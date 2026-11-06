import test from 'node:test';
import assert from 'node:assert/strict';
import {tilePlan,validPrintCuts} from '../src/selection.js';
import {printExportFormat} from '../src/print-settings.js';
import {equalPrintBands,movePrintCut,printCutLimits} from '../src/print-cut-editor.js';

test('saved manual cuts preserve the total and piece count limits',()=>{
  assert.equal(validPrintCuts({columns:[250,245,305]},800,200),true);
  assert.equal(validPrintCuts({columns:[250,245,300]},800,200),false);
  assert.equal(validPrintCuts({columns:[791,9]},800,200),false);
  assert.equal(validPrintCuts({columns:[160,160,160,160,160],rows:[50,50,50,50]},800,200),false);
});

test('moving a cut preserves the other cut and the total, clamping before either neighbour disappears',()=>{
  const columns=[200,200,200,200];
  assert.deepEqual(printCutLimits(columns,1),{position:400,min:210,max:590});
  assert.deepEqual(movePrintCut(columns,1,445),[200,245,155,200]);
  assert.deepEqual(movePrintCut(columns,1,100),[200,10,390,200]);
  assert.deepEqual(movePrintCut(columns,1,700),[200,390,10,200]);
});

test('a dragged automatic fractional layout remains valid for saved projects and export',()=>{
  const plan=tilePlan(520,200),[left,right]=plan.xCuts;
  const columns=movePrintCut([left,right-left,520-right],0,240);
  assert.deepEqual(equalPrintBands(520,3),[173,174,173]);
  assert.deepEqual(columns,[240,107,173]);
  assert.equal(validPrintCuts({columns},520,200),true);
  assert.deepEqual(tilePlan(520,200,{columns}).xCuts,[240,347]);
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
