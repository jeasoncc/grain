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

#[cfg(any(target_os = "linux", target_os = "macos", windows))]
fn capture_at(calendar_times: &[[i32; 5]], now_epoch_ms: i64) -> Result<OrgClockContextSnapshot, String> {
    platform::capture(calendar_times, now_epoch_ms)
}

#[cfg(not(any(target_os = "linux", target_os = "macos", windows)))]
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

#[cfg(windows)]
mod platform {
    use super::OrgClockContextSnapshot;
    use chrono::{Datelike, NaiveDate, Timelike};
    use windows_sys::Win32::Foundation::{FILETIME, SYSTEMTIME};
    use windows_sys::Win32::System::Time::{
        FileTimeToSystemTime, GetDynamicTimeZoneInformation, GetTimeZoneInformationForYear,
        SystemTimeToFileTime, SystemTimeToTzSpecificLocalTimeEx,
        DYNAMIC_TIME_ZONE_INFORMATION, TIME_ZONE_ID_INVALID, TIME_ZONE_INFORMATION,
    };

    const MAX_EXACT_MS: i64 = 9_007_199_254_740_991;
    const UNIX_EPOCH_FILETIME: i64 = 116_444_736_000_000_000;

    fn native_error(operation: &str) -> String {
        format!("Native Windows Org calendar {operation}: {}", std::io::Error::last_os_error())
    }

    fn filetime(milliseconds: i64) -> Result<FILETIME, String> {
        if milliseconds.unsigned_abs() > MAX_EXACT_MS as u64 {
            return Err("Native clock exceeds exact timestamp precision".into());
        }
        let ticks = milliseconds.checked_mul(10_000)
            .and_then(|value| value.checked_add(UNIX_EPOCH_FILETIME))
            .filter(|value| *value >= 0)
            .ok_or_else(|| "Native Windows calendar exceeds its supported range".to_string())?;
        Ok(FILETIME { dwLowDateTime: ticks as u32, dwHighDateTime: (ticks as u64 >> 32) as u32 })
    }

    fn systemtime(milliseconds: i64) -> Result<SYSTEMTIME, String> {
        let file = filetime(milliseconds)?;
        let mut time = SYSTEMTIME::default();
        // SAFETY: input and output are initialized structures owned by this call.
        if unsafe { FileTimeToSystemTime(&file, &mut time) } == 0 {
            return Err(native_error("timestamp decoding failed"));
        }
        Ok(time)
    }

    fn milliseconds(time: &SYSTEMTIME) -> Result<i64, String> {
        let mut file = FILETIME::default();
        // SAFETY: Windows validates the fully initialized calendar fields.
        if unsafe { SystemTimeToFileTime(time, &mut file) } == 0 {
            return Err(native_error("timestamp encoding failed"));
        }
        let ticks = (u64::from(file.dwHighDateTime) << 32) | u64::from(file.dwLowDateTime);
        let ticks = i64::try_from(ticks)
            .ok().and_then(|value| value.checked_sub(UNIX_EPOCH_FILETIME))
            .ok_or_else(|| "Native Windows calendar exceeds exact timestamp precision".to_string())?;
        if ticks % 10_000 != 0 {
            return Err("Native Windows calendar loses timestamp precision".into());
        }
        let value = ticks / 10_000;
        if value.unsigned_abs() > MAX_EXACT_MS as u64 {
            return Err("Native Windows calendar exceeds exact timestamp precision".into());
        }
        Ok(value)
    }

