import assert from 'node:assert/strict';
import test from 'node:test';
import {previewPieces} from '../src/preview-pieces.js';

const terrain={id:'terrain',vertices:Float32Array.of(
  250,250,1, 50,350,2, 50,250,3, 150,350,4,
  280,310,5, 330,310,6, 330,370,7,
  0,0,8,
),faces:Uint32Array.of(4,5,6, 0,1,2, 1,0,3)};
const water={id:'water',vertices:Float32Array.of(200,50,1, 300,50,2, 300,70,3),faces:Uint32Array.of(0,1,2)};
const empty={id:'forest',vertices:new Float32Array(0),faces:new Uint32Array(0)};
const flatten=({vertices,faces})=>[...faces].map(i=>[...vertices.slice(i*3,i*3+3)]);

test('preview fragments preserve winding and global positions in north-first print order',()=>{
  const pieces=[...previewPieces([terrain,water,empty],400,400)];
  assert.deepEqual(pieces.map(({index,total})=>[index,total]),[[1,4],[2,4],[3,4],[4,4]]);
  assert.deepEqual(pieces.map(({parts})=>parts.map(part=>part.id)),[['terrain'],['terrain'],[],['water']]);
  assert.deepEqual(flatten(pieces[0].parts[0]),flatten(terrain).slice(3));
  assert.deepEqual(flatten(pieces[1].parts[0]),flatten(terrain).slice(0,3));
  assert.deepEqual(flatten(pieces[3].parts[0]),flatten(water));
  assert.equal(pieces[0].parts[0].vertices.length,4*3);
  assert.deepEqual([...previewPieces([terrain],250,250)],[]);
});

test('preview buffers can be transferred before generating the next fragment',()=>{
  const iterator=previewPieces([terrain],400,400);
  const {value:first}=iterator.next();
  const {faces,vertices}=first.parts[0];
  const copy=structuredClone(first,{transfer:[faces.buffer,vertices.buffer]});
  assert.equal(faces.byteLength,0);
  assert.equal(vertices.byteLength,0);
  assert.deepEqual(flatten(copy.parts[0]),flatten(terrain).slice(3));
  assert.deepEqual(flatten(iterator.next().value.parts[0]),flatten(terrain).slice(0,3));
  assert.equal(terrain.vertices.length,24);
  assert.equal(terrain.faces.length,9);
});
