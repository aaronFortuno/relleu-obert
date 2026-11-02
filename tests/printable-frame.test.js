import test from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import {frameSegments} from '../src/printable-frame.js';

// Float32 at 450 mm has a 0.0000306 mm ULP; test within 0.00005 mm.
const EPS=5e-5;
const close=(a,b,eps=EPS)=>Math.abs(a-b)<=eps;
const bbox=v=>{
  const b=[Infinity,Infinity,Infinity,-Infinity,-Infinity,-Infinity];
  for(let i=0;i<v.length;i+=3)for(let k=0;k<3;k++){
    b[k]=Math.min(b[k],v[i+k]);b[3+k]=Math.max(b[3+k],v[i+k]);
  }
  return {dx:b[3]-b[0],dy:b[4]-b[1],dz:b[5]-b[2],min:b.slice(0,3),max:b.slice(3)};
};
const globalRect=s=>{
  const b=bbox(s.vertices);
  return [s.offset[0]+b.min[0],s.offset[1]+b.min[1],s.offset[0]+b.max[0],s.offset[1]+b.max[1]];
};

test('opening, outer and per-segment bbox respect the parameters',()=>{
  const r=frameSegments({width:200,height:150});
  assert(close(r.opening[0],200.8)&&close(r.opening[1],150.8));
  assert(close(r.outer[0],216.8)&&close(r.outer[1],166.8));
  assert.deepEqual(r.parameters,{width:200,height:150,clearance:.4,rim:8,frameHeight:3,segmentMax:180});
  for(const s of r.segments){
    const b=bbox(s.vertices);
    assert(b.dx<=180+1e-6&&b.dy<=180+1e-6,`${s.id} bbox ${b.dx}x${b.dy}`);
    assert(close(b.dz,3),`${s.id} dz ${b.dz}`);
    assert(s.vertices instanceof Float32Array&&s.faces instanceof Uint32Array);
  }
});

test('150 mm fits whole: one annulus of 16 vertices and 32 triangles, outer 166.8',()=>{
  const r=frameSegments({width:150,height:150});
  assert.equal(r.segments.length,1);
  assert(close(r.outer[0],166.8)&&close(r.outer[1],166.8));
  const s=r.segments[0];
  assert.equal(s.id,'anell-unic');
  assert.equal(s.vertices.length,16*3);
  assert.equal(s.faces.length,32*3);
  const b=bbox(s.vertices);
  assert(close(b.dx,166.8)&&close(b.dy,166.8));
});

test('200 mm gives 12 segments and 400 mm gives 16 with equal trams per side',()=>{
  const r2=frameSegments({width:200,height:200});
  assert.equal(r2.segments.length,12);
  const r4=frameSegments({width:400,height:400});
  assert.equal(r4.segments.length,16);
  for(const [r,n,len] of [[r2,2,100.4],[r4,3,133.6]]){
    for(const side of ['top','bottom','left','right']){
      const parts=r.segments.filter(s=>s.id.startsWith(`${side}-`));
      assert.equal(parts.length,n,`${side} count`);
      for(const p of parts){
        const b=bbox(p.vertices);
        const along=side==='top'||side==='bottom'?b.dx:b.dy;
        const across=side==='top'||side==='bottom'?b.dy:b.dx;
        assert(close(along,len),`${p.id} along ${along}`);
        assert(close(across,8),`${p.id} across ${across}`);
      }
    }
    const corners=r.segments.filter(s=>s.id.startsWith('corner-'));
    assert.equal(corners.length,4);
    for(const c of corners){
      const b=bbox(c.vertices);
      assert(close(b.dx,8)&&close(b.dy,8),`${c.id} corner`);
    }
  }
});

test('global reconstruction tiles the ring without overlap or gaps and matches the volume',()=>{
  for(const size of [200,400]){
    const r=frameSegments({width:size,height:size});
    const ring=r.outer[0]*r.outer[1]-r.opening[0]*r.opening[1];
    const g0=-(r.parameters.clearance+r.parameters.rim),g1=size+r.parameters.clearance+r.parameters.rim;
    const open0=-r.parameters.clearance,open1=size+r.parameters.clearance;
    const rects=r.segments.map(globalRect);
    let area=0,volume=0;
    for(let i=0;i<rects.length;i++){
      const [x0,y0,x1,y1]=rects[i];
      area+=(x1-x0)*(y1-y0);
      assert(x0>=g0-EPS&&y0>=g0-EPS&&x1<=g1+EPS&&y1<=g1+EPS,`${r.segments[i].id} inside outer`);
      const iox=Math.min(x1,open1)-Math.max(x0,open0),ioy=Math.min(y1,open1)-Math.max(y0,open0);
      assert(!(iox>EPS&&ioy>EPS),`${r.segments[i].id} intrudes into the opening`);
      volume+=(x1-x0)*(y1-y0)*bbox(r.segments[i].vertices).dz;
      for(let j=i+1;j<rects.length;j++){
        const ox=Math.min(x1,rects[j][2])-Math.max(x0,rects[j][0]);
        const oy=Math.min(y1,rects[j][3])-Math.max(y0,rects[j][1]);
        assert(!(ox>EPS&&oy>EPS),`overlap ${r.segments[i].id} vs ${r.segments[j].id}`);
      }
    }
    assert(close(area,ring,1e-3),`area ${area} vs ring ${ring}`);
    assert(close(volume,ring*3,.01),`volume ${volume} vs ${ring*3}`);
    const ids=new Set(r.segments.map(s=>s.id));
    assert.equal(ids.size,r.segments.length);
  }
});

test('every segment is manifold with NoError and positive volume',async()=>{
  const api=await Module();api.setup();
  for(const size of [150,200,400]){
    const r=frameSegments({width:size,height:size});
    const ring=r.outer[0]*r.outer[1]-r.opening[0]*r.opening[1];
    let total=0;
    for(const s of r.segments){
      const solid=new api.Manifold(new api.Mesh({numProp:3,vertProperties:s.vertices,triVerts:s.faces}));
      assert.equal(solid.status(),'NoError',`${size} ${s.id}`);
      const v=solid.volume();
      assert(v>0,`${size} ${s.id} volume`);
      total+=v;
      solid.delete();
    }
    assert(close(total,ring*3,.01),`manifold volume ${total} vs ${ring*3}`);
  }
});

test('invalid parameters are rejected before generating',()=>{
  const bad=[
    {},{width:0,height:100},{width:451,height:100},{width:NaN,height:100},
    {width:Infinity,height:100},{width:'200',height:100},{width:100},
    {width:100,height:0},{width:100,height:1000},
    {width:100,height:100,clearance:.19},{width:100,height:100,clearance:1.01},
    {width:100,height:100,rim:2.9},{width:100,height:100,rim:15.5},
    {width:100,height:100,frameHeight:1.9},{width:100,height:100,frameHeight:41},
    {width:100,height:100,segmentMax:49},{width:100,height:100,segmentMax:450.1},
  ];
  for(const opts of bad)assert.throws(()=>frameSegments(opts),RangeError,JSON.stringify(opts));
});

test('output is deterministic across calls',()=>{
  for(const size of [150,200,400])
    assert.deepEqual(frameSegments({width:size,height:size}),frameSegments({width:size,height:size}));
});
