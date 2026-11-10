import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  SHAPES,
  DEFAULT_POLYGONS,
  geometry,
  solidGeometry,
  area,
  isRound,
} from "../src/geometry.js";
import { netGeometry, netOrientation } from "../src/presentation.js";
const close = (a, b, tolerance = 1e-8) =>
  assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);
const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));

test("Initial triangles and quadrilaterals are regular, centered polygons", () => {
  for (const p of Object.values(DEFAULT_POLYGONS)) {
    const edges = p.map((v, i) => distance(v, p[(i + 1) % p.length]));
    for (const edge of edges) close(edge, 6);
    for (let axis = 0; axis < 2; axis++)
      close(
        p.reduce((sum, v) => sum + v[axis], 0),
        0,
      );
    const radius = Math.hypot(...p[0]);
    for (const v of p) close(Math.hypot(...v), radius);
  }
});
for (const shape of SHAPES) {
  test(`${shape.name}: closed net matches solid, expanded net is planar`, () => {
    const dimensions = isRound(shape) ? 3 : DEFAULT_POLYGONS[shape.n],
      solid = solidGeometry(shape, dimensions, 6),
      closed = netGeometry(shape, dimensions, 6, 0);
    for (let i = 0; i < solid.length; i++)
      for (let j = 0; j < solid[i].vertices.length; j++)
        close(distance(solid[i].vertices[j], closed[i].vertices[j]), 0);
    for (const t of [0, 0.2, 0.5, 0.999, 1])
      for (const f of netGeometry(shape, dimensions, 6, t)) {
        assert.ok(f.vertices.flat().every(Number.isFinite));
        if (t === 1) for (const v of f.vertices) close(v[2], 0);
      }
  });
}
for (const shape of SHAPES.filter(isRound)) {
  test(`${shape.name}: unfolding preserves surface area and circular bases`, () => {
    for (const r of [1, 3, 4])
      for (const h of [2, 6, 15]) {
        const lateralArea =
          shape.kind === "cylinder"
            ? 2 * Math.PI * r * h
            : Math.PI * r * Math.hypot(r, h);
        for (const t of [0, 0.001, 0.25, 0.5, 0.9, 0.999, 1]) {
          const faces = geometry(shape, r, h, t);
          assert.equal(faces.length, shape.kind === "cylinder" ? 3 : 2);
          close(area(faces[0]) / lateralArea, 1, 0.001);
          for (const f of faces.filter((f) => f.base)) {
            close(area(f) / (Math.PI * r * r), 1, 0.001);
            const center = f.vertices.reduce(
              (sum, v) => sum.map((x, i) => x + v[i] / f.vertices.length),
              [0, 0, 0],
            );
            for (const v of f.vertices) close(distance(v, center), r);
          }
        }
        const flat = geometry(shape, r, h, 1),
          side = flat[0];
        if (shape.kind === "cylinder") {
          close(
            distance(side.vertices[0], side.vertices.at(-2)),
            2 * Math.PI * r,
          );
          close(distance(side.vertices[0], side.vertices[1]), h);
          for (const v of flat[1].vertices) assert.ok(v[1] <= 1e-8);
          for (const v of flat[2].vertices) assert.ok(v[1] >= h - 1e-8);
        } else {
          const apex = side.vertices[0],
            slant = Math.hypot(r, h);
          for (const v of side.vertices.slice(1)) {
            close(distance(v, apex), slant);
            assert.ok(v[1] <= 1e-8);
          }
          for (const v of flat[1].vertices) assert.ok(v[1] >= -1e-8);
          const arc = side.vertices
            .slice(2)
            .reduce((sum, v, i) => sum + distance(v, side.vertices[i + 1]), 0);
          close(arc / (2 * Math.PI * r), 1, 0.001);
        }
      }
    for (const [r, h] of [
      [0, 6],
      [NaN, 6],
      [5, 6],
      [3, 16],
      [3, NaN],
    ])
      assert.throws(() => geometry(shape, r, h), RangeError);
  });
}
test("Net follows solid rotation until fully expanded, then stays fixed", () => {
  const first = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(0.7, 0.2, -0.5),
    ),
    second = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(-0.8, 1.1, 0.4),
    );
  close(netOrientation(first, 0).angleTo(first), 0, 1e-7);
  for (const t of [0, 0.5, 0.99, 0.999])
    assert.ok(
      netOrientation(first, t).angleTo(netOrientation(second, t)) > 0.001,
    );
  close(netOrientation(first, 1).angleTo(new THREE.Quaternion()), 0);
  close(netOrientation(second, 1).angleTo(new THREE.Quaternion()), 0);
});
