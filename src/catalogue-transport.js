// A building can explicitly include a bridge in its own printable mesh.
// Authorisation is local to both a source ID and a geographic scope; an MVT
// feature ID may also represent other, distant bridges.
const validBounds=b=>Array.isArray(b)&&b.length===4&&b.every(Number.isFinite)&&
  b[0]>=-180&&b[0]<b[2]&&b[2]<=180&&b[1]>=-90&&b[1]<b[3]&&b[3]<=90;

export function validTransportReplacement(value,kind,bbox){
  if(value===undefined)return true;
  if(kind!=='building'||!validBounds(bbox)||!Array.isArray(value)||value.length>32)return false;
  const seen=new Set();
  return value.every(rule=>{
    if(!rule||typeof rule!=='object'||Array.isArray(rule)||
        Object.keys(rule).length!==2||!Object.hasOwn(rule,'featureId')||!Object.hasOwn(rule,'bbox')||
        typeof rule.featureId!=='string'||!/^\d{1,18}$/.test(rule.featureId)||!validBounds(rule.bbox))return false;
    const [w,s,e,n]=rule.bbox,key=JSON.stringify([rule.featureId,rule.bbox]);
    if(w<bbox[0]||s<bbox[1]||e>bbox[2]||n>bbox[3]||seen.has(key))return false;
    seen.add(key);return true;
  });
}

function polygons(geometry){
  return geometry?.type==='Polygon'?[geometry.coordinates]:
    geometry?.type==='MultiPolygon'?geometry.coordinates:[];
}

const cross=(a,b)=>a[0]*b[1]-a[1]*b[0];
const minus=(a,b)=>[a[0]-b[0],a[1]-b[1]];
const pointAt=(a,b,t)=>t===0?a:t===1?b:a.map((v,i)=>v+(b[i]-v)*t);
const samePoint=(a,b)=>a&&b&&a[0]===b[0]&&a[1]===b[1];

function onEdge(point,a,b){
  const v=minus(b,a),p=minus(point,a),length=Math.hypot(...v);
  if(!length)return samePoint(point,a);
  // Sub-millimetre geographic tolerance, used only to retain tangencies.
  return Math.abs(cross(v,p))/length<=1e-12&&
    p[0]*v[0]+p[1]*v[1]>=-1e-12*length&&
    p[0]*v[0]+p[1]*v[1]<=length*length+1e-12*length;
}

