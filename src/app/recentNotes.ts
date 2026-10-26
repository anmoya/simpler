export interface RecentNote {
  workspacePath: string;
  workspaceName: string;
  notePath: string;
  openedAt: string;
  available: boolean;
}
export const recentNotesStorageKey = "simpler.recentNotes";
export const showWelcomeStorageKey = "simpler.showWelcome";
export function recentNoteKey(note: Pick<RecentNote, "workspacePath" | "notePath">) { return `${note.workspacePath}\0${note.notePath}`; }
export function readRecentNotes(): RecentNote[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(recentNotesStorageKey) ?? "[]");
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    return value.filter((entry): entry is RecentNote => {
      if (!entry || typeof entry.workspacePath !== "string" || typeof entry.workspaceName !== "string" || typeof entry.notePath !== "string" || !Number.isFinite(Date.parse(entry.openedAt))) return false;
      const key = recentNoteKey(entry);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((a, b) => Date.parse(b.openedAt) - Date.parse(a.openedAt)).slice(0, 7).map((note) => ({ ...note, available: note.available !== false }));
  } catch { return []; }
}
export function saveRecentNotes(notes: RecentNote[]) { try { localStorage.setItem(recentNotesStorageKey, JSON.stringify(notes)); } catch { /* Device preferences can be unavailable. */ } }
export function readShowWelcome() { try { return localStorage.getItem(showWelcomeStorageKey) !== "false"; } catch { return true; } }
export function saveShowWelcome(show: boolean) { try { localStorage.setItem(showWelcomeStorageKey, String(show)); } catch { /* Keep the in-session preference. */ } }
export function relativeOpeningTime(openedAt: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - Date.parse(openedAt)) / 1000));
  if (seconds < 60) return "Hace un momento";
  if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `Hace ${Math.floor(seconds / 3600)} h`;
  return `Hace ${Math.floor(seconds / 86400)} días`;
}
