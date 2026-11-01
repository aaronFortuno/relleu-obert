export function printOptions(options={}){
  const filament=options.filament??'PLA',nozzle=options.nozzle==null||options.nozzle===''?null:Number(options.nozzle);
  if(!['PLA','PETG'].includes(filament)||nozzle!==null&&![.2,.4,.6].includes(nozzle))throw Error('Opcions de broquet o filament no admeses.');
  return {filament,nozzle};
}
