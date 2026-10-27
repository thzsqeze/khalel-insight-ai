/**
 * Original, stylized reconstruction from university photographs.
 * Run: node scripts/generate-campus-model.mjs
 * Uses the exact Three.js dependency already installed with model-viewer.
 * Units are illustrative, not surveyed measurements. Front is +Z; up is +Y.
 */
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const viewerDirectory = path.dirname(require.resolve("@google/model-viewer"));
const threeDirectory = path.dirname(
  path.dirname(require.resolve("three", { paths: [viewerDirectory] })),
);
const addon = (file) => import(pathToFileURL(path.join(threeDirectory, "examples/jsm", file)));
const THREE = await import(pathToFileURL(path.join(threeDirectory, "build/three.module.js")));
const { GLTFExporter } = await addon("exporters/GLTFExporter.js");
const { mergeGeometries, mergeVertices } = await addon("utils/BufferGeometryUtils.js");
const { FontLoader } = await addon("loaders/FontLoader.js");
const { RoundedBoxGeometry } = await addon("geometries/RoundedBoxGeometry.js");

// GLTFExporter reads its Blob buffers through the browser FileReader API.
class NodeFileReader {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = result;
      this.onloadend?.();
    });
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = `data:${blob.type};base64,${Buffer.from(result).toString("base64")}`;
      this.onloadend?.();
    });
  }
}
globalThis.FileReader = NodeFileReader;

const palette = {
  wall: ["#d8d7ca", 0.95],
  wallLight: ["#e8e7db", 0.9],
  wallShadow: ["#c2c5bd", 0.95],
  plinth: ["#909b95", 1],
  roof: ["#3c9ac2", 0.72],
  roofEdge: ["#287fa8", 0.8],
  lettering: ["#22668e", 0.8],
  glass: ["#446474", 0.28],
  glassLight: ["#7298a5", 0.32],
  frame: ["#eeede4", 0.75],
  door: ["#304f5d", 0.35],
  paving: ["#d7d5c8", 1],
  path: ["#ebe6d8", 1],
  lawn: ["#a3b18c", 1],
  evergreen: ["#4c7562", 1],
  evergreenLight: ["#709075", 1],
  trunk: ["#8d7861", 1],
  bronze: ["#656f63", 0.85],
  flag: ["#45aeca", 0.8],
  gold: ["#d9b762", 0.8],
};
const materials = new Map(
  Object.entries(palette).map(([name, [color, roughness]]) => [
    name,
    new THREE.MeshStandardMaterial({ name, color, roughness, metalness: 0 }),
  ]),
);
const batches = new Map();
function add(geometry, material, position = [0, 0, 0], rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(geometry);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.updateMatrix();
  let flat = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  flat.applyMatrix4(mesh.matrix);
  flat.deleteAttribute("uv");
  flat.deleteAttribute("uv1");
  if (!flat.getAttribute("normal")) flat.computeVertexNormals();
  const list = batches.get(material) ?? [];
  list.push(flat);
  batches.set(material, list);
  geometry.dispose();
}
function box(x, y, z, width, height, depth, material, rotation = [0, 0, 0]) {
  add(new THREE.BoxGeometry(width, height, depth), material, [x, y, z], rotation);
}
function cylinder(x, y, z, top, bottom, height, material, segments = 12) {
  add(new THREE.CylinderGeometry(top, bottom, height, segments), material, [x, y, z]);
}
function polyhedron(vertices, triangles, material) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      triangles.flatMap((triangle) => triangle.flatMap((index) => vertices[index])),
      3,
    ),
  );
  geometry.computeVertexNormals();
  add(geometry, material);
}
function hipRoof(x, y, z, width, depth, rise, material = "roof") {
  const a = width / 2,
    b = depth / 2,
    ridge = Math.max(0, a - b);
  const vertices = [
    [x - a, y, z - b],
    [x + a, y, z - b],
    [x + a, y, z + b],
    [x - a, y, z + b],
    [x - ridge, y + rise, z],
    [x + ridge, y + rise, z],
  ];
  polyhedron(
    vertices,
    [
      [0, 4, 5],
      [0, 5, 1],
      [1, 5, 2],
      [2, 5, 4],
      [2, 4, 3],
      [3, 4, 0],
    ],
    material,
  );
  box(x, y - 0.035, z, width, 0.11, depth, "roofEdge");
  box(x, y + rise + 0.018, z, Math.max(0.12, ridge * 2), 0.065, 0.1, "roofEdge");
}
function windowAt(x, y, z, width = 0.56, height = 0.88, rotation = 0, variant = 0) {
  const transform = (dx, dy, dz, w, h, d, material) => {
    const vector = new THREE.Vector3(dx, dy, dz).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      rotation,
    );
    box(x + vector.x, y + dy, z + vector.z, w, h, d, material, [0, rotation, 0]);
  };
  transform(0, 0, -0.025, width + 0.14, height + 0.14, 0.09, "wallShadow");
  transform(0, 0, 0.025, width, height, 0.065, variant % 3 === 0 ? "glassLight" : "glass");
  for (const edge of [-1, 1]) {
    transform((edge * width) / 2, 0, 0.07, 0.045, height + 0.07, 0.05, "frame");
    transform(0, (edge * height) / 2, 0.07, width + 0.07, 0.045, 0.05, "frame");
  }
  transform(0, 0, 0.075, 0.032, height, 0.05, "frame");
  transform(0, height * 0.16, 0.075, width, 0.025, 0.05, "frame");
  transform(0, -height / 2 - 0.045, 0.095, width + 0.15, 0.065, 0.16, "wallLight");
}
const font = new FontLoader().parse(
  JSON.parse(await readFile(path.join(project, "scripts/assets/campus-sign-font.json"), "utf8")),
);
function lettering(text, x, y, z, width, material, size = 0.22) {
  const geometry = new THREE.ShapeGeometry(font.generateShapes(text, size), 2);
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  const scale = width / (bounds.max.x - bounds.min.x);
  geometry.scale(scale, scale, 1);
  geometry.translate(-width / 2, 0, 0);
  add(geometry, material, [x, y, z]);
}

