const glideTime = .18;
const slideTime = .48;
const maxPendingSlides = 4;

export function createCarouselMotion() {
  let position = 0, velocity = 0, stride = 0, slide = null;
  const pending = [];

  function startSlide(end) {
    if (end === position && velocity === 0) return;
    const duration = Math.min(slideTime, Math.max(.18, slideTime * Math.abs(end - position) / (stride || 1)));
    slide = {start: position, end, velocity, duration, elapsed: 0};
  }

  function seek(distance) {
    position = distance;
    velocity = 0;
    slide = null;
    pending.length = 0;
  }

  return {
    get position() { return position; },
    setStride(distance) {
      if (!(distance > 0) || distance === stride) return;
      if (stride) {
        const factor = distance / stride;
        position *= factor;
        velocity *= factor;
        if (slide) {
          slide.start *= factor;
          slide.end *= factor;
          slide.velocity *= factor;
        }
      }
      stride = distance;
    },
    seek,
    moveTo(distance, immediate = false) {
      if (immediate) {
        seek(distance);
        return;
      }
      pending.length = 0;
      slide = null;
      startSlide(distance);
    },
    advance(direction, immediate = false) {
      const step = Math.sign(direction);
      if (!stride || !step) return;
      if (immediate) seek(position + step * stride);
      else if (!slide) startSlide(position + step * stride);
      else if (pending.length < maxPendingSlides) pending.push(step);
    },
    update(seconds, targetVelocity = 0) {
      if (!(seconds > 0)) return position;
      while (slide && seconds > 0) {
        const remaining = slide.duration - slide.elapsed;
        if (seconds >= remaining) {
          position = slide.end;
          velocity = 0;
          slide = null;
          seconds -= remaining;
          if (pending.length) startSlide(position + pending.shift() * stride);
          continue;
        }
        slide.elapsed += seconds;
        const t = slide.elapsed / slide.duration, distance = slide.end - slide.start;
        // Hermite interpolation carries the incoming speed and comes to rest at the exact target.
        position = slide.start + distance * t ** 2 * (3 - 2 * t) + slide.velocity * slide.duration * t * (1 - t) ** 2;
        velocity = distance / slide.duration * 6 * t * (1 - t) + slide.velocity * (1 - t) * (1 - 3 * t);
        return position;
      }
      const difference = velocity - targetVelocity, decay = Math.exp(-seconds / glideTime);
      position += targetVelocity * seconds + difference * glideTime * (1 - decay);
      velocity = targetVelocity + difference * decay;
      return position;
    },
  };
}
