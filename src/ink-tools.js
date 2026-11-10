export const INK_COLORS = [
  { value: "#c02121", name: "빨강", rgb: "192, 33, 33" },
  { value: "#000000", name: "검정", rgb: "0, 0, 0" },
  { value: "#155dd1", name: "파랑", rgb: "21, 93, 209" },
  { value: "#34bf0d", name: "초록", rgb: "52, 191, 13" },
];
const paths = {
  pen: '<path d="m15.5 4.5 4 4M4 20l4.5-1L20 7.5a2.83 2.83 0 0 0-4-4L4.5 15 4 20Z"/>',
  eraser:
    '<path d="m14 3 7 7a2 2 0 0 1 0 3l-7 7H8l-5-5a2 2 0 0 1 0-3l9-9a1.5 1.5 0 0 1 2 0ZM8 8l9 9M13 20h8"/>',
  select: '<path d="m4 3 16 10-7 1-3 7L4 3Z"/>',
  undo: '<path d="m9 4-6 6 6 6M3 10h11a6 6 0 0 1 0 12" transform="translate(0 -1)"/>',
  clear: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
};
const icon = (name) =>
  `<svg class="ink-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;
const toolButton = (name, label, attributes) =>
  `<button type="button" class="ink-tool" aria-label="${label}" title="${label}" ${attributes}>${icon(name)}</button>`;
export const inkTools = `<fieldset id="ink-tools" aria-label="전개도 필기 도구" disabled>
${toolButton("pen", "펜", 'data-ink-mode="pen" aria-pressed="true"')}
${toolButton("eraser", "지우개", 'data-ink-mode="eraser" aria-pressed="false"')}
${toolButton("select", "면 선택", 'data-ink-mode="select" aria-pressed="false"')}
<div class="ink-palette" role="group" aria-label="펜 색상">${INK_COLORS.map(({ value, name, rgb }) => `<button type="button" class="ink-swatch" data-ink-color="${value}" aria-label="${name} (${rgb})" title="${name} (${rgb})" aria-pressed="${value === "#000000"}"><span style="background:${value}" aria-hidden="true"></span></button>`).join("")}</div>
<label>굵기<select id="ink-width" aria-label="펜 굵기"><option value="2">얇게</option><option value="4" selected>보통</option><option value="7">굵게</option></select></label>
${toolButton("undo", "되돌리기", 'id="ink-undo"')}
${toolButton("clear", "모두 지우기", 'id="ink-clear"')}
</fieldset>`;
