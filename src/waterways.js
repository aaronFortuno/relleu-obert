import {lineBuffer} from './roads.js';

const nominalWidth={river:8,stream:1,brook:1,canal:4,ditch:.7,drain:.7};
export const MIN_STREAM_WIDTH_MM=.45;

export function waterwayPolygons(features,project,{width,height,scale,multiplier=1}){
  if(multiplier===0)return [];
  const polygons=[];
  const minimum=MIN_STREAM_WIDTH_MM*(Number.isFinite(multiplier)?Math.max(1,Math.min(3,multiplier)):1);
  for(const {properties:p={},geometry:g} of features){
    if(!g||p.tunnel&&p.tunnel!=='no'||p.brunnel==='tunnel'||p.location==='underground'||p.location==='underwater')continue;
    const kind=p.waterway||p.class,nominal=Object.hasOwn(nominalWidth,kind)?nominalWidth[kind]:0;
    if(!nominal)continue;
    const value=String(p.width??'').trim().match(/^(\d+(?:[.,]\d+)?)\s*(?:m)?$/);
    const metres=value?Number(value[1].replace(',','.')):0;
    const mappedWidth=(Number.isFinite(metres)&&metres>0?metres:nominal)*scale;
    const radius=Math.min(Math.hypot(width,height),Math.max(minimum,mappedWidth)/2);
    const lines=g.type==='LineString'?[g.coordinates]:g.type==='MultiLineString'?g.coordinates:[];
    for(const line of lines){
      if(line.length<2||!line.every(([x,y])=>Number.isFinite(x)&&Number.isFinite(y)))continue;
      const buffered=lineBuffer(line.map(project),radius,[width,height]);
      if(buffered.length)polygons.push(buffered);
    }
  }
  return polygons;
}
