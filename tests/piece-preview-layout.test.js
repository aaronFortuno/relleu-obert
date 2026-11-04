import test from 'node:test';
import assert from 'node:assert/strict';
import {layoutPiecePreview} from '../src/piece-preview.js';
import {tilePlan} from '../src/selection.js';

test('all panoramic sizes keep the original print pieces within the tabletop',()=>{
  for(let long=510;long<=1000;long+=10)for(let short=100;short<=200;short+=10){
    for(const [width,height] of [[long,short],[short,long]]){
      const plan=tilePlan(width,height),layout=layoutPiecePreview(width,height,plan);
      assert.equal(layout.rotated,height>width);
      assert.equal(layout.twoRows,long>600);
      assert.equal(layout.pieces.length,plan.tiles.length);
      assert.equal(new Set(layout.pieces.map(({tile})=>tile)).size,plan.tiles.length);
      assert.equal(new Set(layout.pieces.map(({y})=>y)).size,long>600?2:1);

      const bounds=layout.pieces.map(({tile,x,y})=>({
        x,y,right:x+(layout.rotated?tile.height:tile.width),front:y+(layout.rotated?tile.width:tile.height)
      }));
      for(const [index,piece] of bounds.entries()){
        assert.ok(piece.x>=-300-1e-8&&piece.right<=300+1e-8&&piece.y>=-200-1e-8&&piece.front<=200+1e-8);
        for(const other of bounds.slice(index+1)){
          assert.ok(piece.right<=other.x+1e-8||other.right<=piece.x+1e-8||
            piece.front<=other.y+1e-8||other.front<=piece.y+1e-8);
        }
      }
    }
  }
});

test('standard split previews still show the pieces in assembly order with gaps',()=>{
  const plan=tilePlan(400,400),layout=layoutPiecePreview(400,400,plan);
  assert.equal(layout.rotated,false);
  assert.equal(layout.twoRows,false);
  assert.deepEqual(layout.pieces.map(({x,y})=>[x,y]),[[-203.5,3.5],[3.5,3.5],[-203.5,-203.5],[3.5,-203.5]]);
});
