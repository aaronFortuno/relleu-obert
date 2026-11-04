import {isPanoramicSize, pieceDimensions, SIZE_PRESETS, tilePlan} from './selection.js';
import {createPiecePreview} from './piece-preview.js';

const svgNS = 'http://www.w3.org/2000/svg';
const formatCentimetres = value => (value / 10).toLocaleString('ca', {maximumFractionDigits: 2});
const formatSize = (width, height) => `${formatCentimetres(width)} × ${formatCentimetres(height)}`;

export function bindPieceDimensions(form, width, height){
  const read = () => `${width.valueAsNumber}x${height.valueAsNumber}`;
  function validate(){
    const w=width.valueAsNumber*10,h=height.valueAsNumber*10;
    const message='Quan un costat supera els 50 cm, l’altre ha de fer 20 cm com a màxim.';
    const invalid=isPanoramicSize(w,h)&&Math.min(w,h)>200;
    width.setCustomValidity(invalid&&w<h?message:'');
    height.setCustomValidity(invalid&&h<=w?message:'');
  }
  form.addEventListener('input',validate);
  return {read,validate};
}

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

export function initPiecePicker(container, select) {
  const buttons = container.querySelector('#piece-sizes');
  const drawPreview = createPiecePreview(container.querySelector('#piece-preview-model'));
  const caption = container.querySelector('#piece-preview-size');
  const note = container.querySelector('#piece-preview-note');
  const custom = container.querySelector('#custom-piece');
  const form = container.querySelector('#custom-piece-form');
  const customWidth = container.querySelector('#custom-width');
  const customHeight = container.querySelector('#custom-height');
  const customDimensions = bindPieceDimensions(form, customWidth, customHeight);
  let activeButton, activePreset;

  function preview(preset, button) {
    const dimensions = pieceDimensions(preset);
    if (!dimensions) return;
    if (preset !== activePreset) {
      const [width, height] = dimensions;
      const plan = tilePlan(width, height);
      const count = plan.tiles.length;
      const {width: tileWidth, height: tileHeight} = plan.tiles[0];
      const panorama=isPanoramicSize(width,height);
      const displayScale=panorama?Math.min(1,560/width,360/height):1;
      drawPreview(width, height, plan, displayScale);
      note.textContent=displayScale<1?'Vista reduïda · format panoràmic':'Taula de 60 × 40 cm · vista orientativa';
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

  const customPreset = customDimensions.read;
  custom.addEventListener('toggle', () => { if (custom.open) preview(customPreset()); });
  form.addEventListener('input', () => preview(customPreset()));
  form.addEventListener('focusin', () => preview(customPreset()));
  form.addEventListener('submit', event => {
    event.preventDefault();
    select(customPreset());
  });
}
