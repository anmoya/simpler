import { describe, expect, it } from "vitest";
import { nativeDropClientPoint } from "./nativeDropChannel";

// Only the coordinate translation is covered here. The subscription itself is
// deliberately untested: mocking a synthetic native event would reproduce
// exactly the false confidence that closed this feature twice while it was
// inoperative — it is verified by a real drag instead.
describe("nativeDropClientPoint", () => {
  it("passes physical pixels through unchanged at scale factor 1", () => {
    expect(nativeDropClientPoint({ x: 402, y: 146 }, 1)).toEqual({ x: 402, y: 146 });
  });

  it("divides by the monitor scale factor on a HiDPI screen", () => {
    expect(nativeDropClientPoint({ x: 804, y: 292 }, 2)).toEqual({ x: 402, y: 146 });
    expect(nativeDropClientPoint({ x: 603, y: 219 }, 1.5)).toEqual({ x: 402, y: 146 });
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "falls back to 1 for an unusable scale factor (%s)",
    (scaleFactor) => {
      expect(nativeDropClientPoint({ x: 402, y: 146 }, scaleFactor)).toEqual({ x: 402, y: 146 });
    },
  );
});
