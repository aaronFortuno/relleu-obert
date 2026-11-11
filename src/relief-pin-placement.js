import {makeProjection} from './model-projection.js';
import {MAX_RELIEF_PINS,RELIEF_PIN_MARGIN_MM,validReliefPinDepth} from './relief-pin-holes.js';

export function normalizeReliefPins(pins){
  if(!Array.isArray(pins)||pins.length>MAX_RELIEF_PINS)throw Error('Els punts de perforació no són vàlids.');
  return Array.from(pins,pin=>{
    const {lon,lat,depth}=pin??{};
    if(!Number.isFinite(lon)||Math.abs(lon)>180||!Number.isFinite(lat)||Math.abs(lat)>90||!validReliefPinDepth(depth))
      throw Error('Els punts de perforació no són vàlids.');
    return {lon,lat,depth};
  });
}

export function pinProjection(model){
  return makeProjection(model.provenance.bbox,Math.max(model.width,model.height),
    {...model.provenance.options,widthMM:model.width,heightMM:model.height});
}

export function pinInsideTile(x,y,tile,margin=0){
  return x>=tile.x0+margin&&x<=tile.x1-margin&&y>=tile.y0+margin&&y<=tile.y1-margin;
}

export function locateReliefPins(model,pins,plan){
  const assignments=plan.tiles.map(()=>[]),projection=pinProjection(model);
  for(const [index,pin] of normalizeReliefPins(pins).entries()){
    const [x,y]=projection.project([pin.lon,pin.lat]);
    if(x<0||x>model.width||y<0||y>model.height)continue;
    const tileIndex=plan.tiles.findIndex(tile=>pinInsideTile(x,y,tile));
    const tile=plan.tiles[tileIndex];
    assignments[tileIndex].push({id:index+1,depth:pin.depth,x:x-tile.x0,y:y-tile.y0});
  }
  return assignments;
}

export const pinFitsTile=(x,y,plan)=>plan.tiles.some(tile=>pinInsideTile(x,y,tile,RELIEF_PIN_MARGIN_MM));
