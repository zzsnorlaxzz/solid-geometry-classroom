import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  SHAPES,
  geometry,
  triangulate,
  DEFAULT_POLYGONS,
  canonicalPolygon,
  centroid,
} from "./geometry.js";
import { layout } from "./ui.js";
import { mountEditor } from "./editor.js";
import "./style.css";
const $ = (id) => document.getElementById(id),
  letters = ["A", "B", "C", "D"],
  colors = ["#3478bd", "#bc7146", "#628b58", "#8b67ad"];
let n = 3,
  kind = "prism",
  h = 6,
  t = 1,
  selected = null;
const dimensions = structuredClone(DEFAULT_POLYGONS),
  shape = () => SHAPES.find((s) => s.kind === kind && s.n === n),
  sides = () => dimensions[n];
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
    camera = flat
      ? new THREE.OrthographicCamera(-20, 20, 20, -20, 0.1, 1000)
      : new THREE.PerspectiveCamera(38, 1, 0.1, 1000),
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
  netBox;
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
    const pts = f.vertices.map((p) => new THREE.Vector3(...p));
    pts.push(pts[0].clone());
    view.group.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: active ? 0xb86d23 : 0x59758b }),
      ),
    );
  }
}
function resetView() {
  const b = box(geometry(shape(), sides(), h, 0)),
    center = b.getCenter(new THREE.Vector3()),
    size = b.getSize(new THREE.Vector3()).length(),
    vertical = kind === "prism";
  orbit.dispose();
  solid.camera.up.set(0, vertical ? 1 : 0, vertical ? 0 : 1);
  orbit = new OrbitControls(solid.camera, $("solid-canvas"));
  orbit.enableDamping = true;
  orbit.enablePan = false;
  orbit.target.copy(center);
  orbit.minDistance = size * 0.65;
  orbit.maxDistance = size * 4;
  solid.camera.position
    .copy(center)
    .add(
      vertical
        ? new THREE.Vector3(size * 0.9, size * 0.8, size * 1.3)
        : new THREE.Vector3(size * 0.9, -size * 1.25, size * 0.9),
    );
  solid.camera.lookAt(center);
  orbit.update();
}
function netCamera() {
  if (!netBox) return;
  const w = $("board").clientWidth,
    hv = $("board").clientHeight,
    size = netBox.getSize(new THREE.Vector3()),
    scale = Math.max(size.x / (w * 0.8), size.y / (hv * 0.8), 0.015);
  net.camera.left = (-w * scale) / 2;
  net.camera.right = (w * scale) / 2;
  net.camera.top = (hv * scale) / 2;
  net.camera.bottom = (-hv * scale) / 2;
  const folded = box(geometry(shape(), sides(), h, 0)).getCenter(
      new THREE.Vector3(),
    ),
    center = folded.lerp(netBox.getCenter(new THREE.Vector3()), t);
  net.camera.position
    .copy(center)
    .add(new THREE.Vector3(0, -30 * (1 - t), 100));
  net.camera.lookAt(center);
  net.camera.updateProjectionMatrix();
}
let vertexLabels = [];
function labels() {
  const base = geometry(shape(), sides(), h, 0).find((f) => f.base);
  $("vertex-labels").innerHTML = letters
    .slice(0, n)
    .map((v, i) => `<span style="color:${colors[i]}">${v}</span>`)
    .join("");
  vertexLabels = Array.from($("vertex-labels").children).map((el, i) => ({
    el,
    p: new THREE.Vector3(...base.vertices[i]),
  }));
}
function rebuild(reset = false) {
  draw(solid, geometry(shape(), sides(), h, 0));
  draw(net, geometry(shape(), sides(), h, t));
  netBox = box(geometry(shape(), sides(), h, 1));
  if (reset) resetView();
  netCamera();
  labels();
  $("app").dataset.shape = shape().id;
  $("app").dataset.vertices = JSON.stringify(sides());
  $("app").dataset.height = h;
  $("height-handle").setAttribute("aria-valuenow", h.toFixed(2));
  $("app").dataset.progress = t;
  $("app").dataset.selected = selected || "";
}
const editor = mountEditor($("base-editor"), sides, (polygon) => {
  dimensions[n] = polygon;
  selected = null;
  rebuild();
  ensureVisible();
});
$("shape").onchange = () => {
  kind = $("shape").value;
  selected = null;
  rebuild(true);
};
$("base-shape").onchange = () => {
  n = Number($("base-shape").value);
  selected = null;
  editor.render();
  rebuild(true);
};
$("reset-base").onclick = () => {
  dimensions[n] = structuredClone(DEFAULT_POLYGONS[n]);
  selected = null;
  editor.render();
  rebuild(true);
};
function projectPoint(p) {
  const q = p.clone().project(solid.camera);
  return new THREE.Vector2(
    (q.x + 1) * 0.5 * $("solid-wrap").clientWidth,
    (-q.y + 1) * 0.5 * $("solid-wrap").clientHeight,
  );
}
function heightAnchor() {
  const [x, y] = centroid(canonicalPolygon(sides()));
  return kind === "prism"
    ? new THREE.Vector3(x, h, y)
    : new THREE.Vector3(x, y, h);
}
function ensureVisible() {
  const data = geometry(shape(), sides(), h, 0);
  if (
    !data.some((f) =>
      f.vertices.some((v) => {
        const q = new THREE.Vector3(...v).project(solid.camera);
        return Math.abs(q.x) > 0.82 || Math.abs(q.y) > 0.82;
      }),
    )
  )
    return;
  const b = box(data),
    center = b.getCenter(new THREE.Vector3()),
    size = b.getSize(new THREE.Vector3()).length(),
    direction = solid.camera.position.clone().sub(orbit.target).normalize(),
    distance = Math.max(
      solid.camera.position.distanceTo(orbit.target),
      size * 1.75,
    );
  orbit.target.copy(center);
  solid.camera.position.copy(center).addScaledVector(direction, distance);
  orbit.minDistance = size * 0.65;
  orbit.maxDistance = size * 4;
  orbit.update();
}
let heightDrag = null;
$("height-handle").onpointerdown = (e) => {
  if (heightDrag) return;
  e.preventDefault();
  e.stopPropagation();
  orbit.enabled = false;
  heightDrag = { id: e.pointerId, x: e.clientX, y: e.clientY };
  $("height-handle").setPointerCapture(e.pointerId);
  $("height-handle").classList.add("dragging");
};
$("height-handle").onpointermove = (e) => {
  if (!heightDrag || heightDrag.id !== e.pointerId) return;
  e.preventDefault();
  const anchor = heightAnchor(),
    up =
      kind === "prism"
        ? new THREE.Vector3(0, 1, 0)
        : new THREE.Vector3(0, 0, 1),
    axis = projectPoint(anchor.clone().add(up)).sub(projectPoint(anchor)),
    delta = new THREE.Vector2(
      e.clientX - heightDrag.x,
      e.clientY - heightDrag.y,
    );
  heightDrag.x = e.clientX;
  heightDrag.y = e.clientY;
  // When looking along the height axis, its projection collapses. Keep the
  // same up/down gesture usable from this view with the camera's world scale.
  if (axis.lengthSq() <= 1) {
    const distance = solid.camera.position.distanceTo(orbit.target);
    axis.set(
      0,
      -$("solid-wrap").clientHeight /
        (2 *
          distance *
          Math.tan(THREE.MathUtils.degToRad(solid.camera.fov / 2))),
    );
  }
  if (axis.lengthSq() > 1) {
    h = Math.min(15, Math.max(2, h + delta.dot(axis) / axis.lengthSq()));
    rebuild();
    ensureVisible();
  }
};
function endHeight(e) {
  if (heightDrag?.id !== e.pointerId) return;
  heightDrag = null;
  orbit.enabled = true;
  $("height-handle").classList.remove("dragging");
  if ($("height-handle").hasPointerCapture(e.pointerId))
    $("height-handle").releasePointerCapture(e.pointerId);
}
$("height-handle").onpointerup = endHeight;
$("height-handle").onpointercancel = endHeight;
$("height-handle").onlostpointercapture = () => {
  heightDrag = null;
  orbit.enabled = true;
  $("height-handle").classList.remove("dragging");
};
$("height-handle").onkeydown = (e) => {
  let next = h;
  if (e.key === "ArrowUp" || e.key === "ArrowRight") next += 0.5;
  else if (e.key === "ArrowDown" || e.key === "ArrowLeft") next -= 0.5;
  else if (e.key === "Home") next = 2;
  else if (e.key === "End") next = 15;
  else return;
  e.preventDefault();
  h = Math.max(2, Math.min(15, next));
  rebuild();
  ensureVisible();
};
$("progress").oninput = () => {
  t = Number($("progress").value);
  draw(net, geometry(shape(), sides(), h, t));
  netCamera();
  $("app").dataset.progress = t;
};
$("reset-view").onclick = resetView;
for (const [id, factor] of [
  ["zoom-in", 0.82],
  ["zoom-out", 1.2],
])
  $(id).onclick = () => {
    solid.camera.position
      .sub(orbit.target)
      .multiplyScalar(factor)
      .add(orbit.target);
    orbit.update();
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
  solid.renderer.setSize(r.width, r.height, false);
  solid.camera.aspect = r.width / r.height;
  solid.camera.updateProjectionMatrix();
  net.renderer.setSize($("board").clientWidth, $("board").clientHeight, false);
  netCamera();
}
rebuild(true);
resize();
new ResizeObserver(resize).observe($("solid-wrap"));
new ResizeObserver(resize).observe($("board"));
function animate() {
  orbit.update();
  const handle = projectPoint(heightAnchor());
  $("height-handle").style.left =
    Math.max(24, Math.min($("solid-wrap").clientWidth - 24, handle.x)) + "px";
  $("height-handle").style.top =
    Math.max(38, Math.min($("solid-wrap").clientHeight - 48, handle.y - 8)) +
    "px";
  for (const { el, p } of vertexLabels) {
    const q = p.clone().project(solid.camera);
    el.style.left = (q.x + 1) * 0.5 * $("solid-wrap").clientWidth + "px";
    el.style.top = (-q.y + 1) * 0.5 * $("solid-wrap").clientHeight + "px";
  }
  solid.renderer.render(solid.scene, solid.camera);
  net.renderer.render(net.scene, net.camera);
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
