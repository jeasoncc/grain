//! Handle-relative Windows document transactions. No ambient pathname is used after approval.
//!
//! NT opens never traverse a reparse point. Directory pins reopen the retained object with an
//! empty native name, not Win32 ReOpenFile or ".". Ancestors deny delete sharing; observed files
//! deny write/delete sharing through CAS and publication. Native rename uses a retained source handle,
//! a retained destination directory and ReplaceIfExists=false. Journals and recovery bodies are
//! intentionally never garbage-collected here. Windows write-through handles and file flushes
//! are used; these are not a claim that Windows provides POSIX directory-fsync power-loss ordering.

use super::*;
use std::mem::{offset_of, size_of};
use std::os::windows::ffi::OsStrExt;
use std::os::windows::io::{AsRawHandle, FromRawHandle};
use std::ptr::{null, null_mut};
use windows_sys::Wdk::Foundation::OBJECT_ATTRIBUTES;
use windows_sys::Wdk::Storage::FileSystem::{
    FileLinkInformation, FileRenameInformation, NtCreateFile, NtSetInformationFile, FILE_CREATE,
    FILE_DIRECTORY_FILE, FILE_LINK_INFORMATION, FILE_NON_DIRECTORY_FILE, FILE_OPEN, FILE_OPEN_IF,
    FILE_OPEN_REPARSE_POINT, FILE_RENAME_INFORMATION, FILE_SYNCHRONOUS_IO_NONALERT,
    FILE_WRITE_THROUGH,
};
use windows_sys::Win32::Foundation::{RtlNtStatusToDosError, HANDLE, UNICODE_STRING};
use windows_sys::Win32::Globalization::{CompareStringOrdinal, CSTR_EQUAL};
use windows_sys::Win32::Security::{
    GetKernelObjectSecurity, GetLengthSid, GetSecurityDescriptorControl, GetSecurityDescriptorDacl,
    GetSecurityDescriptorGroup, GetSecurityDescriptorOwner, GetSecurityDescriptorSacl,
    SetKernelObjectSecurity, DACL_SECURITY_INFORMATION, GROUP_SECURITY_INFORMATION,
    LABEL_SECURITY_INFORMATION, OWNER_SECURITY_INFORMATION, PROTECTED_DACL_SECURITY_INFORMATION,
    SE_DACL_PROTECTED, UNPROTECTED_DACL_SECURITY_INFORMATION,
};
use windows_sys::Win32::Storage::FileSystem::{
    FileAttributeTagInfo, FileBasicInfo, FileIdInfo, GetFileInformationByHandleEx, GetFileType,
    GetFinalPathNameByHandleW, DELETE, FILE_ALL_ACCESS, FILE_ATTRIBUTE_DIRECTORY,
    FILE_ATTRIBUTE_NORMAL, FILE_ATTRIBUTE_REPARSE_POINT, FILE_ATTRIBUTE_TAG_INFO, FILE_BASIC_INFO,
    FILE_ID_INFO, FILE_LIST_DIRECTORY, FILE_READ_ATTRIBUTES, FILE_READ_DATA, FILE_SHARE_DELETE,
    FILE_SHARE_READ, FILE_SHARE_WRITE, FILE_TRAVERSE, FILE_TYPE_DISK, FILE_WRITE_DATA,
    READ_CONTROL, SYNCHRONIZE, VOLUME_NAME_NONE,
};
use windows_sys::Win32::System::IO::IO_STATUS_BLOCK;

const PREFIX: &str = ".grain-win-write-";
const JOURNAL: &str = "journal.json";
const COMPLETE: &str = "completed.json";
const STAGE: &str = "stage";
const ORIGINAL: &str = "original";
const JOURNAL_LIMIT: u64 = 64 * 1024;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct ObjectIdentity {
    volume: u64,
    file: [u8; 16],
}

#[derive(Clone, Debug)]
pub(crate) struct LeafObservation {
    pub identity: Option<ObjectIdentity>,
    pub revision: Option<String>,
    stamp: Option<FileStamp>,
    // Prevent ID recycling while a native-picker confirmation is pending. This handle permits
    // normal external edits; publication reacquires its own deny-write/delete handle.
    _retained: Option<std::sync::Arc<cap_std::fs::File>>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
struct FileStamp {
    change: i64,
    write: i64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct Object {
    identity: ObjectIdentity,
    revision: String,
    length: u64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct Journal {
    version: u32,
    directory_name: String,
    parent: ObjectIdentity,
    directory: ObjectIdentity,
    target: String,
    kind: OrgOriginalRecoveryKind,
    original: Option<Object>,
    staged: Option<Object>,
}

#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct Completed {
    version: u32,
    directory: ObjectIdentity,
    journal: Object,
}

// All ancestors remain open, denying rename/delete of any traversed directory until the
// operation finishes. Keeping just the last parent would allow a directory-tree identity swap.
struct Parent {
    directory: Dir,
    _ancestors: Vec<Dir>,
}

struct Transaction {
    parent: Parent,
    directory: Dir,
    journal: Journal,
    journal_file: cap_std::fs::File,
    original: Option<cap_std::fs::File>,
    staged: Option<cap_std::fs::File>,
    display: String,
}

fn raw(handle: &impl AsRawHandle) -> HANDLE {
    handle.as_raw_handle().cast()
}

#[track_caller]
fn status(result: i32) -> io::Result<()> {
    if result < 0 {
        let error = io::Error::from_raw_os_error(unsafe { RtlNtStatusToDosError(result) } as i32);
        // Temporary native-run diagnostics: retain the unwrapped OS error for classification.
        #[cfg(test)]
        eprintln!(
            "Windows native call at {} failed: NTSTATUS={:#010x}, {}",
            std::panic::Location::caller(),
            result as u32,
            error
        );
        Err(error)
    } else {
        Ok(())
    }
}

fn identity(handle: &impl AsRawHandle) -> io::Result<ObjectIdentity> {
    let mut info = FILE_ID_INFO::default();
    if unsafe {
        GetFileInformationByHandleEx(
            raw(handle),
            FileIdInfo,
            (&mut info as *mut FILE_ID_INFO).cast(),
            size_of::<FILE_ID_INFO>() as u32,
        )
    } == 0
    {
        return Err(io::Error::last_os_error());
    }
    Ok(ObjectIdentity {
        volume: info.VolumeSerialNumber,
        file: info.FileId.Identifier,
    })
}

pub(crate) fn same_directory(first: &Dir, second: &Dir) -> io::Result<bool> {
    Ok(identity(first)? == identity(second)?)
}

fn attributes(handle: &impl AsRawHandle) -> io::Result<u32> {
    let mut info = FILE_ATTRIBUTE_TAG_INFO::default();
    if unsafe {
        GetFileInformationByHandleEx(
            raw(handle),
            FileAttributeTagInfo,
            (&mut info as *mut FILE_ATTRIBUTE_TAG_INFO).cast(),
            size_of::<FILE_ATTRIBUTE_TAG_INFO>() as u32,
        )
    } == 0
    {
        return Err(io::Error::last_os_error());
    }
    if unsafe { GetFileType(raw(handle)) } != FILE_TYPE_DISK {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "workspace objects must be disk files",
        ));
    }
    Ok(info.FileAttributes)
}

// Native child opens accept only one stream-free leaf, never a Win32-normalized '.' path.
fn nt_open(
    parent: &Dir,
    name: &OsStr,
    access: u32,
    share: u32,
    disposition: u32,
    kind: u32,
) -> io::Result<cap_std::fs::File> {
    let mut wide: Vec<u16> = name.encode_wide().collect();
    if wide.is_empty()
        || wide.len() > (u16::MAX as usize / 2)
        || wide.iter().any(|c| matches!(*c, 0 | 47 | 92 | 58))
    {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "native opens require one stream-free leaf",
        ));
    }
    nt_open_counted(parent, &mut wide, access, share, disposition, kind)
}

// An empty counted name reopens RootDirectory itself. Only pin() uses that form; child opens
// above must remain validated leaves. Unlike ReOpenFile, this supports directory handles.
fn nt_open_counted(
    parent: &Dir,
    wide: &mut [u16],
    access: u32,
    share: u32,
    disposition: u32,
    kind: u32,
) -> io::Result<cap_std::fs::File> {
    let unicode = UNICODE_STRING {
        Length: (wide.len() * 2) as u16,
        MaximumLength: (wide.len() * 2) as u16,
        Buffer: if wide.is_empty() {
            null_mut()
        } else {
            wide.as_mut_ptr()
        },
    };
    let object = OBJECT_ATTRIBUTES {
        Length: size_of::<OBJECT_ATTRIBUTES>() as u32,
        RootDirectory: raw(parent),
        ObjectName: &unicode,
        Attributes: 0x40, // OBJ_CASE_INSENSITIVE, matching ordinary Windows path semantics.
        SecurityDescriptor: null_mut(),
        SecurityQualityOfService: null_mut(),
    };
    let mut handle = null_mut();
    let mut result = IO_STATUS_BLOCK::default();
    let options =
        kind | FILE_OPEN_REPARSE_POINT | FILE_SYNCHRONOUS_IO_NONALERT | FILE_WRITE_THROUGH;
    let native_status = unsafe {
        NtCreateFile(
            &mut handle,
            access | SYNCHRONIZE,
            &object,
            &mut result,
            null(),
            FILE_ATTRIBUTE_NORMAL,
            share,
            disposition,
            options,
            null(),
            0,
        )
    };
    #[cfg(test)]
    if native_status < 0 {
        eprintln!(
            "NtCreateFile name={:?}, access={:#010x}, share={:#x}, disposition={}, options={:#010x}",
            String::from_utf16_lossy(wide),
            access | SYNCHRONIZE,
            share,
            disposition,
            options
        );
    }
    status(native_status)?;
    // NtCreateFile returned an owned synchronous handle on success.
    Ok(cap_std::fs::File::from_std(unsafe {
        std::fs::File::from_raw_handle(handle)
    }))
}

