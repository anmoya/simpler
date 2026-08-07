import { describe, expect, it } from "vitest";
import { parseSemver, validateNextVersion } from "./releaseVersion.mjs";

describe("parseSemver", () => {
  it("parses a valid semver string", () => {
    expect(parseSemver("1.2.3")).toEqual({ major: 1, minor: 2, patch: 3 });
  });

  it("rejects non-semver strings", () => {
    expect(parseSemver("1.2")).toBeNull();
    expect(parseSemver("v1.2.3")).toBeNull();
    expect(parseSemver("1.2.3-beta")).toBeNull();
    expect(parseSemver("not-a-version")).toBeNull();
  });
});

describe("validateNextVersion", () => {
  it("accepts a version greater than the current one", () => {
    expect(validateNextVersion("0.1.0", "0.2.0")).toBeNull();
    expect(validateNextVersion("0.1.0", "1.0.0")).toBeNull();
  });

  it("rejects an invalid version string", () => {
    expect(validateNextVersion("0.1.0", "not-a-version")).toMatch(/not a valid semver/);
  });

  it("rejects a non-increasing version", () => {
    expect(validateNextVersion("0.2.0", "0.1.0")).toMatch(/must be greater/);
    expect(validateNextVersion("0.2.0", "0.2.0")).toMatch(/must be greater/);
  });
});
