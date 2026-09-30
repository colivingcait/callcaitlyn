import { readFile } from "node:fs/promises";
import path from "node:path";

export type OgFont = {
  name: string;
  data: Buffer;
  weight: 400 | 500 | 600;
  style: "normal" | "italic";
};

let pending: Promise<OgFont[]> | null = null;

async function readOgFonts(): Promise<OgFont[]> {
  const dir = path.join(process.cwd(), "assets/fonts");
  const [regular, italic, medium, semibold] = await Promise.all([
    readFile(path.join(dir, "Newsreader-Regular.ttf")),
    readFile(path.join(dir, "Newsreader-Italic.ttf")),
    readFile(path.join(dir, "Archivo-Medium.ttf")),
    readFile(path.join(dir, "Archivo-SemiBold.ttf")),
  ]);
  return [
    { name: "Newsreader", data: regular, weight: 400, style: "normal" },
    { name: "Newsreader", data: italic, weight: 400, style: "italic" },
    { name: "Archivo", data: medium, weight: 500, style: "normal" },
    { name: "Archivo", data: semibold, weight: 600, style: "normal" },
  ];
}

export function loadOgFonts(): Promise<OgFont[]> {
  if (!pending) pending = readOgFonts();
  return pending;
}
