export function sourceError(phase,error,provider){
  return Object.assign(new Error(error.message,{cause:error}),{
    sourcePhase:phase,sourceProvider:error.sourceProvider??provider
  });
}

export async function fetchGenerationData(fetcher,url,options){
  try{return await fetcher(url,options);}
  catch(error){
    if(error.name==='TypeError')throw Object.assign(new Error(error.message,{cause:error}),{diagnosticReason:'xarxa'});
    throw error;
  }
}

export function generationErrorReason(error){
  if(error?.diagnosticReason)return error.diagnosticReason;
  if(error?.code==='REGION_LIMIT')return 'limit_retall';
  if(error?.code==='INVALID_ELEVATION'||error?.name==='SyntaxError')return 'dades_invalides';
  if(error?.name==='TimeoutError')return 'temps_exhaurit';
  if(error?.name==='AbortError')return 'peticio_interrompuda';
  const status=error?.status;
  if(status===404)return 'http_404';
  if(status===429)return 'http_429';
  if(Number.isInteger(status)&&status>=500&&status<600)return 'http_5xx';
  if(Number.isInteger(status)&&status>=400&&status<500)return 'http_4xx';
  return 'inesperat';
}
