export const buildNoteLink = (noteId: string, atMs: number | null) =>
  atMs === null ? `/notes/${noteId}` : `/notes/${noteId}?at=${atMs}`;
