// A successful HTTP status may still contain an ArcGIS error or a truncated page.
export async function fetchArcgisPolygons(queryUrl,{
  bbox,where,idField,fields=[],fetcher=fetch,accept=()=>true
}){
  const signal=AbortSignal.timeout(30_000);
  async function query(parameters){
    const request=new URL(queryUrl);
    request.search=new URLSearchParams(parameters);
    const response=await fetcher(request,{signal});
    if(!response.ok)throw Error(`ArcGIS HTTP ${response.status}`);
    const result=await response.json();
    if(result.error)throw Error(`ArcGIS ${result.error.code}: ${result.error.message}`);
    return result;
  }

  const selection=await query({f:'json',where,returnIdsOnly:true,geometry:bbox.join(','),
    geometryType:'esriGeometryEnvelope',inSR:4326,spatialRel:'esriSpatialRelIntersects'});
  const ids=selection.objectIds===null?[]:selection.objectIds;
  if(selection.objectIdFieldName?.toLowerCase()!==idField.toLowerCase()||!Array.isArray(ids)||
    !ids.every(Number.isSafeInteger)||new Set(ids).size!==ids.length||ids.length>6000||selection.exceededTransferLimit){
    throw Error('Incomplete ArcGIS object list.');
  }
  ids.sort((a,b)=>a-b);

  const features=[];
  for(let start=0;start<ids.length;start+=250){
    const wanted=new Set(ids.slice(start,start+250));
    const page=await query({f:'geojson',objectIds:[...wanted].join(','),
      outFields:[idField,...fields].join(','),outSR:4326,geometryPrecision:7,orderByFields:`${idField} ASC`});
    if(page.type!=='FeatureCollection'||page.exceededTransferLimit||page.properties?.exceededTransferLimit||
      !Array.isArray(page.features)||!page.features.every(feature=>
        wanted.delete(feature?.properties?.[idField])&&accept(feature))||wanted.size){
      throw Error('Incomplete ArcGIS geometry page.');
    }
    features.push(...page.features);
  }
  return {type:'FeatureCollection',features};
}
