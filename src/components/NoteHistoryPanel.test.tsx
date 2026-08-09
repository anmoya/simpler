import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NoteHistoryPanel } from "./NoteHistoryPanel";
import type { NoteHistoryPanelProps } from "./NoteHistoryPanel";

const noop = () => undefined;
const defaultProps: NoteHistoryPanelProps = {
  noteHistoryOpen: true,
  noteHistoryEntries: [],
  selectedNoteHistoryCommitId: null,
  noteHistoryPreview: null,
  noteHistoryLoading: false,
  noteHistoryError: null,
  currentContent: "",
  onSelectNoteHistoryEntry: noop,
  onCloseNoteHistory: noop,
  onRestoreNoteHistoryEntry: noop,
};

function renderPanel(props: Partial<NoteHistoryPanelProps> = {}) {
  return render(<NoteHistoryPanel {...defaultProps} {...props} />);
}

describe("NoteHistoryPanel", () => {
  it("renders nothing when closed", () => {
    const { container } = renderPanel({ noteHistoryOpen: false });

    expect(container).toBeEmptyDOMElement();
  });

  it("shows an empty note-history state when there are no synced versions", () => {
    renderPanel({ noteHistoryEntries: [] });

    expect(screen.getByRole("complementary", { name: "Note history" })).toHaveTextContent("No synced versions yet.");
  });

  it("lists history entries and selects one on click", async () => {
    const onSelectNoteHistoryEntry = vi.fn();
    renderPanel({
      noteHistoryEntries: [
        { commitId: "abc123", summary: "Sync version 1", date: "2026-08-08T12:00:00Z" },
      ],
      onSelectNoteHistoryEntry,
    });

    const entry = screen.getByRole("button", { name: /Sync version 1/ });
    await userEvent.click(entry);

    expect(onSelectNoteHistoryEntry).toHaveBeenCalledWith({
      commitId: "abc123",
      summary: "Sync version 1",
      date: "2026-08-08T12:00:00Z",
    });
  });

  it("shows a preview and restores the selected version", async () => {
    const onRestoreNoteHistoryEntry = vi.fn();
    renderPanel({
      noteHistoryEntries: [
        { commitId: "abc123", summary: "Sync version 1", date: "2026-08-08T12:00:00Z" },
      ],
      selectedNoteHistoryCommitId: "abc123",
      noteHistoryPreview: "# Old content",
      onRestoreNoteHistoryEntry,
    });

    expect(screen.getByText("# Old content")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Restore this version" }));

    expect(onRestoreNoteHistoryEntry).toHaveBeenCalledOnce();
  });

  it("renders a line-level diff between the historical version and the current content", () => {
    renderPanel({
      noteHistoryEntries: [
        { commitId: "abc123", summary: "Sync version 1", date: "2026-08-08T12:00:00Z" },
      ],
      selectedNoteHistoryCommitId: "abc123",
      currentContent: "line one\nline two\nline three",
      noteHistoryPreview: "line one\nline two changed\nline three\nnew line",
    });

    // Unchanged line: present in both, rendered without added/removed markers.
    const unchangedLine = screen.getByText("line one").closest(".note-history__diff-line");
    expect(unchangedLine).not.toHaveClass("note-history__diff-line--added");
    expect(unchangedLine).not.toHaveClass("note-history__diff-line--removed");

    // Removed line: only in the current content, lost by restoring.
    const removedLine = screen.getByText("line two").closest(".note-history__diff-line");
    expect(removedLine).toHaveClass("note-history__diff-line--removed");

    // Added lines: only in the historical version, gained by restoring.
    const addedChangedLine = screen.getByText("line two changed").closest(".note-history__diff-line");
    expect(addedChangedLine).toHaveClass("note-history__diff-line--added");

    const addedNewLine = screen.getByText("new line").closest(".note-history__diff-line");
    expect(addedNewLine).toHaveClass("note-history__diff-line--added");
  });

  it("closes the panel via its close button", async () => {
    const onCloseNoteHistory = vi.fn();
    renderPanel({ onCloseNoteHistory });

    await userEvent.click(screen.getByRole("button", { name: "Close note history" }));

    expect(onCloseNoteHistory).toHaveBeenCalledOnce();
  });
});
