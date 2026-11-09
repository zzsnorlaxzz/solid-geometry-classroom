import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  SHAPES,
  DEFAULT_POLYGONS,
  solidGeometry,
  snapVertex,
  validPolygon,
} from "../src/geometry.js";
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
for (const shape of SHAPES)
  test(`${shape.name}: solid vertices keep the editor's axes and identities`, () => {
    for (const p of [
      DEFAULT_POLYGONS[shape.n],
      shape.n === 3
        ? [
            [-2, -3],
            [4, 0],
            [0, 3],
          ]
        : [
            [-4, 0],
            [1, -2],
            [4, 2],
            [-2, 3],
          ],
    ]) {
      const data = solidGeometry(shape, p, 6),
        base = data.find(
          (f) => f.id === (shape.kind === "prism" ? "base1" : "base0"),
        );
      for (let i = 0; i < p.length; i++) {
        close(base.vertices[i][0], p[i][0]);
        close(base.vertices[i][1], p[i][1]);
        close(base.vertices[i][2], shape.kind === "prism" ? 6 : 0);
      }
      const camera = new THREE.OrthographicCamera(-20, 20, 20, -20, 0.1, 1000);
      camera.up.set(0, 0, 1);
      camera.position.set(0, -95, 165);
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();
      const projected = base.vertices.map((v) =>
        new THREE.Vector3(...v).project(camera),
      );
      for (let i = 0; i < p.length; i++)
        for (let j = i + 1; j < p.length; j++) {
          if (Math.abs(p[i][0] - p[j][0]) > 1e-8)
            assert.equal(
              Math.sign(projected[i].x - projected[j].x),
              Math.sign(p[i][0] - p[j][0]),
            );
          if (Math.abs(p[i][1] - p[j][1]) > 1e-8)
            assert.equal(
              Math.sign(projected[i].y - projected[j].y),
              Math.sign(p[i][1] - p[j][1]),
            );
        }
    }
  });
test("Vertical and horizontal alignment snaps to exactly equal coordinates", () => {
  const p = structuredClone(DEFAULT_POLYGONS[4]),
    vertical = snapVertex(p, 2, [p[1][0] + 0.12, 2.7], 0.3);
  assert.equal(vertical[2][0], p[1][0]);
  assert.ok(validPolygon(vertical));
  const rectangle = snapVertex(
    vertical,
    3,
    [p[0][0] - 0.08, vertical[2][1] + 0.09],
    0.3,
  );
  assert.equal(rectangle[3][0], rectangle[0][0]);
  assert.equal(rectangle[3][1], rectangle[2][1]);
  assert.ok(validPolygon(rectangle));
  for (let i = 0; i < 4; i++)
    if (i !== 3) assert.deepEqual(rectangle[i], vertical[i]);
});
test("Snapping keeps geometry valid near degeneracy and cannot move another vertex", () => {
  let p = structuredClone(DEFAULT_POLYGONS[3]);
  for (const target of [
    [3.05, -1.9],
    [-3.1, -2.1],
    [7, 4],
    [0, -4],
  ]) {
    const prev = structuredClone(p);
    p = snapVertex(p, 2, target, 0.4);
    assert.ok(validPolygon(p));
    assert.deepEqual(p[0], prev[0]);
    assert.deepEqual(p[1], prev[1]);
  }
});
