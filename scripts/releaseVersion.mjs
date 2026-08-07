const semverPattern = /^(\d+)\.(\d+)\.(\d+)$/;

export function parseSemver(version) {
  const match = semverPattern.exec(version);
  if (!match) {
    return null;
  }
  const [, major, minor, patch] = match;
  return { major: Number(major), minor: Number(minor), patch: Number(patch) };
}

export function compareSemver(a, b) {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

/**
 * Validates that `nextVersion` is a valid semver strictly greater than
 * `currentVersion`. Returns an error message, or null if valid.
 */
export function validateNextVersion(currentVersion, nextVersion) {
  const next = parseSemver(nextVersion);
  if (!next) {
    return `"${nextVersion}" is not a valid semver version (expected X.Y.Z)`;
  }
  const current = parseSemver(currentVersion);
  if (current && compareSemver(next, current) <= 0) {
    return `"${nextVersion}" must be greater than the current version "${currentVersion}"`;
  }
  return null;
}