    fn normalize([year, month, day, hour, minute]: [i32; 5]) -> Result<SYSTEMTIME, String> {
        // Normalize Gregorian fields before timezone resolution, just like GNU
        // encode-time. 400-year cycles avoid intermediate date-range truncation:
        // even very large overflowing fields may cancel into a valid date.
        let month = i64::from(month) - 1;
        let year = i64::from(year) + month.div_euclid(12);
        let first = NaiveDate::from_ymd_opt(year.rem_euclid(400) as i32,
            (month.rem_euclid(12) + 1) as u32, 1)
            .ok_or_else(|| "Native Org calendar cannot be normalized".to_string())?;
        let days = i64::from(first.num_days_from_ce()) + year.div_euclid(400) * 146_097
            - 719_163 + i64::from(day) - 1;
        let seconds = days * 86_400 + i64::from(hour) * 3_600 + i64::from(minute) * 60;
        let normalized = chrono::DateTime::from_timestamp(seconds, 0)
            .filter(|value| (1601..=30827).contains(&value.year()))
            .ok_or_else(|| "Native Windows calendar exceeds its supported range".to_string())?;
        Ok(SYSTEMTIME {
            wYear: normalized.year() as u16, wMonth: normalized.month() as u16,
            wDay: normalized.day() as u16, wHour: normalized.hour() as u16,
            wMinute: normalized.minute() as u16, ..SYSTEMTIME::default()
        })
    }

    fn same_calendar(first: &SYSTEMTIME, second: &SYSTEMTIME) -> bool {
        (first.wYear, first.wMonth, first.wDay, first.wHour, first.wMinute,
            first.wSecond, first.wMilliseconds)
            == (second.wYear, second.wMonth, second.wDay, second.wHour, second.wMinute,
                second.wSecond, second.wMilliseconds)
    }

    struct NativeZone(DYNAMIC_TIME_ZONE_INFORMATION);

    impl NativeZone {
        fn current() -> Result<Self, String> {
            let mut zone = DYNAMIC_TIME_ZONE_INFORMATION::default();
            // SAFETY: the OS initializes an owned output; never change process/system TZ.
            if unsafe { GetDynamicTimeZoneInformation(&mut zone) } == TIME_ZONE_ID_INVALID {
                return Err(native_error("timezone is unavailable"));
            }
            Ok(Self(zone))
        }

        fn local(&self, utc: &SYSTEMTIME) -> Result<SYSTEMTIME, String> {
            let mut local = SYSTEMTIME::default();
            // SAFETY: use the captured Windows zone, including its historical registry
            // identity and DynamicDaylightTimeDisabled policy, not an implicit fallback.
            if unsafe { SystemTimeToTzSpecificLocalTimeEx(&self.0, utc, &mut local) } == 0 {
                return Err(native_error("timezone conversion failed"));
            }
            Ok(local)
        }

        fn encode(&self, local: &SYSTEMTIME) -> Result<i64, String> {
            let nominal = milliseconds(local)?;
            let mut result = None;
            // Inverse Windows conversions choose an arbitrary side of a fold. Instead,
            // enumerate every native bias and accept exactly one native round trip.
            // Adjacent years cover UTC/local year crossings with historical rule changes.
            let mut biases = [0_i32; 9];
            let mut count = 0;
            for year in local.wYear.saturating_sub(1).max(1601)..=local.wYear.saturating_add(1).min(30827) {
                let rules = if self.0.DynamicDaylightTimeDisabled || self.0.TimeZoneKeyName[0] == 0 {
                    // Disabled dynamic rules mean the captured fixed transition set,
                    // not a request to silently load different historical registry rules.
                    TIME_ZONE_INFORMATION {
                        Bias: self.0.Bias, StandardBias: self.0.StandardBias,
                        DaylightBias: self.0.DaylightBias, StandardDate: self.0.StandardDate,
                        DaylightDate: self.0.DaylightDate, ..TIME_ZONE_INFORMATION::default()
                    }
                } else {
                    let mut rules = TIME_ZONE_INFORMATION::default();
                    // SAFETY: owned output and the captured native timezone descriptor.
                    if unsafe { GetTimeZoneInformationForYear(year, &self.0, &mut rules) } == 0 {
                        return Err(native_error("year-specific timezone rules are unavailable"));
                    }
                    rules
                };
                // Windows ignores StandardBias/DaylightBias without transition dates;
                // include the base offset as well, then let the OS validate each one.
                for adjustment in [0, rules.StandardBias, rules.DaylightBias] {
                    let bias = rules.Bias.checked_add(adjustment)
                        .filter(|value| (-1_440..=1_440).contains(value))
                        .ok_or_else(|| "Native Windows timezone bias exceeds its supported range".to_string())?;
                    if !biases[..count].contains(&bias) {
                        biases[count] = bias;
                        count += 1;
                    }
                }
                if self.0.DynamicDaylightTimeDisabled || self.0.TimeZoneKeyName[0] == 0 {
                    break;
                }
            }
            for bias in &biases[..count] {
                let candidate = nominal.checked_add(i64::from(*bias) * 60_000)
                    .ok_or_else(|| "Native Windows calendar exceeds exact timestamp precision".to_string())?;
                let utc = systemtime(candidate)?;
                if same_calendar(&self.local(&utc)?, local) {
                    if result.is_some_and(|previous| previous != candidate) {
                        return Err("Exact GNU clock context is required for an ambiguous local time".into());
                    }
                    result = Some(candidate);
                }
            }
            result.ok_or_else(|| "Exact GNU clock context is required for a nonexistent local time".to_string())
        }

