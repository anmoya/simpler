import type { GitHubConnectionWizardState } from "../app/appState";

export function GitHubConnectionWizard({
  state,
  isGitBacked,
  onUrlChange,
  onSubmit,
  onCancel,
}: {
  state: GitHubConnectionWizardState;
  isGitBacked: boolean;
  onUrlChange: (url: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const error = state.validationError ?? state.submitError;

  return (
    <div className="dialog-overlay" role="presentation" onClick={onCancel}>
      <form
        className="command-popover app-dialog github-connection-wizard"
        role="dialog"
        aria-modal="true"
        aria-label="GitHub Connection Wizard"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <p className="app-dialog__title">
          {isGitBacked ? "Connect remote" : "Initialize & connect"}
        </p>
        <p className="github-connection-wizard__description">
          {isGitBacked
            ? "This Workspace is already a Git repository. Add a GitHub remote to start syncing."
            : "This Workspace isn't a Git repository yet. Simpler will initialize it and connect it to GitHub."}
        </p>
        <label className="github-connection-wizard__field">
          GitHub repository URL
          <input
            type="text"
            value={state.urlInput}
            disabled={state.isSubmitting}
            autoFocus
            onChange={(event) => onUrlChange(event.target.value)}
          />
        </label>
        {error ? (
          <p role="alert" className="github-connection-wizard__error">
            {error}
          </p>
        ) : null}
        <div className="app-dialog__actions">
          <button type="button" onClick={onCancel} disabled={state.isSubmitting}>
            Cancel
          </button>
          <button type="submit" className="app-dialog__confirm" disabled={state.isSubmitting}>
            {state.isSubmitting ? "Connecting…" : "Connect"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function isGitHubRepositoryUrl(url: string): boolean {
  const prefixes = [
    "https://github.com/",
    "http://github.com/",
    "git@github.com:",
    "ssh://git@github.com/",
    "git://github.com/",
  ];

  if (!prefixes.some((prefix) => url.startsWith(prefix))) {
    return false;
  }

  const trimmed = url.replace(/\/+$/, "");
  const separatorIndex = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf(":"));
  return separatorIndex >= 0 && trimmed.slice(separatorIndex + 1).length > 0;
}
