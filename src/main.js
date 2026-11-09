import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import html2canvas from "html2canvas";
import { SHAPES, metrics, geometry, triangulate } from "./geometry.js";
import "./style.css";
const $ = (id) => document.getElementById(id),
  fmt = (x) => Number(x.toFixed(2)).toLocaleString("ko-KR"),
  icons = {
    pen: '<path d="m4 17-1 4 4-1L20 7l-3-3Z M14 7l3 3"/>',
    select: '<path d="m5 3 13 9-6 1-3 7Z"/>',
    move: '<path d="M12 3v18M3 12h18m-12-6 3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3m12-6 3 3-3 3"/>',
    erase: '<path d="m4 13 10-10 7 7-11 11H5l-4-5Z M7 10l7 7M10 21h12"/>',
    undo: '<path d="M8 4 3 9l5 5M3 9h10a7 7 0 0 1 0 14"/>',
    redo: '<path d="m16 4 5 5-5 5m5-5h-10a7 7 0 0 0 0 14"/>',
    trash: '<path d="M4 6h16M9 3h6M6 6l1 15h10l1-15M10 10v7m4-7v7"/>',
    save: '<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>',
  };
const tool = (id, label, icon) =>
  `<button id="${id}" title="${label}" aria-label="${label}"><svg viewBox="0 0 24 24">${icons[icon]}</svg></button>`;
$("app").innerHTML =
  `<section id="left"><header><div><div class="eyebrow">GEOMETRY CLASSROOM</div><h1>입체도형 연구실</h1></div><span class="badge">중1 수학 · 겉넓이</span></header><div id="solid-wrap"><canvas id="solid-canvas"></canvas><div id="solid-labels"></div><span id="solid-hint">드래그로 회전 · 휠 / 두 손가락으로 확대</span><div id="view-tools"><button id="zoom-in" title="입체 확대">＋</button><button id="zoom-out" title="입체 축소">−</button><button id="reset-view">시점 복귀</button></div></div><div id="controls"><div class="section-title"><span>01 &nbsp; 입체도형 설정</span><button id="collapse">컨트롤 접기</button></div><div class="foldable"><div class="control-grid"><div class="field"><label for="shape">입체도형</label><select id="shape">${SHAPES.map((s) => `<option value="${s.id}">${s.name}</option>`).join("")}</select></div><div class="field"><label for="base-shape">밑면 모양</label><select id="base-shape">${[3, 4, 5, 6].map((n) => `<option value="${n}">정${n}각형</option>`).join("")}<option value="0">원</option></select></div></div><div class="size-block"><div class="field"><label id="size-label" for="size">밑면 한 변의 길이</label><div class="range-row"><input id="size" type="range" min="2" max="10" step=".1" value="4"><input id="size-number" aria-label="밑면 크기" type="number" min="2" max="10" step=".1" value="4"><small>cm</small></div></div><div class="field"><label for="height">입체도형의 높이</label><div class="range-row"><input id="height" type="range" min="2" max="15" step=".1" value="6"><input id="height-number" aria-label="높이" type="number" min="2" max="15" step=".1" value="6"><small>cm</small></div></div></div></div><hr class="divider"><div class="section-title">02 &nbsp; 펼쳐서 살펴보기</div><div class="button-row"><button id="start" title="접힌 상태로">처음</button><button id="reverse">◀ 접기</button><button class="primary" id="play">▶ 펼치기</button><button id="pause">Ⅱ 정지</button><button id="end">완료</button></div><div class="timeline"><input id="progress" aria-label="전개 진행률" type="range" min="0" max="1" step=".001" value="1"><output id="percent">100%</output></div><div class="button-row" style="margin-top:8px"><button id="highlight-base">밑면 강조</button><button id="highlight-side">옆면 강조</button><button id="highlight-clear">강조 해제</button><button id="fit">전개도 맞춤</button></div><div class="foldable"><hr class="divider"><div class="section-title">03 &nbsp; 길이와 넓이 <select id="pi-mode" aria-label="원주율 표시" style="width:130px;font-size:11px;min-height:28px"><option value="exact">π · 정확한 값</option><option value="decimal">소수 근삿값</option></select></div><div class="chips">${[
    ["length", "길이"],
    ["height", "높이"],
    ["base", "밑넓이"],
    ["lateral", "옆넓이"],
    ["total", "겉넓이"],
    ["steps", "계산 과정"],
  ]
    .map(
      ([id, name]) =>
        `<label><input type="checkbox" id="show-${id}" checked>${name}</label>`,
    )
    .join(
      "",
    )}</div><div class="option-row"><label><input type="checkbox" id="guides">길이 보조선</label><label><input type="checkbox" id="labels">3D 수치 레이블</label></div><div id="info"></div><hr class="divider"><div class="section-title">04 &nbsp; 판서와 저장</div><div class="option-row"><label><input id="link-ink" type="checkbox" checked>이동·확대할 때 필기도 함께 이동</label></div><div class="button-row"><button id="restore-ink">마지막 필기 복원</button><button id="reset-net">전개도 시점 초기화</button></div><div class="save-actions"><button id="save-board">전개도 + 필기 PNG</button><button id="save-screen">전체 수업 화면 PNG</button></div><div id="status" class="status" role="status"></div><div class="footnote">왼쪽에서 정보를 확인하고 오른쪽에 직접 설명을 적어 보세요.<br>파랑: 밑면 · 회청색: 옆면 · 주황: 선택한 면</div></div></div></section><section id="board" aria-label="전개도와 교사 필기 영역"><canvas id="net-canvas"></canvas><canvas id="ink"></canvas><div id="toolbar">${tool("mode-select", "면 선택", "select")}${tool("mode-pen", "필기", "pen")}${tool("mode-move", "전개도 이동 및 확대", "move")}<div class="tool-sep"></div>${["#25364a", "#d34242", "#286bc2", "#c28a00"].map((c, i) => `<button class="color" data-color="${c}" style="background:${c}" aria-label="${["검정", "빨강", "파랑", "노랑"][i]} 펜"></button>`).join("")}<input id="width" aria-label="펜 굵기" title="펜 굵기" type="range" min="1" max="12" value="3">${tool("mode-erase", "지우개", "erase")}<div class="tool-sep"></div>${tool("undo", "실행 취소", "undo")}${tool("redo", "다시 실행", "redo")}${tool("clear-ink", "전체 필기 삭제", "trash")}${tool("download", "전개도와 필기 저장", "save")}</div></section>`;
