//! Readonly native local-calendar snapshot for GNU Org clock property matches.
//! Calendar overflow is normalized natively; timezone transitions must have one
//! round-trippable instant. Folds/gaps require exact supplied GNU clock context:
//! guessed mktime offsets depend on process history and are not equivalent.
//! No process TZ mutation, Source/file writes, shell, or JS-calendar fallback.

use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OrgClockContextSnapshot {
    pub now_epoch_ms: i64,
    pub today_start_epoch_ms: i64,
    pub today_end_epoch_ms: i64,
    pub calendar_epoch_ms: Vec<i64>,
}

pub fn capture_org_match_clock_context(
    calendar_times: Vec<[i32; 5]>,
) -> Result<OrgClockContextSnapshot, String> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|_| "Native clock is before the Unix epoch".to_string())?;
    let now_epoch_ms = i64::try_from(now.as_millis())
        .map_err(|_| "Native clock exceeds exact timestamp precision".to_string())?;
    capture_at(&calendar_times, now_epoch_ms)
}

#[cfg(any(target_os = "linux", target_os = "macos"))]
fn capture_at(calendar_times: &[[i32; 5]], now_epoch_ms: i64) -> Result<OrgClockContextSnapshot, String> {
    platform::capture(calendar_times, now_epoch_ms)
}

#[cfg(not(any(target_os = "linux", target_os = "macos")))]
fn capture_at(_calendar_times: &[[i32; 5]], _now_epoch_ms: i64) -> Result<OrgClockContextSnapshot, String> {
    Err("Native GNU Org clock calendar context is unsupported on this platform".into())
}

#[cfg(any(target_os = "linux", target_os = "macos"))]
mod platform {
    use super::OrgClockContextSnapshot;
    use chrono::{Local, LocalResult, TimeZone};
    const MAX_EXACT_MS: i64 = 9_007_199_254_740_991;

    #[cfg(target_os = "linux")]
    unsafe fn errno() -> *mut libc::c_int { unsafe { libc::__errno_location() } }
    #[cfg(target_os = "macos")]
    unsafe fn errno() -> *mut libc::c_int { unsafe { libc::__error() } }

    fn encode(time: &mut libc::tm) -> Result<i64, String> {
        // SAFETY: tm is fully initialized; errno points to this thread's errno.
        let seconds = unsafe {
            *errno() = 0;
            let result = libc::timegm(time);
            if result == -1 && *errno() != 0 {
                return Err("Native Org local-calendar timestamp cannot be encoded".into());
            }
            result
        };
        let local = chrono::DateTime::from_timestamp(seconds as i64, 0)
            .ok_or_else(|| "Native Org local calendar exceeds the supported calendar range".to_string())?
            .naive_utc();
        let seconds = match Local.from_local_datetime(&local) {
            LocalResult::Single(value) => libc::time_t::try_from(value.timestamp())
                .map_err(|_| "Native Org local calendar exceeds this platform's clock precision".to_string())?,
            LocalResult::Ambiguous(_, _) => return Err(
                "Exact GNU clock context is required for an ambiguous local time".into()),
            LocalResult::None => return Err(
                "Exact GNU clock context is required for a nonexistent local time".into()),
        };
        // Chrono's timezone loader can fall back if host zone data is unavailable.
        // Never accept that fallback as native authority: require libc agreement.
        let mut actual: libc::tm = unsafe { std::mem::zeroed() };
        if unsafe { libc::localtime_r(&seconds, &mut actual) }.is_null()
            || (actual.tm_year, actual.tm_mon, actual.tm_mday, actual.tm_hour, actual.tm_min, actual.tm_sec)
                != (time.tm_year, time.tm_mon, time.tm_mday, time.tm_hour, time.tm_min, time.tm_sec)
        {
            return Err("Native Org local timezone context is unavailable or inconsistent".into());
        }
        let milliseconds = (seconds as i64).checked_mul(1_000)
            .ok_or_else(|| "Native Org local-calendar timestamp exceeds exact precision".to_string())?;
        if milliseconds.unsigned_abs() > MAX_EXACT_MS as u64 {
            return Err("Native Org local-calendar timestamp exceeds exact precision".into());
        }
        Ok(milliseconds)
    }