fn directory(parent: &Dir, name: &OsStr, disposition: u32) -> io::Result<Dir> {
    let file = nt_open(
        parent,
        name,
        FILE_LIST_DIRECTORY | FILE_TRAVERSE | FILE_READ_ATTRIBUTES,
        FILE_SHARE_READ | FILE_SHARE_WRITE,
        disposition,
        FILE_DIRECTORY_FILE,
    )?;
    let attrs = attributes(&file)?;
    if attrs & FILE_ATTRIBUTE_REPARSE_POINT != 0 || attrs & FILE_ATTRIBUTE_DIRECTORY == 0 {
        return Err(io::Error::new(
            io::ErrorKind::PermissionDenied,
            "reparse directories are not workspace capabilities",
        ));
    }
    Ok(Dir::from_std_file(file.into_std()))
}

pub(crate) fn open_directory(parent: &Dir, name: &OsStr) -> io::Result<Dir> {
    leaf_name(name).map_err(|error| io::Error::new(io::ErrorKind::InvalidInput, error))?;
    let directory = directory(parent, name, FILE_OPEN)?;
    require_long_leaf(&directory, name)?;
    Ok(directory)
}

fn pin(root: &Dir) -> io::Result<Dir> {
    // ReOpenFile always requests FILE_NON_DIRECTORY_FILE, even with BACKUP_SEMANTICS.
    // An empty NT name instead reopens the retained directory object, never an ambient path
    // or a literal "." child. The new handle denies delete sharing for the whole operation.
    let file = nt_open_counted(
        root,
        &mut [],
        FILE_LIST_DIRECTORY | FILE_TRAVERSE | FILE_READ_ATTRIBUTES,
        FILE_SHARE_READ | FILE_SHARE_WRITE,
        FILE_OPEN,
        FILE_DIRECTORY_FILE,
    )?;
    if attributes(&file)? & (FILE_ATTRIBUTE_REPARSE_POINT | FILE_ATTRIBUTE_DIRECTORY)
        != FILE_ATTRIBUTE_DIRECTORY
    {
        return Err(io::Error::new(
            io::ErrorKind::PermissionDenied,
            "reopened workspace capability is not a non-reparse directory",
        ));
    }
    Ok(Dir::from_std_file(file.into_std()))
}

fn require_long_leaf(handle: &impl AsRawHandle, expected: &OsStr) -> io::Result<()> {
    // This normalized name is only an alias check, never pathname authority. All I/O remains
    // relative to the original handles. In particular, 8.3 aliases cannot bypass metadata names.
    let mut stack = [0u16; 512];
    let mut length = unsafe {
        GetFinalPathNameByHandleW(
            raw(handle),
            stack.as_mut_ptr(),
            stack.len() as u32,
            VOLUME_NAME_NONE,
        )
    };
    if length == 0 {
        return Err(io::Error::last_os_error());
    }
    let heap;
    let path = if length as usize >= stack.len() {
        let mut buffer = vec![0u16; length as usize + 1];
        length = unsafe {
            GetFinalPathNameByHandleW(
                raw(handle),
                buffer.as_mut_ptr(),
                buffer.len() as u32,
                VOLUME_NAME_NONE,
            )
        };
        if length == 0 || length as usize >= buffer.len() {
            return Err(io::Error::last_os_error());
        }
        buffer.truncate(length as usize);
        heap = buffer;
        &heap[..]
    } else {
        &stack[..length as usize]
    };
    let leaf = path
        .rsplit(|unit| *unit == b'\\' as u16)
        .next()
        .unwrap_or_default();
    let expected: Vec<u16> = expected.encode_wide().collect();
    if !ordinal_equal(leaf, &expected)? {
        return Err(io::Error::new(
            io::ErrorKind::PermissionDenied,
            "Windows short-name or normalized-name alias is not an approved leaf",
        ));
    }
    Ok(())
}

fn ordinal_equal(first: &[u16], second: &[u16]) -> io::Result<bool> {
    let result = unsafe {
        CompareStringOrdinal(
            first.as_ptr(),
            first.len() as i32,
            second.as_ptr(),
            second.len() as i32,
            1,
        )
    };
    if result == 0 {
        Err(io::Error::last_os_error())
    } else {
        Ok(result == CSTR_EQUAL)
    }
}

fn resolve_parent(
    root: &Dir,
    relative: &Path,
    display: &str,
) -> OrgFilesystemResult<(Parent, OsString)> {
    let mut current = pin(root)?;
    let mut ancestors = Vec::new();
    for component in relative
        .parent()
        .ok_or_else(|| OrgFilesystemError::InvalidPath(display.to_owned()))?
        .components()
    {
        let Component::Normal(name) = component else {
            return Err(OrgFilesystemError::InvalidPath(display.to_owned()));
        };
        let next = open_directory(&current, name).map_err(|error| map_not_found(error, display))?;
        ancestors.push(current);
        current = next;
    }
    let name = relative
        .file_name()
        .ok_or_else(|| OrgFilesystemError::InvalidPath(display.to_owned()))?
        .to_os_string();
    Ok((
        Parent {
            directory: current,
            _ancestors: ancestors,
        },
        name,
    ))
}

pub(super) fn unsafe_component(component: &str) -> bool {
    if component.is_empty()
        || component.ends_with(['.', ' '])
        || component
            .chars()
            .any(|c| c <= '\u{1f}' || matches!(c, ':' | '<' | '>' | '"' | '|' | '?' | '*' | '\\'))
        || component.to_ascii_lowercase().starts_with(".grain-")
    {
        return true;
    }
    let stem = component
        .split('.')
        .next()
        .unwrap_or_default()
        .trim_end_matches(' ')
        .to_ascii_uppercase();
    matches!(
        stem.as_str(),
        "CON" | "PRN" | "AUX" | "NUL" | "CLOCK$" | "CONIN$" | "CONOUT$"
    ) || stem
        .strip_prefix("COM")
        .or_else(|| stem.strip_prefix("LPT"))
        .is_some_and(|suffix| {
            matches!(
                suffix,
                "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "¹" | "²" | "³"
            )
        })
}

fn leaf_name(name: &OsStr) -> OrgFilesystemResult<String> {
    let text = name
        .to_str()
        .ok_or_else(|| OrgFilesystemError::InvalidPath("non-UTF8 leaf".to_owned()))?;
    let path = validate_relative_directory_path(Path::new(text))?;
    if path.components().count() != 1 {
        return Err(OrgFilesystemError::InvalidPath(text.to_owned()));
    }
    Ok(text.to_owned())
}

fn conflict(display: &str) -> OrgFilesystemError {
    OrgFilesystemError::WriteRecoveryConflict(display.to_owned())
}

fn maybe_entry(parent: &Dir, name: &OsStr) -> io::Result<Option<cap_std::fs::File>> {
    match nt_open(
        parent,
        name,
        FILE_READ_ATTRIBUTES,
        FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
        FILE_OPEN,
        0,
    ) {
        Ok(file) => Ok(Some(file)),
        Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(error),
    }
}

fn open_file(parent: &Dir, name: &OsStr, mutate: bool) -> OrgFilesystemResult<cap_std::fs::File> {
    let access = FILE_READ_DATA
        | FILE_READ_ATTRIBUTES
        | READ_CONTROL
        | if mutate { FILE_WRITE_DATA | DELETE } else { 0 };
    let file = nt_open(
        parent,
        name,
        access,
        FILE_SHARE_READ,
        FILE_OPEN,
        FILE_NON_DIRECTORY_FILE,
    )?;
    if attributes(&file)? & FILE_ATTRIBUTE_REPARSE_POINT != 0 {
        return Err(OrgFilesystemError::OutsideWorkspace(
            name.to_string_lossy().into_owned(),
        ));
    }
    require_long_leaf(&file, name)?;
    Ok(file)
}

fn maybe_file(
    parent: &Dir,
    name: &OsStr,
    mutate: bool,
) -> OrgFilesystemResult<Option<cap_std::fs::File>> {
    match open_file(parent, name, mutate) {
        Ok(file) => Ok(Some(file)),
        Err(OrgFilesystemError::Io(error)) if error.kind() == io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(error),
    }
}

fn object(file: &mut cap_std::fs::File, display: &str) -> OrgFilesystemResult<Object> {
    use std::io::{Seek, SeekFrom};
    file.seek(SeekFrom::Start(0))?;
    let id = identity(file)?;
    let (length, revision) = observe_open_file_raw(file, display)?;
    if identity(file)? != id {
        return Err(OrgFilesystemError::InspectionChanged(display.to_owned()));
    }
    Ok(Object {
        identity: id,
        revision,
        length,
    })
}

fn document_object(file: &mut cap_std::fs::File, display: &str) -> OrgFilesystemResult<Object> {
    use std::io::{Seek, SeekFrom};
    file.seek(SeekFrom::Start(0))?;
    let id = identity(file)?;
    let length = file.metadata()?.len();
    let revision = read_open_file_revision_utf8(file, display)?;
    if identity(file)? != id {
        return Err(OrgFilesystemError::InspectionChanged(display.to_owned()));
    }
    Ok(Object {
        identity: id,
        revision,
        length,
    })
}

fn require_object(
    file: &mut cap_std::fs::File,
    expected: &Object,
    display: &str,
) -> OrgFilesystemResult<()> {
    let actual = object(file, display)?;
    if actual.identity != expected.identity
        || actual.revision != expected.revision
        || actual.length != expected.length
    {
        return Err(conflict(display));
    }
    Ok(())
}

fn require_entry(
    parent: &Dir,
    name: &OsStr,
    expected: ObjectIdentity,
    display: &str,
) -> OrgFilesystemResult<()> {
    let file = maybe_entry(parent, name)?.ok_or_else(|| conflict(display))?;
    if attributes(&file)? & FILE_ATTRIBUTE_REPARSE_POINT != 0 || identity(&file)? != expected {
        return Err(conflict(display));
    }
    Ok(())
}

