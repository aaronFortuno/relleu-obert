import {coordinateTransform,projectedRasterSampler} from './local-raster.js';
import {polygonOps} from './polygon-ops.js';

const blendMetres=12;
const tolerance=1e-6;
const rectangle=([w,s,e,n])=>[[w,s],[e,s],[e,n],[w,n]];
const closedRectangle=bounds=>{const ring=rectangle(bounds);return [[...ring,ring[0]]];};

// Test the actual crop quadrilateral in the raster CRS, including its rotation.
export function terrainTilesInCrop({epsg,tiles},bbox,corners){
  const transform=coordinateTransform(epsg),crop=(corners??rectangle(bbox)).map(p=>transform.inverse(p));
  const axes=[[1,0],[0,1],...crop.map(([x,y],i)=>{
    const [u,v]=crop[(i+1)%crop.length],length=Math.hypot(v-y,u-x);
    return [(v-y)/length,(x-u)/length];
  })];
  const span=(points,[x,y])=>{
    const values=points.map(p=>p[0]*x+p[1]*y);return [Math.min(...values),Math.max(...values)];
  };
  const extents=axes.map(axis=>span(crop,axis));
  return tiles.filter(tile=>{
    const points=rectangle(tile.bounds);
    return axes.every((axis,i)=>{
      const [lo,hi]=span(points,axis),[start,end]=extents[i];
      return hi>start+tolerance&&end>lo+tolerance;
    });
  });
}
export async function decodeTerrainTile(bytes,{bounds,byteLength,step},epsg){
  if(bytes.byteLength!==byteLength)throw Error('Mida del sector de relleu incorrecta.');
  const {importDEM}=await import('./local-import.js');
  const raster=await importDEM(bytes.buffer);
  const [w,s,e,n]=bounds,expected=[step,0,w,0,-step,n];
  if(raster.epsg!==epsg||raster.pixelIsArea||raster.width!==(e-w)/step+1||raster.height!==(n-s)/step+1||
    raster.metadata.invalidSamples||raster.affine.some((v,i)=>Math.abs(v-expected[i])>tolerance))throw Error('Graella del sector de relleu incorrecta.');
  const {metadata,...grid}=raster;
  return grid;
}

function distanceToEdge([x,y],[[a,b],[c,d]]){
  const dx=c-a,dy=d-b,t=Math.max(0,Math.min(1,((x-a)*dx+(y-b)*dy)/(dx*dx+dy*dy)));
  return Math.hypot(x-a-t*dx,y-b-t*dy);
}

export function withTerrainTiles(base,models){
  const groups=(models??[]).filter(m=>m.kind==='terrain-overview'&&m.tiles.length).map(({terrainTiles,tiles,coverage})=>{
    const {inverse}=coordinateTransform(terrainTiles.epsg);
    const outlines=polygonOps().union(...coverage.map(closedRectangle));
    const edges=outlines.flatMap(poly=>poly.flatMap(ring=>ring.slice(1).map((point,i)=>[ring[i],point])));
    return {inverse,edges,tiles:tiles.slice().sort((a,b)=>a.step-b.step).map(tile=>({...tile,sample:projectedRasterSampler(tile.raster)}))};
  });
  if(!groups.length)return base;
  return (lon,lat)=>{
    for(const {inverse,edges,tiles} of groups){
      const point=inverse([lon,lat]),[x,y]=point;
      const tile=tiles.find(({bounds:[w,s,e,n]})=>x>=w-tolerance&&x<=e+tolerance&&y>=s-tolerance&&y<=n+tolerance);
      if(!tile)continue;
      const detail=tile.sample(x,y);
      let distance=blendMetres;
      for(const edge of edges)distance=Math.min(distance,distanceToEdge(point,edge));
      if(distance===blendMetres)return detail;
      const t=distance/blendMetres,weight=t*t*(3-2*t),original=base(lon,lat);
      return original+(detail-original)*weight;
    }
    return base(lon,lat);
  };
}

export function terrainTileBands(models,proj){
  const groups=(models??[]).filter(m=>m.kind==='terrain-overview');
  const count=groups.reduce((sum,model)=>sum+model.tiles.length,0);
  if(!count)return [];
  const divisions=Math.floor(80/count);
  return groups.flatMap(({terrainTiles,tiles})=>{
    const {forward}=coordinateTransform(terrainTiles.epsg);
    return tiles.map(({bounds,step})=>{
      const points=rectangle(bounds).map(p=>proj.project(forward(p)));
      const lo=[0,1].map(i=>Math.max(0,Math.min(...points.map(p=>p[i]))));
      const hi=[proj.width,proj.height].map((max,i)=>Math.min(max,Math.max(...points.map(p=>p[i]))));
      return {lo,hi,step:Math.max(step*proj.scale,(hi[0]-lo[0])/divisions,(hi[1]-lo[1])/divisions)};
    });
  });
}
