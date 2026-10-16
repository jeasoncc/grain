[CmdletBinding()]
param(
    [string]$OutputDirectory = 'artifacts/windows-msix',
    [string]$Executable = 'apps/desktop/src-tauri/target/release/grain.exe'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$repo = Split-Path $PSScriptRoot -Parent
$certificate = $null
$toolLog = $null
$stage = Join-Path ([IO.Path]::GetTempPath()) ('grain-msix-' + [guid]::NewGuid())

function Find-SdkTool([string]$Name) {
    $tool = Get-ChildItem "${env:ProgramFiles(x86)}\Windows Kits\10\bin\*\x64\$Name" |
        Sort-Object { [version]$_.Directory.Parent.Name } -Descending | Select-Object -First 1
    if (-not $tool) { throw "Windows SDK x64 tool not found: $Name" }
    return $tool.FullName
}

try {
    $config = Get-Content (Join-Path $repo 'apps/desktop/src-tauri/tauri.conf.json') -Raw | ConvertFrom-Json
    if ($config.version -notmatch '^\d+\.\d+\.\d+$') { throw 'MSIX requires the real numeric desktop release version (major.minor.patch).' }
    $version = [version]($config.version + '.0')
    foreach ($component in @($version.Major, $version.Minor, $version.Build, $version.Revision)) {
        if ($component -gt 65535) { throw "Version component exceeds MSIX range: $version" }
    }
    # These are the identities assigned to the existing Store product 9NV7M2PW25B3.
    $identity = 'Jeason.5842835EA9EE6'
    $publisher = 'CN=056C6E40-362E-4DC2-A03D-B19B795AA254'
    $output = [IO.Path]::GetFullPath((Join-Path $repo $OutputDirectory))
    New-Item -ItemType Directory -Path $output -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $stage 'Assets') -Force | Out-Null
    $exe = Get-Item (Join-Path $repo $Executable)
    # Refuse to label an ARM64 or x86 executable as an x64 package.
    $reader = [IO.BinaryReader]::new([IO.File]::OpenRead($exe.FullName))
    try {
        if ($reader.ReadUInt16() -ne 0x5a4d) { throw 'grain.exe has no DOS/PE header.' }
        $reader.BaseStream.Position = 0x3c
        $reader.BaseStream.Position = $reader.ReadUInt32()
        if ($reader.ReadUInt32() -ne 0x4550 -or $reader.ReadUInt16() -ne 0x8664) { throw 'MSIX input must be an x64 PE executable.' }
    } finally { $reader.Dispose() }
    Copy-Item $exe.FullName (Join-Path $stage 'grain.exe')
    foreach ($icon in @('Square44x44Logo.png', 'Square150x150Logo.png', 'StoreLogo.png')) {
        Copy-Item (Join-Path $repo "apps/desktop/src-tauri/icons/$icon") (Join-Path $stage 'Assets')
    }
    $manifest = @"
<?xml version="1.0" encoding="utf-8"?>
<Package xmlns="http://schemas.microsoft.com/appx/manifest/foundation/windows10"
         xmlns:uap="http://schemas.microsoft.com/appx/manifest/uap/windows10"
         xmlns:rescap="http://schemas.microsoft.com/appx/manifest/foundation/windows10/restrictedcapabilities"
         IgnorableNamespaces="uap rescap">
  <Identity Name="$identity" Publisher="$publisher" Version="$version" ProcessorArchitecture="x64" />
  <Properties>
    <DisplayName>&#23567;&#40614;&#20889;&#20316;</DisplayName>
    <PublisherDisplayName>Jeason</PublisherDisplayName>
    <Logo>Assets\StoreLogo.png</Logo>
  </Properties>
  <Dependencies>
    <TargetDeviceFamily Name="Windows.Desktop" MinVersion="10.0.17763.0" MaxVersionTested="10.0.22621.0" />
  </Dependencies>
  <Resources><Resource Language="zh-CN" /></Resources>
  <Applications>
    <Application Id="Grain" Executable="grain.exe" EntryPoint="Windows.FullTrustApplication">
      <uap:VisualElements DisplayName="Grain" Description="A minimalist writing sanctuary for long-form content"
        BackgroundColor="transparent" Square150x150Logo="Assets\Square150x150Logo.png"
        Square44x44Logo="Assets\Square44x44Logo.png" />
    </Application>
  </Applications>
  <Capabilities><rescap:Capability Name="runFullTrust" /></Capabilities>
</Package>
"@
    [IO.File]::WriteAllText((Join-Path $stage 'AppxManifest.xml'), $manifest, [Text.UTF8Encoding]::new($false))
    $package = Join-Path $output "grain_$($config.version)_x64.msix"
    $makeAppx = Find-SdkTool 'makeappx.exe'
    $signTool = Find-SdkTool 'signtool.exe'
    $toolLog = Join-Path $output 'makeappx.log'
    & $makeAppx pack /d $stage /p $package /o 2>&1 | Tee-Object $toolLog
    if ($LASTEXITCODE -ne 0) { throw "MakeAppx pack failed ($LASTEXITCODE)." }

    # A short-lived CI signing key, never exported to disk or included in artifacts.
    # The Store signs accepted submissions with its own certificate.
    $certificate = New-SelfSignedCertificate -Type Custom -Subject $publisher -KeyUsage DigitalSignature `
        -FriendlyName 'Grain ephemeral MSIX test signing' -CertStoreLocation 'Cert:\CurrentUser\My' `
        -KeyExportPolicy NonExportable -NotAfter (Get-Date).AddDays(7) `
        -TextExtension @('2.5.29.37={text}1.3.6.1.5.5.7.3.3', '2.5.29.19={text}')
    $toolLog = Join-Path $output 'signtool.log'
    & $signTool sign /fd SHA256 /s My /sha1 $certificate.Thumbprint $package 2>&1 | Tee-Object $toolLog
    if ($LASTEXITCODE -ne 0) { throw "SignTool sign failed ($LASTEXITCODE)." }
    Export-Certificate -Cert $certificate -FilePath (Join-Path $output 'test-signing.cer') | Out-Null
    Copy-Item (Join-Path $stage 'AppxManifest.xml') $output
    [ordered]@{
        package = [IO.Path]::GetFileName($package)
        sha256 = (Get-FileHash $package -Algorithm SHA256).Hash
        executableSha256 = (Get-FileHash $exe.FullName -Algorithm SHA256).Hash
        identity = $identity
        publisher = $publisher
        version = $version.ToString()
        architecture = 'x64'
        certificateThumbprint = $certificate.Thumbprint
        signing = 'Ephemeral CI certificate; not Store certification'
        webview2 = @{
            required = 'Microsoft Edge WebView2 Evergreen Runtime (not the Edge browser)'
            provisioning = 'Provision Evergreen separately before launching the installed MSIX; no MSI/NSIS bootstrapper is included'
            installer = 'https://developer.microsoft.com/microsoft-edge/webview2/consumer/'
            guidance = 'https://learn.microsoft.com/microsoft-edge/webview2/concepts/distribution'
        }
    } | ConvertTo-Json -Depth 4 | Set-Content (Join-Path $output 'package-info.json') -Encoding UTF8
    Write-Output "Created $package ($version, x64). Packaging is not certification."
    Write-Warning 'WebView2 Evergreen is required and must be provisioned separately before launching this MSIX.'
    if ($env:GITHUB_STEP_SUMMARY) {
        @"
### MSIX package
- Identity: ``$identity`` / ``$publisher``
- Version: ``$version``; architecture: ``x64``
- SHA-256: ``$((Get-FileHash $package -Algorithm SHA256).Hash)``
- WebView2 Evergreen is a prerequisite, **not bundled or installed by this MSIX**. Provision Evergreen separately, including on clean Windows 10. Readiness explicitly checks/provisions the runtime; an install-only pass does not prove runtime availability.
- Self-signing/MakeAppx success is **not** Store certification.
"@ | Add-Content $env:GITHUB_STEP_SUMMARY
    }
} catch {
    $message = $_.Exception.Message
    if ($toolLog -and (Test-Path $toolLog)) {
        $message += "`n" + (Get-Content $toolLog -Tail 60 | Out-String)
    }
    Write-Output ('::error title=MSIX packaging::' + $message.Replace('%', '%25').Replace("`r", '%0D').Replace("`n", '%0A'))
    if ($env:GITHUB_STEP_SUMMARY) { "### MSIX packaging failed`n$message" | Add-Content $env:GITHUB_STEP_SUMMARY }
    throw
} finally {
    if ($certificate) { Remove-Item "Cert:\CurrentUser\My\$($certificate.Thumbprint)" -DeleteKey -ErrorAction Continue }
    if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
}