function inRing(point,ring){
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const a=ring[j],b=ring[i];
    if(onEdge(point,a,b))return null;
    if((a[1]>point[1])!==(b[1]>point[1])&&
        point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  return inside;
}

function covered(point,rule){
  const [w,s,e,n]=rule.bbox;
  if(point[0]<=w||point[0]>=e||point[1]<=s||point[1]>=n)return false;
  return rule.polygons.some(([outer,...holes])=>
    inRing(point,outer)===true&&holes.every(hole=>inRing(point,hole)===false));
}

function intersectionFraction(a,b,c,d){
  const r=minus(b,a),s=minus(d,c),q=minus(c,a),det=cross(r,s);
  if(Math.abs(det)<=Number.EPSILON*Math.hypot(...r)*Math.hypot(...s)*16)return null;
  const t=cross(q,s)/det,u=cross(q,r)/det;
  return t>0&&t<1&&u>=-1e-10&&u<=1+1e-10?t:null;
}

function outsideScopes(line,rules){
  const dimensions=line?.[0]?.length;
  if(!Array.isArray(line)||line.length<2||![2,3].includes(dimensions)||!line.every(point=>
      Array.isArray(point)&&point.length===dimensions&&point.every(Number.isFinite)&&
      Math.abs(point[0])<=180&&Math.abs(point[1])<=90))return {lines:[line],removed:0,applied:[],cuts:[]};
  const lines=[],applied=new Set(),cuts=[];let active=[],removed=0;
  const flush=()=>{if(active.length>1)lines.push(active);active=[];};
  for(let i=1;i<line.length;i++){
    const a=line[i-1],b=line[i],fractions=[0,1];
    for(const rule of rules)for(const ring of rule.rings)for(let j=1;j<ring.length;j++){
      const t=intersectionFraction(a,b,ring[j-1],ring[j]);
      if(t!==null)fractions.push(t);
    }
    fractions.sort((a,b)=>a-b);
    const breaks=fractions.filter((value,index)=>!index||value-fractions[index-1]>1e-10);
    for(let j=1;j<breaks.length;j++){
      const lo=breaks[j-1],hi=breaks[j];
      const matching=rules.filter(rule=>covered(pointAt(a,b,(lo+hi)/2),rule));
      if(matching.length){
        matching.forEach(rule=>applied.add(rule));
        cuts.push(pointAt(a,b,lo),pointAt(a,b,hi));removed++;flush();continue;
      }
      const start=pointAt(a,b,lo),end=pointAt(a,b,hi);
      if(!active.length)active.push(start);
      else if(!samePoint(active.at(-1),start)){flush();active.push(start);}
      if(!samePoint(active.at(-1),end))active.push(end);
    }
  }
  flush();return removed?{lines,removed,applied:[...applied],cuts}:{lines:[line],removed:0,applied:[],cuts:[]};
}

// accepted contains only buildings that prepareLandmark has already admitted
// in source mode, including mesh audit, water and printable crop checks.
// The caller reuses that accepted solid in the eventual building layer.
export function applyBuildingTransportReplacements(data,accepted){
  const byId=new Map();
  for(const {model,prepared} of accepted){
    if(!prepared?.fragments?.[0]?.solid?.faces?.length||
        !validTransportReplacement(model.replacement?.transport,model.kind??'building',model.bbox))continue;
    const shape=polygons(model.footprint);
    for(const rule of model.replacement?.transport??[]){
      const [w,s,e,n]=rule.bbox,scope=[[w,s],[e,s],[e,n],[w,n],[w,s]],
        entry={...rule,modelId:model.id,polygons:shape,rings:[scope,...shape.flat()]};
      if(!byId.has(rule.featureId))byId.set(rule.featureId,[]);
      byId.get(rule.featureId).push(entry);
    }
  }
  if(!byId.size)return data;
  const replacements=new Map();let changed=false;
  const filter=features=>features.flatMap(feature=>{
    const p=feature.properties,g=feature.geometry,rules=byId.get(String(feature.id));
    if(!rules||p?.sourceLayer!=='transportation'||p.brunnel!=='bridge'||
        !['LineString','MultiLineString'].includes(g?.type))return [feature];
    const lines=g.type==='LineString'?[g.coordinates]:g.coordinates,remaining=[];
    let removed=0;const applied=new Set(),cuts=[];
    for(const line of lines){const cut=outsideScopes(line,rules);remaining.push(...cut.lines);removed+=cut.removed;
      cut.applied.forEach(rule=>applied.add(rule));cuts.push(...cut.cuts);}
    if(!removed)return [feature];
    changed=true;
    for(const rule of applied){const key=JSON.stringify([rule.modelId,rule.featureId,rule.bbox]);
      replacements.set(key,{modelId:rule.modelId,featureId:rule.featureId,bbox:rule.bbox});}
    if(!remaining.length)return [];
    return [{...feature,properties:{...p,catalogueTransportCuts:cuts},geometry:remaining.length===1&&g.type==='LineString'
      ?{type:'LineString',coordinates:remaining[0]}:{type:'MultiLineString',coordinates:remaining}}];
  });
  const features=filter(data.features),bridgeFeatures=data.bridgeFeatures?filter(data.bridgeFeatures):undefined;
  return changed?{...data,features,...(bridgeFeatures?{bridgeFeatures}:{}),
    meta:{...data.meta,catalogueTransportReplacements:[...replacements.values()]}}:data;
}
