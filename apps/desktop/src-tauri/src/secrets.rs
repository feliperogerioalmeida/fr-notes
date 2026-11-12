use std::collections::{BTreeMap, BTreeSet};
use std::sync::{Mutex, OnceLock};

use serde::{Deserialize, Serialize};

const KEYCHAIN_SERVICE: &str = "dev.feliperogerio.notes";
const VAULT_ACCOUNT: &str = "fr-notes-secrets";
pub const DEEPGRAM_API_KEY: &str = "deepgram_api_key";
pub const LLM_API_KEY: &str = "llm_api_key";
pub const LLM_GATEWAY_API_KEY: &str = "llm_gateway_api_key";
pub const LLM_COMPATIBLE_API_KEY: &str = "llm_compatible_api_key";
const ALLOWED_KEYS: [&str; 4] = [
    DEEPGRAM_API_KEY,
    LLM_API_KEY,
    LLM_GATEWAY_API_KEY,
    LLM_COMPATIBLE_API_KEY,
];
const SCOPED_KEY_PREFIXES: [&str; 3] = ["webhook_secret:", "webhook_header:", "connection_token:"];
const MAX_SCOPED_ID_LENGTH: usize = 64;

fn is_scoped_id(id: &str) -> bool {
    !id.is_empty()
        && id.len() <= MAX_SCOPED_ID_LENGTH
        && id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-')
}

fn is_allowed_key(key: &str) -> bool {
    ALLOWED_KEYS.contains(&key)
        || SCOPED_KEY_PREFIXES
            .iter()
            .any(|prefix| key.strip_prefix(prefix).is_some_and(is_scoped_id))
}

fn ensure_allowed(key: &str) -> Result<(), String> {
    if is_allowed_key(key) {
        return Ok(());
    }
    Err(format!("unknown_secret_key:{key}"))
}

trait SecretStore: Send + Sync {
    fn get(&self, account: &str) -> Result<Option<String>, String>;
    fn set(&self, account: &str, value: &str) -> Result<(), String>;
}

struct KeychainStore;

impl KeychainStore {
    fn entry(account: &str) -> Result<keyring::Entry, String> {
        keyring::Entry::new(KEYCHAIN_SERVICE, account).map_err(|error| error.to_string())
    }
}

impl SecretStore for KeychainStore {
    fn get(&self, account: &str) -> Result<Option<String>, String> {
        match Self::entry(account)?.get_password() {
            Ok(value) => Ok(Some(value)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(error) => Err(error.to_string()),
        }
    }

    fn set(&self, account: &str, value: &str) -> Result<(), String> {
        Self::entry(account)?
            .set_password(value)
            .map_err(|error| error.to_string())
    }
}

/// Every secret lives in ONE Keychain item. Local builds are not signed by an Apple
/// team, so macOS asks again for each item after every new build; one item means at
/// most one prompt per build. Secrets saved by older versions in their own items are
/// copied in the first time they are read; the old items are left alone, because
/// deleting an item another build created would trigger one more prompt.
#[derive(Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct VaultData {
    entries: BTreeMap<String, String>,
    legacy_checked: BTreeSet<String>,
}

struct Vault<S: SecretStore> {
    store: S,
    data: Mutex<Option<VaultData>>,
}

impl<S: SecretStore> Vault<S> {
    fn new(store: S) -> Self {
        Self {
            store,
            data: Mutex::new(None),
        }
    }

    fn load(&self) -> Result<VaultData, String> {
        match self.store.get(VAULT_ACCOUNT)? {
            Some(json) => serde_json::from_str(&json).map_err(|error| error.to_string()),
            None => Ok(VaultData::default()),
        }
    }

    fn save(&self, data: &VaultData) -> Result<(), String> {
        let json = serde_json::to_string(data).map_err(|error| error.to_string())?;
        self.store.set(VAULT_ACCOUNT, &json)
    }

    fn with_data<T>(
        &self,
        action: impl FnOnce(&Self, &mut VaultData) -> Result<T, String>,
    ) -> Result<T, String> {
        let mut guard = self.data.lock().map_err(|error| error.to_string())?;
        if guard.is_none() {
            *guard = Some(self.load()?);
        }
        let data = guard.as_mut().ok_or("vault_unavailable")?;
        action(self, data)
    }

    fn adopt_legacy(&self, data: &mut VaultData, key: &str) -> Result<Option<String>, String> {
        if data.legacy_checked.contains(key) {
            return Ok(None);
        }
        let legacy = self.store.get(key)?;
        data.legacy_checked.insert(key.to_string());
        if let Some(value) = &legacy {
            data.entries.insert(key.to_string(), value.clone());
        }
        self.save(data)?;
        Ok(legacy)
    }

