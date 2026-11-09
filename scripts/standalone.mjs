import fs from "node:fs";
let html = fs.readFileSync("dist/index.html", "utf8");
html = html.replace(
  /<script type="module" crossorigin src="([^"]+)"><\/script>/g,
  (_, p) =>
    `<script type="module">${fs.readFileSync("dist/" + p.replace(/^\.\//, ""), "utf8").replaceAll("</script", "<\\/script")}</script>`,
);
html = html.replace(
  /<link rel="stylesheet" crossorigin href="([^"]+)">/g,
  (_, p) =>
    `<style>${fs.readFileSync("dist/" + p.replace(/^\.\//, ""), "utf8")}</style>`,
);
fs.writeFileSync("dist/입체도형-수업.html", html);
console.log("Offline standalone HTML generated.");
