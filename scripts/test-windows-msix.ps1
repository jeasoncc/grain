[CmdletBinding()]
param([string]$PackageDirectory = 'artifacts/windows-msix', [string]$OutputDirectory = 'artifacts/windows-readiness')

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$repo = Split-Path $PSScriptRoot -Parent
$packages = [IO.Path]::GetFullPath((Join-Path $repo $PackageDirectory))
$output = [IO.Path]::GetFullPath((Join-Path $repo $OutputDirectory))
New-Item -ItemType Directory -Path $output -Force | Out-Null
$info = Get-Content (Join-Path $packages 'package-info.json') -Raw | ConvertFrom-Json
$packagePath = Join-Path $packages $info.package
$trustedCertificate = $null
$installed = $null
$installAttempted = $false
$process = $null
$overrides = @()
$failure = $null
$cleanupErrors = @()
$started = Get-Date
$result = [ordered]@{ status = 'running'; package = $info.package; sha256 = $info.sha256; purpose = $info.purpose; storeProductId = $info.storeProductId; wack = 'not run'; phases = @() }

function Add-Summary([string]$Text) {
    Write-Output $Text
    if ($env:GITHUB_STEP_SUMMARY) { $Text | Add-Content $env:GITHUB_STEP_SUMMARY }
}

function Get-EvergreenVersion {
    # Official Evergreen product key, not the installed Edge browser version.
    foreach ($key in @(
        'HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}',
        'HKCU:\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}'
    )) {
        $entry = Get-ItemProperty $key -ErrorAction SilentlyContinue
        if ($entry -and $entry.PSObject.Properties['pv'] -and $entry.pv -and [version]$entry.pv -gt [version]'0.0.0.0') {
            return $entry.pv
        }
    }
    return $null
}

function Stop-InstalledApp {
    if ($installed) {
        Get-Process grain -ErrorAction SilentlyContinue | Where-Object {
            $_.Path -eq (Join-Path $installed.InstallLocation 'grain.exe')
        } | Stop-Process -Force
        # Wait for the old WebView2 debugging endpoint to release its port before restart.
        for ($attempt = 0; $attempt -lt 40; $attempt++) {
            $listener = Get-NetTCPConnection -LocalPort 9222 -State Listen -ErrorAction SilentlyContinue
            if (-not $listener) { return }
            Start-Sleep -Milliseconds 250
        }
        throw 'Installed app/WebView2 did not release the debugging endpoint after shutdown.'
    }
}

function Start-InstalledApp([string]$Phase) {
    $aumid = $installed.PackageFamilyName + '!Grain'
    Start-Process explorer.exe -ArgumentList "shell:AppsFolder\$aumid" | Out-Null
    $deadline = (Get-Date).AddSeconds(90)
    do {
        $candidate = Get-Process grain -ErrorAction SilentlyContinue | Where-Object {
            $_.Path -eq (Join-Path $installed.InstallLocation 'grain.exe') -and $_.MainWindowHandle -ne [IntPtr]::Zero
        } | Select-Object -First 1
        if ($candidate -and [GrainReadiness.Native]::IsWindowVisible($candidate.MainWindowHandle)) {
            [uint32]$length = 0
            $code = [GrainReadiness.Native]::GetPackageFullName($candidate.Handle, [ref]$length, $null)
            if ($code -ne 122) { throw "Cannot determine activated app package identity: Win32 $code" }
            $name = [Text.StringBuilder]::new([int]$length)
            $code = [GrainReadiness.Native]::GetPackageFullName($candidate.Handle, [ref]$length, $name)
            if ($code -ne 0 -or $name.ToString() -ne $installed.PackageFullName) { throw 'Activated process does not have the installed MSIX identity.' }
            $dpiContext = [GrainReadiness.Native]::GetWindowDpiAwarenessContext($candidate.MainWindowHandle)
            if ($dpiContext -eq [IntPtr]::Zero -or -not [GrainReadiness.Native]::AreDpiAwarenessContextsEqual($dpiContext, [IntPtr]::new(-4))) {
                throw "Installed window is not PerMonitorV2 DPI aware (context $($dpiContext.ToInt64()))."
            }
            # Resize the real native window, not an emulated browser viewport or upscaled image.
            $null = [GrainReadiness.Native]::ShowWindow($candidate.MainWindowHandle, 9)
            if (-not [GrainReadiness.Native]::SetWindowPos($candidate.MainWindowHandle, [IntPtr]::Zero, 0, 0, 1440, 960, 0x0416)) {
                throw [ComponentModel.Win32Exception]::new([Runtime.InteropServices.Marshal]::GetLastWin32Error())
            }
            $client = [GrainReadiness.Rect]::new()
            if (-not [GrainReadiness.Native]::GetClientRect($candidate.MainWindowHandle, [ref]$client)) {
                throw [ComponentModel.Win32Exception]::new([Runtime.InteropServices.Marshal]::GetLastWin32Error())
            }
            $width = $client.Right - $client.Left
            $height = $client.Bottom - $client.Top
            if ($width -lt 1366 -or $height -lt 768) { throw "Native client area is too small for Store screenshots: ${width}x${height}." }
            [ordered]@{
                phase = $Phase; pid = $candidate.Id; executable = $candidate.Path
                packageFullName = $name.ToString(); windowTitle = $candidate.MainWindowTitle
                windowHandle = $candidate.MainWindowHandle.ToInt64(); sessionId = $candidate.SessionId
                clientWidth = $width; clientHeight = $height
                dpiAwareness = 'PerMonitorV2'; dpiContext = $dpiContext.ToInt64()
            } | ConvertTo-Json | Set-Content (Join-Path $output "$Phase-process.json") -Encoding UTF8
            return $candidate
        }
        Start-Sleep -Milliseconds 500
    } while ((Get-Date) -lt $deadline)
    throw 'Installed app did not expose a visible native window within 90 seconds.'
}

