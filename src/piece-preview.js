// Corners of the 600 × 400 mm tabletop, clockwise from the back-left.
const [backLeft, backRight, frontRight, frontLeft] = [[549, 253], [1126, 369], [909, 558], [293, 400]];
const [dx1, dy1] = [backRight[0] - frontRight[0], backRight[1] - frontRight[1]];
const [dx2, dy2] = [frontLeft[0] - frontRight[0], frontLeft[1] - frontRight[1]];
const [dx3, dy3] = [backLeft[0] - backRight[0] + frontRight[0] - frontLeft[0], backLeft[1] - backRight[1] + frontRight[1] - frontLeft[1]];
const det = dx1 * dy2 - dx2 * dy1;
const g = (dx3 * dy2 - dx2 * dy3) / det, h = (dx1 * dy3 - dx3 * dy1) / det;
const gap = 7, sampleSpacing = 3;

function project(x, y, z, color) {
  const u = x / 600 + .5, v = y / 400 + .5;
  const depth = 1 / (1 + g * u + h * v);
  const px = (backLeft[0] + ((1 + g) * backRight[0] - backLeft[0]) * u + ((1 + h) * frontLeft[0] - backLeft[0]) * v) * depth;
  const py = (backLeft[1] + ((1 + g) * backRight[1] - backLeft[1]) * u + ((1 + h) * frontLeft[1] - backLeft[1]) * v - 1.1 * z) * depth;
  // The canvas origin matches the crop of the table illustration.
  return {x: px - 235, y: py - 225, depth, color};
}

function blend(a, b, t) {
  return a.map((value, i) => value + t * (b[i] - value));
}

function smooth(from, to, value) {
  const t = Math.max(0, Math.min(1, (value - from) / (to - from)));
  return t * t * (3 - 2 * t);
}

function shoreDistance(x, y) {
  return 31 + 29 * Math.sin(x / 42 + .9) + 10 * Math.sin(x / 19 - .4) + 4 * Math.sin(x / 8) - y;
}

function hill(x, y, centerX, centerY, radiusX, radiusY) {
  return Math.exp(-(((x - centerX) / radiusX) ** 2 + ((y - centerY) / radiusY) ** 2));
}

function elevation(x, y, land) {
  const hills = 6 + 21 * hill(x, y, -47, -40, 55, 49)
    + 32 * hill(x, y, 69, -102, 68, 69)
    + 37 * hill(x, y, -116, -135, 52, 44)
    + 19 * hill(x, y, 156, -15, 45, 66);
  const folds = 3.2 * Math.sin(x / 15 + y / 31) * Math.sin(y / 10 - x / 42)
    + 1.1 * Math.sin(x / 5.8 - y / 12) * Math.sin(y / 6.5 + x / 27);
  return 5 + smooth(0, 24, land) * (hills + folds);
}

function sample(x, y) {
  const land = shoreDistance(x, y);
  const z = elevation(x, y, land);
  const slopeX = elevation(x + 1, y, shoreDistance(x + 1, y)) - z;
  const slopeY = elevation(x, y + 1, land - 1) - z;
  const light = (.5 * slopeX + .25 * slopeY + .83) / Math.hypot(slopeX, slopeY, 1);
  const shade = .69 + .43 * Math.max(0, light);
  const woodland = smooth(-.55, .72, Math.sin(x / 27 - y / 49) * Math.cos(y / 21) + .3 * Math.sin((x + y) / 13));
  const texture = 2.6 * Math.sin(x / 1.9) * Math.sin(y / 2.3) + 3.5 * Math.sin(x / 5.6 - y / 3.8);
  const vegetation = blend([155, 164, 111], [77, 117, 84], woodland).map(channel => channel + texture);
  const roadY = -14 + 17 * Math.sin(x / 33 + .45) + 7 * Math.sin(x / 17);
  const road = (1 - smooth(1.5, 3.6, Math.abs(y - roadY))) * smooth(8, 14, land);
  const ground = blend(vegetation, [206, 193, 155], road);
  const beach = blend([216, 197, 153], ground, smooth(2, 9, land));
  const color = blend([143, 184, 191], beach.map(channel => channel * shade), smooth(-.8, 1.5, land));
  return {z, color, water: 1 - smooth(-.8, 1.5, land)};
}

