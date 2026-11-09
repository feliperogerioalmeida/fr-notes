use serde::{Deserialize, Serialize};

pub const CALENDAR_ACCESS_DENIED: &str = "calendar_access_denied";
const MAILTO_PREFIX: &str = "mailto:";
const MAX_NOTES_CHARS: usize = 4000;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListEventsArgs {
    pub from_ms: f64,
    pub to_ms: f64,
    #[serde(default)]
    pub calendar_ids: Option<Vec<String>>,
}

#[derive(Serialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CalendarAttendee {
    pub name: Option<String>,
    pub email: Option<String>,
    pub is_current_user: bool,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CalendarEvent {
    pub id: String,
    pub calendar_id: String,
    pub title: String,
    pub start_ms: f64,
    pub end_ms: f64,
    pub is_all_day: bool,
    pub location: Option<String>,
    pub notes: Option<String>,
    pub url: Option<String>,
    pub calendar_title: String,
    pub calendar_color: Option<String>,
    pub attendees: Vec<CalendarAttendee>,
    pub organizer: Option<CalendarAttendee>,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CalendarInfo {
    pub id: String,
    pub title: String,
    pub color: Option<String>,
    pub source: String,
    pub allows_modifications: bool,
}

pub fn parse_mailto(url: &str) -> Option<String> {
    let trimmed = url.trim();
    let prefix = trimmed.get(..MAILTO_PREFIX.len())?;
    if !prefix.eq_ignore_ascii_case(MAILTO_PREFIX) {
        return None;
    }
    let address = trimmed[MAILTO_PREFIX.len()..].split('?').next()?.trim();
    (!address.is_empty()).then(|| address.to_string())
}

pub fn truncate_chars(text: &str, limit: usize) -> String {
    text.chars().take(limit).collect()
}

pub fn format_hex_color(red: f64, green: f64, blue: f64) -> String {
    let channel = |value: f64| (value.clamp(0.0, 1.0) * 255.0).round() as u8;
    format!("#{:02X}{:02X}{:02X}", channel(red), channel(green), channel(blue))
}

fn non_empty(value: Option<String>) -> Option<String> {
    value.map(|text| text.trim().to_string()).filter(|text| !text.is_empty())
}

pub fn notes_excerpt(notes: Option<String>) -> Option<String> {
    non_empty(notes).map(|text| truncate_chars(&text, MAX_NOTES_CHARS))
}

pub fn sort_calendars(calendars: &mut [CalendarInfo]) {
    calendars.sort_by(|first, second| {
        first
            .source
            .to_lowercase()
            .cmp(&second.source.to_lowercase())
            .then_with(|| first.title.to_lowercase().cmp(&second.title.to_lowercase()))
    });
}

#[cfg(target_os = "macos")]
pub use platform::{authorization_status, list_calendars, list_events, request_access};

#[cfg(target_os = "macos")]
mod platform {
    use std::sync::mpsc;
    use std::time::Duration;

    use block2::RcBlock;
    use objc2::rc::{autoreleasepool, Retained};
    use objc2::runtime::Bool;
    use objc2::{sel, AllocAnyThread};
    use objc2_app_kit::{NSColor, NSColorSpace};
    use objc2_event_kit::{EKAuthorizationStatus, EKCalendar, EKEntityType, EKEvent, EKEventStore, EKParticipant};
    use objc2_foundation::{NSArray, NSDate, NSError, NSObjectProtocol};

    use super::{
        format_hex_color, non_empty, notes_excerpt, parse_mailto, sort_calendars, CalendarAttendee, CalendarEvent,
        CalendarInfo, ListEventsArgs, CALENDAR_ACCESS_DENIED,
    };
    use crate::permissions::{DENIED, GRANTED, RESTRICTED, UNDETERMINED};

    const MILLIS_PER_SECOND: f64 = 1000.0;
    const ACCESS_PROMPT_TIMEOUT: Duration = Duration::from_secs(300);

    fn current_status() -> EKAuthorizationStatus {
        unsafe { EKEventStore::authorizationStatusForEntityType(EKEntityType::Event) }
    }

    pub fn authorization_status() -> &'static str {
        match current_status() {
            EKAuthorizationStatus::FullAccess => GRANTED,
            EKAuthorizationStatus::Denied | EKAuthorizationStatus::WriteOnly => DENIED,
            EKAuthorizationStatus::Restricted => RESTRICTED,
            _ => UNDETERMINED,
        }
    }

    fn new_store() -> Retained<EKEventStore> {
        unsafe { EKEventStore::init(EKEventStore::alloc()) }
    }

    fn ensure_authorized() -> Result<(), String> {
        if current_status() == EKAuthorizationStatus::FullAccess {
            return Ok(());
        }
        Err(CALENDAR_ACCESS_DENIED.into())
    }

    #[allow(deprecated)]
    fn send_access_request(store: &EKEventStore, sender: mpsc::Sender<bool>) {
        let completion = RcBlock::new(move |granted: Bool, _error: *mut NSError| {
            let _ = sender.send(granted.as_bool());
        });
        let supports_full_access = store.respondsToSelector(sel!(requestFullAccessToEventsWithCompletion:));
        unsafe {
            if supports_full_access {
                store.requestFullAccessToEventsWithCompletion(RcBlock::as_ptr(&completion));
            } else {
                store.requestAccessToEntityType_completion(EKEntityType::Event, RcBlock::as_ptr(&completion));
            }
        }
    }

    pub fn request_access() -> Result<bool, String> {
        if current_status() == EKAuthorizationStatus::FullAccess {
            return Ok(true);
        }
        let store = new_store();
        let (sender, receiver) = mpsc::channel();
        send_access_request(&store, sender);
        let granted = receiver.recv_timeout(ACCESS_PROMPT_TIMEOUT).unwrap_or(false);
        drop(store);
        Ok(granted)
    }

    fn hex_color(calendar: &EKCalendar) -> Option<String> {
        let color: Retained<NSColor> = unsafe { calendar.color() };
        let srgb = color.colorUsingColorSpace(&NSColorSpace::sRGBColorSpace())?;
        Some(format_hex_color(srgb.redComponent(), srgb.greenComponent(), srgb.blueComponent()))
    }

    fn to_calendar_info(calendar: &EKCalendar) -> CalendarInfo {
        let source = unsafe { calendar.source() }
            .map(|source| unsafe { source.title() }.to_string())
            .unwrap_or_default();
        CalendarInfo {
            id: unsafe { calendar.calendarIdentifier() }.to_string(),
            title: unsafe { calendar.title() }.to_string(),
            color: hex_color(calendar),
            source,
            allows_modifications: unsafe { calendar.allowsContentModifications() },
        }
    }

    fn event_calendars(store: &EKEventStore) -> Retained<NSArray<EKCalendar>> {
        unsafe { store.calendarsForEntityType(EKEntityType::Event) }
    }

    pub fn list_calendars() -> Result<Vec<CalendarInfo>, String> {
        ensure_authorized()?;
        autoreleasepool(|_| {
            let store = new_store();
            let mut calendars: Vec<CalendarInfo> = event_calendars(&store).iter().map(|c| to_calendar_info(&c)).collect();
            sort_calendars(&mut calendars);
            Ok(calendars)
        })
    }

    fn selected_calendars(store: &EKEventStore, ids: &Option<Vec<String>>) -> Option<Retained<NSArray<EKCalendar>>> {
        let ids = ids.as_ref().filter(|ids| !ids.is_empty())?;
        let matching: Vec<Retained<EKCalendar>> = event_calendars(store)
            .iter()
            .filter(|calendar| ids.contains(&unsafe { calendar.calendarIdentifier() }.to_string()))
            .collect();
        Some(NSArray::from_retained_slice(&matching))
    }

    fn to_attendee(participant: &EKParticipant) -> CalendarAttendee {
        let url = unsafe { participant.URL() };
        CalendarAttendee {
            name: non_empty(unsafe { participant.name() }.map(|name| name.to_string())),
            email: url.absoluteString().and_then(|value| parse_mailto(&value.to_string())),
            is_current_user: unsafe { participant.isCurrentUser() },
        }
    }

    fn to_millis(date: &NSDate) -> f64 {
        date.timeIntervalSince1970() * MILLIS_PER_SECOND
    }

    fn to_calendar_event(event: &EKEvent) -> CalendarEvent {
        let start_date = unsafe { event.startDate() };
        let end_date = unsafe { event.endDate() };
        let start_ms = to_millis(&start_date);
        let identifier = unsafe { event.eventIdentifier() }.map(|id| id.to_string()).unwrap_or_default();
        let calendar = unsafe { event.calendar() };
        let attendees = unsafe { event.attendees() }
            .map(|list| list.iter().map(|participant| to_attendee(&participant)).collect())
            .unwrap_or_default();
        CalendarEvent {
            id: format!("{identifier}:{}", start_ms.round() as i64),
            calendar_id: calendar
                .as_ref()
                .map(|calendar| unsafe { calendar.calendarIdentifier() }.to_string())
                .unwrap_or_default(),
            title: unsafe { event.title() }.to_string(),
            start_ms,
            end_ms: to_millis(&end_date),
            is_all_day: unsafe { event.isAllDay() },
            location: non_empty(unsafe { event.location() }.map(|location| location.to_string())),
            notes: notes_excerpt(unsafe { event.notes() }.map(|notes| notes.to_string())),
            url: unsafe { event.URL() }.and_then(|url| url.absoluteString()).map(|url| url.to_string()),
            calendar_title: calendar.as_ref().map(|calendar| unsafe { calendar.title() }.to_string()).unwrap_or_default(),
            calendar_color: calendar.as_ref().and_then(|calendar| hex_color(calendar)),
            attendees,
            organizer: unsafe { event.organizer() }.map(|organizer| to_attendee(&organizer)),
        }
    }

    pub fn list_events(args: &ListEventsArgs) -> Result<Vec<CalendarEvent>, String> {
        ensure_authorized()?;
        autoreleasepool(|_| {
            let store = new_store();
            let start = NSDate::dateWithTimeIntervalSince1970(args.from_ms / MILLIS_PER_SECOND);
            let end = NSDate::dateWithTimeIntervalSince1970(args.to_ms / MILLIS_PER_SECOND);
            let calendars = selected_calendars(&store, &args.calendar_ids);
            if calendars.as_ref().is_some_and(|list| list.count() == 0) {
                return Ok(Vec::new());
            }
            let predicate =
                unsafe { store.predicateForEventsWithStartDate_endDate_calendars(&start, &end, calendars.as_deref()) };
            let mut events: Vec<CalendarEvent> =
                unsafe { store.eventsMatchingPredicate(&predicate) }.iter().map(|event| to_calendar_event(&event)).collect();
            events.sort_by(|first, second| first.start_ms.total_cmp(&second.start_ms));
            Ok(events)
        })
    }
}

