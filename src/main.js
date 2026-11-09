import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  SHAPES,
  geometry,
  triangulate,
  sideLimits,
  validSides,
} from "./geometry.js";
import "./style.css";
const $ = (id) => document.getElementById(id),
  letters = ["A", "B", "C", "D"],
  colors = ["#3478bd", "#bc7146", "#628b58", "#8b67ad"];
let n = 3,
  kind = "prism",
  h = 6,
  t = 1,
  selected = null;
const dimensions = { 3: [4, 5, 6], 4: [4, 6, 5, 7] },
  shape = () => SHAPES.find((s) => s.kind === kind && s.n === n),
  sides = () => dimensions[n];
$("app").innerHTML =
  `<section id="left"><header><div class="eyebrow">GEOMETRY CLASSROOM</div><h1>입체도형 연구실</h1></header><div id="solid-wrap"><canvas id="solid-canvas" aria-label="회전 가능한 입체도형"></canvas><div id="vertex-labels" aria-hidden="true"></div><div class="view-tools"><button id="zoom-in" aria-label="확대">＋</button><button id="zoom-out" aria-label="축소">−</button><button id="reset-view">시점 복귀</button></div></div><div id="controls"><div class="section-title"><span>입체도형 설정</span><button id="collapse" aria-expanded="true">접기</button></div><div id="settings"><div class="control-grid"><label>입체도형<select id="shape"><option value="prism">각기둥</option><option value="pyramid">각뿔</option></select></label><label>밑면 모양<select id="base-shape"><option value="3">삼각형</option><option value="4">사각형</option></select></label></div><div id="edges"></div><p id="shape-note" class="note"></p><p id="error" role="status"></p><div class="field height-field"><label for="height">입체도형의 높이</label><div class="range-row"><input id="height" type="range" min="2" max="15" step=".1" value="6"><input id="height-number" aria-label="높이" type="number" min="2" max="15" step=".1" value="6"><small>cm</small></div></div></div><div class="unfold"><label for="progress">펼쳐서 살펴보기</label><input id="progress" aria-label="전개 진행률" type="range" min="0" max="1" step=".001" value="1"></div></div></section><section id="board" aria-label="전개도"><canvas id="net-canvas" aria-label="면을 선택할 수 있는 전개도"></canvas></section>`;
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
  $("app").dataset.sides = JSON.stringify(sides());
  $("app").dataset.progress = t;
  $("app").dataset.selected = selected || "";
}
function updateRanges(source = null) {
  sides().forEach((v, i) => {
    const [min, max] = sideLimits(sides(), i);
    $("side-" + i).min = min;
    $("side-" + i).max = max;
    $("side-" + i).value = v;
    if ($("side-number-" + i) !== source) $("side-number-" + i).value = v;
    $("side-number-" + i).removeAttribute("aria-invalid");
  });
}
function renderEdges() {
  $("edges").innerHTML = sides()
    .map(
      (v, i) =>
        `<div class="field"><label for="side-${i}"><i style="background:${colors[i]}"></i>변 ${letters[i]}${letters[(i + 1) % n]}</label><div class="range-row"><input id="side-${i}" data-side="${i}" type="range" min="2" max="10" step=".1" value="${v}"><input id="side-number-${i}" data-side="${i}" aria-label="변 ${letters[i]}${letters[(i + 1) % n]} 길이" type="number" min="2" max="10" step=".1" value="${v}"><small>cm</small></div></div>`,
    )
    .join("");
  $("shape-note").textContent =
    n === 4
      ? "네 변에 맞는 원에 내접하는 사각형으로 구성합니다."
      : "세 변의 길이에 맞추어 삼각형을 구성합니다.";
  $("error").textContent = "";
  updateRanges();
}
function setSide(input) {
  const index = Number(input.dataset.side),
    value = Number(input.value),
    next = [...sides()];
  next[index] = Math.round(value * 10) / 10;
  if (input.value === "" || value < 2 || value > 10 || !validSides(next)) {
    input.setAttribute("aria-invalid", "true");
    $("error").textContent =
      "각 변은 2~10cm이며, 가장 긴 변은 나머지 변의 합보다 짧아야 합니다.";
    return false;
  }
  dimensions[n] = next;
  updateRanges(input);
  $("error").textContent = "";
  selected = null;
  rebuild(true);
  return true;
}
$("edges").addEventListener("input", (e) => {
  if (e.target.dataset.side !== undefined) setSide(e.target);
});
$("edges").addEventListener("change", (e) => {
  if (e.target.dataset.side !== undefined) {
    setSide(e.target);
    updateRanges();
  }
});
$("shape").onchange = () => {
  kind = $("shape").value;
  selected = null;
  rebuild(true);
};
$("base-shape").onchange = () => {
  n = Number($("base-shape").value);
  selected = null;
  renderEdges();
  rebuild(true);
};
for (const id of ["height", "height-number"])
  $(id).oninput = () => {
    const input = $(id),
      v = Number(input.value);
    if (input.value === "" || v < 2 || v > 15 || !Number.isFinite(v)) {
      input.setAttribute("aria-invalid", "true");
      $("error").textContent = "높이는 2~15cm로 입력해 주세요.";
      return;
    }
    h = Math.round(v * 10) / 10;
    $("height").value = h;
    if (id !== "height-number") $("height-number").value = h;
    input.removeAttribute("aria-invalid");
    $("error").textContent = "";
    rebuild(true);
  };
$("height-number").onchange = () => {
  $("height-number").value = h;
  if ($("height-number").hasAttribute("aria-invalid")) {
    $("height-number").value = h;
    $("height-number").removeAttribute("aria-invalid");
  }
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
renderEdges();
rebuild(true);
resize();
new ResizeObserver(resize).observe($("solid-wrap"));
new ResizeObserver(resize).observe($("board"));
function animate() {
  orbit.update();
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
