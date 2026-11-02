import {finiteRange,joinedPart,translateSolid} from './accessory-solids.js';
import {printableText,glyphRectangles} from './label-font.js';
export function layoutLabel({lines=[],plateWidth=100,plateDepth=32,textHeight=6,plateHeight=3,relief=1.2}={}){
  finiteRange(plateWidth,40,180,'Amplada de placa');finiteRange(plateDepth,16,80,'Fondària de placa');
  finiteRange(plateHeight,2,6,'Gruix de placa');finiteRange(relief,.6,3,'Relleu de lletra');finiteRange(textHeight,4.5,20,'Alçada de lletra');
  if(!Array.isArray(lines)||lines.length>3)throw Error('La placa admet un màxim de tres línies.');
  const printed=lines.map(printableText),active=printed.filter(s=>s.trim());
  if(!active.length)throw Error('Escriu almenys una línia a la placa.');
  const unit=textHeight/7,rectangles=[];
  active.forEach((line,index)=>{
    let advance=0;const local=[];
    for(const c of line){for(const [x,y,w,h]of glyphRectangles(c))local.push([(advance+x)*unit,y*unit,w*unit,h*unit]);advance+=c===' '?3:6;}
    const width=(advance-1)*unit;
    if(width>plateWidth-4+1e-6)throw Error(`La línia ${index+1} fa ${width.toFixed(1)} mm i no cap. Eixampla la placa o escurça el text.`);
    const x0=(plateWidth-width)/2,y0=(active.length-1-index)*12*unit;
    for(const [x,y,w,h]of local)rectangles.push({x:x+x0,y:y+y0,width:w,height:h,line:index});
  });
  const low=Math.min(...rectangles.map(r=>r.y)),high=Math.max(...rectangles.map(r=>r.y+r.height));
  if(high-low>plateDepth-3)throw Error('Les línies no caben a la fondària de la placa. Augmenta-la o redueix el text.');
  const dy=(plateDepth-(high-low))/2-low;
  for(const r of rectangles)r.y+=dy;
  return {printed,rectangles,plateWidth,plateDepth,plateHeight,relief,textHeight,strokeWidth:unit};
}
export function labelParts(options,api){
  if(!['frontal','lateral'].includes(options.orientation||'frontal'))throw Error('Orientació de placa invàlida.');
  const layout=layoutLabel(options),{plateWidth:w,plateDepth:d,plateHeight:h,relief}=layout;
  const part=joinedPart(api,own=>{
    own(api.Manifold.cube([w,d,h]));
    for(const r of layout.rectangles)own(translateSolid(api.Manifold.cube([r.width,r.height,relief+.05]),[r.x,r.y,h-.05]));
  },'placa','Placa educativa',options.color||'#eee9dc');
  return {segments:[part],parameters:{...options,lines:options.lines,printedLines:layout.printed,strokeWidth:layout.strokeWidth},outer:[w,d],displayRotation:options.orientation==='lateral'?[90,0,0]:[0,0,0]};
}
