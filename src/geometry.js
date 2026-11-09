export const SHAPES = [
  { id: "prism3", kind: "prism", n: 3, name: "삼각기둥" },
  { id: "prism4", kind: "prism", n: 4, name: "사각기둥" },
  { id: "pyramid3", kind: "pyramid", n: 3, name: "삼각뿔" },
  { id: "pyramid4", kind: "pyramid", n: 4, name: "사각뿔" },
];
export function validSides(s) {
  return (
    [3, 4].includes(s.length) &&
    s.every((v) => Number.isFinite(v) && v >= 2 && v <= 10) &&
    2 * Math.max(...s) < s.reduce((a, b) => a + b, 0) - 1e-7
  );
}
export function sideLimits(s, index) {
  const other = s.filter((_, i) => i !== index),
    sum = other.reduce((a, b) => a + b, 0);
  return [
    Math.max(2, Math.ceil((2 * Math.max(...other) - sum + 0.099999) * 10) / 10),
    Math.min(10, Math.floor((sum - 0.099999) * 10) / 10),
  ];
}
// Counterclockwise vertices. Four sides define a convex cyclic quadrilateral.
export function basePolygon(s) {
  if (!validSides(s))
    throw new RangeError("도형을 만들 수 없는 변의 길이입니다.");
  const [a, b, c, d] = s,
    e =
      s.length === 3
        ? c
        : Math.sqrt(((a * c + b * d) * (a * d + b * c)) / (a * b + c * d)),
    x = (a * a + e * e - b * b) / (2 * a),
    y = Math.sqrt(Math.max(0, e * e - x * x)),
    p = [
      [0, 0],
      [a, 0],
      [x, y],
    ];
  if (s.length === 4) {
    const u = [x / e, y / e],
      w = (d * d + e * e - c * c) / (2 * e),
      v = Math.sqrt(Math.max(0, d * d - w * w));
    p.push([w * u[0] - v * u[1], w * u[1] + v * u[0]]);
  }
  return p;
}
export function centroid(p) {
  let sum = 0,
    x = 0,
    y = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i],
      b = p[(i + 1) % p.length],
      c = a[0] * b[1] - b[0] * a[1];
    sum += c;
    x += (a[0] + b[0]) * c;
    y += (a[1] + b[1]) * c;
  }
  return [x / (3 * sum), y / (3 * sum)];
}
const face = (id, base, vertices) => ({ id, base, vertices });
export const DEFAULT_POLYGONS = {
  3: [
    [-3, -2],
    [3, -2],
    [-1, 2.5],
  ],
  4: [
    [-3, -2],
    [3, -2],
    [2.4, 2.5],
    [-2.5, 1.5],
  ],
};
export function validPolygon(p) {
  if (
    ![3, 4].includes(p.length) ||
    p.some(
      (v) =>
        v.length !== 2 ||
        v.some((x) => !Number.isFinite(x)) ||
        Math.abs(v[0]) > 8 ||
        Math.abs(v[1]) > 4.5,
    )
  )
    return false;
  let twiceArea = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i],
      b = p[(i + 1) % p.length],
      c = p[(i + 2) % p.length],
      dx = b[0] - a[0],
      dy = b[1] - a[1],
      length = Math.hypot(dx, dy);
    if (
      length < 1.2 ||
      length > 14 ||
      (dx * (c[1] - b[1]) - dy * (c[0] - b[0])) / length < 0.5
    )
      return false;
    twiceArea += a[0] * b[1] - b[0] * a[1];
  }
  return twiceArea >= 6;
}
// Follow a drag segment to the valid boundary instead of jumping across it.
export function moveVertex(p, index, target) {
  if (
    !validPolygon(p) ||
    !Number.isInteger(index) ||
    index < 0 ||
    index >= p.length ||
    target.some((x) => !Number.isFinite(x))
  )
    return p.map((v) => [...v]);
  const start = p[index],
    end = [
      Math.max(-8, Math.min(8, target[0])),
      Math.max(-4.5, Math.min(4.5, target[1])),
    ],
    steps = Math.max(
      1,
      Math.ceil(Math.hypot(end[0] - start[0], end[1] - start[1]) / 0.1),
    );
  let accepted = 0;
  const at = (t) =>
    p.map((v, i) =>
      i === index
        ? [
            start[0] + (end[0] - start[0]) * t,
            start[1] + (end[1] - start[1]) * t,
          ]
        : [...v],
    );
  for (let j = 1; j <= steps; j++) {
    const fraction = j / steps;
    if (validPolygon(at(fraction))) {
      accepted = fraction;
      continue;
    }
    let lo = accepted,
      hi = fraction;
    for (let k = 0; k < 20; k++) {
      const mid = (lo + hi) / 2;
      if (validPolygon(at(mid))) lo = mid;
      else hi = mid;
    }
    return at(lo);
  }
  return at(accepted);
}
export function canonicalPolygon(p) {
  if (!validPolygon(p))
    throw new RangeError("교차하거나 납작한 밑면은 사용할 수 없습니다.");
  const [x, y] = p[0],
    dx = p[1][0] - x,
    dy = p[1][1] - y,
    length = Math.hypot(dx, dy),
    ux = dx / length,
    uy = dy / length;
  return p.map((v) => [
    (v[0] - x) * ux + (v[1] - y) * uy,
    -(v[0] - x) * uy + (v[1] - y) * ux,
  ]);
}
// Solid view keeps the editor's axes and point identities. Only the net uses
// an AB-aligned coordinate frame for its hinge construction.
export function solidGeometry(shape, polygon, h) {
  const faces = geometry(shape, polygon, h, 0),
    a = polygon[0],
    b = polygon[1],
    length = Math.hypot(b[0] - a[0], b[1] - a[1]),
    ux = (b[0] - a[0]) / length,
    uy = (b[1] - a[1]) / length;
  return faces.map((f) => ({
    ...f,
    vertices: f.vertices.map((v) => {
      const x = v[0],
        y = shape.kind === "prism" ? v[2] : v[1],
        z = shape.kind === "prism" ? v[1] : v[2];
      return [a[0] + x * ux - y * uy, a[1] + x * uy + y * ux, z];
    }),
  }));
}
export function snapVertex(p, index, target, threshold = 0.3) {
  const moved = moveVertex(p, index, target),
    point = moved[index],
    other = p.filter((_, i) => i !== index),
    snap = [...point];
  for (let axis = 0; axis < 2; axis++) {
    const nearest = other.reduce(
      (best, v) =>
        Math.abs(v[axis] - point[axis]) < Math.abs(best - point[axis])
          ? v[axis]
          : best,
      other[0][axis],
    );
    const grid = Math.round(point[axis] * 2) / 2;
    if (Math.abs(nearest - point[axis]) <= threshold) snap[axis] = nearest;
    else if (Math.abs(grid - point[axis]) <= threshold * 0.5) snap[axis] = grid;
  }
  for (const q of [snap, [snap[0], point[1]], [point[0], snap[1]]]) {
    const candidate = moved.map((v, i) => (i === index ? [...q] : [...v]));
    if (!validPolygon(candidate)) continue;
    const checked = moveVertex(p, index, q);
    if (Math.hypot(checked[index][0] - q[0], checked[index][1] - q[1]) < 1e-7) {
      checked[index] = [...q];
      return checked;
    }
  }
  return moved;
}
export function triangulate(f) {
  return Array.from({ length: f.vertices.length - 2 }, (_, i) => [
    0,
    i + 1,
    i + 2,
  ]).flat();
}
export function geometry(shape, s, h, t = 0) {
  if (!Number.isFinite(h) || h < 2 || h > 15 || s.length !== shape.n)
    throw new RangeError("잘못된 치수");
  const p = Array.isArray(s[0]) ? canonicalPolygon(s) : basePolygon(s),
    n = shape.n,
    faces = [];
  s = p.map((v, i) =>
    Math.hypot(p[(i + 1) % n][0] - v[0], p[(i + 1) % n][1] - v[1]),
  );
  t = Math.min(1, Math.max(0, t));
  if (shape.kind === "prism") {
    let angle = 0;
    const chain = [[0, 0]];
    for (let i = 0; i < n; i++) {
      const a = chain[i];
      chain.push([
        a[0] + s[i] * Math.cos(angle),
        a[1] + s[i] * Math.sin(angle),
      ]);
      if (i < n - 1) {
        const a = p[i],
          b = p[i + 1],
          c = p[(i + 2) % n],
          u = [b[0] - a[0], b[1] - a[1]],
          v = [c[0] - b[0], c[1] - b[1]];
        angle +=
          Math.atan2(u[0] * v[1] - u[1] * v[0], u[0] * v[0] + u[1] * v[1]) *
          (1 - t);
      }
    }
    for (let i = 0; i < n; i++) {
      const a = chain[i],
        b = chain[i + 1];
      faces.push(
        face("side" + i, false, [
          [a[0], 0, a[1]],
          [b[0], 0, b[1]],
          [b[0], h, b[1]],
          [a[0], h, a[1]],
        ]),
      );
    }
    for (let j = 0; j < 2; j++)
      faces.push(
        face(
          "base" + j,
          true,
          p.map(([x, z]) => [
            x,
            j
              ? h + z * Math.sin((t * Math.PI) / 2)
              : -z * Math.sin((t * Math.PI) / 2),
            z * Math.cos((t * Math.PI) / 2),
          ]),
        ),
      );
  } else {
    const [cx, cy] = centroid(p);
    faces.push(
      face(
        "base0",
        true,
        p.map((v) => [...v, 0]),
      ),
    );
    for (let i = 0; i < n; i++) {
      const a = p[i],
        b = p[(i + 1) % n],
        ux = (b[0] - a[0]) / s[i],
        uy = (b[1] - a[1]) / s[i],
        nx = -uy,
        ny = ux,
        dx = cx - a[0],
        dy = cy - a[1],
        along = dx * ux + dy * uy,
        inward = dx * nx + dy * ny,
        beta = t * (Math.PI - Math.atan2(h, inward)),
        offset = inward * Math.cos(beta) - h * Math.sin(beta),
        z = inward * Math.sin(beta) + h * Math.cos(beta);
      faces.push(
        face("side" + i, false, [
          [...a, 0],
          [...b, 0],
          [a[0] + along * ux + offset * nx, a[1] + along * uy + offset * ny, z],
        ]),
      );
    }
  }
  return faces;
}
export function area(f) {
  let sum = 0,
    indices = triangulate(f);
  for (let i = 0; i < indices.length; i += 3) {
    const [a, b, c] = indices.slice(i, i + 3).map((j) => f.vertices[j]),
      u = b.map((v, k) => v - a[k]),
      v = c.map((v, k) => v - a[k]);
    sum +=
      Math.hypot(
        u[1] * v[2] - u[2] * v[1],
        u[2] * v[0] - u[0] * v[2],
        u[0] * v[1] - u[1] * v[0],
      ) / 2;
  }
  return sum;
}
