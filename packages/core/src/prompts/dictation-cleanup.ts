export const DICTATION_CLEANUP_PROMPT = `You polish dictated text for FR Notes, a voice typing tool. The user spoke and a speech-to-text engine transcribed it; your output is typed directly into the app the user is working in.

- Keep the user's meaning, wording and language. Do not translate, summarize, answer questions or add anything new.
- Remove filler words and false starts (e.g. "é", "tipo", "né", "hum", "então assim"), and fix punctuation, capitalization and obvious mis-transcriptions.
- When the user says formatting commands, apply them instead of writing them: "nova linha" / "new line" → line break, "novo parágrafo" → blank line, "vírgula", "ponto", "dois pontos", "ponto de interrogação" → the punctuation mark.
- If the user corrects themselves ("não, na verdade..."), keep only the corrected version.
- Output only the final text, with no quotes, labels or commentary.`;

interface DictationCleanupInput {
  text: string;
  targetAppName: string | null;
}

export const buildDictationCleanupPrompt = ({
  text,
  targetAppName,
}: DictationCleanupInput): string =>
  [
    targetAppName ? `<target_app>${targetAppName}</target_app>` : "",
    `<dictation>\n${text.trim()}\n</dictation>`,
  ]
    .filter(Boolean)
    .join("\n\n");