// Interpolate the surface colour between samples. The reciprocal depth keeps
// the relief and the walls of neighbouring pieces in the correct order.
function makePainter(canvas, context) {
  const {width, height} = canvas;
  const frame = context.createImageData(width, height);
  const pixels = frame.data;
  const depths = new Float32Array(width * height);
  function triangle(a, b, c) {
    const abX = b.x - a.x, abY = b.y - a.y;
    const acX = c.x - a.x, acY = c.y - a.y;
    const area = abX * acY - abY * acX;
    if (Math.abs(area) < 1e-8) return;
    const left = Math.max(0, Math.floor(Math.min(a.x, b.x, c.x)));
    const right = Math.min(width - 1, Math.floor(Math.max(a.x, b.x, c.x)));
    const top = Math.max(0, Math.floor(Math.min(a.y, b.y, c.y)));
    const bottom = Math.min(height - 1, Math.floor(Math.max(a.y, b.y, c.y)));
    for (let y = top; y <= bottom; y++) {
      const dy = y + .5 - a.y;
      for (let x = left; x <= right; x++) {
        const dx = x + .5 - a.x;
        const u = (dx * acY - dy * acX) / area, v = (abX * dy - abY * dx) / area;
        const w = 1 - u - v;
        if (u < -1e-7 || v < -1e-7 || w < -1e-7) continue;
        const depth = a.depth * w + b.depth * u + c.depth * v;
        const index = y * width + x;
        if (depth <= depths[index]) continue;
        depths[index] = depth;
        for (let i = 0; i < 3; i++) pixels[index * 4 + i] = a.color[i] * w + b.color[i] * u + c.color[i] * v;
        pixels[index * 4 + 3] = 255;
      }
    }
  }
  return {
    triangle,
    clear() { depths.fill(0); pixels.fill(0); },
    present() { context.putImageData(frame, 0, 0); }
  };
}

export function createPiecePreview(canvas) {
  const context = canvas.getContext('2d');
  if (!context) return () => {};
  const {triangle, clear, present} = makePainter(canvas, context);
  function wall(a, b, front) {
    const sand = front ? [170, 149, 111] : [136, 119, 88];
    const sea = front ? [115, 152, 158] : [92, 125, 131];
    const topA = {...a.top, color: blend(sand, sea, a.water)};
    const topB = {...b.top, color: blend(sand, sea, b.water)};
    const baseA = {...a.base, color: topA.color.map(channel => channel * .86)};
    const baseB = {...b.base, color: topB.color.map(channel => channel * .86)};
    triangle(topA, topB, baseB);
    triangle(topA, baseB, baseA);
  }
  return (width, height, plan) => {
    clear();
    for (const tile of plan.tiles) {
      const cols = Math.ceil(tile.width / sampleSpacing), rows = Math.ceil(tile.height / sampleSpacing);
      const shiftX = (tile.col - (plan.cols + 1) / 2) * gap;
      const shiftY = ((plan.rows + 1) / 2 - tile.row) * gap;
      const grid = Array.from({length: rows + 1}, (_, row) =>
        Array.from({length: cols + 1}, (_, col) => {
          const x = tile.x0 + tile.width * col / cols - width / 2;
          const y = tile.y0 + tile.height * row / rows - height / 2;
          const {z, color, water} = sample(x, y);
          const top = project(x + shiftX, y + shiftY, z, color);
          const base = row === rows || col === cols ? project(x + shiftX, y + shiftY, 0) : null;
          return {top, base, water};
        }));
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const a = grid[row][col], b = grid[row][col + 1];
          const c = grid[row + 1][col + 1], d = grid[row + 1][col];
          triangle(a.top, b.top, c.top);
          triangle(a.top, c.top, d.top);
          if (row === rows - 1) wall(d, c, true);
          if (col === cols - 1) wall(b, c, false);
        }
      }
    }
    present();
  };
}
