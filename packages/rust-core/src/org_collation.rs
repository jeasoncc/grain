//! Data-only, case-sensitive native collation for GNU Org relational matches.
//! Linux/macOS use the installed POSIX libc and its locale data, not Intl/ICU.
//! The collation locale is the first nonempty LC_ALL, LC_COLLATE, LANG, or C.
//! LC_CTYPE is scoped to that same locale, as in GNU's wcscoll_l binding.
//! Input is decoded to Unicode code points, not locale-encoded strcoll bytes;
//! neither the process locale nor the calling thread's locale is changed.
//! Characters after the first NUL do not participate in GNU's native comparator.
//! Results contain indices only: no strings, source bodies, paths, or query code.
//! Native locale tables differ across OS/libc versions; this is not a portable
//! Unicode ordering, an exact-string equality predicate, or ignore-case sorting.
//! Windows/other targets are explicitly unsupported: no GNU comparator binding
//! is available here, and substituting another platform's comparator is unsound.

use serde::Serialize;

/// Dense native collation ranks aligned with original input indices.
/// Semantically collating-equal strings share a rank; no input strings are returned.
#[derive(Debug, PartialEq, Eq, Serialize)]
pub struct OrgCollationSnapshot {
    pub locale: String,
    pub ranks: Vec<usize>,
}

pub fn collate_org_match_strings(strings: Vec<String>) -> Result<OrgCollationSnapshot, String> {
    #[cfg(any(target_os = "linux", target_os = "macos"))]
    {
        let locale = environment_locale()?;
        platform::collate(strings, locale)
    }
    #[cfg(not(any(target_os = "linux", target_os = "macos")))]
    {
        drop(strings);
        Err("Native GNU Org collation is unsupported on this platform; Linux/macOS POSIX locale collation is required".into())
    }
}

#[cfg(any(target_os = "linux", target_os = "macos"))]
fn resolve_locale(
    mut variable: impl FnMut(&str) -> Result<Option<String>, String>,
) -> Result<String, String> {
    for name in ["LC_ALL", "LC_COLLATE", "LANG"] {
        if let Some(value) = variable(name)? {
            if !value.is_empty() {
                return Ok(value);
            }
        }
    }
    Ok("C".into())
}

#[cfg(any(target_os = "linux", target_os = "macos"))]
fn environment_locale() -> Result<String, String> {
    resolve_locale(|name| match std::env::var(name) {
        Ok(value) => Ok(Some(value)),
        Err(std::env::VarError::NotPresent) => Ok(None),
        Err(std::env::VarError::NotUnicode(_)) => {
            Err(format!("Native Org collation locale variable {name} is not UTF-8"))
        }
    })
}

#[cfg(any(target_os = "linux", target_os = "macos"))]
mod platform {
    use super::OrgCollationSnapshot;
    use std::cmp::Ordering;
    use std::ffi::CString;

    // GNU src/sysdep.c:str_collate decodes code points then calls wcscoll_l.
    // libc 0.2.190 omits this binding on these targets; signatures are declared
    // in glibc /usr/include/wchar.h and Apple's include/xlocale/_wchar.h.
    unsafe extern "C" {
        fn wcscoll_l(
            left: *const libc::wchar_t,
            right: *const libc::wchar_t,
            locale: libc::locale_t,
        ) -> libc::c_int;
    }

    struct Locale(libc::locale_t);

    impl Drop for Locale {
        fn drop(&mut self) {
            // SAFETY: newlocale created this non-null, exclusively owned handle.
            // macOS returns int, Linux void; neither return value is needed.
            unsafe { libc::freelocale(self.0); }
        }
    }

    impl Locale {
        fn new(name: &str) -> Result<Self, String> {
            let c_name = CString::new(name)
                .map_err(|_| "Native Org collation locale contains NUL".to_string())?;
            // SAFETY: c_name is terminated; null base creates an independent
            // locale. libc supplies the platform-specific category mask values.
            let handle = unsafe {
                libc::newlocale(
                    libc::LC_COLLATE_MASK | libc::LC_CTYPE_MASK,
                    c_name.as_ptr(),
                    std::ptr::null_mut(),
                )
            };
            if handle.is_null() {
                return Err(format!(
                    "Native Org collation locale {name:?} is unavailable: {}",
                    std::io::Error::last_os_error(),
                ));
            }
            let locale = Self(handle);
            Ok(locale)
        }

        fn compare(&self, left: &[libc::wchar_t], right: &[libc::wchar_t]) -> Result<Ordering, String> {
            // SAFETY: each slice starts at a zero-terminated sequence in the
            // owned wide arena; its handle is live/private and errno is local.
            let (result, error) = unsafe {
                #[cfg(target_os = "linux")]
                let errno = libc::__errno_location();
                #[cfg(target_os = "macos")]
                let errno = libc::__error();
                *errno = 0;
                let result = wcscoll_l(left.as_ptr(), right.as_ptr(), self.0);
                (result, *errno)
            };
            if error != 0 {
                return Err(format!(
                    "Native Org string collation failed: {}",
                    std::io::Error::from_raw_os_error(error),
                ));
            }
            Ok(result.cmp(&0))
        }
    }

