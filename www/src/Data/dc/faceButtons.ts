export type FaceShape = 'cross' | 'circle' | 'square' | 'triangle';

// How a face button is drawn beyond plain text: a colored PlayStation symbol
// (shape set) or just a colored label, as on Xbox (no shape).
export type FaceStyle = { color: string; shape?: FaceShape };

type FaceKey = 'B1' | 'B2' | 'B3' | 'B4';

// Bright versions of the consoles' own colors so they read on the dark circles.
const PLAYSTATION: Record<FaceKey, FaceStyle> = {
  B1: { shape: 'cross', color: '#7fb2f0' },
  B2: { shape: 'circle', color: '#f0616d' },
  B3: { shape: 'square', color: '#e58fc4' },
  B4: { shape: 'triangle', color: '#4fd1a1' },
};

const XBOX: Record<FaceKey, FaceStyle> = {
  B1: { color: '#7ac143' }, // A - green
  B2: { color: '#f0554b' }, // B - red
  B3: { color: '#3d9bf0' }, // X - blue
  B4: { color: '#f5c518' }, // Y - yellow
};

// Keyed by the stock button-label set (Data/Buttons.js) — the same key
// labelSetForInputMode resolves a console to — so PS3/PS4/PS5 share the PS
// styling and the Xbox 360/One/Original share Xbox's.
const STYLES_BY_LABEL_SET: Record<string, Record<FaceKey, FaceStyle>> = {
  ps3: PLAYSTATION,
  ps4: PLAYSTATION,
  xinput: XBOX,
};

export function faceStyleFor(labelSet: string, buttonKey: string): FaceStyle | undefined {
  const styles = STYLES_BY_LABEL_SET[labelSet];
  return styles?.[buttonKey as FaceKey];
}
