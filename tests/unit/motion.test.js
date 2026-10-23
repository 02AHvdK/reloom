import test from "node:test";
import assert from "node:assert/strict";
import { sheetSnap, rubberBand } from "../../src/motion.js";
test("sheet projects release velocity to nearest anchor and stays bounded", () => {
  assert.equal(sheetSnap(20, 0, 1000), 0);
  assert.equal(sheetSnap(20, 2, 1000), 380);
  assert.equal(sheetSnap(350, 2, 1000), 700);
  assert.equal(sheetSnap(700, -4, 1000), 0);
  assert.equal(sheetSnap(-100, 0, 1000), 0);
});
test("rubber band preserves movement inside bounds and damps overscroll", () => {
  assert.equal(rubberBand(120, 0, 700), 120);
  assert.equal(rubberBand(-100, 0, 700), -22);
  assert.equal(rubberBand(800, 0, 700), 722);
});