// Four-storey monument-facing facade. Dimensions and rear elevation are
// deliberately schematic; the visible massing follows the Atyrau TV aerial.
add(new RoundedBoxGeometry(33.4, 0.38, 17.4, 2, 0.65), "paving", [0, 0.05, 3.4]);
box(0, 0.26, 4.7, 28.8, 0.06, 8.3, "path");
box(0, 0.36, -0.4, 28.6, 0.3, 7.5, "plinth");
box(0, 3.55, -0.5, 21.0, 6.25, 6.3, "wall");
for (const side of [-1, 1]) {
  const x = side * 12.2;
  box(x, 3.55, -0.25, 3.9, 6.25, 7.1, "wallShadow");
  box(x, 3.6, 3.34, 3.92, 6.0, 0.12, "wall");
  box(x, 0.61, 3.45, 4.0, 0.3, 0.24, "plinth");
  hipRoof(x, 6.78, -0.25, 4.25, 7.5, 0.82);
  for (let floor = 0; floor < 4; floor++) {
    const y = 1.35 + floor * 1.36;
    for (const [i, dx] of [-0.76, 0.76].entries())
      windowAt(x + dx, y, 3.43, 0.65, 0.91, 0, i + floor);
    for (let col = 0; col < 5; col++)
      windowAt(side * 14.19, y, 2.4 - col * 1.27, 0.64, 0.91, (side * Math.PI) / 2, col + floor);
  }
}
// Roof eaves, compound hip roof and the large name band visible in the aerial.
box(0, 6.68, 2.7, 21.1, 0.18, 0.3, "wallLight");
hipRoof(0, 6.82, -0.55, 21.5, 6.8, 1.34);
box(0, 7.35, 2.65, 19.3, 0.75, 0.18, "wallLight");
box(0, 7.76, 2.64, 19.5, 0.1, 0.28, "roofEdge");
lettering("Х. ДОСМҰХАМЕДОВ АТЫНДАҒЫ АТЫРАУ УНИВЕРСИТЕТІ", 0, 7.26, 2.76, 18.6, "lettering");

