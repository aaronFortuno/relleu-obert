const pixelsPerSecond = 12;

export function initExampleCarousel(container, examples, onSelect) {
  if (!examples.length) return;

  const cards = container.querySelector('.example-cards');
  const track = cards.querySelector('.example-track');
  const navigation = container.querySelector('.example-carousel-navigation');
  const motionButton = navigation.querySelector('.example-carousel-motion');

  for (const example of examples) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'secondary example-card';
    card.dataset.example = example.id;
    card.setAttribute('aria-description', example.description);

    const image = document.createElement('img');
    image.src = example.image;
    image.alt = '';
    image.width = 720;
    image.height = 450;
    image.loading = 'lazy';
    image.decoding = 'async';
    const picture = document.createElement('span');
    picture.className = 'example-card-image';
    picture.append(image);

    const caption = document.createElement('span');
    caption.className = 'example-card-caption';
    const title = document.createElement('strong');
    title.textContent = example.title;
    const metadata = document.createElement('span');
    metadata.textContent = `${example.category} · ${example.width / 10} × ${example.height / 10} cm`;
    const details = document.createElement('span');
    details.className = 'example-card-details';
    const scale = document.createElement('span');
    scale.textContent = `Relleu pur · 1:${example.scale.toLocaleString('ca')}`;
    const description = document.createElement('span');
    description.textContent = example.description;
    description.setAttribute('aria-hidden', 'true');
    details.append(scale, description);
    caption.append(title, metadata, details);
    card.append(picture, caption);
    track.append(card);
  }

  track.addEventListener('click', event => {
    const card = event.target.closest('.example-card');
    if (card) onSelect(examples.find(example => example.id === card.dataset.example));
  });
  container.hidden = false;
  if (examples.length === 1) return;

  // A second copy fills the viewport when the last card passes the left edge.
  const first = track.firstElementChild;
  for (const card of [...track.children]) {
    const copy = card.cloneNode(true);
    copy.tabIndex = -1;
    copy.setAttribute('aria-hidden', 'true');
    track.append(copy);
  }
  const firstCopy = track.children[examples.length];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let animation, cycle = 0, step = 0, visible = false, paused = false;

  const offset = () => ((animation?.currentTime ?? 0) * pixelsPerSecond / 1000) % cycle;
  function seek(distance) {
    if (animation) animation.currentTime = ((distance % cycle + cycle) % cycle) * 1000 / pixelsPerSecond;
  }
  function updatePlayback() {
    motionButton.hidden = reducedMotion.matches;
    if (!animation) return;
    const keyboardFocus = container.querySelector(':focus-visible:not(.example-carousel-motion)');
    const shouldPlay = visible && !document.hidden && !reducedMotion.matches && !paused &&
      !cards.matches(':hover') && !keyboardFocus;
    if (shouldPlay && animation.playState !== 'running') animation.play();
    if (!shouldPlay && animation.playState === 'running') animation.pause();
  }
  function measure() {
    const distance = firstCopy.getBoundingClientRect().left - first.getBoundingClientRect().left;
    if (distance <= 0 || distance === cycle) return;
    const progress = animation ? offset() / step : 0;
    animation?.cancel();
    cycle = distance;
    step = cycle / examples.length;
    animation = track.animate([{transform: 'translateX(0)'}, {transform: `translateX(${-cycle}px)`}], {
      duration: cycle * 1000 / pixelsPerSecond, iterations: Infinity,
    });
    animation.pause();
    seek(progress * step);
    updatePlayback();
  }

  for (const button of navigation.querySelectorAll('[data-example-step]')) {
    button.addEventListener('click', () => seek((Math.round(offset() / step) + Number(button.dataset.exampleStep)) * step));
  }
  motionButton.addEventListener('click', () => {
    paused = !paused;
    motionButton.textContent = paused ? 'Reprèn' : 'Pausa';
    updatePlayback();
  });
  cards.addEventListener('pointerenter', updatePlayback);
  cards.addEventListener('pointerleave', updatePlayback);
  // A partly visible card moves just inside the fade so its text fits.
  cards.addEventListener('pointerover', event => {
    const card = event.target.closest('.example-card');
    if (event.pointerType !== 'mouse' || !card || card.contains(event.relatedTarget)) return;
    const frame = cards.getBoundingClientRect(), box = card.getBoundingClientRect();
    const inset = first.offsetLeft;
    if (event.clientX <= frame.left + inset || event.clientX >= frame.right - inset) return;
    if (box.left < frame.left + inset) seek(offset() + box.left - frame.left - inset);
    else if (box.right > frame.right - inset) seek(offset() + box.right - frame.right + inset);
  });
  cards.addEventListener('pointerdown', event => {
    if (event.target.closest('.example-card[aria-hidden]')) event.preventDefault();
  });
  container.addEventListener('focusin', event => {
    updatePlayback();
    const card = event.target.closest('.example-card:focus-visible');
    if (card) seek(card.offsetLeft - first.offsetLeft);
  });
  container.addEventListener('focusout', () => queueMicrotask(updatePlayback));
  reducedMotion.addEventListener('change', updatePlayback);
  document.addEventListener('visibilitychange', updatePlayback);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    updatePlayback();
  }).observe(cards);
  new ResizeObserver(measure).observe(cards);
  navigation.hidden = false;
  measure();
}
