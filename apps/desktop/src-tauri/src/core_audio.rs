use std::ffi::c_void;
use std::mem::size_of;
use std::ptr::NonNull;

use objc2::rc::Retained;
use objc2_core_audio::{
    kAudioObjectPropertyElementMain, kAudioObjectPropertyScopeGlobal, kAudioObjectSystemObject,
    AudioObjectGetPropertyData, AudioObjectGetPropertyDataSize, AudioObjectID,
    AudioObjectPropertyAddress, AudioObjectPropertySelector,
};
use objc2_foundation::NSString;

pub const SYSTEM_OBJECT: AudioObjectID = kAudioObjectSystemObject as AudioObjectID;

pub fn global_address(selector: AudioObjectPropertySelector) -> AudioObjectPropertyAddress {
    AudioObjectPropertyAddress {
        mSelector: selector,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kAudioObjectPropertyElementMain,
    }
}

pub fn status_error(context: &str, status: i32) -> String {
    format!("{context}_failed:{status}")
}

pub fn read_value<T: Copy>(
    object: AudioObjectID,
    selector: AudioObjectPropertySelector,
) -> Result<T, i32> {
    read_qualified::<T, ()>(object, selector, None)
}

pub fn read_qualified<T: Copy, Q>(
    object: AudioObjectID,
    selector: AudioObjectPropertySelector,
    qualifier: Option<&Q>,
) -> Result<T, i32> {
    let address = global_address(selector);
    let mut value: T = unsafe { std::mem::zeroed() };
    let mut size = size_of::<T>() as u32;
    let (qualifier_size, qualifier_ptr) = qualifier
        .map(|q| (size_of::<Q>() as u32, q as *const Q as *const c_void))
        .unwrap_or((0, std::ptr::null()));
    let status = unsafe {
        AudioObjectGetPropertyData(
            object,
            NonNull::from(&address),
            qualifier_size,
            qualifier_ptr,
            NonNull::from(&mut size),
            NonNull::from(&mut value).cast(),
        )
    };
    if status != 0 {
        return Err(status);
    }
    Ok(value)
}

pub fn read_array<T: Copy>(
    object: AudioObjectID,
    selector: AudioObjectPropertySelector,
) -> Result<Vec<T>, i32> {
    let address = global_address(selector);
    let mut size = 0u32;
    let status = unsafe {
        AudioObjectGetPropertyDataSize(
            object,
            NonNull::from(&address),
            0,
            std::ptr::null(),
            NonNull::from(&mut size),
        )
    };
    if status != 0 {
        return Err(status);
    }
    let count = size as usize / size_of::<T>();
    let mut values: Vec<T> = vec![unsafe { std::mem::zeroed() }; count];
    if count == 0 {
        return Ok(values);
    }
    let status = unsafe {
        AudioObjectGetPropertyData(
            object,
            NonNull::from(&address),
            0,
            std::ptr::null(),
            NonNull::from(&mut size),
            NonNull::new_unchecked(values.as_mut_ptr()).cast(),
        )
    };
    if status != 0 {
        return Err(status);
    }
    values.truncate(size as usize / size_of::<T>());
    Ok(values)
}

pub fn read_string(
    object: AudioObjectID,
    selector: AudioObjectPropertySelector,
) -> Result<String, i32> {
    let raw: usize = read_value(object, selector)?;
    let Some(pointer) = NonNull::new(raw as *mut NSString) else {
        return Ok(String::new());
    };
    let string = unsafe { Retained::from_raw(pointer.as_ptr()) };
    Ok(string.map(|value| value.to_string()).unwrap_or_default())
}