let shape = SHAPES[1],
  a = 4,
  h = 6,
  t = 1,
  playing = 0,
  selected = null,
  mode = "select",
  color = "#25364a",
  strokes = [],
  redos = [],
  backup = [],
  current = null;
const renderOptions = {
  antialias: true,
  alpha: true,
  preserveDrawingBuffer: true,
};
function scene(canvas, ortho = false) {
  const renderer = new THREE.WebGLRenderer({ canvas, ...renderOptions });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0xffffff, 0);
  const scene = new THREE.Scene(),
    camera = ortho
      ? new THREE.OrthographicCamera(-20, 20, 20, -20, 0.1, 2000)
      : new THREE.PerspectiveCamera(38, 1, 0.1, 2000);
  scene.add(new THREE.AmbientLight(0xffffff, 2));
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(-10, -10, 30);
  scene.add(light);
  const group = new THREE.Group();
  scene.add(group);
  return { renderer, scene, camera, group, faces: [], flat: ortho };
}
let solid, net;
try {
  solid = scene($("solid-canvas"));
  net = scene($("net-canvas"), true);
} catch (e) {
  $("solid-hint").textContent =
    "이 브라우저에서 WebGL을 사용할 수 없습니다. 그래픽 가속을 켜 주세요.";
  throw e;
}
solid.camera.up.set(0, 0, 1);
let orbit = new OrbitControls(solid.camera, $("solid-canvas"));
orbit.enableDamping = true;
orbit.enablePan = false;
const ray = new THREE.Raycaster(),
  pointer = new THREE.Vector2();
let netBounds,
  fitScale = 1,
  netView = { x: 0, y: 0, zoom: 1 },
  inkView = { x: 0, y: 0, zoom: 1 };
