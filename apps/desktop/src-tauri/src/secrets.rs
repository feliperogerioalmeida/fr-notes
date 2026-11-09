const KEYCHAIN_SERVICE: &str = "dev.feliperogerio.notes";
pub const DEEPGRAM_API_KEY: &str = "deepgram_api_key";
pub const LLM_API_KEY: &str = "llm_api_key";
const ALLOWED_KEYS: [&str; 2] = [DEEPGRAM_API_KEY, LLM_API_KEY];

fn open_entry(key: &str) -> Result<keyring::Entry, String> {
    if !ALLOWED_KEYS.contains(&key) {
        return Err(format!("unknown_secret_key:{key}"));
    }
    keyring::Entry::new(KEYCHAIN_SERVICE, key).map_err(|error| error.to_string())
}

pub fn read_secret(key: &str) -> Result<Option<String>, String> {
    match open_entry(key)?.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(error) => Err(error.to_string()),
    }
}

pub fn write_secret(key: &str, value: &str) -> Result<(), String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return remove_secret(key);
    }
    open_entry(key)?
        .set_password(trimmed)
        .map_err(|error| error.to_string())
}

pub fn remove_secret(key: &str) -> Result<(), String> {
    match open_entry(key)?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(error) => Err(error.to_string()),
    }
}
