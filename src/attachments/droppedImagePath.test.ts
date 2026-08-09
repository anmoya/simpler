import { describe, expect, it } from "vitest";
import { findDroppedImagePath } from "./droppedImagePath";

describe("findDroppedImagePath", () => {
  describe("from a raw text/uri-list string", () => {
    it("keeps the leading slash of a three-slash file URI", () => {
      expect(findDroppedImagePath("file:///home/user/foto.png")).toBe("/home/user/foto.png");
    });

    it("accepts an empty-host and a localhost file URI", () => {
      expect(findDroppedImagePath("file://localhost/home/user/foto.png")).toBe(
        "/home/user/foto.png",
      );
    });

    it("ignores a file URI pointing at another host", () => {
      expect(findDroppedImagePath("file://nas.local/share/foto.png")).toBeUndefined();
    });

    it("decodes percent-encoded spaces and accents", () => {
      expect(findDroppedImagePath("file:///home/user/captura%20a%C3%B1o.png")).toBe(
        "/home/user/captura año.png",
      );
    });

    it("falls back to the undecoded path when percent-encoding is invalid", () => {
      expect(findDroppedImagePath("file:///home/user/broken%zz.png")).toBe(
        "/home/user/broken%zz.png",
      );
    });

    it("skips blank lines, comments and trailing CRLF", () => {
      expect(
        findDroppedImagePath("# comment\r\n\r\nfile:///home/user/foto.png\r\n"),
      ).toBe("/home/user/foto.png");
    });

    it.each(["FOTO.PNG", "foto.JPEG", "foto.jpg", "foto.WebP", "foto.gif", "foto.bmp"])(
      "recognises %s as an importable image",
      (fileName) => {
        expect(findDroppedImagePath(`file:///home/user/${fileName}`)).toBe(
          `/home/user/${fileName}`,
        );
      },
    );

    it.each([
      ["a path without extension", "file:///home/user/README"],
      ["a non-image extension", "file:///home/user/notes.pdf"],
      ["a dotted folder but extensionless file", "file:///home/us.er/foto"],
      ["a non-file scheme", "https://example.com/foto.png"],
      ["an empty string", ""],
      ["only comments", "# just a comment\r\n"],
      ["garbage", "not a uri at all"],
    ])("returns nothing for %s", (_label, uriList) => {
      expect(findDroppedImagePath(uriList)).toBeUndefined();
    });

    it("returns only the first recognised image across several lines", () => {
      expect(
        findDroppedImagePath(
          "file:///home/user/notes.pdf\r\nfile:///home/user/first.png\r\nfile:///home/user/second.png",
        ),
      ).toBe("/home/user/first.png");
    });
  });

  describe("from a list of absolute paths", () => {
    it("returns the first image path", () => {
      expect(
        findDroppedImagePath(["/home/user/notes.pdf", "/home/user/first.png", "/home/user/b.png"]),
      ).toBe("/home/user/first.png");
    });

    it("accepts file URIs mixed into the list", () => {
      expect(findDroppedImagePath(["file:///home/user/captura%20a%C3%B1o.png"])).toBe(
        "/home/user/captura año.png",
      );
    });

    it("returns nothing for an empty list or a list without images", () => {
      expect(findDroppedImagePath([])).toBeUndefined();
      expect(findDroppedImagePath(["/home/user/archive.zip"])).toBeUndefined();
    });
  });

  it("returns nothing for null or undefined input", () => {
    expect(findDroppedImagePath(null)).toBeUndefined();
    expect(findDroppedImagePath(undefined)).toBeUndefined();
  });
});