function dispose(group) {
  while (group.children.length) {
    const o = group.children[0];
    o.geometry?.dispose();
    o.material?.dispose();
    group.remove(o);
  }
}
function isSelected(f) {
  return (
    selected === f.id ||
    (selected === "bases" && f.base) ||
    (selected === "sides" && !f.base)
  );
}
function paint(view, data) {
  dispose(view.group);
  view.faces = data;
  for (const f of data) {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(f.vertices.flat(), 3),
    );
    geom.setIndex(triangulate(f));
    geom.computeVertexNormals();
    const active = isSelected(f),
      mat = new (
        view.flat ? THREE.MeshBasicMaterial : THREE.MeshStandardMaterial
      )({
        color: active ? 0xf5b96b : f.base ? 0xa8cdee : 0xd7e3ed,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
      });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.userData.face = f.id;
    view.group.add(mesh);
    const pts = f.boundary.map((i) => new THREE.Vector3(...f.vertices[i]));
    pts.push(pts[0].clone());
    const edge = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: active ? 0xc56c1b : 0x526f88 }),
    );
    edge.userData.face = f.id;
    view.group.add(edge);
  }
}
function bounds(data) {
  return new THREE.Box3().setFromPoints(
    data.flatMap((f) => f.vertices.map((p) => new THREE.Vector3(...p))),
  );
}
function rebuild(reset = false) {
  paint(solid, geometry(shape, a, h, 0));
  paint(net, geometry(shape, a, h, t));
  netBounds = bounds(geometry(shape, a, h, 1));
  if (reset) {
    resetSolid();
    fitNet();
  }
  addGuides();
  updateInfo();
}
function resetSolid() {
  const box = bounds(geometry(shape, a, h, 0)),
    center = box.getCenter(new THREE.Vector3()),
    s = box.getSize(new THREE.Vector3()).length(),
    vertical = shape.kind === "prism" || shape.kind === "cylinder";
  orbit.dispose();
  solid.camera.up.set(0, vertical ? 1 : 0, vertical ? 0 : 1);
  orbit = new OrbitControls(solid.camera, $("solid-canvas"));
  orbit.enableDamping = true;
  orbit.enablePan = false;
  orbit.target.copy(center);
  solid.camera.position
    .copy(center)
    .add(
      vertical
        ? new THREE.Vector3(s * 0.9, s * 0.8, s * 1.3)
        : new THREE.Vector3(s * 0.9, -s * 1.25, s * 0.9),
    );
  orbit.minDistance = s * 0.65;
  orbit.maxDistance = s * 4;
  solid.camera.lookAt(center);
  orbit.update();
}
function fitNet() {
  if ($("link-ink").checked) {
    inkView.x = (inkView.x - netView.x) / netView.zoom;
    inkView.y = (inkView.y - netView.y) / netView.zoom;
    inkView.zoom /= netView.zoom;
    redraw();
  }
  netView = { x: 0, y: 0, zoom: 1 };
  updateNetCamera();
}
function updateNetCamera() {
  if (!netBounds) return;
  const w = $("board").clientWidth,
    hh = $("board").clientHeight,
    center = netBounds.getCenter(new THREE.Vector3()),
    size = netBounds.getSize(new THREE.Vector3());
  fitScale = Math.max(size.x / (w * 0.78), size.y / (hh * 0.68), 0.015);
  let halfW = (w * fitScale) / 2 / netView.zoom,
    halfH = (hh * fitScale) / 2 / netView.zoom;
  net.camera.left = -halfW;
  net.camera.right = halfW;
  net.camera.top = halfH;
  net.camera.bottom = -halfH;
  let foldBox = bounds(geometry(shape, a, h, 0)),
    foldCenter = foldBox.getCenter(new THREE.Vector3()),
    target = foldCenter.lerp(center, t);
  target.x -= (netView.x * fitScale) / netView.zoom;
  target.y += (netView.y * fitScale) / netView.zoom;
  net.camera.position
    .copy(target)
    .add(new THREE.Vector3(0, -30 * (1 - t), 100));
  net.camera.lookAt(target);
  net.camera.updateProjectionMatrix();
}
function setProgress(v) {
  t = Math.max(0, Math.min(1, v));
  $("progress").value = t;
  $("percent").value = Math.round(t * 100) + "%";
  paint(net, geometry(shape, a, h, t));
  updateNetCamera();
}
function selectFace(id) {
  selected = id;
  $("app").dataset.selected = id || "";
  paint(solid, geometry(shape, a, h, 0));
  paint(net, geometry(shape, a, h, t));
  addGuides();
}
function pick(view, e) {
  const r = view.renderer.domElement.getBoundingClientRect();
  pointer.set(
    ((e.clientX - r.left) / r.width) * 2 - 1,
    (-(e.clientY - r.top) / r.height) * 2 + 1,
  );
  ray.setFromCamera(pointer, view.camera);
  const hit = ray
    .intersectObjects(view.group.children)
    .find((o) => o.object.isMesh);
  selectFace(hit?.object.userData.face || null);
}
let solidDown;
$("solid-canvas").addEventListener(
  "pointerdown",
  (e) => (solidDown = [e.clientX, e.clientY]),
);
$("solid-canvas").addEventListener("pointerup", (e) => {
  if (
    solidDown &&
    Math.hypot(e.clientX - solidDown[0], e.clientY - solidDown[1]) < 5
  )
    pick(solid, e);
});
let guideLabels = [];
function addGuides() {
  guideLabels = [];
  $("solid-labels").innerHTML = "";
  if (!$("guides").checked && !$("labels").checked) return;
  const m = metrics(shape, a, h),
    round = !shape.n,
    kind = shape.kind;
  let lines = [];
  if (kind === "cone" || kind === "pyramid") {
    lines.push([[0, 0, 0], [0, 0, h], 0x269185, `높이 ${fmt(h)} cm`]);
    let rim = round
      ? [0, a, 0]
      : [
          m.b * Math.cos(Math.PI / shape.n),
          m.b * Math.sin(Math.PI / shape.n),
          0,
        ];
    lines.push([
      [0, 0, h],
      rim,
      0xd37536,
      `${round ? "모선" : "옆면 높이"} ${fmt(m.l)} cm`,
    ]);
  } else if (kind === "cylinder")
    lines.push([[0, -h / 2, a], [0, h / 2, a], 0x269185, `높이 ${fmt(h)} cm`]);
  else
    lines.push([
      [-a / 2, -h / 2, 0],
      [-a / 2, h / 2, 0],
      0x269185,
      `높이 ${fmt(h)} cm`,
    ]);
  if (round) {
    let center = kind === "cone" ? [0, 0, 0] : [0, -h / 2, a],
      rim = kind === "cone" ? [a, 0, 0] : [a, -h / 2, a];
    lines.push([center, rim, 0x3376c4, `반지름 ${fmt(a)} cm`]);
  } else {
    const f = geometry(shape, a, h, 0).find((f) => f.base);
    lines.push([f.vertices[0], f.vertices[1], 0x3376c4, `한 변 ${fmt(a)} cm`]);
  }
  for (const [A, B, c, label] of lines) {
    if (!$("show-height").checked && label.includes("높이")) continue;
    if (!$("show-length").checked && !label.includes("높이")) continue;
    if ($("guides").checked) {
      const g = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(...A),
          new THREE.Vector3(...B),
        ]),
        l = new THREE.Line(
          g,
          new THREE.LineDashedMaterial({
            color: c,
            dashSize: 0.3,
            gapSize: 0.16,
            depthTest: false,
          }),
        );
      l.computeLineDistances();
      l.renderOrder = 10;
      solid.group.add(l);
    }
    if ($("labels").checked) {
      let el = document.createElement("span");
      el.textContent = label;
      el.style.color = "#" + c.toString(16).padStart(6, "0");
      $("solid-labels").append(el);
      guideLabels.push({
        el,
        p: new THREE.Vector3(...A).lerp(new THREE.Vector3(...B), 0.5),
      });
    }
  }
}
function updateInfo() {
  const m = metrics(shape, a, h),
    kind = shape.kind,
    round = !shape.n,
    prism = kind === "prism" || kind === "cylinder",
    exact = $("pi-mode").value === "exact";
  $("pi-mode").disabled = !round;
  const pi = (coefficient) =>
      exact ? `${fmt(coefficient)}π` : fmt(coefficient * Math.PI),
    ell = `√${fmt(a * a + h * h)}`,
    lSymbol = kind === "cone" ? ell : fmt(m.l),
    rows = [];
  const stat = (label, value, total = false) =>
    `<div class="stat ${total ? "total" : ""}"><small>${label}</small><strong>${value}</strong></div>`;
  if ($("show-length").checked) {
    rows.push(stat(round ? "밑면 반지름" : "밑면 한 변", `${fmt(a)} cm`));
    rows.push(
      stat(
        round ? "밑면 원주" : "밑면 둘레",
        `${round ? pi(2 * a) : fmt(m.p)} cm`,
      ),
    );
    if (kind === "cone")
      rows.push(
        stat("모선의 길이 l", `${exact ? ell : fmt(m.l)} cm`),
        stat("부채꼴 중심각 θ", `≈ ${fmt(m.theta)}°`),
      );
  }
  if ($("show-height").checked) {
    rows.push(stat("입체도형의 높이 h", `${fmt(h)} cm`));
    if (kind === "pyramid")
      rows.push(stat("옆면 삼각형의 높이", `${fmt(m.l)} cm`));
  }
  if ($("show-base").checked)
    rows.push(stat("밑넓이 B", `${round ? pi(a * a) : fmt(m.B)} cm²`));
  if ($("show-lateral").checked)
    rows.push(
      stat(
        "옆넓이 L",
        `${round ? (kind === "cone" && exact ? `${fmt(a)}π${ell}` : pi(kind === "cone" ? a * m.l : 2 * a * h)) : fmt(m.L)} cm²`,
      ),
    );
  if ($("show-total").checked)
    rows.push(
      stat(
        "겉넓이 S",
        `${round && exact ? (kind === "cone" ? `(${fmt(a * a)} + ${fmt(a)}${ell})π` : `${fmt(2 * a * a + 2 * a * h)}π`) : fmt(m.S)} cm²`,
        true,
      ),
    );
  let steps = "";
  if ($("show-steps").checked) {
    if (round)
      steps =
        kind === "cone"
          ? `l = √(r² + h²) = ${ell}<br>θ = 360° × r/l ≈ ${fmt(m.theta)}°<br>B = πr² = ${fmt(a * a)}π<br>L = πrl = ${fmt(a)}π × ${lSymbol}<br>S = B + L = πr² + πrl`
          : `B = πr² = ${fmt(a * a)}π<br>L = 2πrh = ${fmt(2 * a * h)}π<br>S = 2B + L = 2πr² + 2πrh`;
    else
      steps = `B = 둘레 × 밑면의 내접원 반지름 ÷ 2<br>= ${fmt(m.p)} × ${fmt(m.b)} ÷ 2 = ${fmt(m.B)}<br>L = 둘레 × ${prism ? "높이" : "옆면 높이 ÷ 2"}<br>= ${fmt(m.p)} × ${fmt(prism ? h : m.l)}${prism ? "" : " ÷ 2"} = ${fmt(m.L)}<br>S = ${prism ? "2B" : "B"} + L = ${fmt(m.S)} cm²`;
    if (round && exact) steps += `<br>겉넓이 근삿값 ≈ ${fmt(m.S)} cm²`;
  }
  $("info").innerHTML =
    `<div class="info-grid">${rows.join("")}</div>${steps ? `<div class="formula">${steps}</div>` : ""}${!round ? `<div class="footnote">면 ${m.faces}개 · 모서리 ${m.edges}개 · 꼭짓점 ${m.vertices}개 · 옆면 ${shape.n}개</div>` : ""}`;
}
function changeShape() {
  shape = SHAPES.find((s) => s.id === $("shape").value);
  $("base-shape").value = shape.n || 0;
  $("base-shape").disabled = !shape.n;
  $("size-label").textContent = shape.n ? "밑면 한 변의 길이" : "밑면 반지름";
  selected = null;
  playing = 0;
  rebuild(true);
}
$("shape").value = shape.id;
$("base-shape").value = shape.n;
$("shape").onchange = changeShape;
$("base-shape").onchange = () => {
  if (!Number($("base-shape").value)) {
    $("base-shape").value = shape.n;
    return;
  }
  $("shape").value = shape.kind + $("base-shape").value;
  changeShape();
};
for (const [id, max] of [
  ["size", 10],
  ["height", 15],
])
  for (const target of [id, id + "-number"])
    $(target).addEventListener("input", () => {
      let v = Number($(target).value);
      if (!Number.isFinite(v) || v < 2 || v > max) return;
      v = Math.round(v * 10) / 10;
      $(id).value = $(id + "-number").value = v;
      if (id === "size") a = v;
      else h = v;
      rebuild(true);
    });
