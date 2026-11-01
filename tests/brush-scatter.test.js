import test from 'node:test';
import assert from 'node:assert/strict';
import { scatterBrush } from '../src/brush-scatter.js';

const base = { x: 100, y: -40, radius: 5, spacing: 1, density: 1, seed: 7 };

test('determinisme: mateixa llavor i entrades, mateixos punts', () => {
  const a = scatterBrush(base);
  const b = scatterBrush({ ...base });
  assert.deepEqual(a, b);
  assert.ok(a.length > 0);
});

test('una altra llavor dona posicions diferents', () => {
  const a = scatterBrush(base);
  const b = scatterBrush({ ...base, seed: 8 });
  assert.equal(a.length, b.length);
  assert.notDeepEqual(a, b);
});

test('tots els centres queden dins del cercle', () => {
  const pts = scatterBrush({ ...base, radius: 12, density: 4 });
  for (const [px, py] of pts) {
    const d = Math.hypot(px - base.x, py - base.y);
    assert.ok(d <= 12 + 1e-9, `punt fora del cercle: ${d}`);
  }
});

test('separació mínima respectada', () => {
  const r = 3;
  const pts = scatterBrush({ ...base, radius: r, spacing: 0.8 });
  const minDist = 0.65 * 0.8;
  for (let i = 0; i < pts.length; i += 1) {
    for (let j = i + 1; j < pts.length; j += 1) {
      const d = Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]);
      assert.ok(d >= minDist - 1e-9, `parella massa propera: ${d}`);
    }
  }
});

test('sense retícula quadrada visible: fases respecte spacing variades', () => {
  const pts = scatterBrush({ ...base, radius: 10, spacing: 1.5 });
  const fx = new Set(pts.map(([px]) => Math.round(((px / 1.5) % 1 + 1) % 1 * 24)));
  const fy = new Set(pts.map(([, py]) => Math.round(((py / 1.5) % 1 + 1) % 1 * 24)));
  assert.ok(fx.size > 12, `poques fases en x: ${fx.size}`);
  assert.ok(fy.size > 12, `poques fases en y: ${fy.size}`);
});

test('la densitat augmenta el nombre objectiu', () => {
  const low = scatterBrush({ ...base, density: 0.25 });
  const mid = scatterBrush({ ...base, density: 1 });
  const high = scatterBrush({ ...base, density: 4 });
  assert.ok(mid.length > low.length, `${mid.length} <= ${low.length}`);
  assert.ok(high.length > mid.length, `${high.length} <= ${mid.length}`);
});

test('recompte objectiu acotat: mínim 1, màxim 12000', () => {
  assert.equal(scatterBrush({ x: 0, y: 0, radius: 0.5, spacing: 5 }).length, 1);
  assert.ok(scatterBrush({ x: 0, y: 0, radius: 30, spacing: 0.1, density: 5 }).length <= 12000);
});

test('entrades no vàlides llençen error', () => {
  const bad = [
    { ...base, x: NaN },
    { ...base, y: Infinity },
    { ...base, radius: 0 },
    { ...base, radius: -2 },
    { ...base, radius: 31 },
    { ...base, radius: NaN },
    { ...base, spacing: 0 },
    { ...base, spacing: Number.MIN_VALUE },
    { ...base, spacing: Infinity },
    { ...base, density: 0.1 },
    { ...base, density: 6 },
    { ...base, density: NaN },
    { ...base, seed: NaN },
  ];
  for (const args of bad) {
    assert.throws(() => scatterBrush(args), RangeError, JSON.stringify(args));
  }
});
