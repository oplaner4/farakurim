// Generates PNG app icons from the SVG logo. Run: pnpm icons
import sharp from "sharp";
import { readFile } from "node:fs/promises";

const logo = await readFile(new URL("../src/app/icon.svg", import.meta.url));

async function render(size, padding, background, out) {
  const inner = size - padding * 2;
  const mark = await sharp(logo, { density: 600 })
    .resize({ width: inner, height: inner, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: mark, gravity: "center" }])
    .png()
    .toFile(new URL(out, import.meta.url).pathname);
}

const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
const white = { r: 255, g: 255, b: 255, alpha: 1 };

await render(32, 1, transparent, "../src/app/icon.png");
await render(180, 22, white, "../src/app/apple-icon.png");
console.log("Icons generated.");