// Three upper window rows; the glazed ground floor is modeled separately.
for (let floor = 0; floor < 3; floor++) {
  const y = 2.72 + floor * 1.36;
  for (let col = 0; col < 18; col++) {
    const x = -9.57 + col * 1.126;
    windowAt(x, y, 2.69, 0.66, 0.91, 0, col + floor);
  }
}
for (const y of [2.03, 3.4, 4.76, 6.13]) box(0, y, 2.687, 20.94, 0.028, 0.028, "wallShadow");
// Panel joints are restrained so the building stays readable at card size.
for (let i = -10; i <= 10; i += 2) box(i, 4.4, 2.685, 0.018, 4.6, 0.025, "wallShadow");
for (let col = 0; col < 20; col++) {
  const x = -9.55 + col * 1.005;
  if (Math.abs(x) < 1.5) continue;
  windowAt(x, 1.21, 2.8, 0.88, 1.28, 0, col);
}
box(0, 2.01, 3.0, 20.8, 0.14, 0.7, "roofEdge");
box(0, 2.12, 3.13, 20.9, 0.08, 0.98, "roof", [-0.08, 0, 0]);
box(0, 1.22, 3.1, 3.05, 1.53, 0.4, "door");
for (const x of [-1.45, 0, 1.45]) box(x, 1.24, 3.33, 0.075, 1.58, 0.1, "frame");
for (const x of [-0.73, 0.73]) {
  box(x, 1.25, 3.34, 1.32, 1.4, 0.065, "glassLight");
  box(x, 1.25, 3.39, 0.035, 1.4, 0.045, "frame");
  box(x + 0.21, 1.2, 3.43, 0.045, 0.32, 0.06, "frame");
}
box(0, 1.99, 3.44, 3.2, 0.11, 0.28, "frame");
box(0, 2.3, 3.26, 4.1, 0.38, 0.35, "wallLight");
lettering("ATYRAU UNIVERSITY", 0, 2.21, 3.45, 3.65, "lettering");
for (let step = 0; step < 3; step++)
  box(
    0,
    0.28 + step * 0.09,
    3.9 - step * 0.21,
    4.5 - step * 0.12,
    0.1,
    1.2 - step * 0.15,
    "wallLight",
  );

// Schematic rear continuation. It is secondary to the photographed front.
box(0, 3.42, -4.2, 10.6, 6.0, 4.3, "wallShadow");
hipRoof(0, 6.5, -4.2, 11.0, 4.7, 0.72);
for (let floor = 0; floor < 4; floor++) {
  for (let col = 0; col < 9; col++)
    windowAt(-4.5 + col * 1.125, 1.27 + floor * 1.31, -6.4, 0.64, 0.87, Math.PI, col + floor);
  for (const side of [-1, 1])
    for (let col = 0; col < 4; col++)
      windowAt(
        side * 5.36,
        1.27 + floor * 1.31,
        -5.7 + col * 0.9,
        0.6,
        0.87,
        (side * Math.PI) / 2,
        col,
      );
}