fn stamp(file: &cap_std::fs::File) -> io::Result<FileStamp> {
    let mut info = FILE_BASIC_INFO::default();
    if unsafe {
        GetFileInformationByHandleEx(
            raw(file),
            FileBasicInfo,
            (&mut info as *mut FILE_BASIC_INFO).cast(),
            size_of::<FILE_BASIC_INFO>() as u32,
        )
    } == 0
    {
        return Err(io::Error::last_os_error());
    }
    Ok(FileStamp {
        change: info.ChangeTime,
        write: info.LastWriteTime,
    })
}

fn rename(file: &cap_std::fs::File, parent: &Dir, name: &OsStr) -> io::Result<()> {
    let wide: Vec<u16> = name.encode_wide().collect();
    if wide.is_empty() || wide.len() > 32767 || wide.iter().any(|c| matches!(*c, 0 | 47 | 92 | 58))
    {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "rename requires one stream-free leaf",
        ));
    }
    let length = offset_of!(FILE_RENAME_INFORMATION, FileName) + wide.len() * 2;
    // Vec<usize> supplies the alignment required by the native variable-length structure.
    let mut buffer = vec![0usize; length.div_ceil(size_of::<usize>())];
    let info = buffer.as_mut_ptr().cast::<FILE_RENAME_INFORMATION>();
    unsafe {
        (*info).Anonymous.ReplaceIfExists = false;
        (*info).RootDirectory = raw(parent);
        (*info).FileNameLength = (wide.len() * 2) as u32;
        std::ptr::copy_nonoverlapping(
            wide.as_ptr(),
            std::ptr::addr_of_mut!((*info).FileName).cast::<u16>(),
            wide.len(),
        );
    }
    let mut result = IO_STATUS_BLOCK::default();
    status(unsafe {
        NtSetInformationFile(
            raw(file),
            &mut result,
            info.cast(),
            length as u32,
            FileRenameInformation,
        )
    })
}

fn link(file: &cap_std::fs::File, parent: &Dir, name: &OsStr) -> io::Result<()> {
    let wide: Vec<u16> = name.encode_wide().collect();
    if wide.is_empty() || wide.len() > 32767 || wide.iter().any(|c| matches!(*c, 0 | 47 | 92 | 58))
    {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "link requires one stream-free leaf",
        ));
    }
    let length = offset_of!(FILE_LINK_INFORMATION, FileName) + wide.len() * 2;
    let mut buffer = vec![0usize; length.div_ceil(size_of::<usize>())];
    let info = buffer.as_mut_ptr().cast::<FILE_LINK_INFORMATION>();
    unsafe {
        (*info).Anonymous.ReplaceIfExists = false;
        (*info).RootDirectory = raw(parent);
        (*info).FileNameLength = (wide.len() * 2) as u32;
        std::ptr::copy_nonoverlapping(
            wide.as_ptr(),
            std::ptr::addr_of_mut!((*info).FileName).cast::<u16>(),
            wide.len(),
        );
    }
    let mut result = IO_STATUS_BLOCK::default();
    status(unsafe {
        NtSetInformationFile(
            raw(file),
            &mut result,
            info.cast(),
            length as u32,
            FileLinkInformation,
        )
    })
}

const SECURITY: u32 = OWNER_SECURITY_INFORMATION
    | GROUP_SECURITY_INFORMATION
    | DACL_SECURITY_INFORMATION
    | LABEL_SECURITY_INFORMATION;

fn security(file: &cap_std::fs::File) -> io::Result<Vec<u8>> {
    let mut length = 0;
    unsafe {
        GetKernelObjectSecurity(raw(file), SECURITY, null_mut(), 0, &mut length);
    }
    if length == 0 {
        return Err(io::Error::last_os_error());
    }
    let mut bytes = vec![0u8; length as usize];
    if unsafe {
        GetKernelObjectSecurity(
            raw(file),
            SECURITY,
            bytes.as_mut_ptr().cast(),
            length,
            &mut length,
        )
    } == 0
    {
        return Err(io::Error::last_os_error());
    }
    bytes.truncate(length as usize);
    Ok(bytes)
}

#[derive(PartialEq, Eq)]
struct SecurityFingerprint {
    protected: bool,
    owner: Vec<u8>,
    group: Vec<u8>,
    dacl: (bool, Option<Vec<u8>>),
    label: (bool, Option<Vec<u8>>),
}

fn security_fingerprint(descriptor: &mut [u8]) -> io::Result<SecurityFingerprint> {
    use windows_sys::Win32::Security::{ACL, PSID};
    let descriptor = descriptor.as_mut_ptr().cast();
    let mut owner: PSID = null_mut();
    let mut group: PSID = null_mut();
    let mut dacl: *mut ACL = null_mut();
    let mut label: *mut ACL = null_mut();
    let mut dacl_present = 0;
    let mut label_present = 0;
    let mut defaulted = 0;
    let mut control = 0;
    let mut revision = 0;
    if unsafe {
        GetSecurityDescriptorOwner(descriptor, &mut owner, &mut defaulted) != 0
            && GetSecurityDescriptorGroup(descriptor, &mut group, &mut defaulted) != 0
            && GetSecurityDescriptorDacl(descriptor, &mut dacl_present, &mut dacl, &mut defaulted)
                != 0
            && GetSecurityDescriptorSacl(descriptor, &mut label_present, &mut label, &mut defaulted)
                != 0
            && GetSecurityDescriptorControl(descriptor, &mut control, &mut revision) != 0
    } == false
    {
        return Err(io::Error::last_os_error());
    }
    // Compare API-validated SID/ACL ranges, not self-relative layout offsets or incidental
    // AUTO_INHERITED bookkeeping. Null and absent ACLs remain distinct.
    let sid = |value: PSID| {
        if value.is_null() {
            Vec::new()
        } else {
            unsafe {
                std::slice::from_raw_parts(value.cast::<u8>(), GetLengthSid(value) as usize)
                    .to_vec()
            }
        }
    };
    let acl = |value: *mut ACL| {
        if value.is_null() {
            None
        } else {
            Some(unsafe {
                std::slice::from_raw_parts(value.cast::<u8>(), (*value).AclSize as usize).to_vec()
            })
        }
    };
    Ok(SecurityFingerprint {
        protected: control & SE_DACL_PROTECTED != 0,
        owner: sid(owner),
        group: sid(group),
        dacl: (dacl_present != 0, acl(dacl)),
        label: (label_present != 0, acl(label)),
    })
}

fn preserve_security(original: &cap_std::fs::File, stage: &cap_std::fs::File) -> io::Result<()> {
    let mut descriptor = security(original)?;
    let mut control = 0;
    let mut revision = 0;
    if unsafe {
        GetSecurityDescriptorControl(descriptor.as_mut_ptr().cast(), &mut control, &mut revision)
    } == 0
    {
        return Err(io::Error::last_os_error());
    }
    let protection = if control & SE_DACL_PROTECTED != 0 {
        PROTECTED_DACL_SECURITY_INFORMATION
    } else {
        UNPROTECTED_DACL_SECURITY_INFORMATION
    };
    if unsafe {
        SetKernelObjectSecurity(
            raw(stage),
            SECURITY | protection,
            descriptor.as_mut_ptr().cast(),
        )
    } == 0
    {
        return Err(io::Error::last_os_error());
    }
    // Do not accept an ACL conversion/inheritance change or concurrent ACL replacement.
    if security_fingerprint(&mut security(stage)?)? != security_fingerprint(&mut descriptor)?
        || security_fingerprint(&mut security(original)?)? != security_fingerprint(&mut descriptor)?
    {
        return Err(io::Error::new(
            io::ErrorKind::PermissionDenied,
            "Windows security descriptor changed during preservation",
        ));
    }
    Ok(())
}

fn create_file(directory: &Dir, name: &str) -> io::Result<cap_std::fs::File> {
    nt_open(
        directory,
        OsStr::new(name),
        FILE_ALL_ACCESS,
        FILE_SHARE_READ,
        FILE_CREATE,
        FILE_NON_DIRECTORY_FILE,
    )
}

fn write_json<T: Serialize>(
    directory: &Dir,
    name: &str,
    value: &T,
) -> OrgFilesystemResult<cap_std::fs::File> {
    let bytes = serde_json::to_vec(value)
        .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))?;
    let mut file = create_file(directory, name)?;
    file.write_all(&bytes)?;
    file.sync_all()?;
    Ok(file)
}

fn read_json<T: serde::de::DeserializeOwned>(
    file: &mut cap_std::fs::File,
    display: &str,
) -> OrgFilesystemResult<T> {
    use std::io::{Seek, SeekFrom};
    if file.metadata()?.len() > JOURNAL_LIMIT {
        return Err(conflict(display));
    }
    file.seek(SeekFrom::Start(0))?;
    let mut bytes = Vec::new();
    Read::by_ref(file)
        .take(JOURNAL_LIMIT + 1)
        .read_to_end(&mut bytes)?;
    if bytes.len() as u64 > JOURNAL_LIMIT {
        return Err(conflict(display));
    }
    serde_json::from_slice(&bytes).map_err(|_| conflict(display))
}

fn check_revision(
    actual: Option<&Object>,
    expected: Option<&str>,
    display: &str,
) -> OrgFilesystemResult<()> {
    let actual = actual
        .map(|value| value.revision.as_str())
        .unwrap_or("<missing>");
    if let Some(expected) = expected {
        if actual != expected {
            return Err(OrgFilesystemError::RevisionConflict {
                path: display.to_owned(),
                expected: expected.to_owned(),
                actual: actual.to_owned(),
            });
        }
    }
    Ok(())
}

