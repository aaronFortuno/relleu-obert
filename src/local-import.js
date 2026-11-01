import {fromArrayBuffer} from 'geotiff';
import {coordinateTransform} from './local-raster.js';
export async function importDEM(buffer,name='MDT local'){
  if(buffer.byteLength>100*1024*1024)throw Error('El GeoTIFF supera 100 MB. Retalla’l abans d’importar-lo.');
  const tiff=await fromArrayBuffer(buffer),image=await tiff.getImage(),width=image.getWidth(),height=image.getHeight(),keys=image.getGeoKeys()||{};
  if(width*height>4_000_000||width<2||height<2)throw Error('El MDT ha de tenir entre 2 × 2 i 4 milions de cel·les. Retalla el GeoTIFF, sense convertir-lo en imatge RGB.');
  if(image.getSamplesPerPixel()!==1)throw Error('Cal un MDT numèric d’una banda, no una ortofoto ni un ombrejat RGB.');
  const compression=image.getFileDirectory().getValue('Compression')??1;
  if(![1,5,8,32946,32773,50000].includes(compression))throw Error('Cal un GeoTIFF sense compressió o amb compressió sense pèrdua (LZW, Deflate, PackBits o ZSTD).');
  const epsg=keys.ProjectedCSTypeGeoKey||keys.GeographicTypeGeoKey;coordinateTransform(epsg);
  if(keys.VerticalUnitsGeoKey&&keys.VerticalUnitsGeoKey!==9001)throw Error('Les altituds del MDT han d’estar expressades en metres.');
  const m=image.getFileDirectory().getValue('ModelTransformation'),origin=image.getOrigin(),res=image.getResolution(),affine=m?[m[0],m[1],m[3],m[4],m[5],m[7]]:[res[0],0,origin[0],0,res[1],origin[1]];
  const raw=await image.readRasters({samples:[0],interleave:true}),noData=image.getGDALNoData(),values=new Float32Array(width*height);let valid=0;
  for(let i=0;i<values.length;i++){const h=raw[i];values[i]=Number.isFinite(h)&&h!==noData&&h>=-12000&&h<=9000?h:NaN;if(Number.isFinite(values[i]))valid++;}
  if(!valid)throw Error('El GeoTIFF no conté altituds vàlides en metres.');
  const sha256=globalThis.crypto?.subtle?Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',buffer)),b=>b.toString(16).padStart(2,'0')).join(''):null;
  return {width,height,epsg,affine,pixelIsArea:image.pixelIsArea(),values,metadata:{provider:'GeoTIFF local',file:name,sha256,width,height,epsg,affine,compression,validSamples:valid,invalidSamples:width*height-valid,units:'metres',verticalDatum:'from source; no vertical datum conversion',importedAt:new Date().toISOString()}};
}
export function importBuildings(text,name='Edificis locals'){
  if(text.length>30_000_000)throw Error('El GeoJSON supera 30 MB. Retalla’l a l’àrea d’interès.');
  const json=JSON.parse(text);if(json.type!=='FeatureCollection'||!Array.isArray(json.features)||!json.features.length||json.features.length>10000)throw Error('Cal un FeatureCollection GeoJSON amb 1–10.000 edificis.');
  const crs=json.crs?.properties?.name,epsg=!crs||/CRS84$/i.test(crs)?4326:Number(crs.match(/(?:EPSG(?::|::|\/0\/)|\/)(\d+)$/i)?.[1]),transform=coordinateTransform(epsg);let vertices=0;
  const features=json.features.map((f,i)=>{
    if(!['Polygon','MultiPolygon'].includes(f.geometry?.type))throw Error('El GeoJSON d’edificis només pot contenir Polygon o MultiPolygon.');
    const mapRing=ring=>{if(ring.length<4)throw Error('Una petjada no té prou vèrtexs.');const result=ring.map(p=>{if(++vertices>300000)throw Error('El GeoJSON supera 300.000 vèrtexs.');if(!p.slice(0,2).every(Number.isFinite))throw Error('Coordenada GeoJSON invàlida.');const q=transform.forward(p.slice(0,2));if(!q.every(Number.isFinite)||Math.abs(q[0])>180||Math.abs(q[1])>70)throw Error('El GeoJSON conté coordenades fora de l’àmbit admès.');return q;});const a=result[0],b=result.at(-1);if(a[0]!==b[0]||a[1]!==b[1])throw Error('Les petjades GeoJSON han de tenir anells tancats.');return result;};
    const coordinates=f.geometry.type==='Polygon'?f.geometry.coordinates.map(mapRing):f.geometry.coordinates.map(p=>p.map(mapRing)),p=f.properties||{},value=p.render_height??p.altura??p.height,h=typeof value==='number'?value:typeof value==='string'&&/^\s*\d+(\.\d+)?\s*(m)?\s*$/.test(value)?parseFloat(value):NaN,valid=Number.isFinite(h)&&h>0&&h<=1200;
    return {type:'Feature',id:f.id??`local-${i}`,geometry:{type:f.geometry.type,coordinates},properties:{...p,sourceLayer:'building',render_height:valid?h:6,height_estimated:!!p.height_estimated||!valid,provider:'GeoJSON local'}};
  });
  return {type:'FeatureCollection',features,metadata:{provider:'GeoJSON local',file:name,epsg,count:features.length,importedAt:new Date().toISOString()}};
}
