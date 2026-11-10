import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  SHAPES,
  triangulate,
  DEFAULT_POLYGONS,
  solidGeometry,
  isRound,
} from "./geometry.js";
import { netGeometry, netOrientation } from "./presentation.js";
import { mountAnnotations } from "./annotations.js";
import { layout } from "./ui.js";
import { mountEditor } from "./editor.js";
import "./style.css";
const $ = (id) => document.getElementById(id),
  letters = ["A", "B", "C", "D"],
  colors = ["#3478bd", "#bc7146", "#628b58", "#8b67ad"];
let n = 3,
  kind = "prism",
  h = 6,
  radius = 3,
  t = 0,
  selected = null;
const dimensions = structuredClone(DEFAULT_POLYGONS),
  shape = () =>
    SHAPES.find((s) => s.kind === kind && (isRound(s) || s.n === n)),
  sides = () => dimensions[n],
  size = () => (isRound(shape()) ? radius : sides());
$("app").innerHTML = layout;
function view(canvas, flat) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0xffffff, 0);
  const scene = new THREE.Scene(),
    camera = new THREE.OrthographicCamera(-20, 20, 20, -20, 0.1, 1000),
    group = new THREE.Group();
  scene.add(group, new THREE.AmbientLight(0xffffff, 2));
  let light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(-10, -10, 30);
  scene.add(light);
  return { renderer, scene, camera, group, flat };
}
let solid, net;
try {
  solid = view($("solid-canvas"), false);
  net = view($("net-canvas"), true);
} catch (e) {
  $("error").textContent =
    "3D 화면을 표시할 수 없습니다. 브라우저 그래픽 가속을 확인해 주세요.";
  throw e;
}
let orbit = new OrbitControls(solid.camera, $("solid-canvas")),
  netBox,
  currentNetBox,
  solidHalfHeight = 10;
const box = (data) =>
  new THREE.Box3().setFromPoints(
    data.flatMap((f) => f.vertices.map((p) => new THREE.Vector3(...p))),
  );
