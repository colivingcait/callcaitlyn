import { readFile } from "node:fs/promises";
import path from "node:path";

export type OgFont = {
  name: string;
  data: Buffer;
  weight: 300 | 400 | 500 | 600;
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

let indexPending: Promise<OgFont[]> | null = null;

// Index card only. Listing cards keep Newsreader and Archivo.
async function readIndexOgFonts(): Promise<OgFont[]> {
  const dir = path.join(process.cwd(), "assets/fonts");
  const [regular, italic, sans] = await Promise.all([
    readFile(path.join(dir, "CormorantGaramond-Regular.ttf")),
    readFile(path.join(dir, "CormorantGaramond-LightItalic.ttf")),
    readFile(path.join(dir, "DMSans-Light.ttf")),
  ]);
  return [
    { name: "Cormorant Garamond", data: regular, weight: 400, style: "normal" },
    { name: "Cormorant Garamond", data: italic, weight: 300, style: "italic" },
    { name: "DM Sans", data: sans, weight: 300, style: "normal" },
  ];
}

export function loadIndexOgFonts(): Promise<OgFont[]> {
  if (!indexPending) indexPending = readIndexOgFonts();
  return indexPending;
}
