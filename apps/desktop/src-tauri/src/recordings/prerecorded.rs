use std::path::Path;
use std::time::Duration;

use serde::{Deserialize, Serialize};
use url::Url;

use super::files::RecordingFile;

const PRERECORDED_URL: &str = "https://api.deepgram.com/v1/listen";
const MODEL: &str = "nova-3";
const SYSTEM_SOURCE: &str = "system";
const REQUEST_TIMEOUT: Duration = Duration::from_secs(15 * 60);
const MILLIS_PER_SECOND: f64 = 1000.0;

#[derive(Deserialize)]
struct PrerecordedResponse {
    results: PrerecordedResults,
}

#[derive(Deserialize)]
struct PrerecordedResults {
    #[serde(default)]
    utterances: Vec<Utterance>,
}

#[derive(Deserialize)]
struct Utterance {
    start: f64,
    end: f64,
    transcript: String,
    speaker: Option<u32>,
}

#[derive(Serialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct RetranscribedSegment {
    pub source: String,
    pub start_ms: u64,
    pub end_ms: u64,
    pub text: String,
    pub speaker: Option<u32>,
}

pub struct PrerecordedOptions<'a> {
    pub api_key: &'a str,
    pub language: &'a str,
    pub keyterms: &'a [String],
}

pub fn build_prerecorded_url(
    language: &str,
    keyterms: &[String],
    diarize: bool,
) -> Result<Url, String> {
    let mut url = Url::parse(PRERECORDED_URL).map_err(|error| error.to_string())?;
    {
        let mut query = url.query_pairs_mut();
        query
            .append_pair("model", MODEL)
            .append_pair("language", language)
            .append_pair(
                "smart_format",
                &crate::transcription::deepgram::uses_smart_format(language).to_string(),
            )
            .append_pair("punctuate", "true")
            .append_pair("utterances", "true");
        if diarize {
            query.append_pair("diarize", "true");
        }
        for keyterm in keyterms
            .iter()
            .map(|term| term.trim())
            .filter(|term| !term.is_empty())
        {
            query.append_pair("keyterm", keyterm);
        }
    }
    Ok(url)
}

fn content_type_for(path: &Path) -> &'static str {
    match path.extension().and_then(|ext| ext.to_str()) {
        Some("wav") => "audio/wav",
        _ => "audio/mp4",
    }
}

fn to_segments(file: &RecordingFile, utterances: Vec<Utterance>) -> Vec<RetranscribedSegment> {
    let is_system = file.source == SYSTEM_SOURCE;
    utterances
        .into_iter()
        .filter(|utterance| !utterance.transcript.trim().is_empty())
        .map(|utterance| RetranscribedSegment {
            source: file.source.clone(),
            start_ms: file.started_at_ms + (utterance.start * MILLIS_PER_SECOND) as u64,
            end_ms: file.started_at_ms + (utterance.end * MILLIS_PER_SECOND) as u64,
            text: utterance.transcript.trim().to_string(),
            speaker: if is_system { utterance.speaker } else { None },
        })
        .collect()
}

pub async fn transcribe_file(
    client: &reqwest::Client,
    file: &RecordingFile,
    options: &PrerecordedOptions<'_>,
) -> Result<Vec<RetranscribedSegment>, String> {
    let path = Path::new(&file.path);
    let body = tokio::fs::read(path)
        .await
        .map_err(|error| error.to_string())?;
    let url = build_prerecorded_url(
        options.language,
        options.keyterms,
        file.source == SYSTEM_SOURCE,
    )?;
    let response = client
        .post(url)
        .header("Authorization", format!("Token {}", options.api_key))
        .header("Content-Type", content_type_for(path))
        .timeout(REQUEST_TIMEOUT)
        .body(body)
        .send()
        .await
        .map_err(|error| error.to_string())?;
    if !response.status().is_success() {
        let status = response.status();
        let detail = response.text().await.unwrap_or_default();
        return Err(format!("Deepgram respondeu {status}: {detail}"));
    }
    let parsed: PrerecordedResponse = response.json().await.map_err(|error| error.to_string())?;
    Ok(to_segments(file, parsed.results.utterances))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn builds_a_prerecorded_url_with_diarization_only_for_system_audio() {
        let url = build_prerecorded_url("pt-BR", &["FR Hub".into(), " ".into()], true).unwrap();
        let query = url.query().unwrap();
        assert!(query.contains("model=nova-3"));
        assert!(query.contains("utterances=true"));
        assert!(query.contains("diarize=true"));
        assert_eq!(query.matches("keyterm=").count(), 1);
        let microphone = build_prerecorded_url("pt-BR", &[], false).unwrap();
        assert!(!microphone.query().unwrap().contains("diarize"));
    }

    #[test]
    fn maps_utterances_to_absolute_segments() {
        let file = RecordingFile {
            path: "/x/1000-system.m4a".into(),
            source: "system".into(),
            started_at_ms: 1_000,
        };
        let segments = to_segments(
            &file,
            vec![
                Utterance {
                    start: 1.5,
                    end: 3.0,
                    transcript: " Oi ".into(),
                    speaker: Some(1),
                },
                Utterance {
                    start: 4.0,
                    end: 4.5,
                    transcript: " ".into(),
                    speaker: Some(0),
                },
            ],
        );
        assert_eq!(
            segments,
            vec![RetranscribedSegment {
                source: "system".into(),
                start_ms: 2_500,
                end_ms: 4_000,
                text: "Oi".into(),
                speaker: Some(1),
            }]
        );
    }
}
