// Store ink in net-plane coordinates so it follows the diagram on resize.
export function mountAnnotations({
  canvas,
  tools,
  project,
  unproject,
  worldPerPixel,
}) {
  const context = canvas.getContext("2d"),
    status = document.getElementById("ink-status"),
    undo = document.getElementById("ink-undo"),
    clearButton = document.getElementById("ink-clear"),
    color = document.getElementById("ink-color"),
    width = document.getElementById("ink-width");
  let enabled = false,
    mode = "pen",
    operations = [],
    pointer = null;

  function render() {
    const w = canvas.clientWidth,
      h = canvas.clientHeight;
    if (!w || !h) return;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    if (
      canvas.width !== Math.round(w * ratio) ||
      canvas.height !== Math.round(h * ratio)
    ) {
      canvas.width = Math.round(w * ratio);
      canvas.height = Math.round(h * ratio);
    }
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, w, h);
    for (const operation of operations) {
      const points = operation.points.map(project),
        lineWidth = operation.width / worldPerPixel();
      context.globalCompositeOperation =
        operation.mode === "eraser" ? "destination-out" : "source-over";
      context.strokeStyle = context.fillStyle = operation.color;
      context.lineWidth = lineWidth;
      context.lineCap = context.lineJoin = "round";
      context.beginPath();
      if (points.length === 1) {
        context.arc(points[0][0], points[0][1], lineWidth / 2, 0, Math.PI * 2);
        context.fill();
      } else {
        context.moveTo(...points[0]);
        for (const point of points.slice(1)) context.lineTo(...point);
        context.stroke();
      }
    }
    context.globalCompositeOperation = "source-over";
  }
  function update() {
    tools.disabled = !enabled;
    canvas.hidden = !enabled;
    canvas.classList.toggle("drawing", enabled && mode !== "select");
    canvas.dataset.mode = mode;
    canvas.dataset.operations = operations.length;
    for (const button of tools.querySelectorAll("[data-ink-mode]"))
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.inkMode === mode),
      );
    undo.disabled = clearButton.disabled = !enabled || operations.length === 0;
    status.textContent = !enabled
      ? "완전히 펼치면 필기할 수 있어요."
      : mode === "select"
        ? "전개도에서 면을 선택하세요."
        : mode === "eraser"
          ? "지울 부분을 문질러 주세요."
          : "전개도 위에 자유롭게 필기하세요.";
  }
  function finish() {
    if (pointer !== null && canvas.hasPointerCapture(pointer))
      canvas.releasePointerCapture(pointer);
    pointer = null;
  }
  function point(event) {
    const rect = canvas.getBoundingClientRect();
    return unproject([event.clientX - rect.left, event.clientY - rect.top]);
  }
  canvas.addEventListener("pointerdown", (event) => {
    if (
      !enabled ||
      mode === "select" ||
      pointer !== null ||
      !event.isPrimary ||
      event.button !== 0
    )
      return;
    event.preventDefault();
    pointer = event.pointerId;
    canvas.setPointerCapture(pointer);
    operations.push({
      mode,
      color: color.value,
      width: (mode === "eraser" ? 24 : Number(width.value)) * worldPerPixel(),
      points: [point(event)],
    });
    update();
    render();
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!enabled || pointer !== event.pointerId) return;
    event.preventDefault();
    const events = event.getCoalescedEvents?.() || [];
    operations
      .at(-1)
      .points.push(...(events.length ? events : [event]).map(point));
    render();
  });
  for (const name of ["pointerup", "pointercancel", "lostpointercapture"])
    canvas.addEventListener(name, (event) => {
      if (event.pointerId === pointer) finish();
    });
  for (const button of tools.querySelectorAll("[data-ink-mode]"))
    button.onclick = () => {
      finish();
      mode = button.dataset.inkMode;
      update();
    };
  undo.onclick = () => {
    finish();
    operations.pop();
    update();
    render();
  };
  function clear() {
    finish();
    operations = [];
    update();
    render();
  }
  clearButton.onclick = clear;
  update();
  return {
    clear,
    render,
    setEnabled(value) {
      if (!value) finish();
      enabled = value;
      update();
      render();
    },
  };
}