    fn read(&self, key: &str) -> Result<Option<String>, String> {
        self.with_data(|vault, data| match data.entries.get(key) {
            Some(value) => Ok(Some(value.clone())),
            None => vault.adopt_legacy(data, key),
        })
    }

    fn write(&self, key: &str, value: &str) -> Result<(), String> {
        self.with_data(|vault, data| {
            data.entries.insert(key.to_string(), value.to_string());
            data.legacy_checked.insert(key.to_string());
            vault.save(data)
        })
    }

    fn remove(&self, key: &str) -> Result<(), String> {
        self.with_data(|vault, data| {
            data.entries.remove(key);
            data.legacy_checked.insert(key.to_string());
            vault.save(data)
        })
    }
}

fn vault() -> &'static Vault<KeychainStore> {
    static VAULT: OnceLock<Vault<KeychainStore>> = OnceLock::new();
    VAULT.get_or_init(|| Vault::new(KeychainStore))
}

pub fn read_secret(key: &str) -> Result<Option<String>, String> {
    ensure_allowed(key)?;
    vault().read(key)
}

pub fn write_secret(key: &str, value: &str) -> Result<(), String> {
    ensure_allowed(key)?;
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return vault().remove(key);
    }
    vault().write(key, trimmed)
}

pub fn remove_secret(key: &str) -> Result<(), String> {
    ensure_allowed(key)?;
    vault().remove(key)
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;
    use std::sync::{Arc, Mutex};

    use super::{is_allowed_key, SecretStore, Vault, VAULT_ACCOUNT};

    #[derive(Clone, Default)]
    struct MemoryStore {
        items: Arc<Mutex<HashMap<String, String>>>,
        reads: Arc<Mutex<Vec<String>>>,
    }

    impl SecretStore for MemoryStore {
        fn get(&self, account: &str) -> Result<Option<String>, String> {
            self.reads.lock().unwrap().push(account.to_string());
            Ok(self.items.lock().unwrap().get(account).cloned())
        }

        fn set(&self, account: &str, value: &str) -> Result<(), String> {
            self.items
                .lock()
                .unwrap()
                .insert(account.to_string(), value.to_string());
            Ok(())
        }
    }

    #[test]
    fn moves_a_legacy_item_into_the_vault() {
        let store = MemoryStore::default();
        store.set("deepgram_api_key", "dg").unwrap();
        let vault = Vault::new(store.clone());

        assert_eq!(
            vault.read("deepgram_api_key").unwrap().as_deref(),
            Some("dg")
        );
        assert!(store.items.lock().unwrap().contains_key(VAULT_ACCOUNT));

        store.reads.lock().unwrap().clear();
        let reopened = Vault::new(store.clone());
        assert_eq!(
            reopened.read("deepgram_api_key").unwrap().as_deref(),
            Some("dg")
        );
        assert_eq!(store.reads.lock().unwrap().as_slice(), [VAULT_ACCOUNT]);
    }

    #[test]
    fn reads_the_keychain_once_per_run() {
        let store = MemoryStore::default();
        let vault = Vault::new(store.clone());
        vault.write("llm_gateway_api_key", "vck").unwrap();
        store.reads.lock().unwrap().clear();

        vault.read("llm_gateway_api_key").unwrap();
        vault.read("llm_gateway_api_key").unwrap();
        vault.read("deepgram_api_key").unwrap();
        vault.read("deepgram_api_key").unwrap();

        assert_eq!(store.reads.lock().unwrap().as_slice(), ["deepgram_api_key"]);
    }

    #[test]
    fn a_removed_secret_does_not_come_back_from_a_legacy_item() {
        let store = MemoryStore::default();
        let vault = Vault::new(store.clone());
        vault.write("deepgram_api_key", "dg").unwrap();
        vault.remove("deepgram_api_key").unwrap();
        store.set("deepgram_api_key", "stale").unwrap();

        assert_eq!(vault.read("deepgram_api_key").unwrap(), None);
    }

    #[test]
    fn accepts_known_and_webhook_keys() {
        assert!(is_allowed_key("deepgram_api_key"));
        assert!(is_allowed_key(
            "webhook_secret:8f0d704d-4fd1-4f3b-b29a-a74cf82cf880"
        ));
        assert!(is_allowed_key(
            "webhook_header:8f0d704d-4fd1-4f3b-b29a-a74cf82cf880"
        ));
        assert!(is_allowed_key(
            "connection_token:8f0d704d-4fd1-4f3b-b29a-a74cf82cf880"
        ));
    }

    #[test]
    fn rejects_unknown_or_malformed_keys() {
        assert!(!is_allowed_key("anthropic_api_key"));
        assert!(!is_allowed_key("webhook_secret:"));
        assert!(!is_allowed_key("webhook_secret:../etc"));
        assert!(!is_allowed_key("webhook_other:abc"));
    }
}
