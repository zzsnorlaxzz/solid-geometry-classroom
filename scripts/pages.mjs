import fs from "node:fs";
await import("./build.mjs");
fs.mkdirSync("docs", { recursive: true });
fs.copyFileSync("dist/입체도형-수업.html", "docs/index.html");
fs.writeFileSync("docs/.nojekyll", "");
console.log("GitHub Pages build ready: docs/index.html");
