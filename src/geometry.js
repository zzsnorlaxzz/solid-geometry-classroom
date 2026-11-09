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
  const p = basePolygon(s),
    n = shape.n,
    faces = [];
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
          [a[0], -h / 2, a[1]],
          [b[0], -h / 2, b[1]],
          [b[0], h / 2, b[1]],
          [a[0], h / 2, a[1]],
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
            (j ? 1 : -1) * (h / 2 + z * Math.sin((t * Math.PI) / 2)),
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
