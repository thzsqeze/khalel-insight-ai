/** Render the poster from the actual GLB with the site's model-viewer settings. */
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { chromium } = require("@playwright/test");
const sharp = require(require.resolve("sharp", { paths: [path.dirname(require.resolve("next"))] }));
const model = await readFile(path.join(root, "public/models/campus/atyrau-main-building.glb"));
const viewer = await readFile(require.resolve("@google/model-viewer"));
const html = `<!doctype html><html><head><style>
html,body{margin:0;width:100%;height:100%;background:transparent}
model-viewer{display:block;width:100%;height:100%;--poster-color:transparent}
</style><script type="module" src="/viewer.js"></script></head><body>
<model-viewer src="/model.glb" loading="eager" camera-orbit="30deg 70deg 65%" camera-target="0m 1.5m 2m"
field-of-view="30deg" shadow-intensity="0.6" shadow-softness="1" exposure="1"
interaction-prompt="none"></model-viewer></body></html>`;
const server = createServer((request, response) => {
  const route = request.url?.split("?")[0];
  const entry = {
    "/": ["text/html", html],
    "/viewer.js": ["text/javascript", viewer],
    "/model.glb": ["model/gltf-binary", model],
  }[route];
  response.writeHead(entry ? 200 : 404, { "Content-Type": entry?.[0] ?? "text/plain" });
  response.end(entry?.[1] ?? "Not found");
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1590, height: 930 } });
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.waitForFunction(() => document.querySelector("model-viewer")?.loaded, {
    timeout: 30000,
  });
  const png = await page.evaluate(async () => {
    const element = document.querySelector("model-viewer");
    element.jumpCameraToGoal();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const blob = await element.toBlob({ mimeType: "image/png", idealAspect: false });
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  });
  const bytes = Buffer.from(png);
  await writeFile("/tmp/atyrau-main-building-render.png", bytes);
  const result = await sharp(bytes)
    .webp({ quality: 92, alphaQuality: 100 })
    .toFile(path.join(root, "public/models/campus/atyrau-main-building-poster.webp"));
  console.log(JSON.stringify(result));
} finally {
  await browser?.close();
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
}
