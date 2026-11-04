import {pieceDimensions, SIZE_PRESETS, tilePlan} from './selection.js';

const svgNS = 'http://www.w3.org/2000/svg';
const formatSize = (width, height) => `${width / 10} × ${height / 10}`;
const tileGap = 7;

function planIcon(width, height, {cols, rows}) {
  const scale = 15 / Math.max(width, height);
  const w = width * scale, h = height * scale;
  const x = (20 - w) / 2, y = (20 - h) / 2;
  let cuts = '';
  for (let col = 1; col < cols; col++) cuts += `M${x + col * w / cols} ${y}v${h}`;
  for (let row = 1; row < rows; row++) cuts += `M${x} ${y + row * h / rows}h${w}`;
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 20 20');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `<g fill="none" stroke="currentColor">
    <rect x="${x}" y="${y}" width="${w}" height="${h}"/>
    <path d="${cuts}" stroke-dasharray="1.7 1.1"/>
  </g>`;
  return svg;
}

// Table corners in the illustration, clockwise from the back-left.
const [a, b, c, d] = [[549, 253], [1126, 369], [909, 558], [293, 400]];
const [dx1, dy1] = [b[0] - c[0], b[1] - c[1]];
const [dx2, dy2] = [d[0] - c[0], d[1] - c[1]];
const [dx3, dy3] = [a[0] - b[0] + c[0] - d[0], a[1] - b[1] + c[1] - d[1]];
const det = dx1 * dy2 - dx2 * dy1;
const g = (dx3 * dy2 - dx2 * dy3) / det, h = (dx1 * dy3 - dx3 * dy1) / det;

function project(x, y, z) {
  const u = x / 600 + .5, v = y / 400 + .5;
  const depth = 1 + g * u + h * v;
  const px = (a[0] + ((1 + g) * b[0] - a[0]) * u + ((1 + h) * d[0] - a[0]) * v) / depth;
  const py = (a[1] + ((1 + g) * b[1] - a[1]) * u + ((1 + h) * d[1] - a[1]) * v - 1.1 * z) / depth;
  return `${px.toFixed(2)},${py.toFixed(2)}`;
}

function landscape(u, v) {
  const coast = .67 + .11 * Math.sin(u * 8 + .6) + .048 * Math.sin(u * 19);
  const land = coast - v;
  const hills = .25
    + .44 * Math.exp(-26 * ((u - .26) ** 2 + (v - .32) ** 2))
    + .38 * Math.exp(-30 * ((u - .74) ** 2 + (v - .19) ** 2))
    + .11 * Math.sin(23 * u + 10 * v) * Math.sin(17 * v - 5 * u);
  return {land, rise: Math.min(1, Math.max(0, land) * 6) * hills};
}

function modelDrawing(width, height, plan) {
  const verticalScale = Math.min(width, height);
  const point = (tile, x, y, z) => project(
    x - width / 2 + (tile.col - (plan.cols + 1) / 2) * tileGap,
    y - height / 2 + ((plan.rows + 1) / 2 - tile.row) * tileGap, z);
  const polygon = (points, color) => `<polygon points="${points.join(' ')}" fill="${color}" stroke="${color}"/>`;
  // Draw the back pieces first. Every piece samples the same landscape at its original coordinates.
  return plan.tiles.slice().sort((l, r) => r.row - l.row || l.col - r.col).map(tile => {
    const cols = Math.ceil(24 / plan.cols), rows = Math.ceil(24 / plan.rows);
    const grid = Array.from({length: rows + 1}, (_, row) =>
      Array.from({length: cols + 1}, (_, col) => {
        const x = tile.x0 + tile.width * col / cols, y = tile.y0 + tile.height * row / rows;
        const {land, rise} = landscape(x / width, y / height);
        return {land, rise, top: point(tile, x, y, 4 + verticalScale * (.01 + .16 * rise)), base: point(tile, x, y, 0)};
      }));
    const top = (p, q, r) => {
      const land = (p.land + q.land + r.land) / 3;
      const shade = Math.round(4 * Math.max(-2, Math.min(2, (p.rise - q.rise + r.rise - q.rise) * 16)));
      const color = land < 0 ? '#9fbfc2' : land < .045 ? '#d8c69e'
        : `hsl(${89 + Math.round(14 * land)} 24% ${44 + shade + Math.round(5 * Math.sin(18 * land))}%)`;
      return polygon([p.top, q.top, r.top], color);
    };
    const wall = (p, q, front) => polygon([p.top, q.top, q.base, p.base],
      p.land + q.land < 0 ? '#72989d' : front ? '#ae9e7a' : '#948466');
    const faces = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const p = grid[row][col], q = grid[row][col + 1], r = grid[row + 1][col + 1], s = grid[row + 1][col];
        faces.push(top(p, q, r), top(p, r, s));
        if (row === rows - 1) faces.push(wall(s, r, true));
        if (col === cols - 1) faces.push(wall(q, r, false));
      }
    }
    return `<g stroke-width=".55">${faces.join('')}</g>`;
  }).join('');
}

export function initPiecePicker(container, select) {
  const buttons = container.querySelector('#piece-sizes');
  const model = container.querySelector('#piece-preview-model');
  const caption = container.querySelector('#piece-preview-size');
  const custom = container.querySelector('#custom-piece');
  const form = container.querySelector('#custom-piece-form');
  const customWidth = container.querySelector('#custom-width');
  const customHeight = container.querySelector('#custom-height');
  let activeButton, activePreset;

  function preview(preset, button) {
    const dimensions = pieceDimensions(preset);
    if (!dimensions) return;
    if (preset !== activePreset) {
      const [width, height] = dimensions;
      const plan = tilePlan(width, height);
      const count = plan.tiles.length;
      const {width: tileWidth, height: tileHeight} = plan.tiles[0];
      model.innerHTML = modelDrawing(width, height, plan);
      caption.value = `${formatSize(width, height)} cm · ${count === 1 ? '1 peça' : `${count} peces de ${formatSize(tileWidth, tileHeight)} cm`}`;
      activePreset = preset;
    }
    activeButton?.classList.remove('is-previewed');
    button?.classList.add('is-previewed');
    activeButton = button;
  }

  for (const [preset, [width, height]] of Object.entries(SIZE_PRESETS)) {
    const button = document.createElement('button');
    const plan = tilePlan(width, height);
    const label = formatSize(width, height);
    button.type = 'button';
    button.className = 'secondary piece-size';
    button.setAttribute('aria-label', `${label} cm${plan.tiles.length > 1 ? `, ${plan.tiles.length} peces` : ''}`);
    button.append(planIcon(width, height, plan), label);
    button.addEventListener('pointerenter', () => preview(preset, button));
    button.addEventListener('focus', () => preview(preset, button));
    button.addEventListener('click', () => select(preset));
    buttons.append(button);
    if (preset === '20x20') preview(preset, button);
  }

  const customPreset = () => `${customWidth.valueAsNumber}x${customHeight.valueAsNumber}`;
  custom.addEventListener('toggle', () => { if (custom.open) preview(customPreset()); });
  form.addEventListener('input', () => preview(customPreset()));
  form.addEventListener('focusin', () => preview(customPreset()));
  form.addEventListener('submit', event => {
    event.preventDefault();
    select(customPreset());
  });
}