        fn capture(&self, calendar_times: &[[i32; 5]], now_epoch_ms: i64) -> Result<OrgClockContextSnapshot, String> {
            let today = self.local(&systemtime(now_epoch_ms)?)?;
            let date = [i32::from(today.wYear), i32::from(today.wMonth), i32::from(today.wDay), 0, 0];
            let today_start_epoch_ms = self.encode(&normalize(date)?)?;
            let today_end_epoch_ms = self.encode(&normalize([date[0], date[1], date[2], 24, 0])?)?;
            if today_end_epoch_ms <= today_start_epoch_ms {
                return Err("Native current local day has no positive clock range".into());
            }
            let mut calendar_epoch_ms = Vec::with_capacity(calendar_times.len());
            for time in calendar_times {
                calendar_epoch_ms.push(self.encode(&normalize(*time)?)?);
            }
            Ok(OrgClockContextSnapshot { now_epoch_ms, today_start_epoch_ms, today_end_epoch_ms, calendar_epoch_ms })
        }
    }

    pub(super) fn capture(calendar_times: &[[i32; 5]], now_epoch_ms: i64) -> Result<OrgClockContextSnapshot, String> {
        NativeZone::current()?.capture(calendar_times, now_epoch_ms)
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        use windows_sys::Win32::System::Time::EnumDynamicTimeZoneInformation;

        fn installed_zone(name: &str) -> NativeZone {
            for index in 0.. {
                let mut zone = DYNAMIC_TIME_ZONE_INFORMATION::default();
                // SAFETY: enumerate actual installed Windows timezone descriptors.
                let status = unsafe { EnumDynamicTimeZoneInformation(index, &mut zone) };
                assert_eq!(status, 0, "installed Windows timezone {name} is unavailable");
                let length = zone.TimeZoneKeyName.iter().position(|value| *value == 0).unwrap();
                if String::from_utf16(&zone.TimeZoneKeyName[..length]).unwrap() == name {
                    return NativeZone(zone);
                }
            }
            unreachable!()
        }

        fn utc(time: [i32; 5]) -> i64 {
            milliseconds(&normalize(time).unwrap()).unwrap()
        }

        #[test]
        fn windows_calendar_normalizes_overflow_and_preserves_exact_milliseconds() {
            let zone = installed_zone("UTC");
            let now = utc([2026, 3, 2, 12, 0]) + 123;
            let snapshot = zone.capture(&[
                [2026, 2, 30, 25, 70], [2026, 0, 0, -1, -1],
                [1969, 12, 31, 23, 59],
            ], now).unwrap();
            assert_eq!(snapshot.now_epoch_ms, now);
            assert_eq!(snapshot.today_start_epoch_ms, utc([2026, 3, 2, 0, 0]));
            assert_eq!(snapshot.today_end_epoch_ms, utc([2026, 3, 3, 0, 0]));
            assert_eq!(snapshot.calendar_epoch_ms, vec![
                utc([2026, 3, 3, 2, 10]), utc([2025, 11, 29, 22, 59]), -60_000,
            ]);
            assert_eq!(milliseconds(&systemtime(-1).unwrap()).unwrap(), -1);
            assert_eq!(utc([1970, 1, 1, 0, 0]), 0);
            assert!(zone.capture(&[], i64::MAX).is_err());
            assert!(zone.capture(&[[i32::MAX, i32::MAX, i32::MAX, i32::MAX, i32::MAX]], now).is_err());
            assert!(zone.capture(&[[1600, 12, 31, 0, 0]], now).is_err());
        }

        #[test]
        fn windows_calendar_uses_native_historical_and_disabled_dynamic_rules() {
            let mut zone = installed_zone("Pacific Standard Time");
            // The US spring transition changed from April to March in 2007.
            assert_eq!(zone.encode(&normalize([2006, 3, 12, 12, 0]).unwrap()).unwrap(),
                utc([2006, 3, 12, 20, 0]));
            assert_eq!(zone.encode(&normalize([2007, 3, 11, 12, 0]).unwrap()).unwrap(),
                utc([2007, 3, 11, 19, 0]));
            assert_eq!(zone.encode(&normalize([2026, 1, 1, 0, 15]).unwrap()).unwrap(),
                utc([2026, 1, 1, 8, 15]));
            // Pass an explicit native fixed/no-DST policy without modifying the host.
            zone.0.DynamicDaylightTimeDisabled = true;
            zone.0.StandardDate = SYSTEMTIME::default();
            zone.0.DaylightDate = SYSTEMTIME::default();
            assert_eq!(zone.encode(&normalize([2026, 11, 1, 1, 30]).unwrap()).unwrap(),
                utc([2026, 11, 1, 9, 30]));
            assert_eq!(zone.encode(&normalize([2026, 3, 8, 2, 30]).unwrap()).unwrap(),
                utc([2026, 3, 8, 10, 30]));
        }

        #[test]
        fn windows_calendar_rejects_native_folds_and_gaps_without_changing_timezone() {
            let zone = installed_zone("Pacific Standard Time");
            let spring = zone.capture(&[[2026, 3, 8, 1, 30], [2026, 3, 8, 3, 30]],
                utc([2026, 3, 8, 12, 0])).unwrap();
            assert_eq!(spring.today_start_epoch_ms, utc([2026, 3, 8, 8, 0]));
            assert_eq!(spring.today_end_epoch_ms, utc([2026, 3, 9, 7, 0]));
            assert_eq!(spring.calendar_epoch_ms, vec![utc([2026, 3, 8, 9, 30]), utc([2026, 3, 8, 10, 30])]);
            assert_eq!(spring.today_end_epoch_ms - spring.today_start_epoch_ms, 82_800_000);
            let fall = zone.capture(&[[2026, 11, 1, 0, 30], [2026, 11, 1, 2, 30]],
                utc([2026, 11, 1, 12, 0])).unwrap();
            assert_eq!(fall.today_start_epoch_ms, utc([2026, 11, 1, 7, 0]));
            assert_eq!(fall.today_end_epoch_ms, utc([2026, 11, 2, 8, 0]));
            assert_eq!(fall.calendar_epoch_ms, vec![utc([2026, 11, 1, 7, 30]), utc([2026, 11, 1, 10, 30])]);
            assert_eq!(fall.today_end_epoch_ms - fall.today_start_epoch_ms, 90_000_000);
            assert!(zone.encode(&normalize([2026, 3, 8, 2, 30]).unwrap()).unwrap_err().contains("nonexistent"));
            assert!(zone.encode(&normalize([2026, 11, 1, 1, 30]).unwrap()).unwrap_err().contains("ambiguous"));
        }

        #[test]
        fn windows_current_timezone_produces_a_native_day_containing_now() {
            let snapshot = super::super::capture_org_match_clock_context(vec![]).unwrap();
            assert!(snapshot.today_start_epoch_ms <= snapshot.now_epoch_ms);
            assert!(snapshot.now_epoch_ms < snapshot.today_end_epoch_ms);
        }
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
