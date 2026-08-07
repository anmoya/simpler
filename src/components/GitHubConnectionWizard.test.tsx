import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { GitHubConnectionWizard, isGitHubRepositoryUrl } from "./GitHubConnectionWizard";
import type { GitHubConnectionWizardState } from "../app/appState";

const closedState: GitHubConnectionWizardState = {
  isOpen: false,
  urlInput: "",
  validationError: null,
  isSubmitting: false,
  submitError: null,
};

describe("GitHubConnectionWizard", () => {
  it("reports URL edits and submit/cancel through its callbacks", async () => {
    const user = userEvent.setup();
    const onUrlChange = vi.fn();
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(
      <GitHubConnectionWizard
        state={{ ...closedState, isOpen: true }}
        isGitBacked={true}
        onUrlChange={onUrlChange}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />,
    );

    await user.type(screen.getByLabelText("GitHub repository URL"), "h");
    expect(onUrlChange).toHaveBeenCalledWith("h");

    await user.click(screen.getByRole("button", { name: "Connect" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("shows the validation error when present and disables the form while submitting", () => {
    render(
      <GitHubConnectionWizard
        state={{
          ...closedState,
          isOpen: true,
          urlInput: "https://gitlab.com/simpler/notes.git",
          validationError: "Enter a valid GitHub repository URL",
          isSubmitting: true,
        }}
        isGitBacked={false}
        onUrlChange={() => undefined}
        onSubmit={() => undefined}
        onCancel={() => undefined}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid GitHub repository URL");
    expect(screen.getByLabelText("GitHub repository URL")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Connecting…" })).toBeDisabled();
  });

  it("describes the not-yet-Git-backed case differently from the already-a-repo case", () => {
    const { rerender } = render(
      <GitHubConnectionWizard
        state={{ ...closedState, isOpen: true }}
        isGitBacked={false}
        onUrlChange={() => undefined}
        onSubmit={() => undefined}
        onCancel={() => undefined}
      />,
    );
    expect(screen.getByText("Initialize & connect")).toBeInTheDocument();

    rerender(
      <GitHubConnectionWizard
        state={{ ...closedState, isOpen: true }}
        isGitBacked={true}
        onUrlChange={() => undefined}
        onSubmit={() => undefined}
        onCancel={() => undefined}
      />,
    );
    expect(screen.getByText("Connect remote")).toBeInTheDocument();
  });
});

describe("isGitHubRepositoryUrl", () => {
  it("accepts https, ssh, and scp-style GitHub repository URLs", () => {
    expect(isGitHubRepositoryUrl("https://github.com/simpler/notes.git")).toBe(true);
    expect(isGitHubRepositoryUrl("git@github.com:simpler/notes.git")).toBe(true);
    expect(isGitHubRepositoryUrl("ssh://git@github.com/simpler/notes.git")).toBe(true);
  });

  it("rejects non-GitHub URLs", () => {
    expect(isGitHubRepositoryUrl("https://gitlab.com/simpler/notes.git")).toBe(false);
    expect(isGitHubRepositoryUrl("not a url")).toBe(false);
  });
});
