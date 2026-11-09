#[derive(Default)]
pub struct DictationTranscript {
    finals: Vec<String>,
    interim: String,
}

impl DictationTranscript {
    pub fn apply(&mut self, text: &str, is_final: bool) {
        let trimmed = text.trim();
        if !is_final {
            self.interim = trimmed.to_string();
            return;
        }
        self.interim.clear();
        if !trimmed.is_empty() {
            self.finals.push(trimmed.to_string());
        }
    }

    pub fn final_text(&self) -> String {
        join_segments(self.finals.iter().map(String::as_str))
    }

    pub fn running_text(&self) -> String {
        join_segments(self.finals.iter().map(String::as_str).chain([self.interim.as_str()]))
    }
}

pub fn join_segments<'a>(segments: impl IntoIterator<Item = &'a str>) -> String {
    segments
        .into_iter()
        .map(str::trim)
        .filter(|segment| !segment.is_empty())
        .collect::<Vec<_>>()
        .join(" ")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn joins_finals_in_order_with_single_spaces() {
        let mut transcript = DictationTranscript::default();
        transcript.apply("  Olá,  ", true);
        transcript.apply("tudo bem?", true);
        assert_eq!(transcript.final_text(), "Olá, tudo bem?");
    }

    #[test]
    fn running_text_includes_the_current_interim() {
        let mut transcript = DictationTranscript::default();
        transcript.apply("Primeira frase.", true);
        transcript.apply("segunda em and", false);
        assert_eq!(transcript.running_text(), "Primeira frase. segunda em and");
        assert_eq!(transcript.final_text(), "Primeira frase.");
    }

    #[test]
    fn a_final_replaces_the_interim() {
        let mut transcript = DictationTranscript::default();
        transcript.apply("rascunho", false);
        transcript.apply("Rascunho final.", true);
        assert_eq!(transcript.running_text(), "Rascunho final.");
    }

    #[test]
    fn empty_final_clears_interim_without_adding_text() {
        let mut transcript = DictationTranscript::default();
        transcript.apply("eh", false);
        transcript.apply("   ", true);
        assert_eq!(transcript.running_text(), "");
    }

    #[test]
    fn join_skips_blank_segments() {
        assert_eq!(join_segments(["a", " ", "", "b "]), "a b");
    }
}
