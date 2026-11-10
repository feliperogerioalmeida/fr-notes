use std::time::Duration;

use serde::Serialize;

pub const MAX_TEXT_CHARS: usize = 160;

#[derive(Serialize, Clone, Debug, Default, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AxNode {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent: Option<u32>,
    pub role: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub subrole: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub value: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub identifier: Option<String>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub classes: Vec<String>,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AxSnapshot {
    pub bundle_id: String,
    pub pid: i32,
    pub observed_at_ms: u64,
    pub truncated: bool,
    pub nodes: Vec<AxNode>,
}

#[derive(Clone, Copy)]
pub struct WalkBudget {
    pub max_nodes: usize,
    pub max_depth: usize,
    pub max_duration: Duration,
}

pub fn clean_text(raw: &str) -> Option<String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return None;
    }
    Some(trimmed.chars().take(MAX_TEXT_CHARS).collect())
}

#[cfg(target_os = "macos")]
pub use platform::capture_app;

#[cfg(not(target_os = "macos"))]
pub fn capture_app(_bundle_id: &str, _budget: WalkBudget) -> Option<AxSnapshot> {
    None
}

#[cfg(target_os = "macos")]
mod platform {
    use std::ptr::NonNull;
    use std::time::Instant;

    use objc2_app_kit::NSRunningApplication;
    use objc2_core_foundation::{CFArray, CFBoolean, CFRetained, CFString, CFType};
    use objc2_foundation::NSString;

    use super::{clean_text, AxNode, AxSnapshot, WalkBudget};
    use crate::transcription::stream::now_epoch_ms;

    const AX_SUCCESS: i32 = 0;
    const MESSAGING_TIMEOUT_SECONDS: f32 = 0.25;
    const MANUAL_ACCESSIBILITY: &str = "AXManualAccessibility";
    const WINDOWS_ATTRIBUTE: &str = "AXWindows";
    const NODE_ATTRIBUTES: [&str; 8] = [
        "AXRole",
        "AXSubrole",
        "AXTitle",
        "AXDescription",
        "AXValue",
        "AXIdentifier",
        "AXDOMClassList",
        "AXChildren",
    ];
    const CHILDREN_INDEX: usize = 7;
    const CLASSES_INDEX: usize = 6;

    #[link(name = "ApplicationServices", kind = "framework")]
    extern "C" {
        fn AXUIElementCreateApplication(pid: i32) -> *mut CFType;
        fn AXUIElementCopyAttributeValue(
            element: &CFType,
            attribute: &CFString,
            value: *mut *mut CFType,
        ) -> i32;
        fn AXUIElementCopyMultipleAttributeValues(
            element: &CFType,
            attributes: &CFArray<CFString>,
            options: u32,
            values: *mut *mut CFArray<CFType>,
        ) -> i32;
        fn AXUIElementSetAttributeValue(
            element: &CFType,
            attribute: &CFString,
            value: &CFType,
        ) -> i32;
        fn AXUIElementSetMessagingTimeout(element: &CFType, timeout: f32) -> i32;
    }

    struct PendingElement {
        element: CFRetained<CFType>,
        parent: Option<u32>,
        depth: usize,
    }

    pub fn capture_app(bundle_id: &str, budget: WalkBudget) -> Option<AxSnapshot> {
        let pid = find_main_pid(bundle_id)?;
        let application = create_application(pid)?;
        enable_web_accessibility(&application);
        let windows = copy_attribute(&application, WINDOWS_ATTRIBUTE)
            .map(|value| read_elements(&value))
            .unwrap_or_default();
        let (nodes, truncated) = walk(windows, budget);
        Some(AxSnapshot {
            bundle_id: bundle_id.to_string(),
            pid,
            observed_at_ms: now_epoch_ms(),
            truncated,
            nodes,
        })
    }

    fn find_main_pid(bundle_id: &str) -> Option<i32> {
        let identifier = NSString::from_str(bundle_id);
        let running = NSRunningApplication::runningApplicationsWithBundleIdentifier(&identifier);
        running
            .iter()
            .find(|application| !application.isTerminated())
            .map(|application| application.processIdentifier())
    }

    fn create_application(pid: i32) -> Option<CFRetained<CFType>> {
        let raw = unsafe { AXUIElementCreateApplication(pid) };
        let application = NonNull::new(raw).map(|ptr| unsafe { CFRetained::from_raw(ptr) })?;
        unsafe { AXUIElementSetMessagingTimeout(&application, MESSAGING_TIMEOUT_SECONDS) };
        Some(application)
    }

