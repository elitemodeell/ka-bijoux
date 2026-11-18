const fs = require("node:fs/promises");
const path = require("node:path");
const { createHash } = require("node:crypto");
const sharp = require("sharp");

const root = path.resolve(__dirname, "../public");
const output = path.resolve(__dirname, "../../tmp/catalog-photo-audit");
const folders = ["uploads/products", "imagens/Bijoux", "imagens/produtos-whatsapp"];

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const groups = await Promise.all(entries.map((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : entry.isFile() ? [file] : [];
  }));
  return groups.flat();
}

async function inspect(file) {
  const image = sharp(file, { limitInputPixels: 25_000_000, failOn: "error" });
  const { data, info } = await image.autoOrient().flatten({ background: "#fff" }).toColourspace("srgb")
    .raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const digest = createHash("sha256").update(`${width}:${height}:${channels}:`).update(data).digest("hex");
  const tiny = await sharp(data, { raw: { width, height, channels } })
    .resize(9, 8, { fit: "fill" }).greyscale().raw().toBuffer();
  let hash = 0n;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      hash = (hash << 1n) | BigInt(tiny[y * 9 + x] > tiny[y * 9 + x + 1]);
    }
  }
  return { width, height, digest, hash: hash.toString(16).padStart(16, "0") };
}

function distance(a, b) {
  let remainder = BigInt(`0x${a}`) ^ BigInt(`0x${b}`);
  let bits = 0;
  while (remainder && bits <= 4) {
    remainder &= remainder - 1n;
    bits++;
  }
  return bits;
}

async function contactSheet(rows) {
  const width = 240;
  const height = 230;
  const columns = 4;
  const layers = await Promise.all(rows.map(async (row, i) => {
    const input = await sharp(path.join(root, row.file)).autoOrient()
      .resize(width - 8, height - 32, { fit: "contain", background: "#fff" }).flatten({ background: "#fff" })
      .extend({ top: 0, bottom: 27, left: 0, right: 0, background: "#eee" })
      .composite([{ input: { text: { text: `Foto ${i + 1}`, font: "sans 14", rgba: true } }, gravity: "south" }])
      .png().toBuffer();
    return { input, left: (i % columns) * width, top: Math.floor(i / columns) * height };
  }));
  if (!layers.length) return;
  await sharp({ create: { width: columns * width, height: Math.ceil(rows.length / columns) * height,
    channels: 3, background: "#fff" } }).composite(layers).png().toFile(path.join(output, "priority.png"));
}

async function main() {
  const files = (await Promise.all(folders.map((folder) => walk(path.join(root, folder))))).flat()
    .filter((file) => /\.(jpe?g|jfif|png|webp|gif|avif|tiff?|bmp)$/i.test(file)).sort();
  await fs.mkdir(output, { recursive: true });
  const images = [];
  const unreadable = [];
  for (const file of files) {
    const relative = path.relative(root, file).split(path.sep).join("/");
    try {
      images.push({ file: relative, ...await inspect(file) });
    } catch {
      unreadable.push(relative);
    }
  }
  const exact = new Map();
  const similar = [];
  for (const [i, a] of images.entries()) {
    if (!exact.has(a.digest)) exact.set(a.digest, []);
    exact.get(a.digest).push(a.file);
    for (const b of images.slice(i + 1)) {
      if (a.digest === b.digest || Math.abs(Math.log((a.width * b.height) / (a.height * b.width))) > 0.12) continue;
      const difference = distance(a.hash, b.hash);
      if (difference <= 4) similar.push({ files: [a.file, b.file], difference });
    }
  }
  const identical = [...exact.values()].filter((group) => group.length > 1);
  const lowResolution = images.filter(({ width, height }) => Math.min(width, height) < 600).map(({ file }) => file);
  const priority = images.filter(({ file }) => /q10|esfoliante-para-os-pes|balanca|3104000000607|fonte-2-entradas|ip-?11-?pro-?max/i.test(file)).slice(0, 24);
  await contactSheet(priority);
  const totals = { scanned: images.length, unreadable: unreadable.length, identicalGroups: identical.length,
    similarPairs: similar.length, lowResolution: lowResolution.length, visualPriority: priority.length };
  await fs.writeFile(path.join(output, "audit.json"), JSON.stringify({
    totals, images, unreadable, identical, similar, lowResolution, priority: priority.map(({ file }) => file),
  }, null, 2));
  console.log(JSON.stringify(totals));
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
