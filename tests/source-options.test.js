import test from 'node:test';
import assert from 'node:assert/strict';
import {describeSources,clearLocalDecision,buildingProviderLabel,TERRAIN_REMOTE} from '../src/source-options.js';

test('fonts remotes per defecte: terreny Mapterhorn/Mapzen i edificis segons el desplegable',()=>{
  const s=describeSources({buildingSource:'icgc'});
  assert.match(s.terrain.label,/Mapterhorn/);
  assert.match(s.terrain.label,/remota/);
  assert.equal(s.buildings.label,'ICGC (font remota)');
  assert.equal(s.terrain.pending,false);
  assert.equal(s.buildings.pending,false);
});

test('override local d’edificis: no mostra ICGC com a actiu i marca pendent',()=>{
  const s=describeSources({buildingSource:'icgc',localBuildings:{metadata:{file:'edificis.geojson'}},pendingBuildings:true});
  assert.equal(s.buildings.label,'Fitxer propi · edificis.geojson');
  assert.equal(s.buildings.pending,true);
  assert.doesNotMatch(s.buildings.label,/ICGC/);
  assert.match(s.terrain.label,/remota/);
});

test('override local de terreny: substitueix el proveïdor remot i marca pendent',()=>{
  const s=describeSources({terrainProvider:'Mapterhorn',buildingSource:'osm',localDEM:{metadata:{file:'mdt.tif'}},pendingTerrain:true});
  assert.equal(s.terrain.label,'Fitxer propi · mdt.tif');
  assert.equal(s.terrain.pending,true);
  assert.doesNotMatch(s.terrain.label,/Mapterhorn \(font remota\)/);
});

test('ICGC no disponible: amb OSM seleccionat no s’afirma mai ICGC',()=>{
  assert.equal(buildingProviderLabel('osm'),'OpenStreetMap');
  assert.equal(buildingProviderLabel('catastre'),'Catastre · parts (Espanya)');
  const s=describeSources({buildingSource:'osm'});
  assert.doesNotMatch(s.buildings.label,/ICGC/);
  assert.equal(buildingProviderLabel('desconegut'),'Font desconeguda');
  assert.equal(buildingProviderLabel('constructor'),'Font desconeguda');
  assert.equal(TERRAIN_REMOTE,'Mapterhorn / Mapzen');
});

test('treure el DEM local marca pendent la font remota, sense atribuir-li el proveïdor antic',()=>{
  const s=describeSources({terrainProvider:'GeoTIFF local',terrainWasLocal:true,pendingTerrain:true});
  assert.equal(s.terrain.label,'Mapterhorn / Mapzen (font remota)');
  assert.equal(s.terrain.pending,true);
});

test('decisió de neteja local: DEM obliga a regenerar, només edificis va per la via incremental',()=>{
  assert.equal(clearLocalDecision({hadDEM:true,hadBuildings:true}),'reload');
  assert.equal(clearLocalDecision({hadDEM:true,hadBuildings:false}),'reload');
  assert.equal(clearLocalDecision({hadDEM:false,hadBuildings:true}),'buildings');
  assert.equal(clearLocalDecision({hadDEM:false,hadBuildings:false}),'none');
});
