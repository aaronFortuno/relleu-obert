import test from 'node:test';
import assert from 'node:assert/strict';
import {tilePlan,validPrintCuts} from '../src/selection.js';
import {parsePrintBands,printExportFormat} from '../src/print-settings.js';

test('manual cut fields accept decimal centimetres and verify the total and piece count',()=>{
  assert.deepEqual(parsePrintBands('25 + 24,5 30.5'),[250,245,305]);
  assert.equal(parsePrintBands('20; 20'),null);
  assert.equal(parsePrintBands(' '),undefined);
  assert.equal(validPrintCuts({columns:[250,245,305]},800,200),true);
  assert.equal(validPrintCuts({columns:[250,245,300]},800,200),false);
  assert.equal(validPrintCuts({columns:[791,9]},800,200),false);
  assert.equal(validPrintCuts({columns:[160,160,160,160,160],rows:[50,50,50,50]},800,200),false);
});

test('large pieces fall back to individual files without changing the requested cuts',()=>{
  const automatic=tilePlan(800,200),manual=tilePlan(800,200,{columns:[250,250,300]});
  assert.equal(printExportFormat('bambu',automatic),'bambu');
  assert.equal(printExportFormat('bambu',manual),'bambu-zip');
  assert.equal(printExportFormat('3mf',manual),'3mf');
  assert.equal(printExportFormat('stl',manual),'stl');
  assert.equal(printExportFormat('bambu',tilePlan(300,200,{columns:[300]})),'3mf');
  assert.deepEqual(manual.tiles.map(({x0,x1,width})=>[x0,x1,width]),[[0,250,250],[250,500,250],[500,800,300]]);
});
