//! Explicit high-privilege execution. This is not a workspace sandbox or body writer.

use cap_std::fs::Dir;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::fs::File;
use std::io::{Read, Seek, SeekFrom, Write};
use std::path::Path;
use std::process::{Command, Stdio};
use std::sync::Mutex;

pub const OUTPUT_PAGE_LIMIT: usize = 65_536;
const MAX_RETAINED_EXECUTIONS: usize = 32;
const MAX_CONSENT_BYTES: usize = 65_536;
const WARNING: &str = "This process runs with your full OS permissions, NOT in a workspace sandbox. It can read, modify or delete files outside this workspace and access the network. Arbitrary TypeScript is executable code, not harmless JSON. Approve only code and programs you trust. No shell is invoked implicitly. Environment below is complete; no ambient environment is inherited. stdin is delivered as exact UTF-8 bytes (JSON escapes preserve NUL and mixed line endings).";

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct OrgExternalExecutionRequest {
    pub workspace_root: String,
    pub capability_token: String,
    pub program: String,
    pub argv: Vec<String>,
    pub environment: BTreeMap<String, String>,
    pub stdin: Option<String>,
}

impl OrgExternalExecutionRequest {
    pub fn consent_message(&self) -> Result<String, String> {
        let raw_size = self.argv.iter().fold(self.program.len().saturating_add(self.workspace_root.len()), |size, arg| size.saturating_add(arg.len()))
            .saturating_add(self.environment.iter().fold(0usize, |size, (key, value)| size.saturating_add(key.len()).saturating_add(value.len())))
            .saturating_add(self.stdin.as_ref().map_or(0, String::len));
        if raw_size > MAX_CONSENT_BYTES || self.argv.len() > 4096 || self.environment.len() > 1024 {
            return Err("Execution intent is too large for complete native consent; nothing was started".into());
        }
        if !Path::new(&self.program).is_absolute() || self.program.contains('\0') {
            return Err("Execution requires an explicit absolute executable path without NUL".into());
        }
        if self.argv.iter().any(|arg| arg.contains('\0'))
            || self.environment.iter().any(|(key, value)| key.is_empty()
                || key.contains(['=', '\0']) || value.contains('\0'))
        {
            return Err("Invalid literal argv or environment (NUL and '=' in keys are not allowed)".into());
        }
        // The lease is authority, not part of the program. Never expose it in the dialog.
        #[derive(Serialize)]
        #[serde(rename_all = "camelCase")]
        struct Intent<'a> {
            program: &'a str,
            argv: &'a [String],
            cwd: &'a str,
            environment: &'a BTreeMap<String, String>,
            stdin: &'a Option<String>,
        }
        let intent = Intent { program: &self.program, argv: &self.argv,
            cwd: &self.workspace_root, environment: &self.environment, stdin: &self.stdin };
        let details = serde_json::to_string_pretty(&intent).map_err(|error| error.to_string())?;
        if details.len() > MAX_CONSENT_BYTES {
            return Err("Execution intent is too large for complete native consent (maximum 65536 bytes); nothing was started".into());
        }
        Ok(format!("{WARNING}\n\nRun exactly this immutable request once?\n{details}"))
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum ExecutionOutcome { CancelledBeforeStart, Completed, Failed }

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OrgExternalExecutionResult {
    pub outcome: ExecutionOutcome,
    pub execution_id: Option<String>,
    pub stdout_bytes: String,
    pub stderr_bytes: String,
    pub exit_code: Option<i32>,
    pub signal: Option<i32>,
    pub error: Option<String>,
}

impl OrgExternalExecutionResult {
    pub fn before_start(error: Option<String>) -> Self {
        Self { outcome: ExecutionOutcome::CancelledBeforeStart, execution_id: None,
            stdout_bytes: "0".into(), stderr_bytes: "0".into(), exit_code: None, signal: None, error }
    }
}

pub struct OutputFiles { stdout: File, stderr: File }

impl OutputFiles {
    pub fn new() -> Result<Self, String> {
        // Anonymous private files: no user workspace files, ambient plugin, or public pathname.
        Ok(Self {
            stdout: tempfile::tempfile().map_err(|error| error.to_string())?,
            stderr: tempfile::tempfile().map_err(|error| error.to_string())?,
        })
    }
}

#[derive(Default)]
pub struct OrgExecutionRegistry {
    enabled: Mutex<bool>,
    outputs: Mutex<BTreeMap<String, Option<OutputFiles>>>,
}

impl OrgExecutionRegistry {
    pub fn set_enabled(&self, enabled: bool) -> Result<(), String> {
        *self.enabled.lock().map_err(|_| "Execution permission fence unavailable")? = enabled;
        Ok(())
    }
    pub fn enabled(&self) -> Result<bool, String> {
        Ok(*self.enabled.lock().map_err(|_| "Execution permission fence unavailable")?)
    }
    pub fn require_enabled(&self) -> Result<(), String> {
        if self.enabled()? { Ok(()) }
        else { Err("External execution is disabled; enable it explicitly in settings first".into()) }
    }
    /// Recheck permission and hold its fence through the actual spawn, not the drain.
    /// A completed disable prevents this operation; an accepted operation makes disable
    /// wait until its spawn boundary returns. Callers must perform the real spawn here.
    pub fn with_enabled_start<T>(&self, start: impl FnOnce() -> Result<T, String>) -> Result<T, String> {
        let enabled = self.enabled.lock().map_err(|_| "Execution permission fence unavailable")?;
        if !*enabled {
            return Err("External execution is disabled; enable it explicitly in settings first".into());
        }
        let result = start();
        drop(enabled);
        result
    }
    pub fn reserve(&self) -> Result<String, String> {
        let mut outputs = self.outputs.lock().map_err(|_| "Execution output registry unavailable")?;
        if outputs.len() >= MAX_RETAINED_EXECUTIONS {
            return Err("Close an existing execution tool to release its output before starting another".into());
        }
        let id = uuid::Uuid::new_v4().to_string();
        outputs.insert(id.clone(), None);
        Ok(id)
    }
    pub fn retain(&self, id: &str, files: OutputFiles) -> Result<(), String> {
        let mut outputs = self.outputs.lock().map_err(|_| "Execution output registry unavailable")?;
        let slot = outputs.get_mut(id).ok_or("Execution reservation was retired")?;
        *slot = Some(files);
        Ok(())
    }
    pub fn release(&self, id: &str) -> Result<(), String> {
        let mut outputs = self.outputs.lock().map_err(|_| "Execution output registry unavailable")?;
        if outputs.get(id).is_some_and(Option::is_none) {
            return Err("Started/pending execution must drain before its outputs can be released".into());
        }
        outputs.remove(id);
        Ok(())
    }
    pub fn discard_reservation(&self, id: &str) {
        if let Ok(mut outputs) = self.outputs.lock() { outputs.remove(id); }
    }
    pub fn read(&self, id: &str, stream: OutputStream, offset: &str, limit: usize) -> Result<OrgExecutionOutputPage, String> {
        if limit == 0 || limit > OUTPUT_PAGE_LIMIT { return Err("Output page limit must be 1..65536".into()); }
        if offset.is_empty() || !offset.bytes().all(|byte| byte.is_ascii_digit()) {
            return Err("Output offset must be an unsigned decimal string".into());
        }
        let offset: u64 = offset.parse().map_err(|_| "Invalid output offset")?;
        let mut outputs = self.outputs.lock().map_err(|_| "Execution output registry unavailable")?;
        let files = outputs.get_mut(id).and_then(Option::as_mut).ok_or("Execution output is not available")?;
        let file = match stream { OutputStream::Stdout => &mut files.stdout, OutputStream::Stderr => &mut files.stderr };
        let length = file.metadata().map_err(|error| error.to_string())?.len();
        if offset > length { return Err("Output offset is beyond end of stream".into()); }
        file.seek(SeekFrom::Start(offset)).map_err(|error| error.to_string())?;
        let mut bytes = vec![0; (length - offset).min(limit as u64) as usize];
        file.read_exact(&mut bytes).map_err(|error| error.to_string())?;
        let next = offset + bytes.len() as u64;
        Ok(OrgExecutionOutputPage { bytes, next_offset: next.to_string(), eof: next == length })
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum OutputStream { Stdout, Stderr }

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OrgExecutionOutputPage { pub bytes: Vec<u8>, pub next_offset: String, pub eof: bool }

pub fn require_supported_platform() -> Result<(), String> {
    if cfg!(target_os = "linux") { Ok(()) }
    else { Err("Descriptor-bound external execution cwd is unavailable on this platform".into()) }
}

pub fn prepare_command(request: &OrgExternalExecutionRequest, cwd: &Dir) -> Result<Command, String> {
    require_supported_platform()?;
    let mut command = Command::new(&request.program);
    command.args(&request.argv).env_clear().envs(&request.environment)
        .stdin(if request.stdin.is_some() { Stdio::piped() } else { Stdio::null() })
        .stdout(Stdio::piped()).stderr(Stdio::piped());
    #[cfg(target_os = "linux")]
    {
        use std::os::fd::AsRawFd;
        use std::os::unix::process::CommandExt;
        let fd = cwd.as_raw_fd();
        // Only the async-signal-safe syscall runs after fork. cwd is retained through spawn.
        unsafe {
            command.pre_exec(move || {
                if libc::fchdir(fd) == -1 { Err(std::io::Error::last_os_error()) } else { Ok(()) }
            });
        }
    }
    #[cfg(not(target_os = "linux"))]
    let _ = cwd;
    Ok(command)
}

// Continue consuming pipes even if the spool fails: a started child must not block on us.
fn drain(mut input: impl Read, output: &mut File) -> (u64, Option<String>) {
    let mut buffer = [0; 16_384];
    let mut failure = None;
    loop {
        match input.read(&mut buffer) {
            Ok(0) => break,
            Ok(size) => {
                if failure.is_none() {
                    match output.write_all(&buffer[..size]) {
                        Ok(()) => {}
                        Err(error) => failure = Some(format!("Output spool failed; output may be incomplete: {error}")),
                    }
                }
            }
            Err(error) if error.kind() == std::io::ErrorKind::Interrupted => continue,
            Err(error) => { failure = Some(format!("Output drain failed: {error}")); break; }
        }
    }
    let count = match output.metadata() {
        Ok(metadata) => metadata.len(),
        Err(error) => {
            failure = Some(format!("Cannot inspect spooled output size: {error}"));
            0
        }
    };
    (count, failure)
}

/// Show the retained directory identity, not an ambient root that could have been replaced.
pub fn cwd_consent_binding(cwd: &Dir) -> Result<String, String> {
    require_supported_platform()?;
    #[cfg(target_os = "linux")]
    {
        use cap_std::fs::MetadataExt;
        use std::os::fd::AsRawFd;
        let metadata = cwd.dir_metadata().map_err(|error| error.to_string())?;
        let resolved = std::fs::read_link(format!("/proc/self/fd/{}", cwd.as_raw_fd()))
            .map_err(|error| format!("Cannot inspect retained execution cwd: {error}"))?;
        let path = resolved.to_str().ok_or("Retained execution cwd is not valid UTF-8")?;
        serde_json::to_string_pretty(&serde_json::json!({
            "retainedCwdPath": path,
            "device": metadata.dev().to_string(),
            "inode": metadata.ino().to_string(),
            "binding": "fchdir to this retained directory, never ambient reopen; selected cwd above is its workspace label"
        })).map_err(|error| error.to_string())
    }
    #[cfg(not(target_os = "linux"))]
    { let _ = cwd; Err("Descriptor-bound cwd identity is unavailable".into()) }
}

pub fn finish_started(mut child: std::process::Child, request: &OrgExternalExecutionRequest,
    mut files: OutputFiles, id: String) -> (OrgExternalExecutionResult, OutputFiles) {
    let stdout = child.stdout.take().expect("prepared piped stdout");
    let stderr = child.stderr.take().expect("prepared piped stderr");
    let stdin = child.stdin.take();
    let (status, out, err, input_error) = std::thread::scope(|scope| {
        let out = scope.spawn(|| drain(stdout, &mut files.stdout));
        let err = scope.spawn(|| drain(stderr, &mut files.stderr));
        let input = scope.spawn(|| match (stdin, request.stdin.as_ref()) {
            (Some(mut pipe), Some(source)) => pipe.write_all(source.as_bytes()).err().map(|error| format!("stdin delivery failed: {error}")),
            _ => None,
        });
        let status = child.wait();
        (status, out.join().expect("stdout drain thread"), err.join().expect("stderr drain thread"), input.join().expect("stdin thread"))
    });
    let mut errors = Vec::new();
    if let Some(error) = out.1 { errors.push(error); }
    if let Some(error) = err.1 { errors.push(error); }
    if let Some(error) = input_error { errors.push(error); }
    let (exit_code, signal, success) = match status {
        Ok(status) => {
            #[cfg(unix)]
            let signal = { use std::os::unix::process::ExitStatusExt; status.signal() };
            #[cfg(not(unix))]
            let signal = None;
            (status.code(), signal, status.success())
        }
        Err(error) => { errors.push(format!("Could not reap started process: {error}")); (None, None, false) }
    };
    let result = OrgExternalExecutionResult {
        outcome: if success && errors.is_empty() { ExecutionOutcome::Completed } else { ExecutionOutcome::Failed },
        execution_id: Some(id), stdout_bytes: out.0.to_string(), stderr_bytes: err.0.to_string(),
        exit_code, signal, error: if errors.is_empty() { None } else { Some(errors.join("\n")) },
    };
    (result, files)
}

#[cfg(test)]
mod tests {
    use super::*;
    fn request() -> OrgExternalExecutionRequest {
        OrgExternalExecutionRequest { workspace_root: "/workspace".into(), capability_token: "secret-grant".into(),
            program: "/bin/sh".into(), argv: vec!["-c".into(), "printf '%s' '$(not-expanded-by-grain)'".into()],
            environment: BTreeMap::from([("PATH".into(), "/bin".into())]), stdin: Some("a\r\nb\rc\0λ".into()) }
    }
    #[test]
    fn consent_contains_entire_literal_intent_and_warning_but_not_grant() {
        let request = request();
        let message = request.consent_message().unwrap();
        assert!(message.contains("full OS permissions"));
        assert!(message.contains("TypeScript is executable code, not harmless JSON"));
        assert!(!message.contains("secret-grant"));
        let json: serde_json::Value = serde_json::from_str(message.split_once("once?\n").unwrap().1).unwrap();
        assert_eq!(json["stdin"], request.stdin.unwrap());
        assert_eq!(json["argv"][1], request.argv[1]);
        assert_eq!(json["environment"]["PATH"], "/bin");
    }
    #[test]
    fn malformed_intent_and_oversize_consent_fail_before_start() {
        let mut intent = request();
        intent.program = "sh".into();
        assert!(intent.consent_message().is_err());
        intent.program = "/bin/sh".into();
        intent.argv.push("nul\0argument".into());
        assert!(intent.consent_message().is_err());
        intent.argv.pop();
        intent.stdin = Some("x".repeat(MAX_CONSENT_BYTES));
        assert!(intent.consent_message().is_err());
    }
    #[test]
    fn strict_schema_disallows_configuration_privilege_switches() {
        let mut value = serde_json::to_value(request()).unwrap();
        value["shell"] = serde_json::json!(true);
        assert!(serde_json::from_value::<OrgExternalExecutionRequest>(value).is_err());
    }
    #[test]
    fn defaults_off_and_exact_output_pages_survive_release_of_source() {
        let registry = OrgExecutionRegistry::default();
        assert!(registry.require_enabled().is_err());
        assert!(!registry.enabled().unwrap());
        registry.set_enabled(true).unwrap();
        assert!(registry.enabled().unwrap());
        assert!(registry.require_enabled().is_ok());
        registry.set_enabled(false).unwrap();
        assert!(registry.require_enabled().is_err());
        let id = registry.reserve().unwrap();
        assert!(registry.release(&id).is_err());
        let mut files = OutputFiles::new().unwrap();
        let bytes = b"\x00\xff\r\n\r\xce\xbb";
        assert_eq!(drain(&bytes[..], &mut files.stdout).0, bytes.len() as u64);
        registry.retain(&id, files).unwrap();
        let first = registry.read(&id, OutputStream::Stdout, "0", 3).unwrap();
        let second = registry.read(&id, OutputStream::Stdout, &first.next_offset, OUTPUT_PAGE_LIMIT).unwrap();
        assert_eq!([first.bytes, second.bytes].concat(), bytes);
        assert!(second.eof);
        assert!(registry.read(&id, OutputStream::Stdout, "0", OUTPUT_PAGE_LIMIT + 1).is_err());
        registry.release(&id).unwrap();
        assert!(registry.read(&id, OutputStream::Stdout, "0", 1).is_err());
    }
    #[cfg(target_os = "linux")]
    #[test]
    fn completed_disable_rejects_stale_preflight_without_process_or_receipt() {
        let registry = OrgExecutionRegistry::default();
        registry.set_enabled(true).unwrap();
        let directory = tempfile::tempdir().unwrap();
        let marker = directory.path().join("must-not-start");
        let cwd = Dir::open_ambient_dir(directory.path(), cap_std::ambient_authority()).unwrap();
        let mut intent = request();
        intent.argv = vec!["-c".into(), "printf stale > must-not-start; printf stdout; printf stderr >&2".into()];
        intent.stdin = None;
        let (preflight_tx, preflight_rx) = std::sync::mpsc::channel();
        let (resume_tx, resume_rx) = std::sync::mpsc::channel();
        std::thread::scope(|scope| {
            let registry = &registry;
            let start = scope.spawn(move || {
                registry.require_enabled().unwrap();
                let id = registry.reserve().unwrap();
                preflight_tx.send(()).unwrap();
                resume_rx.recv().unwrap();
                let started = registry.with_enabled_start(|| {
                    let files = OutputFiles::new()?;
                    let child = prepare_command(&intent, &cwd)?.spawn().map_err(|error| error.to_string())?;
                    Ok((child, files))
                });
                match started {
                    Err(error) => {
                        registry.discard_reservation(&id);
                        (OrgExternalExecutionResult::before_start(Some(error)), id)
                    }
                    Ok((child, files)) => {
                        let (result, files) = finish_started(child, &intent, files, id.clone());
                        registry.retain(&id, files).unwrap();
                        (result, id)
                    }
                }
            });
            preflight_rx.recv().unwrap();
            registry.set_enabled(false).unwrap();
            resume_tx.send(()).unwrap();
            let (result, reserved_id) = start.join().unwrap();
            assert!(matches!(result.outcome, ExecutionOutcome::CancelledBeforeStart));
            assert!(result.execution_id.is_none());
            assert_eq!(result.stdout_bytes, "0");
            assert_eq!(result.stderr_bytes, "0");
            assert!(result.error.unwrap().contains("disabled"));
            assert!(!marker.exists());
            assert!(registry.read(&reserved_id, OutputStream::Stdout, "0", 1).is_err());
        });
    }
    #[cfg(target_os = "linux")]
    #[test]
    fn accepted_spawn_fences_disable_then_drains_and_retains_exact_output() {
        let registry = OrgExecutionRegistry::default();
        registry.set_enabled(true).unwrap();
        let directory = tempfile::tempdir().unwrap();
        let marker = directory.path().join("accepted-marker");
        let cwd = Dir::open_ambient_dir(directory.path(), cap_std::ambient_authority()).unwrap();
        let mut intent = request();
        intent.argv = vec!["-c".into(), "IFS= read -r line; printf '%s' \"$line\" > accepted-marker; printf 'out\\r\\n'; printf 'err\\r' >&2".into()];
        intent.stdin = Some("accepted\n".into());
        let id = registry.reserve().unwrap();
        let (spawned_tx, spawned_rx) = std::sync::mpsc::channel();
        let (boundary_tx, boundary_rx) = std::sync::mpsc::channel();
        let (disabling_tx, disabling_rx) = std::sync::mpsc::channel();
        let (disabled_tx, disabled_rx) = std::sync::mpsc::channel();
        let (drain_tx, drain_rx) = std::sync::mpsc::channel();
        std::thread::scope(|scope| {
            let registry = &registry;
            let worker_id = id.clone();
            let start = scope.spawn(move || {
                let (child, files) = registry.with_enabled_start(|| {
                    let files = OutputFiles::new()?;
                    let child = prepare_command(&intent, &cwd)?.spawn().map_err(|error| error.to_string())?;
                    spawned_tx.send(()).unwrap();
                    boundary_rx.recv().unwrap();
                    Ok((child, files))
                }).unwrap();
                drain_rx.recv().unwrap();
                let (result, files) = finish_started(child, &intent, files, worker_id.clone());
                registry.retain(&worker_id, files).unwrap();
                result
            });
            spawned_rx.recv().unwrap();
            assert!(matches!(registry.enabled.try_lock(), Err(std::sync::TryLockError::WouldBlock)));
            let disable = scope.spawn(move || {
                disabling_tx.send(()).unwrap();
                registry.set_enabled(false).unwrap();
                disabled_tx.send(()).unwrap();
            });
            disabling_rx.recv().unwrap();
            assert!(matches!(disabled_rx.try_recv(), Err(std::sync::mpsc::TryRecvError::Empty)));
            boundary_tx.send(()).unwrap();
            disabled_rx.recv().unwrap();
            disable.join().unwrap();
            assert!(!registry.enabled().unwrap());
            assert!(registry.require_enabled().is_err());
            assert!(registry.release(&id).is_err());
            // The real child is still waiting for stdin. Disable neither killed it
            // nor waited for its drain; it only waited for the spawn boundary.
            assert!(!marker.exists());
            drain_tx.send(()).unwrap();
            let result = start.join().unwrap();
            assert!(matches!(result.outcome, ExecutionOutcome::Completed));
            assert_eq!(result.execution_id.as_deref(), Some(id.as_str()));
            assert_eq!(result.stdout_bytes, "5");
            assert_eq!(result.stderr_bytes, "4");
            assert_eq!(std::fs::read(&marker).unwrap(), b"accepted");
            let first = registry.read(&id, OutputStream::Stdout, "0", 2).unwrap();
            let rest = registry.read(&id, OutputStream::Stdout, &first.next_offset, OUTPUT_PAGE_LIMIT).unwrap();
            assert_eq!([first.bytes, rest.bytes].concat(), b"out\r\n");
            assert!(rest.eof);
            assert_eq!(registry.read(&id, OutputStream::Stderr, "0", OUTPUT_PAGE_LIMIT).unwrap().bytes, b"err\r");
            registry.release(&id).unwrap();
            assert!(registry.read(&id, OutputStream::Stdout, "0", 1).is_err());
        });
    }
    #[test]
    fn poisoned_permission_fence_reports_failure_instead_of_successful_enable() {
        let registry = OrgExecutionRegistry::default();
        registry.set_enabled(true).unwrap();
        let panic = std::panic::catch_unwind(|| {
            let _ = registry.with_enabled_start::<()>(|| panic!("poison the permission fence"));
        });
        assert!(panic.is_err());
        assert!(registry.enabled().unwrap_err().contains("fence unavailable"));
        assert!(registry.set_enabled(true).unwrap_err().contains("fence unavailable"));
        assert!(registry.set_enabled(false).unwrap_err().contains("fence unavailable"));
        assert!(registry.require_enabled().unwrap_err().contains("fence unavailable"));
        let started = std::cell::Cell::new(false);
        assert!(registry.with_enabled_start(|| { started.set(true); Ok(()) }).is_err());
        assert!(!started.get());
    }
    #[cfg(target_os = "linux")]
    #[test]
    fn cwd_consent_identifies_retained_directory_after_ambient_root_swap() {
        let parent = tempfile::tempdir().unwrap();
        let selected = parent.path().join("selected");
        let retained = parent.path().join("retained");
        std::fs::create_dir(&selected).unwrap();
        let cwd = Dir::open_ambient_dir(&selected, cap_std::ambient_authority()).unwrap();
        let original: serde_json::Value = serde_json::from_str(&cwd_consent_binding(&cwd).unwrap()).unwrap();
        std::fs::rename(&selected, &retained).unwrap();
        std::fs::create_dir(&selected).unwrap();
        let after: serde_json::Value = serde_json::from_str(&cwd_consent_binding(&cwd).unwrap()).unwrap();
        assert_eq!(original["device"], after["device"]);
        assert_eq!(original["inode"], after["inode"]);
        assert_eq!(after["retainedCwdPath"], retained.to_str().unwrap());
        let replacement = Dir::open_ambient_dir(&selected, cap_std::ambient_authority()).unwrap();
        let replacement: serde_json::Value = serde_json::from_str(&cwd_consent_binding(&replacement).unwrap()).unwrap();
        assert_ne!(after["inode"], replacement["inode"]);
    }
    #[test]
    fn explicit_command_does_not_expand_arguments_or_inherit_environment() {
        let directory = cap_std::fs::Dir::open_ambient_dir(std::env::temp_dir(), cap_std::ambient_authority()).unwrap();
        if cfg!(target_os = "linux") {
            let intent = request();
            let command = prepare_command(&intent, &directory).unwrap();
            assert_eq!(command.get_program(), "/bin/sh");
            assert_eq!(command.get_args().collect::<Vec<_>>(), intent.argv.iter().map(std::ffi::OsStr::new).collect::<Vec<_>>());
            assert_eq!(command.get_envs().count(), 1);
        } else { assert!(prepare_command(&request(), &directory).is_err()); }
    }
}