    // Fallible in-place heapsort: libc collation errors propagate without using
    // an inconsistent substitute comparator or allocating collation-key copies.
    fn sift_down(
        indices: &mut [(usize, usize)],
        mut root: usize,
        end: usize,
        strings: &[libc::wchar_t],
        locale: &Locale,
    ) -> Result<(), String> {
        while root < end / 2 {
            let mut child = root * 2 + 1;
            let compare = |left: (usize, usize), right: (usize, usize)| -> Result<Ordering, String> {
                locale.compare(&strings[left.0..], &strings[right.0..])
            };
            if child + 1 < end && compare(indices[child], indices[child + 1])? == Ordering::Less {
                child += 1;
            }
            if compare(indices[root], indices[child])? != Ordering::Less {
                break;
            }
            indices.swap(root, child);
            root = child;
        }
        Ok(())
    }

    pub(super) fn collate(
        strings: Vec<String>,
        name: String,
    ) -> Result<OrgCollationSnapshot, String> {
        // Resolve even empty input: an unavailable locale must not appear usable.
        let locale = Locale::new(&name)?;
        let count = strings.len();
        // Count UTF-8 leading bytes, stopping at NUL, without decoding twice.
        // One exact arena avoids one native-string allocation per value.
        let characters = strings.iter().map(|string|
            string.as_bytes().iter().take_while(|byte| **byte != 0)
                .filter(|byte| **byte & 0xc0 != 0x80).count() + 1).sum();
        let mut wide = Vec::with_capacity(characters);
        let mut indices = Vec::with_capacity(count);
        for (index, string) in strings.into_iter().enumerate() {
            indices.push((wide.len(), index));
            wide.extend(string.chars().take_while(|character| *character != '\0')
                .map(|character| character as libc::wchar_t));
            wide.push(0);
        }
        for root in (0..indices.len() / 2).rev() {
            let end = indices.len();
            sift_down(&mut indices, root, end, &wide, &locale)?;
        }
        for end in (1..indices.len()).rev() {
            indices.swap(0, end);
            sift_down(&mut indices, 0, end, &wide, &locale)?;
        }
        let mut ranks = vec![0; count];
        let mut previous: Option<usize> = None;
        let mut rank = 0;
        for (start, index) in indices {
            if let Some(last) = previous {
                if locale.compare(&wide[last..], &wide[start..])? != Ordering::Equal {
                    rank += 1;
                }
            }
            ranks[index] = rank;
            previous = Some(start);
        }
        Ok(OrgCollationSnapshot { locale: name, ranks })
    }
}

#[cfg(all(test, any(target_os = "linux", target_os = "macos")))]
mod tests {
    use super::*;

    fn in_locale(strings: &[&str], locale: &str) -> OrgCollationSnapshot {
        platform::collate(strings.iter().map(|value| (*value).into()).collect(), locale.into())
            .expect("owned test fixture locale must be available")
    }

    #[test]
    fn locale_precedence_empty_values_and_default() {
        let cases = [
            ([Some("C"), Some("POSIX"), Some("unused")], "C"),
            ([Some(""), Some("POSIX"), Some("unused")], "POSIX"),
            ([None, Some(""), Some("C")], "C"),
            ([Some(""), None, Some("")], "C"),
            ([None, None, None], "C"),
        ];
        for (values, expected) in cases {
            let result = resolve_locale(|key| {
                let index = ["LC_ALL", "LC_COLLATE", "LANG"].iter().position(|name| *name == key).unwrap();
                Ok(values[index].map(str::to_string))
            }).unwrap();
            assert_eq!(result, expected);
        }
        assert!(resolve_locale(|_| Err("invalid locale encoding".into())).is_err());
    }

    #[test]
    fn empty_singleton_duplicates_and_body_free_results() {
        assert_eq!(in_locale(&[], "C").ranks, Vec::<usize>::new());
        assert_eq!(in_locale(&["only"], "C").ranks, vec![0]);
        let snapshot = in_locale(&["secret-fixture", "", "secret-fixture", "a"], "C");
        assert_eq!(snapshot.ranks, vec![2, 0, 2, 1]);
        assert!(!serde_json::to_string(&snapshot).unwrap().contains("secret-fixture"));
        assert_eq!(in_locale(&["b", "a"], "POSIX").ranks, vec![1, 0]);
    }

    #[test]
    fn nul_ends_comparison_not_index_identity() {
        let snapshot = in_locale(&["a\0b", "a\0c", "a", "\0suffix", "", "b", "a\0\0"], "C");
        assert_eq!(snapshot.ranks, vec![1, 1, 1, 0, 0, 2, 1]);
    }

