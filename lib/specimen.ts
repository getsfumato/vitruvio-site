/**
 * The regions the page "measures" on the Vitruvius plate, and the code that
 * measures them.
 *
 * Same conceit as sfumato.sh, inverted. There the readouts argue that Leonardo's
 * transitions are too gradual to draw a line through, and the gradient numbers come
 * out startlingly low. Here the specimen is a nineteenth-century line engraving:
 * every tone in it is hatching, so the same measurement comes back an order of
 * magnitude higher. Both numbers are real, taken from the decoded pixels — a brain
 * that returns evidence should not have a landing page that invents its own.
 */

export interface Region {
  /** rect in image space, 0..1, y down */
  x: number;
  y: number;
  w: number;
  h: number;
  /** which measurement to surface in the label */
  readout: 'grad' | 'lum' | 'sd';
  /** block size in image-width units at rest, and how far it breathes */
  block: number;
  swing: number;
  /** phase offset so the regions do not pulse in unison */
  phase: number;
  /**
   * Hang the readout under the reticle rather than over it.
   *
   * Labels sit above their box by default, which collides when two regions are
   * stacked a few percent apart — and they are, on a head: eyes, brow, beard run
   * straight down the middle. Flipping the middle two puts each label in the gap
   * below its own box instead of in the gap above it, which is the same gap the
   * region above is already using.
   */
  below?: boolean;
}

export const SPECIMEN_SRC = '/img/vitruvius.webp';

/**
 * Placed on the features a viewer already looks at: eyes, brow, beard, the fall of
 * the mantle, the hand on the scroll.
 *
 * All five are kept clear of the plate's edge dissolve (see the shader). The hand
 * sits low enough that it is the one worth checking after any change to the fade
 * distances — a reticle hovering over nothing is worse than no reticle.
 */
export const REGIONS: Region[] = [
  { x: 0.335, y: 0.180, w: 0.285, h: 0.085, readout: 'grad', block: 0.020, swing: 0.010, phase: 0.0 },
  { x: 0.410, y: 0.275, w: 0.165, h: 0.080, readout: 'sd', block: 0.013, swing: 0.006, phase: 1.7, below: true },
  { x: 0.390, y: 0.400, w: 0.240, h: 0.155, readout: 'lum', block: 0.022, swing: 0.011, phase: 3.1, below: true },
  { x: 0.105, y: 0.545, w: 0.150, h: 0.185, readout: 'grad', block: 0.024, swing: 0.012, phase: 4.4 },
  { x: 0.620, y: 0.720, w: 0.245, h: 0.120, readout: 'sd', block: 0.017, swing: 0.008, phase: 5.6 },
];

export interface Measured {
  /** mean gradient magnitude — hatch density, region by region */
  grad: number;
  /** mean luminance */
  lum: number;
  /** rms contrast: the standard deviation of luminance about that mean */
  sd: number;
}

/**
 * Measure every region from the decoded image.
 *
 * Runs once on a scratch canvas at reduced resolution: the statistics are means (and
 * a variance, which is a mean of squares), so they are stable under downsampling,
 * and the full plate is more pixels than the numbers need. Gradient is a forward
 * difference on luminance — scaled to per-pixel units, so the value does not depend
 * on the sampling resolution.
 */
export function measure(img: HTMLImageElement, regions: Region[] = REGIONS): Measured[] {
  const W = 320;
  const H = Math.max(1, Math.round((img.naturalHeight / img.naturalWidth) * W));

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return regions.map(() => ({ grad: 0, lum: 0, sd: 0 }));

  ctx.drawImage(img, 0, 0, W, H);
  const { data } = ctx.getImageData(0, 0, W, H);

  const lum = new Float32Array(W * H);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    lum[p] = (data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722) / 255;
  }

  return regions.map((r) => {
    const x0 = Math.max(0, Math.floor(r.x * W));
    const y0 = Math.max(0, Math.floor(r.y * H));
    const x1 = Math.min(W - 1, Math.ceil((r.x + r.w) * W));
    const y1 = Math.min(H - 1, Math.ceil((r.y + r.h) * H));

    let sumL = 0;
    let sumLL = 0;
    let sumG = 0;
    let n = 0;

    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const p = y * W + x;
        const l = lum[p];
        const gx = lum[y * W + Math.min(W - 1, x + 1)] - l;
        const gy = lum[Math.min(H - 1, y + 1) * W + x] - l;
        sumL += l;
        sumLL += l * l;
        sumG += Math.hypot(gx, gy);
        n++;
      }
    }

    if (n === 0) return { grad: 0, lum: 0, sd: 0 };
    const mean = sumL / n;
    // clamp before the root: floating-point cancellation can drive the variance a
    // hair below zero on a flat region
    const variance = Math.max(0, sumLL / n - mean * mean);
    return { grad: sumG / n, lum: mean, sd: Math.sqrt(variance) };
  });
}

/** Label for a region, e.g. "∇ 0.0846". Fixed width so it does not jitter. */
export function label(region: Region, m: Measured): string {
  if (region.readout === 'grad') return `∇ ${m.grad.toFixed(4)}`;
  if (region.readout === 'sd') return `σ ${m.sd.toFixed(4)}`;
  return `μ ${m.lum.toFixed(4)}`;
}
