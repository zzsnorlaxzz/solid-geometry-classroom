import { test } from "node:test";
import assert from "node:assert/strict";
import { SHAPES, metrics, geometry, area, TAU } from "../src/geometry.js";
const close = (a, b, tol = 1e-8) =>
  assert.ok(Math.abs(a - b) < tol, `${a} ≠ ${b}`);
const dist = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
function overlap(A, B) {
  // Strict convex SAT: shared edges / tangent points are allowed.
  for (const poly of [A, B])
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i],
        q = poly[(i + 1) % poly.length],
        axis = [p[1] - q[1], q[0] - p[0]],
        len = Math.hypot(...axis);
      if (len < 1e-10) continue;
      const project = (P) =>
          P.map((p) => (p[0] * axis[0] + p[1] * axis[1]) / len),
        a = project(A),
        b = project(B);
      if (
        Math.min(Math.max(...a), Math.max(...b)) -
          Math.max(Math.min(...a), Math.min(...b)) <
        1e-7
      )
        return false;
    }
  return true;
}
for (const shape of SHAPES) {
  test(`${shape.name}: parameter extremes, area conservation, final coplanarity`, () => {
    for (const a of [2, 4, 10])
      for (const h of [2, 6, 15]) {
        const m = metrics(shape, a, h),
          flat = geometry(shape, a, h, 1),
          fold = geometry(shape, a, h, 0),
          curved = !shape.n;
        assert.equal(flat.length, m.faces);
        assert.equal(new Set(flat.map((f) => f.id)).size, m.faces);
        close(
          flat.reduce((s, f) => s + area(f), 0),
          m.S,
          curved ? m.S * 0.00015 : 1e-7,
        );
        close(
          fold.reduce((s, f) => s + area(f), 0),
          m.S,
          curved ? m.S * 0.00015 : 1e-7,
        );
        for (const f of flat) for (const v of f.vertices) close(v[2], 0, 1e-8);
        for (const t of [0.15, 0.4, 0.7, 0.9]) {
          const mid = geometry(shape, a, h, t);
          for (const f of mid) {
            assert.ok(f.vertices.flat().every(Number.isFinite));
            close(
              area(f),
              area(flat.find((g) => g.id === f.id)),
              curved ? m.S * 0.0002 : 1e-7,
            );
          }
        }
        if (shape.n) {
          assert.equal(m.edges, shape.n * (shape.kind === "prism" ? 3 : 2));
          assert.equal(
            m.vertices,
            shape.kind === "prism" ? 2 * shape.n : shape.n + 1,
          );
          for (let i = 0; i < flat.length; i++)
            for (let j = i + 1; j < flat.length; j++)
              assert.equal(
                overlap(flat[i].vertices, flat[j].vertices),
                false,
                `overlap ${i},${j}`,
              );
        } else {
          const side = flat.find((f) => !f.base),
            base = flat.find((f) => f.base);
          if (shape.kind === "cylinder") {
            close(dist(side.vertices[0], side.vertices[512]), TAU * a);
            close(dist(side.vertices[0], side.vertices[1]), h);
            const xs = side.vertices.map((p) => p[0]);
            for (const f of flat.filter((f) => f.base)) {
              const ys = f.vertices.map((p) => p[1]);
              assert.ok(
                Math.min(...ys) >= h / 2 - 1e-7 ||
                  Math.max(...ys) <= -h / 2 + 1e-7,
              );
            }
            close(Math.max(...xs) - Math.min(...xs), TAU * a);
          } else {
            const apex = side.vertices[0],
              arc = side.vertices.slice(1);
            for (const p of arc) close(dist(apex, p), m.l);
            close(m.theta, (360 * a) / Math.hypot(a, h));
            close(((m.theta * Math.PI) / 180) * m.l, TAU * a);
            close((0.5 * m.l * m.l * m.theta * Math.PI) / 180, m.L);
            for (const p of base.vertices) assert.ok(p[1] >= m.l - 1e-7);
            close(dist(base.vertices[0], arc[128]), 0);
          }
        }
      }
  });
  test(`${shape.name}: rigid polygon hinges / continuous curve mesh`, () => {
    for (const t of [0, 0.001, 0.25, 0.5, 0.75, 0.999, 1]) {
      const faces = geometry(shape, 4, 6, t);
      for (const f of faces) {
        assert.ok(area(f) > 0);
        if (shape.n) {
          let original = geometry(shape, 4, 6, 0).find((g) => g.id === f.id);
          for (let i = 0; i < f.vertices.length; i++)
            for (let j = i + 1; j < f.vertices.length; j++)
              close(
                dist(f.vertices[i], f.vertices[j]),
                dist(original.vertices[i], original.vertices[j]),
              );
        }
      }
    }
  });
}
