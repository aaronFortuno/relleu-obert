import proj4 from 'proj4';
for(const zone of [29,30,31])proj4.defs('EPSG:'+(25800+zone),`+proj=utm +zone=${zone} +ellps=GRS80 +units=m +no_defs`);
export function coordinateTransform(epsg){
  const code=Number(epsg);
  if(code===4326||code===4258)return {forward:p=>p.slice(),inverse:p=>p.slice()};
  if(![4326,4258,3857,25829,25830,25831].includes(code)&&!(code>=32601&&code<=32660)&&!(code>=32701&&code<=32760))throw Error(`EPSG:${epsg} no admès. Converteix les dades a EPSG:4326 o ETRS89/UTM 29–31.`);
  return proj4(code===4258?'EPSG:4326':'EPSG:'+code,'EPSG:4326');
}
export function localRasterSampler(raster){
  const transform=coordinateTransform(raster.epsg),[a,b,c,d,e,f]=raster.affine,det=a*e-b*d,offset=raster.pixelIsArea?.5:0;
  if(!Number.isFinite(det)||Math.abs(det)<1e-20)throw Error('GeoTIFF sense una transformació geogràfica vàlida.');
  return (lon,lat)=>{
    const [X,Y]=transform.inverse([lon,lat]),dx=X-c,dy=Y-f,gx=(e*dx-b*dy)/det-offset,gy=(-d*dx+a*dy)/det-offset;
    if(gx<-.50001||gy<-.50001||gx>raster.width-.49999||gy>raster.height-.49999)throw Error('El GeoTIFF no cobreix tot el retall seleccionat.');
    const x=Math.max(0,Math.min(raster.width-1,gx)),y=Math.max(0,Math.min(raster.height-1,gy)),i=Math.floor(x),j=Math.floor(y),u=x-i,v=y-j;let z=0,total=0;
    for(const [ix,iy,w]of [[i,j,(1-u)*(1-v)],[Math.min(i+1,raster.width-1),j,u*(1-v)],[i,Math.min(j+1,raster.height-1),(1-u)*v],[Math.min(i+1,raster.width-1),Math.min(j+1,raster.height-1),u*v]]){
      if(w<1e-12)continue;const h=raster.values[iy*raster.width+ix];if(Number.isFinite(h)){z+=h*w;total+=w;}
    }
    if(total<.99999)throw Error('El GeoTIFF té cel·les sense dades dins del retall. Tria una altra zona o un MDT complet.');
    return z/total;
  };
}