fn prepare(
    parent: Parent,
    name: &OsStr,
    display: String,
    bytes: Option<&[u8]>,
    expected_revision: Option<&str>,
    expected_identity: Option<&LeafObservation>,
    document: bool,
) -> OrgFilesystemResult<Transaction> {
    let target = leaf_name(name)?;
    if expected_revision == Some("<missing>") && maybe_entry(&parent.directory, name)?.is_some() {
        return Err(OrgFilesystemError::CreationCollision(display));
    }
    let mut original = maybe_file(&parent.directory, name, true)?;
    let original_object = original
        .as_mut()
        .map(|file| {
            if document {
                document_object(file, &display)
            } else {
                object(file, &display)
            }
        })
        .transpose()?;
    check_revision(original_object.as_ref(), expected_revision, &display)?;
    if let Some(expected) = expected_identity {
        if original_object.as_ref().map(|item| item.identity) != expected.identity
            || original.as_ref().map(stamp).transpose()? != expected.stamp
        {
            return Err(OrgFilesystemError::InspectionChanged(display));
        }
    }
    if bytes.is_none() && original.is_none() {
        return Err(OrgFilesystemError::NotFound(display));
    }
    let directory_name = format!("{PREFIX}{}.tmp", uuid::Uuid::new_v4());
    let directory = directory(&parent.directory, OsStr::new(&directory_name), FILE_CREATE)?;
    let mut staged = if let Some(bytes) = bytes {
        let mut file = create_file(&directory, STAGE)?;
        if let Some(original) = original.as_ref() {
            preserve_security(original, &file)?;
        }
        file.write_all(bytes)?;
        file.sync_all()?;
        Some(file)
    } else {
        None
    };
    let staged_object = staged
        .as_mut()
        .map(|file| object(file, &display))
        .transpose()?;
    let journal = Journal {
        version: 1,
        directory_name,
        parent: identity(&parent.directory)?,
        directory: identity(&directory)?,
        target,
        kind: if bytes.is_some() {
            OrgOriginalRecoveryKind::Save
        } else {
            OrgOriginalRecoveryKind::Delete
        },
        original: original_object,
        staged: staged_object,
    };
    let journal_file = write_json(&directory, JOURNAL, &journal)?;
    Ok(Transaction {
        parent,
        directory,
        journal,
        journal_file,
        original,
        staged,
        display,
    })
}

fn capture(transaction: &mut Transaction) -> OrgFilesystemResult<()> {
    if let (Some(file), Some(expected)) = (
        transaction.original.as_mut(),
        transaction.journal.original.as_ref(),
    ) {
        require_object(file, expected, &transaction.display)?;
        require_entry(
            &transaction.parent.directory,
            OsStr::new(&transaction.journal.target),
            expected.identity,
            &transaction.display,
        )?;
        rename(file, &transaction.directory, OsStr::new(ORIGINAL))?;
        file.sync_all()?;
        require_entry(
            &transaction.directory,
            OsStr::new(ORIGINAL),
            expected.identity,
            &transaction.display,
        )?;
    }
    Ok(())
}

fn publish(transaction: &mut Transaction) -> OrgFilesystemResult<()> {
    if let (Some(file), Some(expected)) = (
        transaction.staged.as_mut(),
        transaction.journal.staged.as_ref(),
    ) {
        require_object(file, expected, &transaction.display)?;
        require_entry(
            &transaction.directory,
            OsStr::new(STAGE),
            expected.identity,
            &transaction.display,
        )?;
        link(
            file,
            &transaction.parent.directory,
            OsStr::new(&transaction.journal.target),
        )
        .map_err(|error| {
            if error.kind() == io::ErrorKind::AlreadyExists {
                OrgFilesystemError::TargetExists(transaction.display.clone())
            } else {
                OrgFilesystemError::Io(error)
            }
        })?;
        file.sync_all()?;
        require_entry(
            &transaction.parent.directory,
            OsStr::new(&transaction.journal.target),
            expected.identity,
            &transaction.display,
        )?;
    } else if maybe_entry(
        &transaction.parent.directory,
        OsStr::new(&transaction.journal.target),
    )?
    .is_some()
    {
        return Err(conflict(&transaction.display));
    }
    Ok(())
}

fn finish(transaction: &mut Transaction) -> OrgFilesystemResult<()> {
    if let (Some(file), Some(expected)) = (
        transaction.original.as_mut(),
        transaction.journal.original.as_ref(),
    ) {
        require_object(file, expected, &transaction.display)?;
        require_entry(
            &transaction.directory,
            OsStr::new(ORIGINAL),
            expected.identity,
            &transaction.display,
        )?;
    }
    if let (Some(file), Some(expected)) = (
        transaction.staged.as_mut(),
        transaction.journal.staged.as_ref(),
    ) {
        require_object(file, expected, &transaction.display)?;
        require_entry(
            &transaction.parent.directory,
            OsStr::new(&transaction.journal.target),
            expected.identity,
            &transaction.display,
        )?;
    }
    transaction.journal_file.sync_all()?;
    let completed = Completed {
        version: 1,
        directory: transaction.journal.directory,
        journal: object(&mut transaction.journal_file, &transaction.display)?,
    };
    write_json(&transaction.directory, COMPLETE, &completed)?;
    Ok(())
}

fn recovery_entry(
    transaction: &Transaction,
    relative_parent: &Path,
    object: OrgRecoveryObjectKind,
    leaf: &str,
) -> OrgFilesystemResult<OrgOriginalRecoveryEntry> {
    Ok(OrgOriginalRecoveryEntry {
        relative_path: portable_relative_path(
            &relative_parent
                .join(&transaction.journal.directory_name)
                .join(leaf),
        )?,
        source_relative_path: portable_relative_path(
            &relative_parent.join(&transaction.journal.target),
        )?,
        kind: transaction.journal.kind,
        object,
    })
}

fn execute(
    mut transaction: Transaction,
    relative_parent: &Path,
) -> OrgFilesystemResult<OrgWriteResult> {
    #[cfg(test)]
    test_hook(TestPoint::Prepared, &transaction)?;
    capture(&mut transaction)?;
    #[cfg(test)]
    test_hook(TestPoint::Captured, &transaction)?;
    publish(&mut transaction)?;
    #[cfg(test)]
    test_hook(TestPoint::Published, &transaction)?;
    finish(&mut transaction)?;
    Ok(OrgWriteResult {
        relative_path: transaction.display.clone(),
        revision: transaction
            .journal
            .staged
            .as_ref()
            .map(|value| value.revision.clone())
            .unwrap_or_else(|| "<missing>".to_owned()),
        original_recovery: Some(if transaction.original.is_some() {
            recovery_entry(
                &transaction,
                relative_parent,
                OrgRecoveryObjectKind::Original,
                ORIGINAL,
            )?
        } else {
            recovery_entry(
                &transaction,
                relative_parent,
                OrgRecoveryObjectKind::Staged,
                STAGE,
            )?
        }),
    })
}

pub(crate) fn observe_leaf(parent: &Dir, name: &OsStr) -> OrgFilesystemResult<LeafObservation> {
    let display = leaf_name(name)?;
    let parent = pin(parent)?;
    let mut file = maybe_file(&parent, name, false)?;
    let observed = file
        .as_mut()
        .map(|file| object(file, &display))
        .transpose()?;
    let stamp = file.as_ref().map(stamp).transpose()?;
    let retained = if let Some(expected) = observed.as_ref() {
        let retained = nt_open(
            &parent,
            name,
            FILE_READ_DATA | FILE_READ_ATTRIBUTES | READ_CONTROL,
            FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
            FILE_OPEN,
            FILE_NON_DIRECTORY_FILE,
        )?;
        if identity(&retained)? != expected.identity {
            return Err(OrgFilesystemError::InspectionChanged(display));
        }
        Some(std::sync::Arc::new(retained))
    } else {
        None
    };
    Ok(LeafObservation {
        identity: observed.as_ref().map(|value| value.identity),
        revision: observed.map(|value| value.revision),
        stamp,
        _retained: retained,
    })
}

pub(crate) fn publish_observed_leaf(
    parent: &Dir,
    name: &OsStr,
    bytes: &[u8],
    expected: &LeafObservation,
) -> OrgFilesystemResult<OrgWriteResult> {
    let _guard = lock_org_mutations()?;
    let display = leaf_name(name)?;
    let parent = Parent {
        directory: pin(parent)?,
        _ancestors: Vec::new(),
    };
    let expected_revision = expected.revision.as_deref().unwrap_or("<missing>");
    let transaction = prepare(
        parent,
        name,
        display,
        Some(bytes),
        Some(expected_revision),
        Some(expected),
        false,
    )?;
    execute(transaction, Path::new(""))
}

pub(super) fn write_document(
    root: &Dir,
    relative_path: &Path,
    content: &str,
    expected: Option<&str>,
) -> OrgFilesystemResult<OrgWriteResult> {
    let _guard = lock_org_mutations()?;
    let relative = validate_relative_org_path(relative_path)?;
    let display = portable_relative_path(&relative)?;
    let (parent, name) = resolve_parent(root, &relative, &display)?;
    let transaction = prepare(
        parent,
        &name,
        display,
        Some(content.as_bytes()),
        expected,
        None,
        true,
    )?;
    execute(transaction, relative.parent().unwrap_or(Path::new("")))
}

pub(super) fn read_document(root: &Dir, relative_path: &Path) -> OrgFilesystemResult<OrgDocument> {
    let relative = validate_relative_org_path(relative_path)?;
    let display = portable_relative_path(&relative)?;
    let (parent, name) =
        resolve_parent(root, &relative, &display).map_err(|error| match error {
            OrgFilesystemError::NotFound(path) => OrgFilesystemError::ProvenAbsent(path),
            other => other,
        })?;
    let file = open_file(&parent.directory, &name, false).map_err(|error| match error {
        OrgFilesystemError::Io(error) if error.kind() == io::ErrorKind::NotFound => {
            OrgFilesystemError::ProvenAbsent(display.clone())
        }
        other => other,
    })?;
    let content = read_open_file_utf8(file, &display)?;
    Ok(OrgDocument {
        relative_path: display,
        revision: revision(content.as_bytes()),
        content,
    })
}

