import assert from 'node:assert/strict';
import test from 'node:test';
import {createCarouselMotion} from '../src/carousel-motion.js';

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} ≈ ${expected}`);

test('carousel drifts into hover speed, turns and pauses without a velocity jump', () => {
  const motion = createCarouselMotion();
  const start = motion.update(1, 12);
  const firstReverse = motion.update(.001, -86);
  assert.ok(firstReverse > start && firstReverse - start < .012);
  const reversed = motion.update(.8, -86);
  assert.ok(reversed < start);
  const braking = motion.update(.01, 0);
  const stopped = motion.update(4, 0);
  assert.ok(braking < reversed && stopped < braking);
  close(motion.update(.1, 0), stopped);
});

test('slide advances one stride from the exact phase while easing in and out', () => {
  const motion = createCarouselMotion();
  motion.setStride(246.5);
  const start = motion.update(.7, 12);
  motion.advance(1);
  close(motion.position, start);
  const firstFrame = motion.update(.001);
  assert.ok(firstFrame > start && firstFrame - start < .02);
  const nearEnd = motion.update(.478);
  const end = motion.update(.001);
  close(end, start + 246.5);
  assert.ok(end > nearEnd && end - nearEnd < .01);
  motion.advance(-1);
  close(motion.update(.48), start);
});

test('queued slides and a viewport resize preserve the card phase', () => {
  const motion = createCarouselMotion();
  motion.setStride(240);
  motion.seek(37);
  motion.advance(-1);
  motion.advance(-1);
  motion.advance(1);
  const halfway = motion.update(.24);
  motion.setStride(300);
  close(motion.position, halfway * 1.25);
  close(motion.update(.24), 37 * 1.25 - 300);
  close(motion.update(.48), 37 * 1.25 - 600);
  close(motion.update(.48), 37 * 1.25 - 300);
  motion.advance(1, true);
  close(motion.position, 37 * 1.25);
});