// Forecourt: axial paved approach, planting beds and restrained trees.
box(0, 0.3, 8.15, 5.0, 0.045, 7.8, "wallLight");
for (const side of [-1, 1]) {
  add(new RoundedBoxGeometry(7.4, 0.16, 4.5, 2, 0.3), "lawn", [side * 10.1, 0.34, 8.4]);
  for (const [i, z] of [5.2, 8.4, 11.2].entries()) {
    const x = side * (12.3 - (i % 2) * 0.75);
    cylinder(x, 1.0, z, 0.095, 0.14, 1.35, "trunk", 7);
    add(new THREE.IcosahedronGeometry(0.94, 1), i % 2 ? "evergreenLight" : "evergreen", [
      x,
      2.1,
      z,
    ]);
    add(new THREE.IcosahedronGeometry(0.7, 1), "evergreenLight", [x + 0.42, 2.3, z + 0.12]);
    add(new THREE.IcosahedronGeometry(0.65, 1), "evergreen", [x - 0.44, 1.9, z - 0.18]);
  }
  for (const z of [7.2, 10.6]) {
    box(side * 6.4, 0.83, z, 2.1, 0.12, 0.55, "trunk");
    box(side * 6.4, 1.12, z - 0.22, 2.1, 0.47, 0.09, "trunk");
    for (const dx of [-0.72, 0.72]) box(side * 6.4 + dx, 0.56, z, 0.1, 0.48, 0.45, "roofEdge");
  }
}
// Simplified standing monument, not a portrait reconstruction.
const mz = 8.0;
box(0, 0.39, mz, 2.35, 0.18, 2.05, "wallLight");
box(0, 0.56, mz, 1.98, 0.17, 1.68, "wallShadow");
box(0, 0.72, mz, 1.6, 0.17, 1.31, "wallLight");
add(
  new THREE.CylinderGeometry(0.43, 0.55, 1.18, 4, 1),
  "plinth",
  [0, 1.37, mz],
  [0, Math.PI / 4, 0],
);
box(0, 2.0, mz, 0.92, 0.12, 0.84, "wallLight");
for (const x of [-0.16, 0.16]) box(x, 2.3, mz, 0.22, 0.56, 0.31, "wallShadow");
add(new THREE.CylinderGeometry(0.29, 0.36, 0.65, 7), "wallLight", [0, 2.82, mz]);
add(new THREE.IcosahedronGeometry(0.205, 2), "wallLight", [0, 3.34, mz]);
box(-0.32, 2.83, mz + 0.03, 0.19, 0.62, 0.22, "wallLight", [0, 0, -0.16]);
box(0.32, 2.83, mz + 0.03, 0.19, 0.62, 0.22, "wallLight", [0, 0, 0.16]);
box(0.16, 2.61, mz + 0.24, 0.4, 0.28, 0.12, "wallShadow", [0, 0, -0.12]);
lettering("ХАЛЕЛ", 0, 1.65, mz + 0.42, 0.53, "wallLight", 0.1);

// Flag above the entrance. Small geometry-only flag avoids external textures.
cylinder(0, 8.72, -0.25, 0.025, 0.025, 1.9, "frame", 8);
box(0.39, 9.12, -0.25, 0.75, 0.39, 0.022, "flag");
add(new THREE.CircleGeometry(0.07, 12), "gold", [0.38, 9.15, -0.231]);
box(0.38, 9.02, -0.23, 0.14, 0.028, 0.022, "gold");

const scene = new THREE.Group();
scene.name = "Atyrau University — main building, stylized reconstruction";
scene.userData = {
  description:
    "Original stylized reconstruction from published photographs. Not a measured architectural survey.",
  source: "https://asu.edu.kz/en/university/rebranding/6653/",
};
for (const [material, geometries] of batches) {
  const merged = mergeGeometries(geometries, false);
  if (!merged) throw new Error(`Cannot merge ${material}`);
  const geometry = mergeVertices(merged, 0.0001);
  merged.dispose();
  geometry.computeBoundingBox();
  const mesh = new THREE.Mesh(geometry, materials.get(material));
  mesh.name = material;
  scene.add(mesh);
  geometries.forEach((part) => part.dispose());
}
if (!scene.children.length) throw new Error("Model has no geometry");
const result = await new GLTFExporter().parseAsync(scene, { binary: true });
const directory = path.join(project, "public/models/campus");
await mkdir(directory, { recursive: true });
await writeFile(path.join(directory, "atyrau-main-building.glb"), Buffer.from(result));
const bounds = new THREE.Box3().setFromObject(scene);
console.log(
  JSON.stringify(
    {
      file: "atyrau-main-building.glb",
      bytes: result.byteLength,
      materials: scene.children.length,
      bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
    },
    null,
    2,
  ),
);