function clear(group) {
  for (const o of [...group.children]) {
    o.geometry?.dispose();
    o.material?.dispose();
    group.remove(o);
  }
}
function draw(view, faces) {
  clear(view.group);
  for (const f of faces) {
    const active = selected === f.id,
      g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(f.vertices.flat(), 3),
    );
    g.setIndex(triangulate(f));
    g.computeVertexNormals();
    const Material = view.flat
        ? THREE.MeshBasicMaterial
        : THREE.MeshStandardMaterial,
      mesh = new THREE.Mesh(
        g,
        new Material({
          color: active ? 0xf5bd77 : f.base ? 0xb2d2ed : 0xdce6ed,
          side: THREE.DoubleSide,
          polygonOffset: true,
          polygonOffsetFactor: 1,
          polygonOffsetUnits: 1,
        }),
      );
    mesh.userData.face = f.id;
    view.group.add(mesh);
    const pts = (f.outline || f.vertices.map((_, i) => i)).map(
      (i) => new THREE.Vector3(...f.vertices[i]),
    );
    pts.push(pts[0].clone());
    view.group.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: active ? 0xb86d23 : 0x59758b }),
      ),
    );
  }
}
function solidData() {
  return solidGeometry(shape(), size(), h);
}
function setSolidFrustum() {
  const aspect = $("solid-canvas").clientWidth / $("solid-canvas").clientHeight;
  solid.camera.left = -solidHalfHeight * aspect;
  solid.camera.right = solidHalfHeight * aspect;
  solid.camera.top = solidHalfHeight;
  solid.camera.bottom = -solidHalfHeight;
  solid.camera.updateProjectionMatrix();
}
function fitSolid(preserveDirection = false) {
  const data = solidData(),
    center = box(data).getCenter(new THREE.Vector3()),
    direction = preserveDirection
      ? solid.camera.position.clone().sub(orbit.target).normalize()
      : new THREE.Vector3(
          0,
          kind === "cone" ? -1.65 : -0.95,
          kind === "cone" ? 0.95 : 1.65,
        ).normalize();
  orbit.target.copy(center);
  solid.camera.position.copy(center).addScaledVector(direction, 100);
  solid.camera.zoom = 1;
  solid.camera.lookAt(center);
  solid.camera.updateMatrixWorld();
  const cameraPoints = data.flatMap((f) =>
      f.vertices.map((p) =>
        new THREE.Vector3(...p).applyMatrix4(solid.camera.matrixWorldInverse),
      ),
    ),
    aspect = $("solid-canvas").clientWidth / $("solid-canvas").clientHeight;
  solidHalfHeight =
    Math.max(
      ...cameraPoints.map((p) =>
        Math.max(Math.abs(p.y), Math.abs(p.x) / aspect),
      ),
    ) * 1.25;
  setSolidFrustum();
  orbit.update();
}
function resetView() {
  orbit.dispose();
  solid.camera.up.set(0, 0, 1);
  orbit = new OrbitControls(solid.camera, $("solid-canvas"));
  orbit.enableDamping = true;
  orbit.enablePan = false;
  orbit.minZoom = 0.35;
  orbit.maxZoom = 4;
  fitSolid();
}
function netCamera() {
  if (!netBox || !currentNetBox) return;
  const w = $("net-viewport").clientWidth,
    hv = $("net-viewport").clientHeight;
  if (!w || !hv) return;
  const aspect = w / hv,
    flatSize = netBox.getSize(new THREE.Vector3()),
    radius = currentNetBox.getSize(new THREE.Vector3()).length() / 2,
    blend = t ** 4,
    halfHeight =
      (((1 - blend) * radius) / Math.min(1, aspect) +
        blend * Math.max(flatSize.x / (2 * aspect), flatSize.y / 2)) *
      1.2,
    center = currentNetBox.getCenter(new THREE.Vector3()),
    orientation = netOrientation(solid.camera.quaternion, t);
  net.camera.left = -halfHeight * aspect;
  net.camera.right = halfHeight * aspect;
  net.camera.top = halfHeight;
  net.camera.bottom = -halfHeight;
  net.camera.quaternion.copy(orientation);
  net.camera.position
    .copy(center)
    .add(new THREE.Vector3(0, 0, 100).applyQuaternion(orientation));
  net.camera.zoom = 1 + (solid.camera.zoom - 1) * (1 - blend);
  net.camera.updateProjectionMatrix();
  net.camera.updateMatrixWorld();
}
function drawNet() {
  const data = netGeometry(shape(), size(), h, t);
  draw(net, data);
  currentNetBox = box(data);
}
const ink = mountAnnotations({
  canvas: $("ink-canvas"),
  tools: $("ink-tools"),
  project: ([x, y]) => {
    const p = new THREE.Vector3(x, y, 0).project(net.camera);
    return [
      ((p.x + 1) * $("net-viewport").clientWidth) / 2,
      ((1 - p.y) * $("net-viewport").clientHeight) / 2,
    ];
  },
  unproject: ([x, y]) => {
    const p = new THREE.Vector3(
      (x / $("net-viewport").clientWidth) * 2 - 1,
      1 - (y / $("net-viewport").clientHeight) * 2,
      0,
    ).unproject(net.camera);
    return [p.x, p.y];
  },
  worldPerPixel: () =>
    (net.camera.right - net.camera.left) /
    net.camera.zoom /
    $("net-viewport").clientWidth,
});
function startFolded() {
  t = 0;
  $("progress").value = 0;
  ink.clear();
}
let vertexLabels = [];
function labels() {
  if (isRound(shape())) {
    $("vertex-labels").innerHTML = "";
    vertexLabels = [];
    return;
  }
  const base = solidData().find(
    (f) => f.id === (kind === "prism" ? "base1" : "base0"),
  );
  $("vertex-labels").innerHTML = letters
    .slice(0, n)
    .map(
      (v, i) =>
        `<span class="vertex-marker" data-label="${v}" style="color:${colors[i]}"><i></i><b>${v}</b></span>`,
    )
    .join("");
  vertexLabels = Array.from($("vertex-labels").children).map((el, i) => ({
    el,
    p: new THREE.Vector3(...base.vertices[i]),
  }));
}
function rebuild(reset = false) {
  draw(solid, solidData());
  drawNet();
  netBox = box(netGeometry(shape(), size(), h, 1));
  if (reset) resetView();
  netCamera();
  ink.setEnabled(t === 1);
  labels();
  $("app").dataset.shape = shape().id;
  $("app").dataset.vertices = JSON.stringify(sides());
  $("app").dataset.radius = radius;
  $("app").dataset.height = h;
  $("height").value = h;
  $("app").dataset.progress = t;
  $("app").dataset.selected = selected || "";
}
const editor = mountEditor($("base-editor"), sides, (polygon) => {
  ink.clear();
  dimensions[n] = polygon;
  selected = null;
  rebuild();
  ensureVisible();
});
$("shape").onchange = () => {
  startFolded();
  kind = $("shape").value;
  selected = null;
  const rounded = isRound(shape());
  $("polygon-settings").hidden = rounded;
  $("radius-control").hidden = !rounded;
  $("base-shape").disabled = rounded;
  $("base-shape").querySelector('[value="circle"]').hidden = !rounded;
  $("base-shape").value = rounded ? "circle" : String(n);
  editor.render();
  rebuild(true);
};
$("base-shape").onchange = () => {
  startFolded();
  n = Number($("base-shape").value);
  dimensions[n] = structuredClone(DEFAULT_POLYGONS[n]);
  selected = null;
  editor.render();
  rebuild(true);
};
$("reset-base").onclick = () => {
  startFolded();
  dimensions[n] = structuredClone(DEFAULT_POLYGONS[n]);
  selected = null;
  editor.render();
  rebuild(true);
};
function ensureVisible() {
  if (
    solidData().some((f) =>
      f.vertices.some((v) => {
        const q = new THREE.Vector3(...v).project(solid.camera);
        return Math.abs(q.x) > 0.85 || Math.abs(q.y) > 0.85;
      }),
    )
  )
    fitSolid(true);
}
$("height").oninput = () => {
  ink.clear();
  h = Number($("height").value);
  rebuild();
  ensureVisible();
};
$("radius").oninput = () => {
  ink.clear();
  radius = Number($("radius").value);
  rebuild();
  ensureVisible();
};
$("progress").oninput = () => {
  t = Number($("progress").value);
  drawNet();
  netCamera();
  $("app").dataset.progress = t;
  ink.setEnabled(t === 1);
};
$("reset-view").onclick = resetView;
for (const [id, factor] of [
  ["zoom-in", 1.2],
  ["zoom-out", 1 / 1.2],
])
  $(id).onclick = () => {
    solid.camera.zoom = Math.min(4, Math.max(0.35, solid.camera.zoom * factor));
    solid.camera.updateProjectionMatrix();
  };
