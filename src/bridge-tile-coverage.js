import {lonLatTile} from './elevation.js';
import {isInactiveRailway} from './railways.js';

const tileKey=({x,y})=>`${x}/${y}`;
const isBridge=f=>f.id!=null&&f.properties.sourceLayer==='transportation'&&f.properties.brunnel==='bridge'&&!isInactiveRailway(f.properties);
const linesOf=f=>f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.type==='MultiLineString'?f.geometry.coordinates:[];
const overlaps=(line,[w,s,e,n])=>line.some(([x,y])=>x>=w&&x<=e&&y>=s&&y<=n)||line.slice(1).some(([x,y],i)=>{
  const [a,b]=line[i];
  return Math.max(x,a)>=w&&Math.min(x,a)<=e&&Math.max(y,b)>=s&&Math.min(y,b)<=n;
});

// Vector tiles include a buffer past their edges. A bridge ending there
// may continue in the next tile. Follow the same way ID with a fixed budget.
export async function extendBridgeTiles(initial,bbox,readTile,{limit=8}={}){
  const loaded=new Map(initial.map(entry=>[tileKey(entry.tile),entry]));
  const attempted=new Set(),extra=new Set(),missing=new Set();
  const queue=initial.flatMap(entry=>entry.features.filter(f=>isBridge(f)&&linesOf(f).some(line=>overlaps(line,bbox))).map(feature=>({tile:entry.tile,feature})));
  const visited=new Set();
  for(let i=0;i<queue.length;i++){
    const {tile,feature}=queue[i];
    if(visited.has(feature))continue;
    visited.add(feature);
    const neighbours=new Map();
    for(const line of linesOf(feature))if(line.length>=2)for(const p of [line[0],line.at(-1)]){
      const [x,y]=lonLatTile(...p,tile.z);
      const dx=x<tile.x+.035?-1:x>tile.x+.965?1:0,dy=y<tile.y+.035?-1:y>tile.y+.965?1:0;
      for(const a of [0,dx])for(const b of [0,dy])if(a||b){
        const t={z:tile.z,x:tile.x+a,y:tile.y+b};
        if(t.x>=0&&t.y>=0&&t.x<2**t.z&&t.y<2**t.z)neighbours.set(tileKey(t),t);
      }
    }
    for(const [key,t]of neighbours){
      if(!loaded.has(key)&&!attempted.has(key)&&attempted.size<limit){
        attempted.add(key);
        try{
          const entry={tile:t,features:(await readTile(t)).filter(isBridge)};
          loaded.set(key,entry);
        }catch{/* Report the incomplete way and keep the terrain usable. */}
      }
      const entry=loaded.get(key);
      if(!entry){missing.add(feature.id);continue;}
      const matches=entry.features.filter(f=>isBridge(f)&&f.id===feature.id);
      for(const f of matches){
        if(attempted.has(key))extra.add(f);
        queue.push({tile:entry.tile,feature:f});
      }
    }
  }
  const tiles=[...loaded.values()].filter(entry=>attempted.has(tileKey(entry.tile))&&entry.features.some(f=>extra.has(f))).map(entry=>entry.tile);
  return {features:[...extra],tiles,missing};
}