    fn enable_web_accessibility(application: &CFType) {
        let attribute = CFString::from_str(MANUAL_ACCESSIBILITY);
        let enabled: &CFType = CFBoolean::new(true);
        unsafe { AXUIElementSetAttributeValue(application, &attribute, enabled) };
    }

    fn copy_attribute(element: &CFType, name: &str) -> Option<CFRetained<CFType>> {
        let attribute = CFString::from_str(name);
        let mut raw: *mut CFType = std::ptr::null_mut();
        let status = unsafe { AXUIElementCopyAttributeValue(element, &attribute, &mut raw) };
        if status != AX_SUCCESS {
            return None;
        }
        NonNull::new(raw).map(|ptr| unsafe { CFRetained::from_raw(ptr) })
    }

    fn walk(roots: Vec<CFRetained<CFType>>, budget: WalkBudget) -> (Vec<AxNode>, bool) {
        let started = Instant::now();
        let names = attribute_names();
        let mut nodes = Vec::new();
        let mut stack: Vec<PendingElement> = roots
            .into_iter()
            .rev()
            .map(|element| PendingElement {
                element,
                parent: None,
                depth: 0,
            })
            .collect();
        while let Some(pending) = stack.pop() {
            if nodes.len() >= budget.max_nodes || started.elapsed() >= budget.max_duration {
                return (nodes, true);
            }
            let Some((mut node, children)) = read_node(&pending.element, &names) else {
                continue;
            };
            node.parent = pending.parent;
            let index = nodes.len() as u32;
            nodes.push(node);
            if pending.depth >= budget.max_depth {
                continue;
            }
            stack.extend(children.into_iter().rev().map(|element| PendingElement {
                element,
                parent: Some(index),
                depth: pending.depth + 1,
            }));
        }
        (nodes, false)
    }

    fn attribute_names() -> CFRetained<CFArray<CFString>> {
        let names: Vec<CFRetained<CFString>> = NODE_ATTRIBUTES
            .iter()
            .map(|name| CFString::from_str(name))
            .collect();
        CFArray::from_retained_objects(&names)
    }

    fn read_node(
        element: &CFType,
        names: &CFArray<CFString>,
    ) -> Option<(AxNode, Vec<CFRetained<CFType>>)> {
        let mut raw: *mut CFArray<CFType> = std::ptr::null_mut();
        let status = unsafe { AXUIElementCopyMultipleAttributeValues(element, names, 0, &mut raw) };
        if status != AX_SUCCESS {
            return None;
        }
        let values = NonNull::new(raw).map(|ptr| unsafe { CFRetained::from_raw(ptr) })?;
        let text = |index: usize| values.get(index).and_then(|value| read_text(&value));
        let node = AxNode {
            parent: None,
            role: text(0).unwrap_or_default(),
            subrole: text(1),
            title: text(2),
            description: text(3),
            value: text(4),
            identifier: text(5),
            classes: values
                .get(CLASSES_INDEX)
                .map(|value| read_strings(&value))
                .unwrap_or_default(),
        };
        let children = values
            .get(CHILDREN_INDEX)
            .map(|value| read_elements(&value))
            .unwrap_or_default();
        Some((node, children))
    }

    fn read_text(value: &CFType) -> Option<String> {
        value
            .downcast_ref::<CFString>()
            .and_then(|string| clean_text(&string.to_string()))
    }

    fn as_array(value: &CFType) -> Option<&CFArray<CFType>> {
        let array = value.downcast_ref::<CFArray>()?;
        Some(unsafe { array.cast_unchecked::<CFType>() })
    }

    fn read_strings(value: &CFType) -> Vec<String> {
        as_array(value)
            .map(|array| array.iter().filter_map(|item| read_text(&item)).collect())
            .unwrap_or_default()
    }

    fn read_elements(value: &CFType) -> Vec<CFRetained<CFType>> {
        as_array(value)
            .map(|array| array.iter().collect())
            .unwrap_or_default()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn trims_and_limits_text() {
        assert_eq!(clean_text("  Marina Souza  "), Some("Marina Souza".into()));
        assert_eq!(clean_text("   "), None);
        let long = "a".repeat(MAX_TEXT_CHARS + 40);
        assert_eq!(
            clean_text(&long).map(|text| text.len()),
            Some(MAX_TEXT_CHARS)
        );
    }

    #[test]
    fn omits_empty_fields_when_serialized() {
        let node = AxNode {
            role: "AXGroup".into(),
            ..AxNode::default()
        };
        assert_eq!(
            serde_json::to_string(&node).unwrap(),
            r#"{"role":"AXGroup"}"#
        );
    }
}
