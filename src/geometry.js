export const TAU = Math.PI * 2;
export const SHAPES = [
  ...[3, 4, 5, 6].map((n) => ({
    id: `prism${n}`,
    kind: "prism",
    n,
    name: ["", "", "", "삼각기둥", "사각기둥", "오각기둥", "육각기둥"][n],
  })),
  ...[3, 4, 5, 6].map((n) => ({
    id: `pyramid${n}`,
    kind: "pyramid",
    n,
    name: ["", "", "", "삼각뿔", "사각뿔", "오각뿔", "육각뿔"][n],
  })),
  { id: "cylinder", kind: "cylinder", name: "원기둥" },
  { id: "cone", kind: "cone", name: "원뿔" },
];
export function metrics(shape, a, h) {
  const { kind, n } = shape,
    round = kind === "cone" || kind === "cylinder",
    r = round ? a : a / (2 * Math.sin(Math.PI / n)),
    b = round ? a : a / (2 * Math.tan(Math.PI / n)),
    p = round ? TAU * a : n * a,
    B = round ? Math.PI * a * a : (p * b) / 2,
    l = Math.hypot(h, b),
    L = kind === "prism" || kind === "cylinder" ? p * h : (p * l) / 2;
  return {
    r,
    b,
    p,
    B,
    l,
    L,
    S: B * (kind === "prism" || kind === "cylinder" ? 2 : 1) + L,
    theta: round ? (360 * a) / l : null,
    faces: round ? (kind === "cone" ? 2 : 3) : n + (kind === "prism" ? 2 : 1),
    edges: round ? null : n * (kind === "prism" ? 3 : 2),
    vertices: round ? null : kind === "prism" ? 2 * n : n + 1,
  };
}
const point = (x, y, z = 0) => [x, y, z];
const face = (id, base, vertices, triangles = null, boundary = null) => ({
  id,
  base,
  vertices,
  triangles,
  boundary: boundary || vertices.map((_, i) => i),
});
function fan(n) {
  return Array.from({ length: n - 2 }, (_, i) => [0, i + 1, i + 2]).flat();
}
export function triangulate(f) {
  return f.triangles || fan(f.vertices.length);
}
export function geometry(shape, a, h, t = 0, segments = 256) {
  const { kind, n } = shape,
    m = metrics(shape, a, h),
    faces = [];
  if (kind === "prism") {
    const chain = [[-a / 2, 0]];
    let angle = 0;
    for (let i = 0; i < n; i++) {
      let [x, z] = chain[i];
      chain.push([x + a * Math.cos(angle), z + a * Math.sin(angle)]);
      angle += (TAU / n) * (1 - t);
    }
    for (let i = 0; i < n; i++) {
      let A = chain[i],
        B = chain[i + 1];
      faces.push(
        face(`side${i}`, false, [
          point(A[0], -h / 2, A[1]),
          point(B[0], -h / 2, B[1]),
          point(B[0], h / 2, B[1]),
          point(A[0], h / 2, A[1]),
        ]),
      );
    }
    let poly = [[-a / 2, 0]],
      ang = 0;
    for (let i = 1; i < n; i++) {
      let v = poly[i - 1];
      poly.push([v[0] + a * Math.cos(ang), v[1] + a * Math.sin(ang)]);
      ang += TAU / n;
    }
    for (let j = 0; j < 2; j++)
      faces.push(
        face(
          `base${j}`,
          true,
          poly.map(([x, z]) =>
            point(
              x,
              (j ? 1 : -1) * (h / 2 + z * Math.sin((t * Math.PI) / 2)),
              z * Math.cos((t * Math.PI) / 2),
            ),
          ),
        ),
      );
  } else if (kind === "pyramid") {
    let poly = Array.from({ length: n }, (_, i) =>
      point(m.r * Math.cos((TAU * i) / n), m.r * Math.sin((TAU * i) / n)),
    );
    faces.push(face("base0", true, poly));
    for (let i = 0; i < n; i++) {
      let A = poly[i],
        B = poly[(i + 1) % n],
        mx = (A[0] + B[0]) / 2,
        my = (A[1] + B[1]) / 2,
        beta = t * (Math.PI - Math.atan2(h, m.b)),
        out = -m.b * Math.cos(beta) + h * Math.sin(beta),
        z = m.b * Math.sin(beta) + h * Math.cos(beta);
      faces.push(
        face(`side${i}`, false, [
          A,
          B,
          point(mx + (out * mx) / m.b, my + (out * my) / m.b, z),
        ]),
      );
    }
  } else if (kind === "cylinder") {
    let verts = [],
      tri = [];
    const k = (1 - t) / a;
    for (let i = 0; i <= segments; i++) {
      let s = (i / segments - 0.5) * TAU * a,
        x = k < 1e-8 ? s : Math.sin(k * s) / k,
        z = k < 1e-8 ? 0 : (2 * Math.sin((k * s) / 2) ** 2) / k;
      verts.push(point(x, -h / 2, z), point(x, h / 2, z));
      if (i < segments) {
        let j = i * 2;
        tri.push(j, j + 2, j + 1, j + 1, j + 2, j + 3);
      }
    }
    let edge = [
      ...Array.from({ length: segments + 1 }, (_, i) => i * 2),
      ...Array.from({ length: segments + 1 }, (_, i) => (segments - i) * 2 + 1),
    ];
    faces.push(face("side0", false, verts, tri, edge));
    for (let j = 0; j < 2; j++) {
      let poly = Array.from({ length: segments }, (_, i) => {
        let ph = (TAU * i) / segments,
          x = a * Math.sin(ph),
          z = a * (1 - Math.cos(ph));
        return point(
          x,
          (j ? 1 : -1) * (h / 2 + z * Math.sin((t * Math.PI) / 2)),
          z * Math.cos((t * Math.PI) / 2),
        );
      });
      faces.push(face(`base${j}`, true, poly));
    }
  } else {
    const q = a / m.l + (1 - a / m.l) * t,
      opening = (TAU * a) / m.l,
      verts = [point(0, 0, m.l * Math.sqrt(Math.max(0, 1 - q * q)))],
      tri = [];
    for (let i = 0; i <= segments; i++) {
      let ph = ((i / segments - 0.5) * opening) / q;
      verts.push(point(m.l * q * Math.sin(ph), m.l * q * Math.cos(ph), 0));
      if (i < segments) tri.push(0, i + 1, i + 2);
    }
    faces.push(
      face("side0", false, verts, tri, [
        0,
        ...Array.from({ length: segments + 1 }, (_, i) => i + 1),
      ]),
    );
    faces.push(
      face(
        "base0",
        true,
        Array.from({ length: segments }, (_, i) => {
          let ph = (TAU * i) / segments,
            d = a * (1 - Math.cos(ph));
          return point(
            a * Math.sin(ph),
            m.l * q - d * Math.cos(Math.PI * t),
            -d * Math.sin(Math.PI * t),
          );
        }),
      ),
    );
  }
  return faces;
}
export function area(f) {
  let inds = triangulate(f),
    A = 0;
  for (let i = 0; i < inds.length; i += 3) {
    let [a, b, c] = inds.slice(i, i + 3).map((j) => f.vertices[j]),
      u = b.map((v, k) => v - a[k]),
      v = c.map((v, k) => v - a[k]);
    A +=
      Math.hypot(
        u[1] * v[2] - u[2] * v[1],
        u[2] * v[0] - u[0] * v[2],
        u[0] * v[1] - u[1] * v[0],
      ) / 2;
  }
  return A;
}