#[cfg(not(target_os = "macos"))]
pub fn authorization_status() -> &'static str {
    crate::permissions::UNDETERMINED
}

#[cfg(not(target_os = "macos"))]
pub fn request_access() -> Result<bool, String> {
    Ok(false)
}

#[cfg(not(target_os = "macos"))]
pub fn list_calendars() -> Result<Vec<CalendarInfo>, String> {
    Err(CALENDAR_ACCESS_DENIED.into())
}

#[cfg(not(target_os = "macos"))]
pub fn list_events(_args: &ListEventsArgs) -> Result<Vec<CalendarEvent>, String> {
    Err(CALENDAR_ACCESS_DENIED.into())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_mailto_urls() {
        assert_eq!(parse_mailto("mailto:ana@fr.dev"), Some("ana@fr.dev".to_string()));
        assert_eq!(parse_mailto("MAILTO:Ana@FR.dev?subject=oi"), Some("Ana@FR.dev".to_string()));
        assert_eq!(parse_mailto("https://meet.google.com/abc"), None);
        assert_eq!(parse_mailto("mailto:"), None);
        assert_eq!(parse_mailto("mail"), None);
    }

    #[test]
    fn truncates_by_characters() {
        assert_eq!(truncate_chars("reunião", 6), "reuniã");
    }

    #[test]
    fn formats_hex_colors() {
        assert_eq!(format_hex_color(1.0, 0.42, 0.1), "#FF6B1A");
        assert_eq!(format_hex_color(-1.0, 2.0, 0.0), "#00FF00");
    }

    #[test]
    fn sorts_calendars_by_source_then_title() {
        let info = |source: &str, title: &str| CalendarInfo {
            id: format!("{source}-{title}"),
            title: title.into(),
            color: None,
            source: source.into(),
            allows_modifications: true,
        };
        let mut calendars = vec![info("iCloud", "Pessoal"), info("Google", "Trabalho"), info("Google", "Aniversários")];
        sort_calendars(&mut calendars);
        let order: Vec<&str> = calendars.iter().map(|calendar| calendar.id.as_str()).collect();
        assert_eq!(order, vec!["Google-Aniversários", "Google-Trabalho", "iCloud-Pessoal"]);
    }
}