    pub(super) fn capture(calendar_times: &[[i32; 5]], now_epoch_ms: i64) -> Result<OrgClockContextSnapshot, String> {
        if now_epoch_ms.unsigned_abs() > MAX_EXACT_MS as u64 {
            return Err("Native clock exceeds exact timestamp precision".into());
        }
        let seconds = libc::time_t::try_from(now_epoch_ms.div_euclid(1_000))
            .map_err(|_| "Native current time exceeds this platform's clock precision".to_string())?;
        // SAFETY: zero initializes all tm fields; localtime_r initializes output.
        let mut today: libc::tm = unsafe { std::mem::zeroed() };
        if unsafe { libc::localtime_r(&seconds, &mut today) }.is_null() {
            return Err("Native current local calendar is unavailable".into());
        }
        today.tm_hour = 0;
        today.tm_min = 0;
        today.tm_sec = 0;
        // GNU's default org-clock-special-range is local hour 0 then hour 24;
        // never add a fixed 86,400,000 ms across a DST transition.
        let mut tomorrow = today;
        tomorrow.tm_hour = 24;
        let today_start_epoch_ms = encode(&mut today)?;
        let today_end_epoch_ms = encode(&mut tomorrow)?;
        if today_end_epoch_ms <= today_start_epoch_ms {
            return Err("Native current local day has no positive clock range".into());
        }
        let mut calendar_epoch_ms = Vec::with_capacity(calendar_times.len());
        for &[year, month, day, hour, minute] in calendar_times {
            // GNU encode-time normalizes calendar overflow; do not independently
            // reject source dates which its native clock sum accepts.
            let mut time: libc::tm = unsafe { std::mem::zeroed() };
            time.tm_year = year.checked_sub(1_900).ok_or_else(|| "Native Org calendar year overflows".to_string())?;
            time.tm_mon = month.checked_sub(1).ok_or_else(|| "Native Org calendar month overflows".to_string())?;
            time.tm_mday = day;
            time.tm_hour = hour;
            time.tm_min = minute;
            calendar_epoch_ms.push(encode(&mut time)?);
        }
        Ok(OrgClockContextSnapshot { now_epoch_ms, today_start_epoch_ms, today_end_epoch_ms, calendar_epoch_ms })
    }
}

#[cfg(all(test, target_os = "linux"))]
mod tests {
    use super::*;

    #[test]
    fn exact_precision_and_overflow_fail_without_fabricating_time() {
        assert!(capture_at(&[], i64::MAX).is_err());
        assert!(capture_at(&[[i32::MIN, 1, 1, 0, 0]], 0).is_err());
        assert!(capture_at(&[[1970, i32::MIN, 1, 0, 0]], 0).is_err());
    }

