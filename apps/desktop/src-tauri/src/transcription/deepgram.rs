use serde::Deserialize;
use tokio::net::TcpStream;
use tokio_tungstenite::tungstenite::client::IntoClientRequest;
use tokio_tungstenite::tungstenite::http::HeaderValue;
use tokio_tungstenite::{connect_async, MaybeTlsStream, WebSocketStream};
use url::Url;

const DEEPGRAM_LISTEN_URL: &str = "wss://api.deepgram.com/v1/listen";
const DEEPGRAM_MODEL: &str = "nova-3";
const ENDPOINTING_MS: &str = "300";
pub const KEEP_ALIVE_MESSAGE: &str = r#"{"type":"KeepAlive"}"#;
pub const CLOSE_STREAM_MESSAGE: &str = r#"{"type":"CloseStream"}"#;

pub type DeepgramSocket = WebSocketStream<MaybeTlsStream<TcpStream>>;

#[derive(Clone)]
pub struct DeepgramConfig {
    pub api_key: String,
    pub language: String,
    pub keyterms: Vec<String>,
    pub sample_rate: u32,
}

#[derive(Debug, PartialEq)]
pub struct DeepgramResult {
    pub transcript: String,
    pub is_final: bool,
    pub start_seconds: f64,
    pub duration_seconds: f64,
}

#[derive(Deserialize)]
struct ResultsMessage {
    #[serde(rename = "type")]
    kind: String,
    #[serde(default)]
    is_final: bool,
    #[serde(default)]
    start: f64,
    #[serde(default)]
    duration: f64,
    channel: Option<ResultsChannel>,
}

#[derive(Deserialize)]
struct ResultsChannel {
    alternatives: Vec<ResultsAlternative>,
}

#[derive(Deserialize)]
struct ResultsAlternative {
    transcript: String,
}

pub fn build_listen_url(config: &DeepgramConfig) -> Result<Url, String> {
    let mut url = Url::parse(DEEPGRAM_LISTEN_URL).map_err(|error| error.to_string())?;
    {
        let mut query = url.query_pairs_mut();
        query
            .append_pair("model", DEEPGRAM_MODEL)
            .append_pair("language", &config.language)
            .append_pair("encoding", "linear16")
            .append_pair("sample_rate", &config.sample_rate.to_string())
            .append_pair("channels", "1")
            .append_pair("smart_format", "true")
            .append_pair("punctuate", "true")
            .append_pair("interim_results", "true")
            .append_pair("endpointing", ENDPOINTING_MS);
        for keyterm in config.keyterms.iter().filter(|term| !term.trim().is_empty()) {
            query.append_pair("keyterm", keyterm.trim());
        }
    }
    Ok(url)
}

pub async fn connect_deepgram(config: &DeepgramConfig) -> Result<DeepgramSocket, String> {
    let url = build_listen_url(config)?;
    let mut request = url
        .as_str()
        .into_client_request()
        .map_err(|error| error.to_string())?;
    let authorization = HeaderValue::from_str(&format!("Token {}", config.api_key))
        .map_err(|error| error.to_string())?;
    request.headers_mut().insert("Authorization", authorization);
    let (socket, _) = connect_async(request)
        .await
        .map_err(|error| format!("deepgram_connection_failed: {error}"))?;
    Ok(socket)
}

pub fn parse_result(text: &str) -> Option<DeepgramResult> {
    let message: ResultsMessage = serde_json::from_str(text).ok()?;
    if message.kind != "Results" {
        return None;
    }
    let transcript = message.channel?.alternatives.into_iter().next()?.transcript;
    if transcript.trim().is_empty() {
        return None;
    }
    Some(DeepgramResult {
        transcript,
        is_final: message.is_final,
        start_seconds: message.start,
        duration_seconds: message.duration,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_config() -> DeepgramConfig {
        DeepgramConfig {
            api_key: "key".into(),
            language: "pt-BR".into(),
            keyterms: vec!["FR Hub".into(), " ".into()],
            sample_rate: 48_000,
        }
    }

    #[test]
    fn builds_url_with_keyterms() {
        let url = build_listen_url(&sample_config()).unwrap();
        let query = url.query().unwrap();
        assert!(query.contains("model=nova-3"));
        assert!(query.contains("language=pt-BR"));
        assert!(query.contains("sample_rate=48000"));
        assert!(query.contains("keyterm=FR+Hub"));
        assert_eq!(query.matches("keyterm=").count(), 1);
    }

    #[test]
    fn parses_final_results() {
        let text = r#"{"type":"Results","is_final":true,"start":1.5,"duration":2.0,"channel":{"alternatives":[{"transcript":"olá mundo"}]}}"#;
        let result = parse_result(text).unwrap();
        assert_eq!(result.transcript, "olá mundo");
        assert!(result.is_final);
        assert_eq!(result.start_seconds, 1.5);
    }

    #[test]
    fn skips_empty_and_metadata() {
        assert!(parse_result(r#"{"type":"Metadata"}"#).is_none());
        let empty = r#"{"type":"Results","channel":{"alternatives":[{"transcript":"  "}]}}"#;
        assert!(parse_result(empty).is_none());
    }
}
