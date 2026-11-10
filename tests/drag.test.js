import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SHAPES,
  DEFAULT_POLYGONS,
  canonicalPolygon,
  basePolygon,
  validPolygon,
  moveVertex,
  geometry,
  area,
} from "../src/geometry.js";
const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);
function overlap(A, B) {
  for (const p of [A, B])
    for (let i = 0; i < p.length; i++) {
      const a = p[i],
        b = p[(i + 1) % p.length],
        u = [a[1] - b[1], b[0] - a[0]],
        length = Math.hypot(...u);
      if (length < 1e-9) continue;
      const proj = (P) => P.map((v) => (v[0] * u[0] + v[1] * u[1]) / length),
        x = proj(A),
        y = proj(B);
      if (
        Math.min(Math.max(...x), Math.max(...y)) -
          Math.max(Math.min(...x), Math.min(...y)) <
        1e-7
      )
        return false;
    }
  return true;
}
test("Editor accepts noncyclic convex quadrilaterals, rejects crossed/concave/flat polygons", () => {
  assert.ok(validPolygon(DEFAULT_POLYGONS[4]));
  const p = canonicalPolygon([[-3, -2], [3, -2], [2.4, 2.5], [-2.5, 1.5]]),
    lengths = p.map((v, i) => distance(v, p[(i + 1) % 4])),
    cyclic = basePolygon(lengths);
  assert.ok(distance(p[3], cyclic[3]) > 0.1);
  for (const bad of [
    [
      [0, 0],
      [4, 4],
      [4, 0],
      [0, 4],
    ],
    [
      [0, 0],
      [4, 0],
      [1, 1],
      [0, 4],
    ],
    [
      [0, 0],
      [4, 0],
      [2, 0.01],
    ],
    [
      [0, 0],
      [0.1, 0],
      [0, 4],
    ],
  ])
    assert.equal(validPolygon(bad), false);
});
for (const n of [3, 4])
  test(`Dragging ${n} vertices preserves a valid polygon and exact solid faces`, () => {
    let p = structuredClone(DEFAULT_POLYGONS[n]),
      seed = 12345;
    const random = () => {
      seed = (1664525 * seed + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let k = 0; k < 70; k++) {
      const index = k % n,
        original = structuredClone(p);
      p = moveVertex(p, index, [(random() - 0.5) * 24, (random() - 0.5) * 16]);
      assert.ok(validPolygon(p));
      for (let i = 0; i < n; i++)
        if (i !== index) assert.deepEqual(p[i], original[i]);
      for (const shape of SHAPES.filter((s) => s.n === n))
        for (const h of [2, 6, 15]) {
          const closed = geometry(shape, p, h, 0),
            flat = geometry(shape, p, h, 1);
          for (let i = 0; i < flat.length; i++)
            for (let j = i + 1; j < flat.length; j++)
              assert.equal(
                overlap(flat[i].vertices, flat[j].vertices),
                false,
                JSON.stringify({ p, h, shape: shape.id, i, j }),
              );
          for (const t of [0, 0.5, 1])
            for (const [i, f] of geometry(shape, p, h, t).entries()) {
              close(area(f), area(closed[i]));
              assert.ok(f.vertices.flat().every(Number.isFinite));
              for (let a = 0; a < f.vertices.length; a++)
                for (let b = a + 1; b < f.vertices.length; b++)
                  close(
                    distance(f.vertices[a], f.vertices[b]),
                    distance(closed[i].vertices[a], closed[i].vertices[b]),
                  );
              if (t === 1) for (const v of f.vertices) close(v[2], 0);
            }
        }
    }
  });
test("Dragging to invalid positions stops at a valid boundary and leaves the source untouched", () => {
  const initial = structuredClone(DEFAULT_POLYGONS[3]),
    original = structuredClone(initial),
    next = moveVertex(initial, 2, [0, -4.5]);
  assert.ok(validPolygon(next));
  assert.deepEqual(initial, original);
  assert.notDeepEqual(next[2], [0, -4.5]);
  assert.deepEqual(moveVertex(initial, 1, [NaN, 1]), initial);
});