    #[test]
    #[ignore = "trusted installed GNU encode-time oracle in isolated timezone processes"]
    fn native_calendar_matches_captured_gnu_sequence() {
        if let Ok(fixture) = std::env::var("GRAIN_NATIVE_CLOCK_UNAVAILABLE") {
            let fields = fixture.split(',').map(|field| field.parse::<i64>().unwrap()).collect::<Vec<_>>();
            let time = fields[1..].iter().map(|field| i32::try_from(*field).unwrap()).collect::<Vec<_>>();
            assert!(capture_at(&[time.try_into().unwrap()], fields[0]).is_err());
            return;
        }
        if let Ok(case) = std::env::var("GRAIN_NATIVE_CLOCK_ORACLE_CASE") {
            let (now, times) = match case.as_str() {
                "ny-fall" => (1793552400000, vec![[2026, 11, 1, 0, 30], [2026, 11, 1, 2, 30]]),
                "ny-spring" => (1772985600000, vec![[2026, 3, 8, 1, 30], [2026, 3, 8, 3, 30]]),
                "dublin-fall" => (1792929600000, vec![[2026, 10, 25, 0, 30], [2026, 10, 25, 2, 30]]),
                "dublin-spring" => (1774782000000, vec![[2026, 3, 29, 0, 30], [2026, 3, 29, 2, 30]]),
                "utc-normalized" => (1772366400000, vec![[2026, 2, 30, 25, 70], [1969, 12, 31, 23, 59]]),
                "moscow-fall" => (1414314000000, vec![[2014, 10, 26, 0, 30], [2014, 10, 26, 2, 30]]),
                _ => panic!("unknown fixed clock oracle case"),
            };
            let snapshot = capture_at(&times, now).unwrap();
            let fields = times.iter().map(|t| format!("(0 {} {} {} {} {} nil -1 nil)", t[4], t[3], t[2], t[1], t[0])).collect::<Vec<_>>().join(" ");
            // Fixed trusted source; untrusted source/query text is never evaluated.
            let script = format!("(progn (require 'org) (require 'json) (let* ((now (seconds-to-time {})) (decoded (decode-time now)) (day (nth 3 decoded)) (month (nth 4 decoded)) (year (nth 5 decoded)) (start (org-encode-time 0 0 0 day month year)) (end (org-encode-time 0 0 24 day month year)) (values (mapcar (lambda (fields) (round (* 1000 (float-time (org-encode-time fields))))) '({fields})))) (princ (json-encode (vector (round (* 1000 (float-time start))) (round (* 1000 (float-time end))) values))))))", now / 1_000);
            let result = std::process::Command::new("emacs").args(["-Q", "--batch", "--eval", &script]).output().expect("installed trusted GNU Emacs");
            assert!(result.status.success(), "GNU clock oracle failed: {}", String::from_utf8_lossy(&result.stderr));
            let expected: serde_json::Value = serde_json::from_slice(&result.stdout).unwrap();
            assert_eq!(serde_json::json!([snapshot.today_start_epoch_ms, snapshot.today_end_epoch_ms, snapshot.calendar_epoch_ms]), expected, "{case}");
            assert_eq!(snapshot.today_end_epoch_ms - snapshot.today_start_epoch_ms, match case.as_str() { "ny-fall" | "dublin-fall" | "moscow-fall" => 90_000_000, "ny-spring" | "dublin-spring" => 82_800_000, _ => 86_400_000 });
            return;
        }
        for (case, zone) in [("ny-fall", "America/New_York"), ("ny-spring", "America/New_York"), ("dublin-fall", "Europe/Dublin"), ("dublin-spring", "Europe/Dublin"), ("utc-normalized", "UTC"), ("moscow-fall", "Europe/Moscow")] {
            let output = std::process::Command::new(std::env::current_exe().unwrap())
                .args(["--exact", "org_clock_context::tests::native_calendar_matches_captured_gnu_sequence", "--ignored", "--nocapture"])
                .env("GRAIN_NATIVE_CLOCK_ORACLE_CASE", case).env("TZ", zone).output().unwrap();
            assert!(output.status.success(), "{case}: {} {}", String::from_utf8_lossy(&output.stdout), String::from_utf8_lossy(&output.stderr));
        }

        // Keep the original unavailable endpoints as fail-closed regressions,
        // rather than changing the GNU oracle to bless a guessed fold/gap.
        for (zone, now, time) in [
            ("America/New_York", 1793552400000_i64, [2026, 11, 1, 1, 15]),
            ("America/New_York", 1772985600000, [2026, 3, 8, 2, 15]),
            ("Europe/Dublin", 1792929600000, [2026, 10, 25, 1, 15]),
            ("Europe/Dublin", 1774782000000, [2026, 3, 29, 1, 15]),
            ("Europe/Moscow", 1414314000000, [2014, 10, 26, 1, 30]),
            ("Pacific/Apia", 1325332800000, [2011, 12, 30, 12, 0]),
        ] {
            let fields = time.iter().map(i32::to_string).collect::<Vec<_>>().join(",");
            let output = std::process::Command::new(std::env::current_exe().unwrap())
                .args(["--exact", "org_clock_context::tests::native_calendar_matches_captured_gnu_sequence", "--ignored", "--nocapture"])
                .env("GRAIN_NATIVE_CLOCK_UNAVAILABLE", format!("{now},{fields}")).env("TZ", zone).output().unwrap();
            assert!(output.status.success(), "{zone}: {} {}", String::from_utf8_lossy(&output.stdout), String::from_utf8_lossy(&output.stderr));
        }
    }

}
