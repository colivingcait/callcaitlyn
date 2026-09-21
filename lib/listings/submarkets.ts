// Submarket centroids for the public listings map. Pins sit here — never
// at a geocoded street address. Keys are lowercase, punctuation-stripped.

const SUBMARKET_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  "adair park": { lat: 33.7305, lng: -84.411 },
  adamsville: { lat: 33.758, lng: -84.504 },
  "atlanta metro": { lat: 33.749, lng: -84.388 },
  austell: { lat: 33.8126, lng: -84.6344 },
  "ben hill": { lat: 33.688, lng: -84.512 },
  bankhead: { lat: 33.772, lng: -84.428 },
  cabbagetown: { lat: 33.751, lng: -84.365 },
  "capitol view": { lat: 33.722, lng: -84.407 },
  "capitol view manor": { lat: 33.716, lng: -84.414 },
  cascade: { lat: 33.722, lng: -84.47 },
  "cascade heights": { lat: 33.722, lng: -84.47 },
  "center hill": { lat: 33.768, lng: -84.462 },
  "chosewood park": { lat: 33.72, lng: -84.368 },
  "college park": { lat: 33.6534, lng: -84.4494 },
  decatur: { lat: 33.7748, lng: -84.2963 },
  douglasville: { lat: 33.7515, lng: -84.7477 },
  "east atlanta": { lat: 33.74, lng: -84.34 },
  "east lake": { lat: 33.743, lng: -84.302 },
  "east point": { lat: 33.6795, lng: -84.4394 },
  edgewood: { lat: 33.7548, lng: -84.339 },
  "english avenue": { lat: 33.763, lng: -84.412 },
  "flat shoals": { lat: 33.74, lng: -84.34 },
  "forest park": { lat: 33.6221, lng: -84.3691 },
  "fort mcpherson": { lat: 33.705, lng: -84.434 },
  "grant park": { lat: 33.737, lng: -84.37 },
  greenbriar: { lat: 33.688, lng: -84.494 },
  "gresham park": { lat: 33.703, lng: -84.314 },
  "grove park": { lat: 33.774, lng: -84.438 },
  hapeville: { lat: 33.6601, lng: -84.4102 },
  "hunter hills": { lat: 33.754, lng: -84.444 },
  "inman park": { lat: 33.757, lng: -84.352 },
  kirkwood: { lat: 33.753, lng: -84.323 },
  lakewood: { lat: 33.701, lng: -84.39 },
  "lakewood heights": { lat: 33.701, lng: -84.39 },
  mableton: { lat: 33.8187, lng: -84.5824 },
  mechanicsville: { lat: 33.726, lng: -84.39 },
  "metro atlanta": { lat: 33.749, lng: -84.388 },
  "mozley park": { lat: 33.751, lng: -84.438 },
  "oakland city": { lat: 33.725, lng: -84.426 },
  "old fourth ward": { lat: 33.764, lng: -84.372 },
  ormewood: { lat: 33.732, lng: -84.356 },
  peoplestown: { lat: 33.728, lng: -84.381 },
  perkerson: { lat: 33.69, lng: -84.408 },
  pittsburgh: { lat: 33.73, lng: -84.396 },
  "pittsburgh yards": { lat: 33.73, lng: -84.396 },
  "princeton lakes": { lat: 33.6534, lng: -84.4494 },
  sandtown: { lat: 33.71, lng: -84.54 },
  "south atlanta": { lat: 33.698, lng: -84.388 },
  "southwest atlanta": { lat: 33.725, lng: -84.46 },
  summerhill: { lat: 33.738, lng: -84.384 },
  "sylvan hills": { lat: 33.712, lng: -84.418 },
  "the westside": { lat: 33.754, lng: -84.465 },
  "venetian hills": { lat: 33.718, lng: -84.436 },
  "vine city": { lat: 33.756, lng: -84.408 },
  "washington park": { lat: 33.756, lng: -84.424 },
  "west atlanta": { lat: 33.754, lng: -84.465 },
  "west end": { lat: 33.7358, lng: -84.413 },
  westside: { lat: 33.754, lng: -84.465 },
  westview: { lat: 33.7385, lng: -84.4399 },
};

function normalizeSubmarket(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9/|,·-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function submarketCentroid(submarket: string | null | undefined): { lat: number; lng: number } | null {
  if (!submarket) return null;
  const key = normalizeSubmarket(submarket);
  if (!key) return null;
  if (SUBMARKET_CENTROIDS[key]) return SUBMARKET_CENTROIDS[key];

  for (const part of key.split(/[·/,|-]+/)) {
    const trimmed = part.trim();
    if (trimmed && SUBMARKET_CENTROIDS[trimmed]) return SUBMARKET_CENTROIDS[trimmed];
  }

  for (const [name, coord] of Object.entries(SUBMARKET_CENTROIDS)) {
    if (name.length < 5) continue;
    if (key.includes(name) || name.includes(key)) return coord;
  }
  return null;
}