for (const [id, max] of [
  ["size-number", 10],
  ["height-number", 15],
])
  $(id).addEventListener("change", () => {
    let v = Math.min(max, Math.max(2, Number($(id).value) || 2));
    $(id).value = v;
    $(id).dispatchEvent(new Event("input"));
  });
$("collapse").onclick = () => {
  const closed = $("controls").classList.toggle("closed");
  $("collapse").textContent = closed ? "컨트롤 펼치기" : "컨트롤 접기";
};
$("play").onclick = () => {
  if (t === 1) setProgress(0);
  playing = 1;
};
$("reverse").onclick = () => {
  if (t === 0) setProgress(1);
  playing = -1;
};
$("pause").onclick = () => (playing = 0);
$("start").onclick = () => {
  playing = 0;
  setProgress(0);
};
$("end").onclick = () => {
  playing = 0;
  setProgress(1);
};
$("progress").oninput = (e) => setProgress(Number(e.target.value));
$("highlight-base").onclick = () => selectFace("bases");
$("highlight-side").onclick = () => selectFace("sides");
$("highlight-clear").onclick = () => selectFace(null);
$("reset-view").onclick = resetSolid;
$("zoom-in").onclick = () => {
  solid.camera.position
    .sub(orbit.target)
    .multiplyScalar(0.82)
    .add(orbit.target);
  orbit.update();
};
$("zoom-out").onclick = () => {
  solid.camera.position.sub(orbit.target).multiplyScalar(1.2).add(orbit.target);
  orbit.update();
};
$("fit").onclick = fitNet;
$("reset-net").onclick = () => {
  fitNet();
  setProgress(1);
  playing = 0;
};
for (const id of ["length", "height", "base", "lateral", "total", "steps"])
  $("show-" + id).onchange = () => {
    paint(solid, geometry(shape, a, h, 0));
    addGuides();
    updateInfo();
  };