    #[test]
    fn unavailable_and_invalid_locales_are_errors_even_for_empty_input() {
        let error = platform::collate(vec![], "grain_nonexistent_locale_937410.UTF-8".into()).unwrap_err();
        assert!(error.contains("unavailable"), "{error}");
        assert!(platform::collate(vec![], "C\0UTF-8".into()).unwrap_err().contains("NUL"));
    }

    #[test]
    fn heap_boundaries_preserve_input_aligned_semantic_ranks() {
        for length in 0..=65 {
            let strings: Vec<String> = (0..length).rev().map(|value| format!("{:02}", value / 3)).collect();
            let expected: Vec<usize> = (0..length).rev().map(|value| value / 3).collect();
            let snapshot = platform::collate(strings, "C".into()).unwrap();
            assert_eq!(snapshot.ranks, expected, "length {length}");
        }
    }

    #[test]
    fn large_values_have_no_arbitrary_size_cap() {
        let prefix = "é".repeat(1_048_577);
        let strings = vec![format!("{prefix}z"), format!("{prefix}a"), format!("{prefix}a\0ignored")];
        assert_eq!(platform::collate(strings, "C".into()).unwrap().ranks, vec![1, 0, 0]);
    }

    // Independent trusted driver: fixed Lisp only, owned strings passed as JSON
    // on stdin, never interpolated into executable Lisp or loaded from user files.
    // Expected pair relations come from GNU, not handwritten Unicode rules.
    const GNU_FIXTURE_DRIVER: &str = r#"
(progn
  (require 'json)
  (require 'org)
  (let* ((fixture (json-parse-string (read-string "") :object-type 'alist :array-type 'array))
         (strings (alist-get 'strings fixture))
         (locale (alist-get 'locale fixture))
         (count (length strings)) rows)
    (dotimes (left count)
      (dotimes (right count)
        (push (cond ((string-collate-lessp (aref strings left) (aref strings right) locale) -1)
                    ((string-collate-lessp (aref strings right) (aref strings left) locale) 1)
                    (t 0)) rows)))
    (princ (json-serialize
            `((emacsVersion . ,emacs-version) (orgVersion . ,(org-version))
              (locale . ,locale) (relations . ,(vconcat (nreverse rows))))))))
"#;

    #[test]
    #[ignore = "requires installed GNU Emacs/Org; run explicitly as a trusted native oracle"]
    fn trusted_gnu_fixture_driver_matches_all_pair_relations() {
        use std::io::Write;
        use std::process::{Command, Stdio};
        let strings = [
            "", "a", "A", "ä", "z", "é", "e\u{301}", "😀", "\u{e000}", "𐐀",
            "Å", "Å", "a_b", "a-b", "ab", "a2", "a10", "a b", "a.b", "٢", "²",
            "a\0b", "a\0c", "\0suffix", "\u{10ffff}", "\n", "\r", "\t", "a",
        ];
        let native = environment_locale().unwrap();
        let mut locales = vec!["C".to_string()];
        if native != "C" { locales.push(native); }
        for locale in locales {
            let snapshot = in_locale(&strings, &locale);
            let ranks = snapshot.ranks;
            let payload = serde_json::to_vec(&serde_json::json!({"locale": locale, "strings": strings})).unwrap();
            let mut child = Command::new("emacs")
                .args(["--batch", "-Q", "--eval", GNU_FIXTURE_DRIVER])
                .env("LC_ALL", &locale)
                .stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped())
                .spawn().expect("installed GNU Emacs is required for this explicit oracle test");
            {
                let mut input = child.stdin.take().unwrap();
                input.write_all(&payload).unwrap();
                input.write_all(b"\n").unwrap();
            }
            let output = child.wait_with_output().unwrap();
            assert!(output.status.success(), "GNU oracle failed: {}", String::from_utf8_lossy(&output.stderr));
            let evidence: serde_json::Value = serde_json::from_slice(&output.stdout).unwrap();
            let relations = evidence["relations"].as_array().unwrap();
            assert_eq!(relations.len(), strings.len() * strings.len());
            for left in 0..strings.len() {
                for right in 0..strings.len() {
                    let actual = match ranks[left].cmp(&ranks[right]) {
                        std::cmp::Ordering::Less => -1,
                        std::cmp::Ordering::Equal => 0,
                        std::cmp::Ordering::Greater => 1,
                    };
                    assert_eq!(relations[left * strings.len() + right].as_i64(), Some(actual),
                        "GNU pair indices {left}/{right}, locale {locale}, evidence {evidence}");
                }
            }
        }
    }
}

#[cfg(all(test, not(any(target_os = "linux", target_os = "macos"))))]
mod unsupported_tests {
    use super::*;

    #[test]
    fn unsupported_platform_never_returns_a_fabricated_order() {
        assert!(collate_org_match_strings(vec![]).unwrap_err().contains("unsupported"));
        assert!(collate_org_match_strings(vec!["a".into(), "b".into()]).is_err());
    }
}
