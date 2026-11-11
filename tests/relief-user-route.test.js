import test from 'node:test';
import assert from 'node:assert/strict';
import {MAX_GPX_BYTES,parseUserRouteGPX,normalizeUserRoute,prepareUserRouteStrips} from '../src/relief-user-route.js';
import {polygonTester} from '../src/polygon-index.js';
import {reliefStreamPart} from '../src/relief-streams.js';
import {auditPart} from '../src/solid-audit.js';

const gpx=body=>`<?xml version="1.0"?><gpx xmlns="http://www.topografix.com/GPX/1/1">${body}</gpx>`;
const track=body=>`<trk><trkseg>${body}</trkseg></trk>`;
const point=(lon,lat)=>`<trkpt lat="${lat}" lon="${lon}"/>`;

test('GPX metadata and track segments produce detached geographic paths without joining gaps',()=>{
  const route=parseUserRouteGPX(gpx('<metadata><name> Vall &amp; Serra </name></metadata><trk>'+
    `<trkseg>${point(1.1,42)}${point(1.1,42)}${point(1.2,42.1)}</trkseg>`+
    `<trkseg>${point(1.3,42.2)}${point(1.4,42.3)}</trkseg></trk>`+
    '<rte><name>Camí</name><rtept lat="42.4" lon="1.5"/><rtept lat="42.5" lon="1.6"/></rte>'));
  assert.deepEqual(route,{name:'Vall & Serra',paths:[
    [[1.1,42],[1.2,42.1]],[[1.3,42.2],[1.4,42.3]],[[1.5,42.4],[1.6,42.5]]
  ]});
  const saved=normalizeUserRoute(JSON.parse(JSON.stringify(route)));
  saved.paths[0][0][0]=5;
  assert.equal(route.paths[0][0][0],1.1);
});

test('prefixed GPX and plain route names work with a filename fallback',()=>{
  const prefixed='<g:gpx xmlns:g="http://www.topografix.com/GPX/1/1"><g:rte>'+
    '<g:rtept lat="42" lon="1"/><g:rtept lat="42.01" lon="1.01"/>'+
    '</g:rte></g:gpx>';
  assert.equal(parseUserRouteGPX(prefixed,' Serra.gpx ').name,'Serra.gpx');
  assert.equal(parseUserRouteGPX(gpx('<rte><name>Santuari</name>'+
    '<rtept lat="42" lon="1"/><rtept lat="42.01" lon="1.01"/></rte>')).name,'Santuari');
});

test('invalid coordinates, malformed XML, dangerous declarations and budgets are rejected',()=>{
  assert.throws(()=>parseUserRouteGPX('<gpx><trk></gpx>'),/GPX vàlid/);
  assert.throws(()=>parseUserRouteGPX('<kml/>'),/GPX vàlid/);
  assert.throws(()=>parseUserRouteGPX('<!DOCTYPE gpx [<!ENTITY foo SYSTEM "file:///example">]>'+gpx('')),/declaracions XML/);
  assert.throws(()=>parseUserRouteGPX(gpx(track(point(181,42)+point(1,42)))),/coordenades invàlides/);
  assert.throws(()=>parseUserRouteGPX(gpx(track(point(1,'')+point(1,42)))),/coordenades invàlides/);
  assert.throws(()=>parseUserRouteGPX(gpx(track(point(1,42)+point(1,42)))),/dos punts diferents/);
  assert.throws(()=>parseUserRouteGPX(gpx(track(point(1,42).repeat(10_001)))),/10.000 punts/);
  assert.throws(()=>parseUserRouteGPX(gpx(track(point(1,42)+point(2,42)).repeat(257))),/256 trams/);
  assert.throws(()=>parseUserRouteGPX('é'.repeat(MAX_GPX_BYTES/2+1)),/1,5 MB/);
  assert.throws(()=>normalizeUserRoute({name:'Ruta',paths:[[[1,42],[2,91]]]}),/coordenades invàlides/);
  assert.throws(()=>normalizeUserRoute({name:'Ruta',paths:[[[1,42],[1,42]]]}),/no són vàlides/);
});

test('projected strips clip to the model, preserve segment gaps and span one physical millimetre',()=>{
  const grid={width:100,height:60,resolution:10};
  const route={name:'Ruta',paths:[[[-20,30],[15,30]],[[70,30],[120,30]]]};
  const strips=prepareUserRouteStrips(route,point=>point,grid);
  const contains=(x,y)=>polygonTester(strips[Math.floor(x/10)])([x,y]);
  assert(contains(5,30.4)&&!contains(5,30.6));
  assert(contains(95,30.4));
  assert(!contains(40,30));
  assert.deepEqual(prepareUserRouteStrips(route,([x,y])=>[x,y+100],grid),[]);
  const acrossDateLine={name:'Ruta',paths:[[[179.5,30],[-179.5,30]]]};
  assert.deepEqual(prepareUserRouteStrips(acrossDateLine,([x,y])=>[x+50,y],grid),[]);
});

test('one continuous route produces closed matching relief cross-sections at a fractional plate cut',()=>{
  const resolution=10,rows=6,width=100,height=60;
  const grid={resolution,rows,width,height,heights:new Float64Array((resolution+1)*(rows+1)).fill(7),
    diagonals:new Uint8Array(resolution*rows)};
  const route={name:'Travessa',paths:[[[-20,30],[120,30]]]};
  const strips=prepareUserRouteStrips(route,point=>point,grid);
  const west=reliefStreamPart(grid,{left:0,bottom:0,right:4.3,top:rows},strips);
  const east=reliefStreamPart(grid,{left:4.3,bottom:0,right:resolution,top:rows},strips);
  const seam=(part,x)=>{
    const result=new Set();
    for(let i=0;i<part.vertices.length;i+=3){
      if(Math.abs(part.vertices[i]-x)<1e-4)
        result.add(part.vertices[i+1].toFixed(4)+','+part.vertices[i+2].toFixed(4));
    }
    return [...result].sort();
  };
  for(const part of [west,east])assert.deepEqual(auditPart(part).errors,[]);
  assert(seam(west,43).length>0);
  assert.deepEqual(seam(west,43),seam(east,0));
});