pub(super) fn delete_document(
    root: &Dir,
    relative_path: &Path,
    expected: &str,
) -> OrgFilesystemResult<OrgOriginalRecoveryEntry> {
    let _guard = lock_org_mutations()?;
    let relative = validate_relative_org_path(relative_path)?;
    let display = portable_relative_path(&relative)?;
    let (parent, name) = resolve_parent(root, &relative, &display)?;
    let transaction = prepare(parent, &name, display, None, Some(expected), None, true)?;
    execute(transaction, relative.parent().unwrap_or(Path::new("")))?
        .original_recovery
        .ok_or_else(|| conflict("deleted original"))
}

pub(super) fn move_document(
    root: &Dir,
    source: &Path,
    target: &Path,
    expected: &str,
) -> OrgFilesystemResult<OrgWriteResult> {
    let _guard = lock_org_mutations()?;
    let source = validate_relative_org_path(source)?;
    let target = validate_relative_org_path(target)?;
    let source_display = portable_relative_path(&source)?;
    let target_display = portable_relative_path(&target)?;
    let (source_parent, source_name) = resolve_parent(root, &source, &source_display)?;
    let (target_parent, target_name) = resolve_parent(root, &target, &target_display)?;
    let mut file =
        open_file(&source_parent.directory, &source_name, true).map_err(|error| match error {
            OrgFilesystemError::Io(error) => map_not_found(error, &source_display),
            other => other,
        })?;
    let observed = document_object(&mut file, &source_display)?;
    check_revision(Some(&observed), Some(expected), &source_display)?;
    require_entry(
        &source_parent.directory,
        &source_name,
        observed.identity,
        &source_display,
    )?;
    // Case-only renames address the same entry, not another hard-link name. The kernel still
    // enforces no-replace publication after this observation.
    if source == target {
        return Ok(OrgWriteResult {
            relative_path: target_display,
            revision: observed.revision,
            original_recovery: None,
        });
    }
    if let Some(target_file) = maybe_entry(&target_parent.directory, &target_name)? {
        let source_wide: Vec<u16> = source_name.encode_wide().collect();
        let target_wide: Vec<u16> = target_name.encode_wide().collect();
        if identity(&target_file)? != observed.identity
            || !same_directory(&source_parent.directory, &target_parent.directory)?
            || !ordinal_equal(&source_wide, &target_wide)?
        {
            return Err(OrgFilesystemError::TargetExists(target_display));
        }
    }
    rename(&file, &target_parent.directory, &target_name).map_err(|error| {
        if error.kind() == io::ErrorKind::AlreadyExists {
            OrgFilesystemError::TargetExists(target_display.clone())
        } else {
            OrgFilesystemError::Io(error)
        }
    })?;
    file.sync_all()?;
    require_object(&mut file, &observed, &target_display)?;
    require_entry(
        &target_parent.directory,
        &target_name,
        observed.identity,
        &target_display,
    )?;
    Ok(OrgWriteResult {
        relative_path: target_display,
        revision: observed.revision,
        original_recovery: None,
    })
}

pub(super) fn create_directory(root: &Dir, relative_path: &Path) -> OrgFilesystemResult<()> {
    let _guard = lock_org_mutations()?;
    let relative = validate_relative_directory_path(relative_path)?;
    let mut held = vec![pin(root)?];
    for component in relative.components() {
        let Component::Normal(name) = component else {
            return Err(OrgFilesystemError::InvalidPath(
                relative.display().to_string(),
            ));
        };
        let next = directory(held.last().expect("root pinned"), name, FILE_OPEN_IF)?;
        require_long_leaf(&next, name)?;
        held.push(next);
    }
    Ok(())
}

fn load(parent: &Dir, directory_name: &OsStr, display: &str) -> OrgFilesystemResult<Transaction> {
    let directory_name_text = directory_name.to_str().ok_or_else(|| conflict(display))?;
    let uuid = directory_name_text
        .strip_prefix(PREFIX)
        .and_then(|name| name.strip_suffix(".tmp"))
        .ok_or_else(|| conflict(display))?;
    if uuid::Uuid::parse_str(uuid).is_err() {
        return Err(conflict(display));
    }
    let directory = directory(parent, directory_name, FILE_OPEN).map_err(|_| conflict(display))?;
    let mut journal_file =
        open_file(&directory, OsStr::new(JOURNAL), true).map_err(|_| conflict(display))?;
    let journal: Journal = read_json(&mut journal_file, display)?;
    if journal.version != 1
        || journal.directory_name != directory_name_text
        || journal.parent != identity(parent)?
        || journal.directory != identity(&directory)?
        || leaf_name(OsStr::new(&journal.target)).is_err()
        || (journal.kind == OrgOriginalRecoveryKind::Save) != journal.staged.is_some()
        || (journal.kind == OrgOriginalRecoveryKind::Delete && journal.original.is_none())
    {
        return Err(conflict(display));
    }
    for entry in directory.entries()? {
        let name = entry?.file_name();
        if ![
            OsStr::new(JOURNAL),
            OsStr::new(COMPLETE),
            OsStr::new(STAGE),
            OsStr::new(ORIGINAL),
        ]
        .contains(&name.as_os_str())
        {
            return Err(conflict(display));
        }
    }
    Ok(Transaction {
        parent: Parent {
            directory: parent.try_clone()?,
            _ancestors: Vec::new(),
        },
        directory,
        journal,
        journal_file,
        original: None,
        staged: None,
        display: display.to_owned(),
    })
}

fn completed(transaction: &mut Transaction) -> OrgFilesystemResult<bool> {
    let Some(mut file) = maybe_file(&transaction.directory, OsStr::new(COMPLETE), false)? else {
        return Ok(false);
    };
    let record: Completed = read_json(&mut file, &transaction.display)?;
    if record.version != 1 || record.directory != transaction.journal.directory {
        return Err(conflict(&transaction.display));
    }
    require_object(
        &mut transaction.journal_file,
        &record.journal,
        &transaction.display,
    )?;
    // Originals are deliberately mutable manual-recovery objects after successful resolution.
    // Do not compare live document revisions here: later saves/renames/deletions are legitimate.
    Ok(true)
}

fn recover_transaction(transaction: &mut Transaction) -> OrgFilesystemResult<()> {
    if completed(transaction)? {
        return Ok(());
    }
    let target = OsString::from(&transaction.journal.target);
    let live_identity = maybe_entry(&transaction.parent.directory, &target)?
        .map(|file| identity(&file))
        .transpose()?;
    if let Some(original) = transaction.journal.original.clone() {
        let retained = maybe_file(&transaction.directory, OsStr::new(ORIGINAL), true)?;
        if let Some(mut file) = retained {
            require_object(&mut file, &original, &transaction.display)?;
            if live_identity == Some(original.identity) {
                return Err(conflict(&transaction.display));
            }
            transaction.original = Some(file);
        } else if live_identity == Some(original.identity) {
            let mut file = open_file(&transaction.parent.directory, &target, true)?;
            require_object(&mut file, &original, &transaction.display)?;
            transaction.original = Some(file);
            capture(transaction)?;
        } else {
            return Err(conflict(&transaction.display));
        }
    } else if maybe_entry(&transaction.directory, OsStr::new(ORIGINAL))?.is_some() {
        return Err(conflict(&transaction.display));
    }
    if let Some(staged) = transaction.journal.staged.clone() {
        let mut file = maybe_file(&transaction.directory, OsStr::new(STAGE), true)?
            .ok_or_else(|| conflict(&transaction.display))?;
        require_object(&mut file, &staged, &transaction.display)?;
        let live = maybe_entry(&transaction.parent.directory, &target)?;
        if let Some(live) = live {
            // An interrupted publication may already have installed this exact stage link.
            if attributes(&live)? & FILE_ATTRIBUTE_REPARSE_POINT != 0
                || identity(&live)? != staged.identity
            {
                return Err(conflict(&transaction.display));
            }
            transaction.staged = Some(file);
        } else {
            transaction.staged = Some(file);
            publish(transaction)?;
        }
    } else if maybe_entry(&transaction.parent.directory, &target)?.is_some() {
        return Err(conflict(&transaction.display));
    }
    finish(transaction)
}

fn reserved(name: &OsStr) -> bool {
    name.to_string_lossy()
        .to_ascii_lowercase()
        .starts_with(".grain-")
}

fn transaction_name(name: &OsStr) -> bool {
    let name = name.to_string_lossy();
    name.starts_with(PREFIX) && name.ends_with(".tmp")
}

pub(super) fn recover(root: &Dir) -> OrgFilesystemResult<()> {
    let directory = pin(root)?;
    recover_directory(&directory, Path::new(""))
}

fn recover_directory(directory: &Dir, relative: &Path) -> OrgFilesystemResult<()> {
    for entry in directory.entries()? {
        let entry = entry?;
        let name = entry.file_name();
        let display = relative.join(&name).display().to_string();
        if transaction_name(&name) {
            let mut transaction = load(directory, &name, &display)?;
            recover_transaction(&mut transaction)?;
        } else if reserved(&name) {
            // Foreign Unix journals, migration trees and unrecognized retention formats are
            // never interpreted, migrated, removed, or treated as resolved.
            return Err(conflict(&display));
        } else {
            let Some(file) = maybe_entry(directory, &name)? else {
                continue;
            };
            let attrs = attributes(&file)?;
            if attrs & FILE_ATTRIBUTE_REPARSE_POINT == 0 && attrs & FILE_ATTRIBUTE_DIRECTORY != 0 {
                let child = open_directory(directory, &name)?;
                recover_directory(&child, &relative.join(name))?;
            }
        }
    }
    Ok(())
}

pub(super) fn scan(root: &Dir) -> OrgFilesystemResult<OrgWorkspaceSnapshot> {
    let directory = pin(root)?;
    let mut snapshot = OrgWorkspaceSnapshot {
        documents: Vec::new(),
        directories: Vec::new(),
        original_recoveries: Vec::new(),
    };
    scan_directory(&directory, Path::new(""), &mut snapshot)?;
    snapshot
        .documents
        .sort_by(|a, b| a.relative_path.cmp(&b.relative_path));
    snapshot.directories.sort();
    snapshot
        .original_recoveries
        .sort_by(|a, b| a.relative_path.cmp(&b.relative_path));
    Ok(snapshot)
}

