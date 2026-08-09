import type { NoteHistoryEntry } from "../native/commands";
import { Icon } from "./icons";
import { diffLines } from "./lineDiff";

export interface NoteHistoryPanelProps {
  noteHistoryOpen: boolean;
  noteHistoryEntries: NoteHistoryEntry[];
  selectedNoteHistoryCommitId: string | null;
  noteHistoryPreview: string | null;
  noteHistoryLoading: boolean;
  noteHistoryError: string | null;
  currentContent: string;
  onSelectNoteHistoryEntry: (entry: NoteHistoryEntry) => void;
  onCloseNoteHistory: () => void;
  onRestoreNoteHistoryEntry: () => void;
}

export function NoteHistoryPanel({
  noteHistoryOpen,
  noteHistoryEntries,
  selectedNoteHistoryCommitId,
  noteHistoryPreview,
  noteHistoryLoading,
  noteHistoryError,
  currentContent,
  onSelectNoteHistoryEntry,
  onCloseNoteHistory,
  onRestoreNoteHistoryEntry,
}: NoteHistoryPanelProps) {
  if (!noteHistoryOpen) {
    return null;
  }

  return (
    <aside className="note-history" aria-label="Note history">
      <header className="note-history__header">
        <h2>Note history</h2>
        <button type="button" aria-label="Close note history" onClick={onCloseNoteHistory}>
          <Icon name="close" />
        </button>
      </header>
      {noteHistoryError ? <p role="alert">{noteHistoryError}</p> : null}
      {noteHistoryLoading && noteHistoryEntries.length === 0 ? <p>Loading history…</p> : null}
      {!noteHistoryLoading && !noteHistoryError && noteHistoryEntries.length === 0 ? <p>No synced versions yet.</p> : null}
      {noteHistoryEntries.length > 0 ? (
        <ol className="note-history__entries">
          {noteHistoryEntries.map((entry) => (
            <li key={entry.commitId}>
              <button
                type="button"
                className={entry.commitId === selectedNoteHistoryCommitId ? "note-history__entry note-history__entry--selected" : "note-history__entry"}
                aria-pressed={entry.commitId === selectedNoteHistoryCommitId}
                onClick={() => onSelectNoteHistoryEntry(entry)}
              >
                <strong>{entry.summary || "Sync version"}</strong>
                <time dateTime={entry.date}>{new Date(entry.date).toLocaleString()}</time>
              </button>
            </li>
          ))}
        </ol>
      ) : null}
      {selectedNoteHistoryCommitId ? (
        <section className="note-history__preview" aria-label="Historical note preview">
          {noteHistoryLoading ? <p>Loading version…</p> : null}
          {noteHistoryPreview !== null ? (
            <>
              <pre className="note-history__diff">
                {diffLines(currentContent, noteHistoryPreview).map((line, index) => (
                  <div
                    key={index}
                    className={
                      line.type === "added"
                        ? "note-history__diff-line note-history__diff-line--added"
                        : line.type === "removed"
                          ? "note-history__diff-line note-history__diff-line--removed"
                          : "note-history__diff-line"
                    }
                  >
                    <span className="note-history__diff-marker">
                      {line.type === "added" ? "+" : line.type === "removed" ? "-" : " "}
                    </span>
                    <span className="note-history__diff-text">{line.value}</span>
                  </div>
                ))}
              </pre>
              <button type="button" className="note-history__restore" onClick={onRestoreNoteHistoryEntry}>
                Restore this version
              </button>
            </>
          ) : null}
        </section>
      ) : null}
    </aside>
  );
}
