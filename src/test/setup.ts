import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

const emptyDomRectList = {
  length: 0,
  item: () => null,
  [Symbol.iterator]: function* () {
    return;
  },
} as DOMRectList;

if (!Range.prototype.getClientRects) {
  Range.prototype.getClientRects = () => emptyDomRectList;
}

if (!Range.prototype.getBoundingClientRect) {
  Range.prototype.getBoundingClientRect = () => new DOMRect();
}

afterEach(() => {
  cleanup();
});
