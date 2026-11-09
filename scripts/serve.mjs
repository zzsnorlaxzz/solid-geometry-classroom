import { createServer } from "node:http";
import fs from "node:fs";
import path from "node:path";
const root = path.resolve("dist"),
  types = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".png": "image/png",
  };
createServer((req, res) => {
  try {
    const pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      ),
      file = path.resolve(
        root,
        "." + (pathname === "/" ? "/index.html" : pathname),
      );
    if (!file.startsWith(root + path.sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    res.setHeader(
      "Content-Type",
      types[path.extname(file)] || "application/octet-stream",
    );
    res.setHeader("Cache-Control", "no-cache");
    res.end(fs.readFileSync(file));
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}).listen(5173, "127.0.0.1", () => console.log("Local: http://127.0.0.1:5173"));
