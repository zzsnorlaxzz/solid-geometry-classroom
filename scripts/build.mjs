import { rollup } from "@rollup/wasm-node";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import fs from "node:fs";
fs.mkdirSync("dist/assets", { recursive: true });
const bundle = await rollup({
  input: "src/main.js",
  plugins: [
    {
      name: "local-css",
      load(id) {
        if (id.endsWith(".css")) return "";
      },
    },
    nodeResolve({ browser: true }),
    commonjs(),
  ],
});
await bundle.write({ file: "dist/assets/app.js", format: "iife" });
fs.copyFileSync("src/style.css", "dist/assets/app.css");
fs.writeFileSync(
  "dist/index.html",
  '<!doctype html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:," /><title>입체도형 연구실 · 겉넓이 수업</title><link rel="stylesheet" crossorigin href="./assets/app.css"></head><body><div id="app"></div><script type="module" crossorigin src="./assets/app.js"></script></body></html>',
);
await import("./standalone.mjs");
console.log("Static build ready: dist/");
