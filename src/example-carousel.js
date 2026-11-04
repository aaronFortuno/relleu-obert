import {createCarouselMotion} from './carousel-motion.js';

const baseSpeed = 12;
const arrowSpeed = 85;
const previewTiming = {duration: 260, easing: 'cubic-bezier(.2,.7,.25,1)'};

function shuffle(examples) {
  for (let i = examples.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [examples[i], examples[j]] = [examples[j], examples[i]];
  }
  return examples;
}

function orderExamples(examples) {
  const relief = shuffle(examples.filter(example => example.pureRelief !== false));
  const complete = shuffle(examples.filter(example => example.pureRelief === false));
  const [majority, minority] = relief.length >= complete.length ? [relief, complete] : [complete, relief];
  if (!minority.length) return majority;

  const ordered = [];
  let start = 0;
  for (const [index, example] of minority.entries()) {
    const end = Math.floor((index + 1) * majority.length / minority.length);
    ordered.push(...majority.slice(start, end), example);
    start = end;
  }
  const offset = Math.floor(Math.random() * ordered.length);
  return ordered.slice(offset).concat(ordered.slice(0, offset));
}

function createCard(expanded = false) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = expanded ? 'secondary example-preview-card' : 'secondary example-card';

  const picture = document.createElement('span');
  picture.className = 'example-card-image';
  const image = document.createElement('img');
  image.alt = '';
  image.width = 720;
  image.height = 450;
  image.decoding = 'async';
  if (!expanded) image.loading = 'lazy';
  picture.append(image);

  const caption = document.createElement('span');
  caption.className = 'example-card-caption';
  const title = document.createElement('strong');
  const metadata = document.createElement('span');
  caption.append(title, metadata);
  const scale = document.createElement('span');
  const description = document.createElement('span');
  if (expanded) caption.append(scale, description);
  button.append(picture, caption);

  return {button, populate(example) {
    const mode = example.pureRelief === false ? 'Model complet' : 'Relleu pur';
    const details = `${mode} · 1:${example.scale.toLocaleString('ca')}`;
    button.dataset.example = example.id;
    button.setAttribute('aria-description', `${details}. ${example.description}`);
    image.src = example.image;
    title.textContent = example.title;
    metadata.textContent = `${example.category} · ${example.width / 10} × ${example.height / 10} cm`;
    if (expanded) {
      scale.textContent = details;
      description.textContent = example.description;
    }
  }};
}

