// Dispersió determinista de punts dins d'un pinzell circular (Poisson acotat).

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mixSeed(seed, x, y, radius, spacing, density) {
  let h = (Math.trunc(seed) >>> 0) || 0x9e3779b9;
  for (const v of [x, y, radius, spacing, density]) {
    const bits = Math.round(v * 4096) | 0;
    h = (Math.imul(h ^ bits, 0x85ebca6b) >>> 0) ^ (h >>> 13);
  }
  return h >>> 0;
}

export function scatterBrush({ x, y, radius, spacing, density = 1, seed = 1 }) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new RangeError('scatterBrush: x/y han de ser finits');
  }
  if (!Number.isFinite(radius) || radius <= 0 || radius > 30) {
    throw new RangeError('scatterBrush: radius ha de ser finit, 0 < r <= 30');
  }
  if (!Number.isFinite(spacing) || spacing <= 0) {
    throw new RangeError('scatterBrush: spacing ha de ser finit i > 0');
  }
  if (!Number.isFinite(density) || density < 0.25 || density > 5) {
    throw new RangeError('scatterBrush: density ha de ser finit, entre 0.25 i 5');
  }
  if (!Number.isFinite(seed)) {
    throw new RangeError('scatterBrush: seed ha de ser finit');
  }

  const step = spacing / Math.sqrt(density);
  if (step < 1e-9) {
    throw new RangeError('scatterBrush: separació inferior a la precisió admesa');
  }
  const target = Math.min(12000, Math.max(1, Math.round((Math.PI * radius * radius) / (step * step))));
  const minDist = 0.65 * step;
  const minDist2 = minDist * minDist;

  const rand = mulberry32(mixSeed(seed, x, y, radius, spacing, density));

  // Graella de contenidors només per a consultes de veïns; mai s'hi ajusten coordenades.
  const cell = minDist / Math.SQRT2;
  const grid = new Map();
  const cellKey = (cx, cy) => cx * 73856093 ^ cy * 19349663;
  const points = [];

  const maxAttempts = Math.min(400000, Math.max(200, target * 40));
  let attempts = 0;
  while (points.length < target && attempts < maxAttempts) {
    attempts += 1;
    const ang = rand() * Math.PI * 2;
    const rr = radius * Math.sqrt(rand());
    const px = rr * Math.cos(ang);
    const py = rr * Math.sin(ang);
    const cx = Math.floor(px / cell);
    const cy = Math.floor(py / cell);
    let ok = true;
    for (let gx = cx - 2; gx <= cx + 2 && ok; gx += 1) {
      for (let gy = cy - 2; gy <= cy + 2 && ok; gy += 1) {
        const bin = grid.get(cellKey(gx, gy));
        if (!bin) continue;
        for (let i = 0; i < bin.length; i += 1) {
          const q = bin[i];
          const dx = q[0] - px;
          const dy = q[1] - py;
          if (dx * dx + dy * dy < minDist2) {
            ok = false;
            break;
          }
        }
      }
    }
    if (!ok) continue;
    const rel = [px, py];
    points.push([x + px, y + py]);
    const key = cellKey(cx, cy);
    const bin = grid.get(key);
    if (bin) bin.push(rel);
    else grid.set(key, [rel]);
  }
  return points;
}