fn scan_directory(
    directory: &Dir,
    relative: &Path,
    snapshot: &mut OrgWorkspaceSnapshot,
) -> OrgFilesystemResult<()> {
    for entry in directory.entries()? {
        let entry = entry?;
        let name = entry.file_name();
        let path = relative.join(&name);
        let display = portable_relative_path(&path)?;
        if transaction_name(&name) {
            let mut transaction = load(directory, &name, &display)?;
            let resolved = completed(&mut transaction)?;
            for (leaf, kind) in [
                (ORIGINAL, OrgRecoveryObjectKind::Original),
                (STAGE, OrgRecoveryObjectKind::Staged),
                (JOURNAL, OrgRecoveryObjectKind::Journal),
            ] {
                if (resolved && leaf == JOURNAL)
                    || (leaf == ORIGINAL && transaction.journal.original.is_none())
                {
                    continue;
                }
                if let Some(file) = maybe_entry(&transaction.directory, OsStr::new(leaf))? {
                    if attributes(&file)?
                        & (FILE_ATTRIBUTE_REPARSE_POINT | FILE_ATTRIBUTE_DIRECTORY)
                        != 0
                    {
                        return Err(conflict(&display));
                    }
                    snapshot.original_recoveries.push(recovery_entry(
                        &transaction,
                        relative,
                        kind,
                        leaf,
                    )?);
                }
            }
            continue;
        }
        if reserved(&name) {
            continue;
        }
        let Some(file) = maybe_entry(directory, &name)? else {
            continue;
        };
        let attrs = attributes(&file)?;
        if attrs & FILE_ATTRIBUTE_REPARSE_POINT != 0 {
            continue;
        }
        if attrs & FILE_ATTRIBUTE_DIRECTORY != 0 {
            if validate_relative_directory_path(&path).is_err() {
                continue;
            }
            let child = open_directory(directory, &name)?;
            snapshot.directories.push(display);
            scan_directory(&child, &path, snapshot)?;
        } else if path.extension() == Some(OsStr::new("org")) {
            let document = read_document(directory, Path::new(&name))?;
            snapshot.documents.push(OrgDocumentEntry {
                relative_path: display,
                revision: document.revision,
            });
        }
    }
    Ok(())
}

#[cfg(test)]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum TestPoint {
    Prepared,
    Captured,
    Published,
}

#[cfg(test)]
type TestAction = Box<dyn FnOnce(&Transaction) -> OrgFilesystemResult<()>>;

#[cfg(test)]
thread_local! {
    static TEST_HOOK: std::cell::RefCell<Option<(TestPoint, TestAction)>> = const { std::cell::RefCell::new(None) };
}