$("pi-mode").onchange = updateInfo;
for (const id of ["guides", "labels"])
  $(id).onchange = () => {
    paint(solid, geometry(shape, a, h, 0));
    addGuides();
  };
const ink = $("ink"),
  ctx = ink.getContext("2d");
let boardW = 1,
  boardH = 1;
function redraw() {
  const dpr = Math.min(devicePixelRatio, 2);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, boardW, boardH);
  ctx.save();
  ctx.translate(boardW / 2 + inkView.x, boardH / 2 + inkView.y);
  ctx.scale(inkView.zoom, inkView.zoom);
  for (const stroke of [...strokes, ...(current ? [current] : [])]) {
    ctx.globalCompositeOperation = stroke.erase
      ? "destination-out"
      : "source-over";
    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
    ctx.lineCap = ctx.lineJoin = "round";
    for (let i = 1; i < stroke.points.length; i++) {
      let p = stroke.points[i - 1],
        q = stroke.points[i];
      ctx.lineWidth = (stroke.width * (p[2] + q[2])) / 2;
      ctx.beginPath();
      ctx.moveTo(p[0], p[1]);
      ctx.lineTo(q[0], q[1]);
      ctx.stroke();
    }
    if (stroke.points.length === 1) {
      let p = stroke.points[0];
      ctx.beginPath();
      ctx.arc(p[0], p[1], (stroke.width * p[2]) / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
  ctx.globalCompositeOperation = "source-over";
  $("undo").disabled = !strokes.length;
  $("redo").disabled = !redos.length;
}
function persist() {
  try {
    localStorage.setItem(
      "solid-classroom-ink-v1",
      JSON.stringify({ strokes, view: inkView, backup }),
    );
  } catch {}
}
function setMode(v) {
  mode = v;
  for (const x of ["pen", "select", "move", "erase"])
    $("mode-" + x).classList.toggle("active", v === x);
  ink.style.cursor =
    v === "pen"
      ? "crosshair"
      : v === "erase"
        ? "cell"
        : v === "move"
          ? "grab"
          : "default";
}
for (const x of ["pen", "select", "move", "erase"])
  $("mode-" + x).onclick = () => setMode(x);
function setColor(c) {
  color = c;
  document
    .querySelectorAll("[data-color]")
    .forEach((b) => b.classList.toggle("active", b.dataset.color === c));
}
document.querySelectorAll("[data-color]").forEach(
  (b) =>
    (b.onclick = () => {
      setColor(b.dataset.color);
      setMode("pen");
    }),
);
function inkPoint(e) {
  let r = ink.getBoundingClientRect();
  return [
    (e.clientX - r.left - boardW / 2 - inkView.x) / inkView.zoom,
    (e.clientY - r.top - boardH / 2 - inkView.y) / inkView.zoom,
    e.pointerType === "pen" ? Math.max(0.25, e.pressure || 0.5) * 1.5 : 1,
  ];
}
let touches = new Map(),
  gesture = null,
  downPoint = null;
function gestureState() {
  const v = [...touches.values()];
  return {
    x: v.reduce((s, p) => s + p.x, 0) / v.length,
    y: v.reduce((s, p) => s + p.y, 0) / v.length,
    d: v.length > 1 ? Math.hypot(v[1].x - v[0].x, v[1].y - v[0].y) : 0,
  };
}
function moveView(dx, dy, factor = 1, cx = boardW / 2, cy = boardH / 2) {
  const old = netView.zoom,
    next = Math.min(5, Math.max(0.25, old * factor)),
    f = next / old;
  netView.x = cx - boardW / 2 - (cx - boardW / 2 - netView.x) * f + dx;
  netView.y = cy - boardH / 2 - (cy - boardH / 2 - netView.y) * f + dy;
  netView.zoom = next;
  if ($("link-ink").checked) {
    inkView.x = cx - boardW / 2 - (cx - boardW / 2 - inkView.x) * f + dx;
    inkView.y = cy - boardH / 2 - (cy - boardH / 2 - inkView.y) * f + dy;
    inkView.zoom *= f;
    redraw();
    persist();
  }
  updateNetCamera();
}
ink.onpointerdown = (e) => {
  e.preventDefault();
  if (current) return;
  ink.setPointerCapture(e.pointerId);
  downPoint = [e.clientX, e.clientY];
  if (mode === "pen" || mode === "erase") {
    current = {
      pointer: e.pointerId,
      erase: mode === "erase",
      color,
      width: (mode === "erase" ? 24 : Number($("width").value)) / inkView.zoom,
      points: [inkPoint(e)],
    };
    redraw();
  } else if (mode === "move") {
    let r = ink.getBoundingClientRect();
    touches.set(e.pointerId, { x: e.clientX - r.left, y: e.clientY - r.top });
    gesture = gestureState();
  }
};
ink.onpointermove = (e) => {
  if (current && e.pointerId === current.pointer) {
    for (const v of e.getCoalescedEvents?.() || [e])
      current.points.push(inkPoint(v));
    redraw();
  } else if (mode === "move" && touches.has(e.pointerId)) {
    let r = ink.getBoundingClientRect();
    touches.set(e.pointerId, { x: e.clientX - r.left, y: e.clientY - r.top });
    let next = gestureState();
    moveView(
      next.x - gesture.x,
      next.y - gesture.y,
      gesture.d && next.d ? next.d / gesture.d : 1,
      next.x,
      next.y,
    );
    gesture = next;
  }
};
function finish(e, cancel = false) {
  if (current && e.pointerId === current.pointer) {
    strokes.push(current);
    current = null;
    redos = [];
    persist();
    redraw();
  } else if (
    !cancel &&
    mode === "select" &&
    downPoint &&
    Math.hypot(e.clientX - downPoint[0], e.clientY - downPoint[1]) < 6
  )
    pick(net, e);
  touches.delete(e.pointerId);
  gesture = touches.size ? gestureState() : null;
  downPoint = null;
}
ink.onpointerup = (e) => finish(e);
ink.onpointercancel = (e) => finish(e, true);
ink.addEventListener(
  "wheel",
  (e) => {
    if (mode !== "move") return;
    e.preventDefault();
    const r = ink.getBoundingClientRect();
    moveView(
      0,
      0,
      Math.exp(-e.deltaY * 0.001),
      e.clientX - r.left,
      e.clientY - r.top,
    );
  },
  { passive: false },
);
$("undo").onclick = () => {
  if (strokes.length) {
    redos.push(strokes.pop());
    redraw();
    persist();
  }
};
$("redo").onclick = () => {
  if (redos.length) {
    strokes.push(redos.pop());
    redraw();
    persist();
  }
};
$("clear-ink").onclick = () => {
  if (!strokes.length) return;
  backup = structuredClone(strokes);
  strokes = [];
  redos = [];
  redraw();
  persist();
};
$("restore-ink").onclick = () => {
  if (backup.length) {
    strokes = structuredClone(backup);
    redos = [];
    redraw();
    persist();
  } else {
    try {
      const saved = JSON.parse(localStorage.getItem("solid-classroom-ink-v1"));
      if (saved) {
        strokes = saved.strokes;
        inkView = saved.view;
        backup = saved.backup || [];
        redraw();
      }
    } catch {}
  }
};
function download(canvas, name) {
  let link = document.createElement("a");
  link.download = name + "-" + new Date().toISOString().slice(0, 10) + ".png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}
async function save(all = false) {
  $("status").textContent = "이미지 저장 중…";
  try {
    solid.renderer.render(solid.scene, solid.camera);
    net.renderer.render(net.scene, net.camera);
    if (all) {
      const c = await html2canvas($("app"), {
        backgroundColor: "#f4f6f8",
        scale: Math.min(devicePixelRatio, 2),
        ignoreElements: (el) => el.id === "status",
      });
      download(c, "전체-수업");
    } else {
      const c = document.createElement("canvas"),
        dpr = Math.min(devicePixelRatio, 2);
      c.width = boardW * dpr;
      c.height = boardH * dpr;
      const cctx = c.getContext("2d");
      cctx.fillStyle = "white";
      cctx.fillRect(0, 0, c.width, c.height);
      cctx.drawImage($("net-canvas"), 0, 0, c.width, c.height);
      cctx.drawImage(ink, 0, 0, c.width, c.height);
      download(c, "전개도-판서");
    }
    $("status").textContent = "PNG 이미지를 저장했습니다.";
  } catch (err) {
    $("status").textContent = "저장 실패: " + err.message;
  }
}
$("save-board").onclick = () => save();
$("download").onclick = () => save();
$("save-screen").onclick = () => save(true);
function resize() {
  const oldScale = fitScale,
    oldW = boardW,
    oldH = boardH;
  let r = $("solid-wrap").getBoundingClientRect();
  solid.renderer.setSize(r.width, r.height, false);
  solid.camera.aspect = r.width / r.height;
  solid.camera.updateProjectionMatrix();
  boardW = $("board").clientWidth;
  boardH = $("board").clientHeight;
  net.renderer.setSize(boardW, boardH, false);
  const dpr = Math.min(devicePixelRatio, 2);
  ink.width = boardW * dpr;
  ink.height = boardH * dpr;
  updateNetCamera();
  if (oldW > 1 && (oldW !== boardW || oldH !== boardH)) {
    let factor = oldScale / fitScale;
    netView.x *= factor;
    netView.y *= factor;
    if ($("link-ink").checked) {
      inkView.x *= factor;
      inkView.y *= factor;
      inkView.zoom *= factor;
    }
    updateNetCamera();
  }
  redraw();
}
new ResizeObserver(resize).observe($("solid-wrap"));
new ResizeObserver(resize).observe($("board"));
setMode("select");
setColor(color);
try {
  let saved = JSON.parse(localStorage.getItem("solid-classroom-ink-v1"));
  if (saved) {
    strokes = saved.strokes;
    inkView = saved.view;
  }
} catch {}
rebuild(true);
resize();
let last = performance.now();
function animate(now) {
  let dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  if (playing) {
    setProgress(t + (playing * dt) / 3);
    if (t === 0 || t === 1) playing = 0;
  }
  orbit.update();
  for (const { el, p } of guideLabels) {
    let q = p.clone().project(solid.camera);
    el.style.left = (q.x + 1) * 0.5 * $("solid-wrap").clientWidth + "px";
    el.style.top = (-q.y + 1) * 0.5 * $("solid-wrap").clientHeight + "px";
    el.style.display = q.z < 1 ? "" : "none";
  }
  solid.renderer.render(solid.scene, solid.camera);
  net.renderer.render(net.scene, net.camera);
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
// Read-only diagnostics support repeatable classroom QA without modifying app state.
window.classroom = {
  getState: () => ({
    shape: shape.id,
    a,
    h,
    t,
    selected,
    mode,
    strokeCount: strokes.length,
    netView: { ...netView },
    inkView: { ...inkView },
    metrics: metrics(shape, a, h),
  }),
  shapes: SHAPES,
};
