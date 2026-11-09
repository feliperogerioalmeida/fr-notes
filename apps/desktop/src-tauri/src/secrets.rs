const KEYCHAIN_SERVICE: &str = "dev.feliperogerio.notes";
pub const DEEPGRAM_API_KEY: &str = "deepgram_api_key";
pub const LLM_API_KEY: &str = "llm_api_key";
const ALLOWED_KEYS: [&str; 2] = [DEEPGRAM_API_KEY, LLM_API_KEY];
const WEBHOOK_KEY_PREFIXES: [&str; 2] = ["webhook_secret:", "webhook_header:"];
const MAX_WEBHOOK_ID_LENGTH: usize = 64;

fn is_webhook_id(id: &str) -> bool {
    !id.is_empty()
        && id.len() <= MAX_WEBHOOK_ID_LENGTH
        && id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-')
}

fn is_allowed_key(key: &str) -> bool {
    ALLOWED_KEYS.contains(&key)
        || WEBHOOK_KEY_PREFIXES
            .iter()
            .any(|prefix| key.strip_prefix(prefix).is_some_and(is_webhook_id))
}

fn open_entry(key: &str) -> Result<keyring::Entry, String> {
    if !is_allowed_key(key) {
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

#[cfg(test)]
mod tests {
    use super::is_allowed_key;

    #[test]
    fn accepts_known_and_webhook_keys() {
        assert!(is_allowed_key("deepgram_api_key"));
        assert!(is_allowed_key("webhook_secret:8f0d704d-4fd1-4f3b-b29a-a74cf82cf880"));
        assert!(is_allowed_key("webhook_header:8f0d704d-4fd1-4f3b-b29a-a74cf82cf880"));
    }

    #[test]
    fn rejects_unknown_or_malformed_keys() {
        assert!(!is_allowed_key("anthropic_api_key"));
        assert!(!is_allowed_key("webhook_secret:"));
        assert!(!is_allowed_key("webhook_secret:../etc"));
        assert!(!is_allowed_key("webhook_other:abc"));
    }
}
