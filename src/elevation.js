export const lonLatTile=(lon,lat,z=14)=>[(lon+180)/360*2**z,(1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*2**z];

export {decodeTerrarium} from './terrarium.js';

// Repairs only invalid samples or isolated kilometre-scale discontinuities.
// It deliberately leaves normal steep slopes and cliffs unchanged.
export function prepareElevationTiles(tiles){
  let invalid=0,spikes=0,repaired=0;
  const lookup=new Map(tiles.map(t=>[`${t.x},${t.y}`,t]));
  const pixel=(t,x,y)=>{const dx=Math.floor(x/t.size),dy=Math.floor(y/t.size),other=lookup.get(`${t.x+dx},${t.y+dy}`);return other?.elev[((y%t.size+t.size)%t.size)*t.size+(x%t.size+t.size)%t.size];};
  const prepared=tiles.map(t=>{
    const elev=t.elev.slice();
    for(let y=0;y<t.size;y++)for(let x=0;x<t.size;x++){
      const i=y*t.size+x,h=t.elev[i],bad=!Number.isFinite(h)||h < -12000||h > 9000;
      if(bad)invalid++;
      const right=t.elev[i+1];
      if(!bad&&x+1<t.size&&right>=-12000&&right<=9000&&Math.abs(h-right)<=1000)continue;
      const n=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const v=pixel(t,x+dx,y+dy);if(Number.isFinite(v)&&v>=-12000&&v<=9000)n.push(v);}
      const isolated=!bad&&n.length>=5&&n.every(v=>Math.abs(h-v)>1000)&&((h>Math.max(...n))||(h<Math.min(...n)));
      if(isolated)spikes++;
      if(bad||isolated){n.sort((a,b)=>a-b);if(n.length>=3){elev[i]=n[Math.floor(n.length/2)];repaired++;}else elev[i]=NaN;}
    }
    return {...t,elev};
  });
  return {tiles:prepared,diagnostics:{invalid,spikes,repaired}};
}

export function sampleHeight(tiles,lon,lat){
  if(!tiles.length)throw Error('No hi ha dades d’elevació.');
  return interpolateHeight(tiles[0],(x,y)=>tiles.find(t=>t.x===x&&t.y===y),lon,lat);
}

export function createElevationSampler(tiles){
  if(!tiles.length)throw Error('No hi ha dades d’elevació.');
  const lookup=new Map();
  for(const tile of tiles){
    if(!lookup.has(tile.y))lookup.set(tile.y,new Map());
    lookup.get(tile.y).set(tile.x,tile);
  }
  const tileAt=(x,y)=>lookup.get(y)?.get(x);
  return (lon,lat)=>interpolateHeight(tiles[0],tileAt,lon,lat);
}

function interpolateHeight({z,size},tileAt,lon,lat){
  const [tx,ty]=lonLatTile(lon,lat,z),gx=tx*size-.5,gy=ty*size-.5,x=Math.floor(gx),y=Math.floor(gy),a=gx-x,b=gy-y;
  let weighted=0,total=0;
  for(const[dx,dy,w]of [[0,0,(1-a)*(1-b)],[1,0,a*(1-b)],[0,1,(1-a)*b],[1,1,a*b]]){
    if(w<1e-12)continue;
    const px=x+dx,py=y+dy,t=tileAt(Math.floor(px/size),Math.floor(py/size));
    const h=t?.elev[((py%size+size)%size)*size+(px%size+size)%size];
    if(Number.isFinite(h)&&h>=-12000&&h<=9000){weighted+=w*h;total+=w;}
  }
  if(total<1e-10)throw Error('Falten dades d’elevació vàlides dins de la regió.');
  return weighted/total;
}

export function createTerrainField({width,height,resolution,at}){
  const n=resolution,values=new Float64Array((n+1)*(n+1));
  for(let y=0;y<=n;y++)for(let x=0;x<=n;x++){
    const z=at(x*width/n,y*height/n);
    if(!Number.isFinite(z))throw Error('El relleu conté una altitud invàlida.');
    values[y*(n+1)+x]=z;
  }
  const sample=(x,y)=>{
    const gx=Math.max(0,Math.min(n,x/width*n)),gy=Math.max(0,Math.min(n,y/height*n)),ix=Math.min(n-1,Math.floor(gx)),iy=Math.min(n-1,Math.floor(gy)),u=gx-ix,v=gy-iy;
    const z00=values[iy*(n+1)+ix],z10=values[iy*(n+1)+ix+1],z01=values[(iy+1)*(n+1)+ix],z11=values[(iy+1)*(n+1)+ix+1];
    // Same bottom-left/top-right diagonal used to generate the actual mesh.
    return u>=v?z00+(z10-z00)*u+(z11-z10)*v:z00+(z11-z01)*u+(z01-z00)*v;
  };
  return {sample,values};
}