function Save-DesktopScreenshot([string]$Name) {
    $bounds = [Windows.Forms.SystemInformation]::VirtualScreen
    $bitmap = [Drawing.Bitmap]::new($bounds.Width, $bounds.Height)
    $graphics = [Drawing.Graphics]::FromImage($bitmap)
    try {
        $graphics.CopyFromScreen($bounds.Location, [Drawing.Point]::Empty, $bounds.Size)
        $bitmap.Save((Join-Path $output $Name), [Drawing.Imaging.ImageFormat]::Png)
    } finally { $graphics.Dispose(); $bitmap.Dispose() }
}

try {
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing
    Add-Type -TypeDefinition @'
using System;
using System.Text;
using System.Runtime.InteropServices;
namespace GrainReadiness {
    [StructLayout(LayoutKind.Sequential)]
    public struct Rect { public int Left, Top, Right, Bottom; }
    public static class Native {
        [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr window);
        [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr window, int command);
        [DllImport("user32.dll", SetLastError = true)]
        public static extern bool SetWindowPos(IntPtr window, IntPtr after, int x, int y, int width, int height, uint flags);
        [DllImport("user32.dll", SetLastError = true)]
        public static extern bool GetClientRect(IntPtr window, ref Rect rect);
        [DllImport("user32.dll")]
        public static extern IntPtr GetWindowDpiAwarenessContext(IntPtr window);
        [DllImport("user32.dll")]
        public static extern bool AreDpiAwarenessContextsEqual(IntPtr first, IntPtr second);
        [DllImport("kernel32.dll", CharSet = CharSet.Unicode)]
        public static extern int GetPackageFullName(IntPtr process, ref uint length, StringBuilder name);
    }
}
'@
    if (-not [Environment]::UserInteractive -or (Get-Process -Id $PID).SessionId -eq 0) {
        throw 'Installed app/window readiness requires an interactive Windows user session (not Session 0).'
    }
    if ((Get-FileHash $packagePath -Algorithm SHA256).Hash -ne $info.sha256) { throw 'MSIX artifact hash does not match package-info.json.' }
    if (Get-AppxPackage -Name $info.identity) { throw 'Refusing to replace an existing user installation; use an ephemeral Windows runner.' }
    if (Get-NetTCPConnection -LocalPort 9222 -State Listen -ErrorAction SilentlyContinue) { throw 'Readiness CDP port 9222 is already occupied.' }

    $runtime = Get-EvergreenVersion
    $provisioned = $false
    if (-not $runtime) {
        $bootstrapper = Join-Path ([IO.Path]::GetTempPath()) ('grain-webview2-' + [guid]::NewGuid() + '.exe')
        try {
            Invoke-WebRequest 'https://go.microsoft.com/fwlink/p/?LinkId=2124703' -OutFile $bootstrapper -UseBasicParsing
            $signature = Get-AuthenticodeSignature $bootstrapper
            if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch 'O=Microsoft Corporation(?:,|$)') {
                throw 'WebView2 bootstrapper is not authentically signed by Microsoft Corporation.'
            }
            $installer = Start-Process $bootstrapper -ArgumentList '/silent /install' -Wait -PassThru
            if ($installer.ExitCode -ne 0) { throw "WebView2 Evergreen bootstrapper failed ($($installer.ExitCode))." }
            $runtime = Get-EvergreenVersion
            if (-not $runtime) { throw 'Evergreen Runtime is still absent after provisioning.' }
            $provisioned = $true
        } finally { if (Test-Path $bootstrapper) { Remove-Item $bootstrapper -Force } }
    }
    $result.webview2 = @{ version = $runtime; provisionedBySmoke = $provisioned; mode = 'Evergreen prerequisite; not bundled by MSIX' }
    Add-Summary "### Installed MSIX readiness`nWebView2 Evergreen version: $runtime (provisioned by smoke: $provisioned). This does not prove clean Windows 10 runtime availability."

    $publicCert = [Security.Cryptography.X509Certificates.X509Certificate2]::new((Join-Path $packages 'test-signing.cer'))
    if ($publicCert.Thumbprint -ne $info.certificateThumbprint -or $publicCert.Subject -ne $info.publisher) { throw 'Test certificate does not match the packaged identity.' }
    $trustPath = "Cert:\LocalMachine\TrustedPeople\$($publicCert.Thumbprint)"
    if (Test-Path $trustPath) { throw 'Refusing to modify pre-existing test certificate trust.' }
    # Trust only this code-signing leaf in TrustedPeople, never a new root CA.
    $trustedCertificate = Import-Certificate -FilePath (Join-Path $packages 'test-signing.cer') -CertStoreLocation 'Cert:\LocalMachine\TrustedPeople'
    $signTool = Get-ChildItem "${env:ProgramFiles(x86)}\Windows Kits\10\bin\*\x64\signtool.exe" |
        Sort-Object { [version]$_.Directory.Parent.Name } -Descending | Select-Object -First 1
    if (-not $signTool) { throw 'Windows SDK SignTool is unavailable for cryptographic verification.' }
    & $signTool.FullName verify /pa /all /v $packagePath 2>&1 | Tee-Object (Join-Path $output 'signature-verification.log')
    if ($LASTEXITCODE -ne 0) {
        $detail = Get-Content (Join-Path $output 'signature-verification.log') -Tail 40 | Out-String
        throw "MSIX signature verification failed ($LASTEXITCODE):`n$detail"
    }
    $installAttempted = $true
    Add-AppxPackage -Path $packagePath
    $installed = Get-AppxPackage -Name $info.identity
    if (-not $installed -or $installed.Version.ToString() -ne $info.version -or $installed.Architecture.ToString() -ne 'X64') {
        throw 'Installed MSIX version or architecture does not match the artifact.'
    }
    $installed | Select-Object Name, Publisher, Version, Architecture, PackageFullName, PackageFamilyName, InstallLocation |
        ConvertTo-Json | Set-Content (Join-Path $output 'installed-package.json') -Encoding UTF8

    # WebView2 150+ ignores HKCU overrides for elevated hosts, including hosted runners.
    # https://github.com/MicrosoftEdge/WebView2Feedback/issues/5645
    # App-scoped HKLM values reach normal AppsFolder activation and are restored in finally.
    # No production debugging flag is built in.
    $aumid = $installed.PackageFamilyName + '!Grain'
    foreach ($name in @($aumid, 'grain.exe')) {
        $key = 'HKLM:\Software\Policies\Microsoft\Edge\WebView2\AdditionalBrowserArguments'
        if (-not (Test-Path $key)) { New-Item -Path $key -Force | Out-Null }
        $properties = Get-ItemProperty $key
        $previous = $properties.PSObject.Properties[$name]
        $overrides += @{ key = $key; name = $name; existed = ($null -ne $previous); value = $(if ($previous) { $previous.Value } else { $null }) }
        New-ItemProperty -Path $key -Name $name -Value '--remote-debugging-port=9222 --remote-debugging-address=127.0.0.1 --enable-logging' -PropertyType String -Force | Out-Null
    }
    foreach ($phase in @('exercise', 'reopen')) {
        $process = Start-InstalledApp $phase
        Save-DesktopScreenshot "$phase-desktop.png"
        # Give CDP time to become reachable without replacing or mocking the app.
        $ready = $false
        for ($attempt = 0; $attempt -lt 120; $attempt++) {
            try {
                $null = Invoke-RestMethod 'http://127.0.0.1:9222/json/version' -TimeoutSec 2
                $ready = $true
                break
            } catch { Start-Sleep -Milliseconds 500 }
        }
        if (-not $ready) { throw 'Installed WebView2 debugging endpoint did not become reachable.' }
        & node (Join-Path $PSScriptRoot 'windows-msix-smoke.mjs') $phase $output 2>&1 | Tee-Object (Join-Path $output "$phase.log")
        if ($LASTEXITCODE -ne 0) {
            $detail = Get-Content (Join-Path $output "$phase.log") -Tail 35 | Out-String
            throw "Installed native and editor smoke failed ($phase):`n$detail"
        }
        $result.phases += $phase
        Stop-InstalledApp
        $process = $null
    }
    Add-Summary '- Real installed-app create/read/edit/save, stale CAS rejection, no-clobber creation, invalid-capability rejection, visible file-tree opening, editor Unicode input and Ctrl+S, exact CRLF disk bytes, and visible reopening after a full process restart passed. Native IME composition is not covered.'

    # Run the real certification tool when available; never ignore a failed tool or report.
    $appcert = Join-Path ${env:ProgramFiles(x86)} 'Windows Kits\10\App Certification Kit\appcert.exe'
    if (Test-Path $appcert) {
        $result.wack = 'running'
        & $appcert reset 2>&1 | Tee-Object (Join-Path $output 'wack-reset.log')
        if ($LASTEXITCODE -ne 0) {
            $detail = Get-Content (Join-Path $output 'wack-reset.log') -Tail 40 | Out-String
            throw "WACK reset failed ($LASTEXITCODE):`n$detail"
        }
        # Official archive mode requires the smoke-tested app to be uninstalled first.
        Remove-AppxPackage -Package $installed.PackageFullName
        $result.wackInput = 'signed MSIX archive'
        $report = Join-Path $output 'wack-report.xml'
        & $appcert test -appxpackagepath $packagePath -reportoutputpath $report 2>&1 | Tee-Object (Join-Path $output 'wack.log')
        $code = $LASTEXITCODE
        if ($code -ne 0) {
            $result.wack = "failed (exit $code)"
            $detail = Get-Content (Join-Path $output 'wack.log') -Tail 60 | Out-String
            throw "WACK failed ($code):`n$detail"
        }
        if (-not (Test-Path $report)) { $result.wack = 'missing report'; throw 'WACK returned no XML report; no certification result can be claimed.' }
        [xml]$reportXml = Get-Content $report -Raw
        $reportRoot = $reportXml.DocumentElement
        # WACK stores the verdict in a REPORT attribute, not an OVERALL_RESULT element.
        if ($reportRoot.LocalName -ne 'REPORT' -or $reportRoot.GetAttribute('PARTIAL_RUN') -ne 'FALSE') {
            throw 'WACK returned an unrecognized or partial report.'
        }
        $verdict = $reportRoot.GetAttribute('OVERALL_RESULT')
        $tests = @($reportRoot.SelectNodes('REQUIREMENTS/REQUIREMENT/TEST'))
        if ($tests.Count -eq 0) { throw 'WACK report contains no test results.' }
        $findings = @()
        foreach ($test in $tests) {
            $node = $test.SelectSingleNode('RESULT')
            $optional = $test.GetAttribute('OPTIONAL')
            if (-not $node -or $node.InnerText.Trim() -notin @('PASS', 'FAIL', 'WARNING') -or $optional -notin @('TRUE', 'FALSE')) {
                throw 'WACK returned an unrecognized test result or requirement.'
            }
            if ($node.InnerText.Trim() -ne 'PASS') {
                $findings += [pscustomobject]@{
                    name = $test.GetAttribute('NAME'); result = $node.InnerText.Trim(); optional = ($optional -eq 'TRUE')
                    messages = @($test.SelectNodes('MESSAGES/MESSAGE') | ForEach-Object { $_.GetAttribute('TEXT') })
                }
            }
        }
        $result.wackVerdict = $verdict
        $result.wackFindings = $findings
        $requiredFindings = @($findings | Where-Object { -not $_.optional })
        if ($verdict -notin @('PASS', 'WARNING') -or $requiredFindings.Count -gt 0 -or
            ($verdict -eq 'PASS' -and $findings.Count -gt 0) -or ($verdict -eq 'WARNING' -and $findings.Count -eq 0)) {
            $result.wack = 'failed or unrecognized checks; certification NOT verified'
            throw "WACK $verdict; non-passing checks:`n$($findings | ConvertTo-Json -Depth 4)"
        }
        if ($verdict -eq 'WARNING') {
            # An optional static scan is not a clean pass. Preserve its findings for review.
            $result.wack = 'WARNING: optional findings require review; not a clean WACK pass or Store certification'
            $result.status = 'passed-with-wack-warnings'
            Write-Warning $result.wack
            Add-Summary ("- **WACK WARNING; not certified.** All mandatory checks passed, but optional findings remain: " + (($findings | ForEach-Object { $_.name + ': ' + $_.result }) -join '; ') + ". Review wack-report.xml and readiness-result.json before submission.")
        } else {
            $result.wack = 'PASS on hosted runner; not Store certification'
            Add-Summary '- WACK produced a real PASS report for this hosted environment. Microsoft Store certification remains a separate review.'
        }
    } else {
        $result.wack = 'unavailable: App Certification Kit is not installed on this runner; certification NOT verified'
        Write-Warning $result.wack
        Add-Summary "- **WACK not run:** $($result.wack). Run the package through WACK on a supported Windows certification machine before submission."
    }
    if ($result.status -eq 'running') { $result.status = 'passed' }
} catch {
    $failure = $_
    $result.status = 'failed'
    $result.error = $_.Exception.Message
    $_ | Out-String | Set-Content (Join-Path $output 'failure.txt') -Encoding UTF8
    $escaped = $_.Exception.Message.Replace('%', '%25').Replace("`r", '%0D').Replace("`n", '%0A')
    Write-Output "::error title=Installed Windows MSIX readiness::$escaped"
    Add-Summary "### Windows readiness failed`n``````text`n$($_.Exception.Message)`n``````"
} finally {
    try { Save-DesktopScreenshot 'final-desktop.png' } catch { Write-Warning "Final screenshot unavailable: $($_.Exception.Message)" }
    # Keep only targeted crash/deployment event details; never dump environment or credentials.
    try {
        Get-WinEvent -FilterHashtable @{ LogName = 'Application'; StartTime = $started } -ErrorAction SilentlyContinue |
            Where-Object { $_.Message -match 'grain\.exe|msedgewebview2\.exe' } |
            Select-Object TimeCreated, Id, LevelDisplayName, Message | ConvertTo-Json -Depth 3 |
            Set-Content (Join-Path $output 'application-events.json') -Encoding UTF8
    } catch { Write-Warning "Application event collection failed: $($_.Exception.Message)" }
    try { Stop-InstalledApp } catch { $cleanupErrors += $_.Exception.Message }
    # Even a partially failed Add-AppxPackage must be cleaned up, but never an older user package.
    try {
        if ($installAttempted) {
            $cleanupPackage = Get-AppxPackage -Name $info.identity | Where-Object { $_.Version.ToString() -eq $info.version }
            if ($cleanupPackage) { Remove-AppxPackage -Package $cleanupPackage.PackageFullName }
        }
    } catch { $cleanupErrors += $_.Exception.Message }
    foreach ($override in $overrides) {
        try {
            if ($override.existed) { Set-ItemProperty -Path $override.key -Name $override.name -Value $override.value }
            else { Remove-ItemProperty -Path $override.key -Name $override.name }
        } catch { $cleanupErrors += $_.Exception.Message }
    }
    if ($trustedCertificate) {
        try { Remove-Item "Cert:\LocalMachine\TrustedPeople\$($trustedCertificate.Thumbprint)" }
        catch { $cleanupErrors += $_.Exception.Message }
    }
    $result.cleanupErrors = $cleanupErrors
    if ($cleanupErrors.Count -gt 0) {
        $result.status = 'failed'
        Add-Summary ("### Readiness cleanup failed`n" + ($cleanupErrors -join "`n"))
        Write-Output ('::error title=Windows readiness cleanup::' + (($cleanupErrors -join '; ').Replace('%', '%25').Replace("`r", '%0D').Replace("`n", '%0A')))
    }
    $result | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $output 'readiness-result.json') -Encoding UTF8
}
if ($failure) { throw $failure }
if ($cleanupErrors.Count -gt 0) { throw 'Windows test package or certificate cleanup failed.' }
