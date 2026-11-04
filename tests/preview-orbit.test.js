import test from 'node:test';
import assert from 'node:assert/strict';
import {createPreviewOrbit} from '../src/preview-orbit.js';

const degrees=180/Math.PI;

test('the automatic orbit reaches 3 degrees per second and cycles between 20 and 40 degrees',()=>{
  const orbit=createPreviewOrbit(),elevations=[];
  let elevation=30/degrees,motion;
  for(let time=0;time<=24000;time+=100){
    motion=orbit.step(time,elevation,true);
    assert(Math.abs((motion.elevation-elevation)*degrees)<=0.400001);
    elevation=motion.elevation;
    elevations.push(elevation*degrees);
  }
  assert(Math.abs(motion.turn*degrees-0.3)<1e-9);
  assert(Math.abs(Math.min(...elevations)-20)<1e-9);
  assert(Math.abs(Math.max(...elevations)-40)<1e-9);
});

test('holding suspends motion, release waits, and each restart ramps in the opposite direction',()=>{
  const orbit=createPreviewOrbit();
  const tilt=30/degrees;
  orbit.step(0,tilt,true);
  assert(orbit.step(100,tilt,true).turn>0);
  assert.equal(orbit.step(200,tilt,false),null);
  orbit.pause(300);
  assert.equal(orbit.step(3799,tilt,true),null);
  const resumed=orbit.step(3800,tilt,true);
  assert(resumed.turn<0&&Math.abs(resumed.turn*degrees)<0.01);
  orbit.pause(4000);
  assert.equal(orbit.step(7499,tilt,true),null);
  assert(orbit.step(7500,tilt,true).turn>0);
});
