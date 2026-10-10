// Generates PNG app icons from the SVG logo. Run: pnpm icons
import { readFile } from "node:fs/promises";
import sharp, { type Colour } from "sharp";
import { runCommand } from "./command";

const transparent: Colour = { r: 0, g: 0, b: 0, alpha: 0 };
const white: Colour = { r: 255, g: 255, b: 255, alpha: 1 };

async function render(logo: Buffer, size: number, padding: number, background: Colour, out: string) {
  const inner = size - padding * 2;
  const mark = await sharp(logo, { density: 600 })
    .resize({ width: inner, height: inner, fit: "contain", background: transparent })
    .png()
    .toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: mark, gravity: "center" }])
    .png()
    .toFile(new URL(out, import.meta.url).pathname);
}

runCommand(
  "icons",
  import.meta.url,
  () => undefined,
  async () => {
    const logo = await readFile(new URL("../src/app/icon.svg", import.meta.url));
    await render(logo, 32, 1, transparent, "../src/app/icon.png");
    await render(logo, 180, 22, white, "../src/app/apple-icon.png");
    console.log("Icons generated.");
  },
);
