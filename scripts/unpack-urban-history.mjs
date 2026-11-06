import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {unzipSync} from 'fflate';

const archive=new URL('../datasets/icgc-urban-2009-2024.zip',import.meta.url);
const output=new URL('../output/archived-historical/',import.meta.url);
const files=unzipSync(await readFile(archive),{filter:({name})=>name==='index.json'||/^\d{4}\/\d+-\d+\.json\.gz$/.test(name)});
const index=JSON.parse(new TextDecoder().decode(files['index.json']));
await mkdir(output,{recursive:true});
for(const {year,tiles} of index.editions){
  const directory=new URL(`${year}/`,output);
  await mkdir(directory,{recursive:true});
  for(const [key,size] of Object.entries(tiles)){
    const name=`${year}/${key}.json.gz`;
    if(!/^\d{4}\/\d+-\d+\.json\.gz$/.test(name)||files[name]?.length!==size)throw Error(`Invalid urban coverage tile: ${name}`);
    await writeFile(new URL(name,output),files[name]);
  }
}
await writeFile(new URL('index.json',output),files['index.json']);
