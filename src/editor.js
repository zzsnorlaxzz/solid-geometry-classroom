import { moveVertex } from "./geometry.js";
const colors = ["#3478bd", "#bc7146", "#628b58", "#8b67ad"];
export function mountEditor(svg, getPolygon, onChange) {
  let drag = null;
  const screen = (p) => [160 + p[0] * 17, 90 - p[1] * 17];
  function render() {
    const poly = getPolygon();
    svg.innerHTML = `<defs><pattern id="editor-grid" width="17" height="17" patternUnits="userSpaceOnUse"><path d="M 17 0 L 0 0 0 17" fill="none" stroke="#e9eff5" stroke-width="1"/></pattern></defs><rect width="320" height="180" fill="url(#editor-grid)"/><polygon points="${poly.map((p) => screen(p).join(",")).join(" ")}" fill="#d9e9f7" stroke="#5e82a5" stroke-width="1.5"/>${poly
      .map((p, i) => {
        const [x, y] = screen(p);
        return `<g data-vertex="${i}" role="button" tabindex="0" aria-label="꼭짓점 ${"ABCD"[i]} 이동" transform="translate(${x} ${y})"><circle class="hit-target" r="26" fill="transparent"/><circle class="vertex-dot" r="6.5" fill="${colors[i]}" stroke="white" stroke-width="2"/><text x="10" y="-10" fill="${colors[i]}" font-size="12" font-weight="bold" pointer-events="none">${"ABCD"[i]}</text></g>`;
      })
      .join("")}`;
  }
  function world(e) {
    const p = svg.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    const q = p.matrixTransform(svg.getScreenCTM().inverse());
    return [(q.x - 160) / 17, (90 - q.y) / 17];
  }
  svg.addEventListener("pointerdown", (e) => {
    const handle = e.target.closest("[data-vertex]");
    if (!handle || drag) return;
    e.preventDefault();
    const q = world(e),
      poly = getPolygon();
    const index = poly.reduce(
      (best, p, i) =>
        Math.hypot(p[0] - q[0], p[1] - q[1]) <
        Math.hypot(poly[best][0] - q[0], poly[best][1] - q[1])
          ? i
          : best,
      0,
    );
    drag = {
      id: e.pointerId,
      index,
      offset: [poly[index][0] - q[0], poly[index][1] - q[1]],
    };
    svg.setPointerCapture(e.pointerId);
    svg.classList.add("dragging");
  });
  svg.addEventListener("pointermove", (e) => {
    if (!drag || drag.id !== e.pointerId) return;
    e.preventDefault();
    const q = world(e);
    onChange(
      moveVertex(getPolygon(), drag.index, [
        q[0] + drag.offset[0],
        q[1] + drag.offset[1],
      ]),
    );
    render();
  });
  function end(e) {
    if (drag?.id !== e.pointerId) return;
    drag = null;
    svg.classList.remove("dragging");
    if (svg.hasPointerCapture(e.pointerId))
      svg.releasePointerCapture(e.pointerId);
  }
  svg.addEventListener("pointerup", end);
  svg.addEventListener("pointercancel", end);
  svg.addEventListener("lostpointercapture", () => {
    drag = null;
    svg.classList.remove("dragging");
  });
  svg.addEventListener("keydown", (e) => {
    const handle = e.target.closest("[data-vertex]"),
      delta = {
        ArrowLeft: [-0.2, 0],
        ArrowRight: [0.2, 0],
        ArrowUp: [0, 0.2],
        ArrowDown: [0, -0.2],
      }[e.key];
    if (!handle || !delta) return;
    e.preventDefault();
    const i = Number(handle.dataset.vertex),
      p = getPolygon();
    onChange(moveVertex(p, i, [p[i][0] + delta[0], p[i][1] + delta[1]]));
    render();
    svg.querySelector(`[data-vertex="${i}"]`).focus({ preventScroll: true });
  });
  render();
  return { render };
}