export function initExampleCarousel(container, examples, onSelect) {
  if (!examples.length) return;

  const cards = container.querySelector('.example-cards');
  const track = cards.querySelector('.example-track');
  const arrows = [...container.querySelectorAll('[data-example-step]')];
  const byId = new Map(examples.map(example => [example.id, example]));
  for (const example of orderExamples(examples)) {
    const card = createCard();
    card.populate(example);
    track.append(card.button);
  }
  const first = track.firstElementChild;
  const looping = examples.length > 1;
  if (looping) {
    // The copies keep the seam filled when moving in either direction.
    for (const card of [...track.children]) {
      const copy = card.cloneNode(true);
      copy.tabIndex = -1;
      copy.setAttribute('aria-hidden', 'true');
      track.append(copy);
    }
  }
  const firstCopy = track.children[examples.length];
  for (const arrow of arrows) arrow.hidden = !looping;

  const workspace = container.closest('#welcome');
  const overlay = document.createElement('div');
  overlay.className = 'example-preview';
  overlay.setAttribute('aria-hidden', 'true');
  const preview = createCard(true);
  preview.button.tabIndex = -1;
  overlay.append(preview.button);
  workspace.append(overlay);

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const motion = createCarouselMotion();
  let cycle = 0, visible = false, frame = 0, previousTime = 0;
  let arrowDirection = 0, cardsHovered = false;
  let activeCard, pointerCard, keyboardCard, dismissedId, closeTimer, previewAnimation;

  function render() {
    if (!cycle) return;
    const offset = (motion.position % cycle + cycle) % cycle;
    track.style.transform = `translate3d(${-offset}px,0,0)`;
  }

  function tick(time) {
    const elapsed = previousTime ? Math.min(.05, (time - previousTime) / 1000) : 0;
    const speed = arrowDirection ? arrowDirection * arrowSpeed :
      cardsHovered || activeCard || keyboardCard ? 0 : baseSpeed;
    motion.update(elapsed, speed);
    render();
    previousTime = time;
    frame = requestAnimationFrame(tick);
  }

  function updatePlayback() {
    if (cycle && visible && !document.hidden && !reducedMotion.matches) {
      if (!frame) frame = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(frame);
      frame = previousTime = 0;
      if (reducedMotion.matches) motion.seek(motion.position);
    }
  }

  function measure() {
    if (!looping) return;
    const distance = firstCopy.getBoundingClientRect().left - first.getBoundingClientRect().left;
    if (distance > 0 && distance !== cycle) {
      cycle = distance;
      motion.setStride(cycle / examples.length);
      render();
    }
    updatePlayback();
  }

  function sourceTransform(card) {
    const source = card.getBoundingClientRect();
    const rail = cards.getBoundingClientRect();
    const frame = overlay.getBoundingClientRect();
    const x = Math.min(rail.right - source.width / 2, Math.max(rail.left + source.width / 2, source.left + source.width / 2));
    const dx = x - (frame.left + frame.width / 2);
    const dy = source.top + source.height / 2 - (frame.top + frame.height / 2);
    return `translate(${dx}px,${dy}px) scale(${source.width / preview.button.offsetWidth},${source.height / preview.button.offsetHeight})`;
  }

  function closePreview() {
    if (!activeCard) return;
    const source = activeCard;
    activeCard = null;
    const {transform, opacity} = getComputedStyle(preview.button);
    previewAnimation?.cancel();
    overlay.classList.remove('is-open');
    if (!reducedMotion.matches && preview.button.offsetWidth && source.offsetWidth) {
      previewAnimation = preview.button.animate([
        {transform, opacity}, {transform: sourceTransform(source), opacity: 0},
      ], previewTiming);
    }
  }

  function refreshPreview() {
    const source = pointerCard || keyboardCard;
    if (!source || source.dataset.example === dismissedId) {
      closePreview();
      return;
    }
    const {example: id} = source.dataset;
    if (activeCard?.dataset.example === id) {
      activeCard = source;
      return;
    }
    let origin;
    if (preview.button.dataset.example === id && previewAnimation?.playState === 'running') {
      const {transform, opacity} = getComputedStyle(preview.button);
      origin = {transform, opacity};
    }
    activeCard = source;
    previewAnimation?.cancel();
    preview.populate(byId.get(id));
    overlay.classList.add('is-open');
    if (!reducedMotion.matches) {
      previewAnimation = preview.button.animate([
        origin ?? {transform: sourceTransform(source), opacity: 0}, {transform: 'none', opacity: 1},
      ], previewTiming);
    }
  }

  function choose(id) {
    closePreview();
    onSelect(byId.get(id));
  }

  function leavePreview(event) {
    if (event.pointerType !== 'mouse') return;
    const to = event.relatedTarget;
    if (preview.button.contains(to) || to?.closest?.('.example-card')) return;
    pointerCard = null;
    if (!keyboardCard) dismissedId = null;
    clearTimeout(closeTimer);
    if (to?.closest?.('[data-example-step]')) refreshPreview();
    else closeTimer = setTimeout(refreshPreview, 140);
  }

  track.addEventListener('click', event => {
    const card = event.target.closest('.example-card');
    if (card) choose(card.dataset.example);
  });
  track.addEventListener('pointerdown', event => {
    if (event.target.closest('.example-card[aria-hidden]')) event.preventDefault();
  });
  track.addEventListener('pointerover', event => {
    const card = event.target.closest('.example-card');
    if (event.pointerType !== 'mouse' || !card || card.contains(event.relatedTarget)) return;
    clearTimeout(closeTimer);
    pointerCard = card;
    if (dismissedId !== card.dataset.example) dismissedId = null;
    refreshPreview();
  });
  track.addEventListener('pointerout', event => {
    const card = event.target.closest('.example-card');
    if (card && !card.contains(event.relatedTarget)) leavePreview(event);
  });
  cards.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') cardsHovered = true; });
  cards.addEventListener('pointerleave', () => { cardsHovered = false; });
  preview.button.addEventListener('pointerenter', () => {
    clearTimeout(closeTimer);
    pointerCard = activeCard;
  });
  preview.button.addEventListener('pointerleave', leavePreview);
  preview.button.addEventListener('pointerdown', event => event.preventDefault());
  preview.button.addEventListener('click', () => choose(preview.button.dataset.example));

  for (const arrow of arrows) {
    const direction = Number(arrow.dataset.exampleStep);
    arrow.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') arrowDirection = direction; });
    arrow.addEventListener('pointerleave', () => { arrowDirection = 0; });
    arrow.addEventListener('click', () => {
      motion.advance(direction, reducedMotion.matches);
      render();
    });
  }

  container.addEventListener('focusin', event => {
    keyboardCard = event.target.closest('.example-card:focus-visible');
    if (keyboardCard) {
      pointerCard = null;
      if (dismissedId !== keyboardCard.dataset.example) dismissedId = null;
      if (cycle) {
        const destination = keyboardCard.offsetLeft - first.offsetLeft;
        motion.moveTo(destination + Math.round((motion.position - destination) / cycle) * cycle, reducedMotion.matches);
        render();
      }
    }
    refreshPreview();
  });
  container.addEventListener('focusout', () => queueMicrotask(() => {
    if (document.activeElement === keyboardCard || !keyboardCard) return;
    keyboardCard = null;
    if (!pointerCard) dismissedId = null;
    refreshPreview();
  }));
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !activeCard) return;
    event.preventDefault();
    dismissedId = activeCard.dataset.example;
    closePreview();
  });

  reducedMotion.addEventListener('change', () => {
    previewAnimation?.cancel();
    updatePlayback();
  });
  document.addEventListener('visibilitychange', updatePlayback);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (!visible && !cards.clientWidth) closePreview();
    updatePlayback();
  }).observe(cards);
  new ResizeObserver(measure).observe(cards);
  container.hidden = false;
  measure();
}
