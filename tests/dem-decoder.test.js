import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {encode} from 'fast-png';
import decodeWebp,{init} from '@jsquash/webp/decode.js';
import {decodeDEMTile,elevationFormat} from '../src/dem-decoder.js';
import {decodeTerrarium,prepareElevationTiles,createTerrainField} from '../src/elevation.js';
import {levelBuildingSolid} from '../src/geometry.js';
const wasm=await WebAssembly.compile(await readFile(new URL('../node_modules/@jsquash/webp/codec/dec/webp_dec.wasm',import.meta.url)));
await init(wasm);
const tile={z:0,x:0,y:0};
test('binary PNG preserves numeric RGB values and transparency without a canvas',async()=>{
  const previous=globalThis.OffscreenCanvas;globalThis.OffscreenCanvas=class{constructor(){throw Error('Canvas must not be used for numeric elevations');}};
  try{
    const rgb=new Uint8Array([128,12,128,128,2,0,127,255,0,128,20,0]),png=encode({width:2,height:2,channels:3,depth:8,data:rgb}),m=await decodeDEMTile(png,tile);
    assert.deepEqual([...m.elev],[12.5,2,-1,20]);assert.equal(m.decoding.codec,'fast-png');assert.match(m.decoding.sha256,/^[a-f0-9]{64}$/);
    const rgba=new Uint8Array([128,12,128,255,128,2,0,0,127,255,0,255,128,20,0,255]),transparent=await decodeDEMTile(encode({width:2,height:2,channels:4,depth:8,data:rgba}),tile);assert(Number.isNaN(transparent.elev[1]));assert.equal(transparent.decoding.invalidSamples,1);
  }finally{if(previous===undefined)delete globalThis.OffscreenCanvas;else globalThis.OffscreenCanvas=previous;}
});
test('each real Tamariu WebP matches every decoded byte of an independent libvips/sharp reference',async()=>{
  // Reference RGBA hashes measured independently, never via canvas or this codec.
  const expected={
    '14-8337-6086.webp':'2a96555693aec713937eab41f12af4bdb3bfaccf9b749b9d34492369694896ad',
    '14-8337-6087.webp':'54c6167d8eb5db890f14240ff57c8d862fb75007c5f1d5bfccbbddd871fcd660',
    '14-8338-6086.webp':'2f1c99bc87548d3be5907e9b2cba8c3d32953be77db0e209519e46b22dfb9b8e',
    '14-8338-6087.webp':'fe76c7085d1d8325cb635279ec81144c5f7e0ed6f077014d3d307dc988dade6f'
  };
  for(const [file,hash]of Object.entries(expected)){const bytes=await readFile(new URL('../public/data/'+file,import.meta.url)),pixels=await decodeWebp(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));assert.equal(createHash('sha256').update(pixels.data).digest('hex'),hash);const a=await decodeDEMTile(bytes,tile,decodeWebp),b=await decodeDEMTile(bytes,tile,decodeWebp);assert.equal(a.size,512);assert.deepEqual(a.elev,b.elev);assert.deepEqual(a.decoding,b.decoding);}
});
test('one changed red-channel unit creates a 256m peak and lifts a nearby roof; binary decoding preserves the original ground',async()=>{
  const rgba=new Uint8Array(3*3*4);for(let i=0;i<9;i++)rgba.set([128,10,0,255],i*4);
  const png=encode({width:3,height:3,channels:4,depth:8,data:rgba}),corrupted=rgba.slice();corrupted[4*4]++;
  const noisy=decodeTerrarium(corrupted),exact=await decodeDEMTile(png,tile);assert.equal(noisy[4]-exact.elev[4],256);
  assert.equal(prepareElevationTiles([{...tile,size:3,elev:noisy}]).diagnostics.repaired,0); // Below the old kilometre-spike threshold.
  const field=elev=>createTerrainField({width:10,height:10,resolution:2,at:(x,y)=>elev[Math.round(y/5)*3+Math.round(x/5)]}).sample;
  const footprint=[[[[1,1],[9,1],[9,9],[1,9],[1,1]]]],bad=levelBuildingSolid(footprint,5,field(noisy),10,10,2),good=levelBuildingSolid(footprint,5,field(exact.elev),10,10,2);
  assert.equal(bad.roof-good.roof,256);assert.equal(good.roof,15);assert([...exact.elev].every(h=>h===10));
});
test('bad signatures, truncated rasters and non-RGB elevations fail explicitly',async()=>{
  assert.throws(()=>elevationFormat(new Uint8Array([1,2,3])),/vàlid/);
  const png=encode({width:2,height:2,channels:3,depth:8,data:new Uint8Array(12)});await assert.rejects(decodeDEMTile(png.slice(0,30),tile));
  await assert.rejects(decodeDEMTile(encode({width:2,height:2,channels:1,depth:8,data:new Uint8Array(4)}),tile),/RGB/);
});
