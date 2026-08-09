// Recognising "the thing just dropped on the editor is an image I can import"
// is all dirty casuistry — `text/uri-list` framing, `file://` host forms,
// percent-encoding, case-insensitive extensions — behind one narrow signature.
// It lives here, free of DOM and Tauri, because it is where the real bug risk
// is and it is the only part of the drop path that can be tested exhaustively
// without a webview. The two accepted input shapes are the two shapes the drop
// can arrive in: a raw `text/uri-list` string (DOM channel) or a list of
// absolute paths (native channel).

// Must stay in step with `IMPORTABLE_IMAGE_EXTENSIONS` in `src-tauri/src/lib.rs`:
// recognising an extension the backend then rejects turns a drop that should be
// a silent no-op into a visible import failure.
const importableImageExtensions = new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp"]);

// Hosts a local drop may legitimately carry. Anything else names another
// machine, which is not a path we can read.
const localFileUriHosts = new Set(["", "localhost"]);

function decodePercentEncoding(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    // An invalid escape sequence must not throw: the undecoded path is still
    // the user's best guess at the file they dropped.
    return value;
  }
}

function toAbsolutePath(entry: string): string | undefined {
  if (entry.startsWith("file://")) {
    const afterScheme = entry.slice("file://".length);
    const pathStart = afterScheme.indexOf("/");

    if (pathStart === -1) {
      return undefined;
    }

    const host = afterScheme.slice(0, pathStart);

    if (!localFileUriHosts.has(host.toLowerCase())) {
      return undefined;
    }

    return decodePercentEncoding(afterScheme.slice(pathStart));
  }

  if (entry.startsWith("/")) {
    return decodePercentEncoding(entry);
  }

  return undefined;
}

function isImagePath(path: string) {
  const baseName = path.slice(path.lastIndexOf("/") + 1);
  const dotIndex = baseName.lastIndexOf(".");

  if (dotIndex <= 0) {
    return false;
  }

  return importableImageExtensions.has(baseName.slice(dotIndex + 1).toLowerCase());
}

/**
 * Returns the absolute path of the first importable image in a dropped
 * `text/uri-list` string or list of paths, or `undefined` when there is none.
 * Extra entries are ignored without error: one drop imports one image.
 */
export function findDroppedImagePath(
  dropped: string | readonly string[] | null | undefined,
): string | undefined {
  if (!dropped) {
    return undefined;
  }

  const entries = typeof dropped === "string" ? dropped.split(/\r?\n/) : dropped;

  for (const rawEntry of entries) {
    const entry = rawEntry.trim();

    if (!entry || entry.startsWith("#")) {
      continue;
    }

    const path = toAbsolutePath(entry);

    if (path && isImagePath(path)) {
      return path;
    }
  }

  return undefined;
}