$("collapse").onclick = () => {
  const hidden = ($("settings").hidden = !$("settings").hidden);
  $("collapse").textContent = hidden ? "펼치기" : "접기";
  $("collapse").setAttribute("aria-expanded", !hidden);
  $("left").classList.toggle("collapsed", hidden);
};
const ray = new THREE.Raycaster(),
  pointer = new THREE.Vector2();
function pick(view, e) {
  const r = view.renderer.domElement.getBoundingClientRect();
  pointer.set(
    ((e.clientX - r.left) / r.width) * 2 - 1,
    (-(e.clientY - r.top) / r.height) * 2 + 1,
  );
  ray.setFromCamera(pointer, view.camera);
  selected =
    ray.intersectObjects(view.group.children).find((v) => v.object.isMesh)
      ?.object.userData.face || null;
  rebuild();
}
for (const v of [solid, net]) {
  let down;
  v.renderer.domElement.addEventListener(
    "pointerdown",
    (e) => (down = [e.clientX, e.clientY]),
  );
  v.renderer.domElement.addEventListener("pointerup", (e) => {
    if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 5)
      pick(v, e);
    down = null;
  });
  v.renderer.domElement.addEventListener("pointercancel", () => (down = null));
}
function resize() {
  const r = $("solid-wrap").getBoundingClientRect();
  solid.renderer.setSize(r.width - 52, r.height, false);
  setSolidFrustum();
  ensureVisible();
  net.renderer.setSize(
    $("net-viewport").clientWidth,
    $("net-viewport").clientHeight,
    false,
  );
  netCamera();
  ink.render();
}
rebuild(true);
resize();
new ResizeObserver(resize).observe($("solid-wrap"));
new ResizeObserver(resize).observe($("net-viewport"));
function animate() {
  orbit.update();
  netCamera();
  for (const { el, p } of vertexLabels) {
    const q = p.clone().project(solid.camera);
    el.style.left = (q.x + 1) * 0.5 * $("solid-canvas").clientWidth + "px";
    el.style.top = (-q.y + 1) * 0.5 * $("solid-canvas").clientHeight + "px";
  }
  solid.renderer.render(solid.scene, solid.camera);
  net.renderer.render(net.scene, net.camera);
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