#[cfg(test)]
fn test_hook(point: TestPoint, transaction: &Transaction) -> OrgFilesystemResult<()> {
    let action = TEST_HOOK.with(|hook| {
        let mut hook = hook.borrow_mut();
        if hook
            .as_ref()
            .is_some_and(|(expected, _)| *expected == point)
        {
            hook.take().map(|(_, action)| action)
        } else {
            None
        }
    });
    if let Some(action) = action {
        action(transaction)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    const OLD: &str = "* 原文 🦀\r\nold\\literal\0tail\r\n";
    const NEW: &str = "* 更新 🌾\r\n正文 e\u{301} Ελληνικά\r\n\0end\r\n";

    fn with_hook<T>(point: TestPoint, action: TestAction, operation: impl FnOnce() -> T) -> T {
        struct Reset;
        impl Drop for Reset {
            fn drop(&mut self) {
                TEST_HOOK.with(|hook| *hook.borrow_mut() = None);
            }
        }
        TEST_HOOK.with(|hook| *hook.borrow_mut() = Some((point, action)));
        let _reset = Reset;
        operation()
    }

    fn interrupted<T>(
        point: TestPoint,
        operation: impl FnOnce() -> OrgFilesystemResult<T>,
    ) -> OrgFilesystemResult<T> {
        with_hook(
            point,
            Box::new(|_| {
                Err(io::Error::new(io::ErrorKind::Interrupted, "simulated process boundary").into())
            }),
            operation,
        )
    }

    fn active(root: &Dir) -> OsString {
        root.entries()
            .unwrap()
            .map(|entry| entry.unwrap().file_name())
            .find(|name| transaction_name(name) && !root.open_dir(name).unwrap().exists(COMPLETE))
            .expect("interrupted transaction")
    }

    #[test]
    fn windows_document_lifecycle_exact_bytes_revisions_and_reopen() {
        let workspace = tempdir().unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        create_org_directory_with_capability(&root, "资料/nested").unwrap();
        let created = write_org_document_with_capability(
            &root,
            "资料/nested/笔记.org",
            OLD,
            Some("<missing>"),
        )
        .unwrap();
        assert_eq!(created.revision, revision(OLD.as_bytes()));
        let creation_recovery = created.original_recovery.unwrap();
        assert_eq!(creation_recovery.object, OrgRecoveryObjectKind::Staged);
        assert_eq!(
            root.read(&creation_recovery.relative_path).unwrap(),
            OLD.as_bytes()
        );
        assert_eq!(
            read_org_document_with_capability(&root, "资料/nested/笔记.org")
                .unwrap()
                .content,
            OLD
        );
        let saved = write_org_document_with_capability(
            &root,
            "资料/nested/笔记.org",
            NEW,
            Some(&created.revision),
        )
        .unwrap();
        assert_ne!(saved.revision, created.revision);
        assert_eq!(
            root.read(saved.original_recovery.unwrap().relative_path)
                .unwrap(),
            OLD.as_bytes()
        );
        assert_eq!(root.read("资料/nested/笔记.org").unwrap(), NEW.as_bytes());
        assert!(matches!(
            write_org_document_with_capability(
                &root,
                "资料/nested/笔记.org",
                "stale",
                Some(&created.revision)
            ),
            Err(OrgFilesystemError::RevisionConflict { .. })
        ));
        let moved = move_org_document_with_capability(
            &root,
            "资料/nested/笔记.org",
            "资料/renamed.org",
            &saved.revision,
        )
        .unwrap();
        assert_eq!(moved.revision, saved.revision);
        assert!(!root.exists("资料/nested/笔记.org"));
        let deleted =
            delete_org_document_with_capability(&root, "资料/renamed.org", &moved.revision)
                .unwrap();
        assert_eq!(deleted.kind, OrgOriginalRecoveryKind::Delete);
        assert_eq!(root.read(&deleted.relative_path).unwrap(), NEW.as_bytes());
        assert!(matches!(
            read_org_document_with_capability(&root, "资料/renamed.org"),
            Err(OrgFilesystemError::ProvenAbsent(_))
        ));
        drop(root);
        let reopened = open_workspace_capability(workspace.path()).unwrap();
        recover_org_document_writes_with_capability(&reopened).unwrap();
        recover_org_document_writes_with_capability(&reopened).unwrap();
        let snapshot = scan_org_workspace_with_capability(&reopened).unwrap();
        assert!(snapshot.documents.is_empty());
        assert!(snapshot.original_recoveries.contains(&deleted));
    }

    #[test]
    fn windows_creation_occupied_targets_have_no_transaction_side_effects() {
        let workspace = tempdir().unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        root.write("occupied.org", b"\xff\r\nnot UTF8").unwrap();
        root.create_dir("directory.org").unwrap();
        for name in ["occupied.org", "OCCUPIED.org", "directory.org"] {
            assert!(matches!(
                write_org_document_with_capability(&root, name, NEW, Some("<missing>")),
                Err(OrgFilesystemError::CreationCollision(_))
            ));
        }
        assert!(matches!(
            write_org_document_with_capability(&root, "occupied.org", NEW, None),
            Err(OrgFilesystemError::InvalidUtf8(_))
        ));
        assert!(matches!(
            move_org_document_with_capability(
                &root,
                "occupied.org",
                "vacant.org",
                &revision(b"\xff\r\nnot UTF8")
            ),
            Err(OrgFilesystemError::InvalidUtf8(_))
        ));
        assert!(matches!(
            delete_org_document_with_capability(
                &root,
                "occupied.org",
                &revision(b"\xff\r\nnot UTF8")
            ),
            Err(OrgFilesystemError::InvalidUtf8(_))
        ));
        assert_eq!(root.entries().unwrap().count(), 2);
        assert_eq!(root.read("occupied.org").unwrap(), b"\xff\r\nnot UTF8");
    }

    #[test]
    fn windows_move_collisions_and_stale_revision_never_replace() {
        let workspace = tempdir().unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        root.write("source.org", OLD).unwrap();
        root.write("target.org", "destination").unwrap();
        root.create_dir("directory.org").unwrap();
        for target in ["target.org", "directory.org"] {
            assert!(matches!(
                move_org_document_with_capability(
                    &root,
                    "source.org",
                    target,
                    &revision(OLD.as_bytes())
                ),
                Err(OrgFilesystemError::TargetExists(_))
            ));
        }
        assert!(matches!(
            move_org_document_with_capability(&root, "source.org", "vacant.org", "stale"),
            Err(OrgFilesystemError::RevisionConflict { .. })
        ));
        assert_eq!(root.read("source.org").unwrap(), OLD.as_bytes());
        assert_eq!(root.read("target.org").unwrap(), b"destination");
        assert!(!root.exists("vacant.org"));
        assert_eq!(root.entries().unwrap().count(), 3);
        move_org_document_with_capability(
            &root,
            "source.org",
            "SOURCE.org",
            &revision(OLD.as_bytes()),
        )
        .unwrap();
        assert!(root
            .entries()
            .unwrap()
            .any(|entry| entry.unwrap().file_name() == OsStr::new("SOURCE.org")));
    }

    #[test]
    fn windows_unsafe_paths_and_metadata_aliases_are_rejected() {
        let workspace = tempdir().unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        for path in [
            "../outside.org",
            "C:/outside.org",
            "//server/share/a.org",
            "a\\b.org",
            "a//b.org",
            "./a.org",
            "a/../b.org",
            "a.org:stream",
            "a.org::$DATA",
            "NUL.org",
            "COM1.org",
            "COM¹.org",
            "LPT².org",
            "CON .org",
            "CONIN$.org",
            "space /a.org",
            "dot./a.org",
            "a.org.",
            "a.org ",
            "a\0.org",
            "a?.org",
            ".GRAIN-any.tmp/a.org",
            ".grain-win-write-spoof.tmp/a.org",
        ] {
            assert!(
                matches!(
                    write_org_document_with_capability(&root, path, NEW, Some("<missing>")),
                    Err(OrgFilesystemError::InvalidPath(_))
                ),
                "{path:?}"
            );
            assert!(
                matches!(
                    read_org_document_with_capability(&root, path),
                    Err(OrgFilesystemError::InvalidPath(_))
                ),
                "{path:?}"
            );
            assert!(
                matches!(
                    delete_org_document_with_capability(&root, path, "stale"),
                    Err(OrgFilesystemError::InvalidPath(_))
                ),
                "{path:?}"
            );
        }
        assert_eq!(root.entries().unwrap().count(), 0);
    }

    fn create_junction(root: &Dir, name: &str, target: &Path) {
        root.create_dir(name).unwrap();
        let file = nt_open(
            root,
            OsStr::new(name),
            FILE_ALL_ACCESS,
            FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
            FILE_OPEN,
            FILE_DIRECTORY_FILE,
        )
        .unwrap();
        let target = target.to_str().unwrap();
        let substitute = format!("\\??\\{}", target.strip_prefix("\\\\?\\").unwrap_or(target));
        let substitute: Vec<u16> = OsStr::new(&substitute).encode_wide().collect();
        let print: Vec<u16> = OsStr::new(target).encode_wide().collect();
        let mut bytes = Vec::new();
        bytes.extend_from_slice(&0xa0000003u32.to_le_bytes()); // IO_REPARSE_TAG_MOUNT_POINT
        bytes.extend_from_slice(
            &((8 + (substitute.len() + print.len() + 2) * 2) as u16).to_le_bytes(),
        );
        bytes.extend_from_slice(&0u16.to_le_bytes());
        bytes.extend_from_slice(&0u16.to_le_bytes());
        bytes.extend_from_slice(&((substitute.len() * 2) as u16).to_le_bytes());
        bytes.extend_from_slice(&(((substitute.len() + 1) * 2) as u16).to_le_bytes());
        bytes.extend_from_slice(&((print.len() * 2) as u16).to_le_bytes());
        for unit in substitute.into_iter().chain([0]).chain(print).chain([0]) {
            bytes.extend_from_slice(&unit.to_le_bytes());
        }
        let mut returned = 0;
        assert_ne!(
            unsafe {
                windows_sys::Win32::System::IO::DeviceIoControl(
                    raw(&file),
                    0x000900a4,
                    bytes.as_ptr().cast(),
                    bytes.len() as u32,
                    null_mut(),
                    0,
                    &mut returned,
                    null_mut(),
                )
            },
            0,
            "{}",
            io::Error::last_os_error()
        );
    }

    #[test]
    fn windows_reparse_junction_is_never_traversed() {
        let workspace = tempdir().unwrap();
        let outside = tempdir().unwrap();
        std::fs::write(outside.path().join("outside.org"), OLD).unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        create_junction(&root, "junction", outside.path());
        assert!(read_org_document_with_capability(&root, "junction/outside.org").is_err());
        assert!(
            write_org_document_with_capability(&root, "junction/outside.org", NEW, None).is_err()
        );
        assert!(create_org_directory_with_capability(&root, "junction/nested").is_err());
        assert!(delete_org_document_with_capability(
            &root,
            "junction/outside.org",
            &revision(OLD.as_bytes())
        )
        .is_err());
        root.write("source.org", NEW).unwrap();
        assert!(move_org_document_with_capability(
            &root,
            "source.org",
            "junction/moved.org",
            &revision(NEW.as_bytes())
        )
        .is_err());
        assert_eq!(
            std::fs::read(outside.path().join("outside.org")).unwrap(),
            OLD.as_bytes()
        );
        let snapshot = scan_org_workspace_with_capability(&root).unwrap();
        assert_eq!(snapshot.documents.len(), 1);
        assert!(!snapshot.directories.contains(&"junction".to_owned()));
    }

    #[test]
    fn windows_pinned_handles_block_source_and_ancestor_identity_swaps() {
        let workspace = tempdir().unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        root.create_dir("parent").unwrap();
        root.write("parent/source.org", OLD).unwrap();
        let path = workspace.path().to_path_buf();
        let receipt = with_hook(
            TestPoint::Prepared,
            Box::new(move |_| {
                assert!(std::fs::rename(
                    path.join("parent/source.org"),
                    path.join("exchanged.org")
                )
                .is_err());
                assert!(
                    std::fs::rename(path.join("parent"), path.join("exchanged-parent")).is_err()
                );
                assert!(std::fs::write(path.join("parent/source.org"), b"racing bytes").is_err());
                Ok(())
            }),
            || {
                write_org_document_with_capability(
                    &root,
                    "parent/source.org",
                    NEW,
                    Some(&revision(OLD.as_bytes())),
                )
            },
        )
        .unwrap();
        assert_eq!(root.read("parent/source.org").unwrap(), NEW.as_bytes());
        assert_eq!(
            root.read(receipt.original_recovery.unwrap().relative_path)
                .unwrap(),
            OLD.as_bytes()
        );
    }

    #[test]
    fn windows_acl_owner_group_protection_and_label_are_preserved() {
        use windows_sys::Win32::Security::Authorization::ConvertStringSecurityDescriptorToSecurityDescriptorW;
        let workspace = tempdir().unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        root.write("acl.org", OLD).unwrap();
        let source = nt_open(
            &root,
            OsStr::new("acl.org"),
            FILE_ALL_ACCESS,
            FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
            FILE_OPEN,
            FILE_NON_DIRECTORY_FILE,
        )
        .unwrap();
        let sddl: Vec<u16> = "D:P(A;;FA;;;OW)(A;;FR;;;WD)"
            .encode_utf16()
            .chain([0])
            .collect();
        let mut descriptor = null_mut();
        assert_ne!(
            unsafe {
                ConvertStringSecurityDescriptorToSecurityDescriptorW(
                    sddl.as_ptr(),
                    1,
                    &mut descriptor,
                    null_mut(),
                )
            },
            0
        );
        let applied = unsafe {
            SetKernelObjectSecurity(
                raw(&source),
                DACL_SECURITY_INFORMATION | PROTECTED_DACL_SECURITY_INFORMATION,
                descriptor,
            )
        };
        unsafe {
            windows_sys::Win32::Foundation::LocalFree(descriptor);
        }
        assert_ne!(applied, 0, "{}", io::Error::last_os_error());
        let mut before = security(&source).unwrap();
        drop(source);
        let saved = write_org_document_with_capability(
            &root,
            "acl.org",
            NEW,
            Some(&revision(OLD.as_bytes())),
        )
        .unwrap();
        let current = open_file(&root, OsStr::new("acl.org"), false).unwrap();
        let mut after = security(&current).unwrap();
        assert!(
            security_fingerprint(&mut before).unwrap() == security_fingerprint(&mut after).unwrap()
        );
        assert!(security_fingerprint(&mut after).unwrap().protected);
        assert_eq!(
            root.read(saved.original_recovery.unwrap().relative_path)
                .unwrap(),
            OLD.as_bytes()
        );
    }

    #[test]
    fn windows_interrupted_save_recovers_every_publication_boundary_and_reopens() {
        for point in [
            TestPoint::Prepared,
            TestPoint::Captured,
            TestPoint::Published,
        ] {
            let workspace = tempdir().unwrap();
            let root = open_workspace_capability(workspace.path()).unwrap();
            root.write("notes.org", OLD).unwrap();
            assert!(interrupted(point, || write_org_document_with_capability(
                &root,
                "notes.org",
                NEW,
                Some(&revision(OLD.as_bytes()))
            ))
            .is_err());
            let retained = active(&root);
            drop(root);
            let reopened = open_workspace_capability(workspace.path()).unwrap();
            recover_org_document_writes_with_capability(&reopened).unwrap();
            recover_org_document_writes_with_capability(&reopened).unwrap();
            assert_eq!(
                read_org_document_with_capability(&reopened, "notes.org")
                    .unwrap()
                    .content,
                NEW
            );
            assert_eq!(
                reopened.read(Path::new(&retained).join(ORIGINAL)).unwrap(),
                OLD.as_bytes()
            );
            assert_eq!(
                reopened.read(Path::new(&retained).join(STAGE)).unwrap(),
                NEW.as_bytes()
            );
            assert_eq!(
                scan_org_workspace_with_capability(&reopened)
                    .unwrap()
                    .documents
                    .len(),
                1
            );
        }
    }

    #[test]
    fn windows_interrupted_creation_retains_stage_and_reopens() {
        for point in [
            TestPoint::Prepared,
            TestPoint::Captured,
            TestPoint::Published,
        ] {
            let workspace = tempdir().unwrap();
            let root = open_workspace_capability(workspace.path()).unwrap();
            assert!(interrupted(point, || write_org_document_with_capability(
                &root,
                "new.org",
                NEW,
                Some("<missing>")
            ))
            .is_err());
            let retained = active(&root);
            recover_org_document_writes_with_capability(&root).unwrap();
            assert_eq!(
                root.read(Path::new(&retained).join(STAGE)).unwrap(),
                NEW.as_bytes()
            );
            assert_eq!(
                read_org_document_with_capability(&root, "new.org")
                    .unwrap()
                    .revision,
                revision(NEW.as_bytes())
            );
            assert!(scan_org_workspace_with_capability(&root)
                .unwrap()
                .original_recoveries
                .iter()
                .any(|entry| entry.object == OrgRecoveryObjectKind::Staged));
        }
    }

    #[test]
    fn windows_interrupted_delete_retains_original_and_reopens() {
        for point in [
            TestPoint::Prepared,
            TestPoint::Captured,
            TestPoint::Published,
        ] {
            let workspace = tempdir().unwrap();
            let root = open_workspace_capability(workspace.path()).unwrap();
            root.write("notes.org", OLD).unwrap();
            assert!(interrupted(point, || delete_org_document_with_capability(
                &root,
                "notes.org",
                &revision(OLD.as_bytes())
            ))
            .is_err());
            let retained = active(&root);
            recover_org_document_writes_with_capability(&root).unwrap();
            assert!(!root.exists("notes.org"));
            assert_eq!(
                root.read(Path::new(&retained).join(ORIGINAL)).unwrap(),
                OLD.as_bytes()
            );
            assert!(scan_org_workspace_with_capability(&root)
                .unwrap()
                .original_recoveries
                .iter()
                .any(|entry| entry.kind == OrgOriginalRecoveryKind::Delete));
        }
    }

    #[test]
    fn windows_late_collision_retains_all_bytes_and_recovery_never_clobbers_foreign_entry() {
        let workspace = tempdir().unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        root.write("notes.org", OLD).unwrap();
        let path = workspace.path().join("notes.org");
        let result = with_hook(
            TestPoint::Captured,
            Box::new(move |_| {
                std::fs::write(&path, b"foreign destination\r\n")?;
                Ok(())
            }),
            || {
                write_org_document_with_capability(
                    &root,
                    "notes.org",
                    NEW,
                    Some(&revision(OLD.as_bytes())),
                )
            },
        );
        assert!(matches!(result, Err(OrgFilesystemError::TargetExists(_))));
        let retained = active(&root);
        assert!(matches!(
            recover_org_document_writes_with_capability(&root),
            Err(OrgFilesystemError::WriteRecoveryConflict(_))
        ));
        assert_eq!(root.read("notes.org").unwrap(), b"foreign destination\r\n");
        assert_eq!(
            root.read(Path::new(&retained).join(ORIGINAL)).unwrap(),
            OLD.as_bytes()
        );
        assert_eq!(
            root.read(Path::new(&retained).join(STAGE)).unwrap(),
            NEW.as_bytes()
        );
        assert!(root.exists(Path::new(&retained).join(JOURNAL)));
    }

    #[test]
    fn windows_recovery_rejects_swapped_transaction_directory_identity() {
        let workspace = tempdir().unwrap();
        let evidence = tempdir().unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        root.write("notes.org", OLD).unwrap();
        assert!(
            interrupted(TestPoint::Prepared, || write_org_document_with_capability(
                &root,
                "notes.org",
                NEW,
                None
            ))
            .is_err()
        );
        let retained = active(&root);
        let original = evidence.path().join("retained");
        std::fs::rename(workspace.path().join(&retained), &original).unwrap();
        root.create_dir(&retained).unwrap();
        std::fs::copy(
            original.join(JOURNAL),
            workspace.path().join(&retained).join(JOURNAL),
        )
        .unwrap();
        std::fs::copy(
            original.join(STAGE),
            workspace.path().join(&retained).join(STAGE),
        )
        .unwrap();
        assert!(matches!(
            recover_org_document_writes_with_capability(&root),
            Err(OrgFilesystemError::WriteRecoveryConflict(_))
        ));
        assert_eq!(root.read("notes.org").unwrap(), OLD.as_bytes());
        assert_eq!(std::fs::read(original.join(STAGE)).unwrap(), NEW.as_bytes());
        assert_eq!(
            root.read(Path::new(&retained).join(STAGE)).unwrap(),
            NEW.as_bytes()
        );
    }

    #[test]
    fn windows_recovery_rejects_changed_stage_without_deleting_evidence() {
        let workspace = tempdir().unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        root.write("notes.org", OLD).unwrap();
        assert!(
            interrupted(TestPoint::Captured, || write_org_document_with_capability(
                &root,
                "notes.org",
                NEW,
                None
            ))
            .is_err()
        );
        let retained = active(&root);
        root.write(Path::new(&retained).join(STAGE), "externally changed stage")
            .unwrap();
        assert!(matches!(
            recover_org_document_writes_with_capability(&root),
            Err(OrgFilesystemError::WriteRecoveryConflict(_))
        ));
        assert!(!root.exists("notes.org"));
        assert_eq!(
            root.read(Path::new(&retained).join(ORIGINAL)).unwrap(),
            OLD.as_bytes()
        );
        assert_eq!(
            root.read(Path::new(&retained).join(STAGE)).unwrap(),
            b"externally changed stage"
        );
    }

    #[test]
    fn windows_completed_recoveries_allow_later_manual_edits_and_document_revisions() {
        let workspace = tempdir().unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        root.write("notes.org", OLD).unwrap();
        let saved = write_org_document_with_capability(&root, "notes.org", NEW, None).unwrap();
        let original = saved.original_recovery.unwrap();
        root.write(&original.relative_path, "manual recovery edit\r\n")
            .unwrap();
        root.write("notes.org", "external live edit\r\n").unwrap();
        recover_org_document_writes_with_capability(&root).unwrap();
        assert_eq!(
            read_org_document_with_capability(&root, "notes.org")
                .unwrap()
                .content,
            "external live edit\r\n"
        );
        let snapshot = scan_org_workspace_with_capability(&root).unwrap();
        assert!(snapshot.original_recoveries.contains(&original));
        assert_eq!(
            root.read(&original.relative_path).unwrap(),
            b"manual recovery edit\r\n"
        );
    }

    #[test]
    fn windows_leaf_selection_detects_same_bytes_object_swap_and_retains_new_bytes() {
        let workspace = tempdir().unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        root.write("export.md", OLD).unwrap();
        let selected = observe_leaf(&root, OsStr::new("export.md")).unwrap();
        root.rename("export.md", &root, "old-export.md").unwrap();
        root.write("export.md", OLD).unwrap();
        assert!(matches!(
            publish_observed_leaf(&root, OsStr::new("export.md"), NEW.as_bytes(), &selected),
            Err(OrgFilesystemError::InspectionChanged(_))
        ));
        assert_eq!(root.read("export.md").unwrap(), OLD.as_bytes());
        let missing = observe_leaf(&root, OsStr::new("new.html")).unwrap();
        let created =
            publish_observed_leaf(&root, OsStr::new("new.html"), NEW.as_bytes(), &missing).unwrap();
        let recovery = created.original_recovery.unwrap();
        assert_eq!(recovery.object, OrgRecoveryObjectKind::Staged);
        assert_eq!(root.read(recovery.relative_path).unwrap(), NEW.as_bytes());
        assert_eq!(root.read("new.html").unwrap(), NEW.as_bytes());
        recover_org_document_writes_with_capability(&root).unwrap();
        assert!(scan_org_workspace_with_capability(&root)
            .unwrap()
            .documents
            .is_empty());
    }

    #[test]
    fn windows_leaf_selection_detects_same_bytes_timestamp_transition() {
        use windows_sys::Win32::Storage::FileSystem::SetFileInformationByHandle;
        let workspace = tempdir().unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        root.write("export.md", OLD).unwrap();
        let selected = observe_leaf(&root, OsStr::new("export.md")).unwrap();
        let file = nt_open(
            &root,
            OsStr::new("export.md"),
            FILE_ALL_ACCESS,
            FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
            FILE_OPEN,
            FILE_NON_DIRECTORY_FILE,
        )
        .unwrap();
        let mut info = FILE_BASIC_INFO::default();
        info.LastWriteTime = selected.stamp.unwrap().write + 10_000_000;
        assert_ne!(
            unsafe {
                SetFileInformationByHandle(
                    raw(&file),
                    FileBasicInfo,
                    (&info as *const FILE_BASIC_INFO).cast(),
                    size_of::<FILE_BASIC_INFO>() as u32,
                )
            },
            0
        );
        drop(file);
        assert!(matches!(
            publish_observed_leaf(&root, OsStr::new("export.md"), NEW.as_bytes(), &selected),
            Err(OrgFilesystemError::InspectionChanged(_))
        ));
        assert_eq!(root.read("export.md").unwrap(), OLD.as_bytes());
    }

    #[test]
    fn windows_directory_identity_uses_objects_not_path_spelling() {
        let workspace = tempdir().unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        root.create_dir("one").unwrap();
        root.create_dir("two").unwrap();
        // Unlike publication ancestors, this observation deliberately permits a real rename.
        let first = Dir::from_std_file(
            nt_open(
                &root,
                OsStr::new("one"),
                FILE_LIST_DIRECTORY | FILE_TRAVERSE | FILE_READ_ATTRIBUTES,
                FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
                FILE_OPEN,
                FILE_DIRECTORY_FILE,
            )
            .unwrap()
            .into_std(),
        );
        let second = root.open_dir("two").unwrap();
        assert!(same_directory(&first, &first.try_clone().unwrap()).unwrap());
        assert!(!same_directory(&first, &second).unwrap());
        root.rename("one", &root, "renamed").unwrap();
        assert!(same_directory(&first, &root.open_dir("renamed").unwrap()).unwrap());
    }

    #[test]
    fn windows_foreign_unix_journals_fail_closed_without_modification() {
        let workspace = tempdir().unwrap();
        let root = open_workspace_capability(workspace.path()).unwrap();
        root.create_dir(".grain-write-foreign.tmp").unwrap();
        let foreign = root.open_dir(".grain-write-foreign.tmp").unwrap();
        foreign.write(JOURNAL, "foreign journal").unwrap();
        foreign.write(ORIGINAL, OLD).unwrap();
        assert!(matches!(
            recover_org_document_writes_with_capability(&root),
            Err(OrgFilesystemError::WriteRecoveryConflict(_))
        ));
        assert_eq!(foreign.read(JOURNAL).unwrap(), b"foreign journal");
        assert_eq!(foreign.read(ORIGINAL).unwrap(), OLD.as_bytes());
    }
}
