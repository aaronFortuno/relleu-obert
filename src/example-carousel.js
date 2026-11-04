export function initExampleCarousel(container, examples, onSelect) {
  if (!examples.length) return;

  const cards = container.querySelector('.example-cards');
  const navigation = container.querySelector('.example-carousel-navigation');
  const previous = navigation.querySelector('[data-example-step="-1"]');
  const next = navigation.querySelector('[data-example-step="1"]');

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

    const caption = document.createElement('span');
    caption.className = 'example-card-caption';
    const title = document.createElement('strong');
    title.textContent = example.title;
    const metadata = document.createElement('span');
    metadata.textContent = `${example.category} · ${example.width / 10} × ${example.height / 10} cm`;
    caption.append(title, metadata);
    card.append(image, caption);
    card.addEventListener('click', () => onSelect(example));
    cards.append(card);
  }

  function updateNavigation() {
    const end = cards.scrollWidth - cards.clientWidth;
    navigation.hidden = end <= 1;
    previous.setAttribute('aria-disabled', String(cards.scrollLeft <= 1));
    next.setAttribute('aria-disabled', String(cards.scrollLeft >= end - 1));
  }

  for (const button of [previous, next]) {
    button.addEventListener('click', () => {
      if (button.getAttribute('aria-disabled') === 'true') return;
      const step = cards.children[1].offsetLeft - cards.children[0].offsetLeft;
      cards.scrollBy({left: Number(button.dataset.exampleStep) * step});
    });
  }

  container.hidden = false;
  cards.addEventListener('scroll', updateNavigation);
  new ResizeObserver(updateNavigation).observe(cards);
  updateNavigation();
}
