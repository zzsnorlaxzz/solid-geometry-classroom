import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SHAPES,
  basePolygon,
  geometry,
  area,
  validSides,
  sideLimits,
  centroid,
} from "../src/geometry.js";
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`),
  distance = (a, b) => Math.hypot(...a.map((x, i) => x - b[i]));
function overlap(A, B) {
  for (const p of [A, B])
    for (let i = 0; i < p.length; i++) {
      const a = p[i],
        b = p[(i + 1) % p.length],
        u = [a[1] - b[1], b[0] - a[0]],
        len = Math.hypot(...u);
      if (len < 1e-9) continue;
      const project = (P) => P.map((v) => (v[0] * u[0] + v[1] * u[1]) / len),
        x = project(A),
        y = project(B);
      if (
        Math.min(Math.max(...x), Math.max(...y)) -
          Math.max(Math.min(...x), Math.min(...y)) <
        1e-7
      )
        return false;
    }
  return true;
}
const cases = {
  3: [
    [4, 5, 6],
    [3, 4, 5],
    [2, 2, 3.9],
    [2, 9, 10],
    [10, 10, 2],
    [2, 10, 9.9],
  ],
  4: [
    [4, 6, 5, 7],
    [2, 2, 2, 5.9],
    [10, 2, 2, 7],
    [2, 10, 9.9, 2],
    [10, 10, 2, 2],
    [3, 4, 5, 6],
  ],
};
for (const shape of SHAPES)
  test(`${shape.name}: independent sides, rigid hinges, no overlaps`, () => {
    for (const s of cases[shape.n])
      for (const h of [2, 6, 15]) {
        const p = basePolygon(s);
        for (let i = 0; i < s.length; i++)
          close(distance(p[i], p[(i + 1) % s.length]), s[i]);
        const closed = geometry(shape, s, h, 0),
          flat = geometry(shape, s, h, 1);
        assert.equal(flat.length, shape.n + (shape.kind === "prism" ? 2 : 1));
        for (const f of flat) for (const v of f.vertices) close(v[2], 0);
        for (let i = 0; i < flat.length; i++)
          for (let j = i + 1; j < flat.length; j++)
            assert.equal(
              overlap(flat[i].vertices, flat[j].vertices),
              false,
              JSON.stringify({ s, h, faces: [i, j] }),
            );
        for (const t of [0, 0.001, 0.2, 0.5, 0.9, 0.999, 1])
          for (const [i, f] of geometry(shape, s, h, t).entries()) {
            close(area(f), area(closed[i]));
            assert.ok(f.vertices.flat().every(Number.isFinite));
            for (let j = 0; j < f.vertices.length; j++)
              for (let k = j + 1; k < f.vertices.length; k++)
                close(
                  distance(f.vertices[j], f.vertices[k]),
                  distance(closed[i].vertices[j], closed[i].vertices[k]),
                );
          }
        if (shape.kind === "prism")
          close(
            closed.reduce((a, f) => a + area(f), 0),
            2 * area({ vertices: p.map((v) => [...v, 0]) }) +
              s.reduce((a, b) => a + b, 0) * h,
          );
        else {
          const apex = closed[1].vertices[2],
            center = centroid(p);
          close(apex[0], center[0]);
          close(apex[1], center[1]);
          close(apex[2], h);
        }
      }
  });
test("Invalid polygons rejected; slider bounds retain valid polygons", () => {
  for (const s of [
    [2, 2, 4],
    [2, 2, 10],
    [2, 2, 2, 6],
    [0, 4, 5],
    [NaN, 4, 5],
  ]) {
    assert.equal(validSides(s), false);
    assert.throws(() => basePolygon(s), RangeError);
  }
  for (const n of [3, 4])
    for (const s of cases[n])
      for (let i = 0; i < n; i++) {
        const [lo, hi] = sideLimits(s, i);
        for (const v of [lo, hi]) {
          const p = [...s];
          p[i] = v;
          assert.ok(validSides(p));
        }
      }
});
test("Only four requested solids remain", () =>
  assert.deepEqual(
    SHAPES.map((s) => s.id),
    ["prism3", "prism4", "pyramid3", "pyramid4"],
  ));
