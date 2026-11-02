// RO-053 interaction model for the illustrative prototype only.
// No terrain, GIS data or printable geometry is generated here.
export const stages=['Peça','Territori','Terreny','Vegetació','Vies','Edificis'];
export const layerNames=['terrain','vegetation','transport','buildings'];
export const locations={rajadell:{name:'Viaducte de l’Eix Diagonal',region:'Bages',lat:41.71792,lon:1.78391},tamariu:{name:'Badia de Tamariu',region:'Baix Empordà',lat:41.9181,lon:3.2062}};
export const impacts={size:['terrain','vegetation','transport','buildings'],plate:[],location:['terrain','vegetation','transport','buildings'],rotation:['terrain','vegetation','transport','buildings'],exaggeration:['terrain','vegetation','transport','buildings'],detail:['terrain','vegetation','transport','buildings'],treeType:['vegetation'],trees:['vegetation'],roadRise:['transport','vegetation'],railRise:['transport','vegetation'],tunnels:['transport','vegetation'],source:['buildings','vegetation','transport'],height:['buildings']};
const clone=value=>structuredClone(value);
const defaults={size:'150x150',plate:200,location:'rajadell',rotation:0,exaggeration:1.5,detail:'equilibrat',treeType:'mixed',trees:true,roadRise:0,railRise:1,tunnels:true,source:'icgc',height:5};
const stageKeys={terrain:['size','location','rotation','exaggeration','detail'],vegetation:['trees','treeType'],transport:['roadRise','railRise','tunnels'],buildings:['source','height']};
function snapshot(s){
 const result={settings:clone(s.settings),accepted:clone(s.accepted),layers:clone(s.layers),scene:clone(s.scene),reviewedHidden:clone(s.reviewedHidden)};
 for(const id of layerNames)if(result.layers[id].hasResult&&['pending','working','error'].includes(result.layers[id].status)){
  result.layers[id].status='ready';for(const key of stageKeys[id])result.settings[key]=result.scene[key];
 }
 if(result.scene.layers.terrain)result.accepted={piece:true,place:true};
 return result;
}
export function createProject(){
 const s={step:0,settings:{...defaults},accepted:{piece:false,place:false},layers:Object.fromEntries(layerNames.map(id=>[id,{status:'pending',hasResult:false}])),scene:{...defaults,layers:{terrain:false,vegetation:false,transport:false,buildings:false}},strokes:[],reviewedHidden:[],tool:'navigate',density:.5,view:'perspective',job:null,conflicts:0,notice:'Comença per la mida de la peça. La vista és il·lustrativa.',lastGood:null,undo:null,changes:[]};
 s.lastGood=snapshot(s);return s;
}
export const dimensions=s=>s.settings.size.split('x').map(Number);
export function pieces(s){const [w,h]=dimensions(s);return [Math.ceil(w/s.settings.plate),Math.ceil(h/s.settings.plate)];}
export function change(s,key,value){
 if(s.job||s.settings[key]===value)return s;
 s.settings[key]=value;if(!s.changes.includes(key))s.changes.push(key);
 if(['size','plate'].includes(key))s.accepted.piece=false;
 if(['size','location','rotation'].includes(key))s.accepted.place=false;
 for(const id of impacts[key]||[])s.layers[id].status='pending';
 s.notice=['size','location','rotation'].includes(key)?'Canvis pendents. La vista vàlida i els traços es conserven fins a preparar el nou terreny.':'Canvis pendents a les capes indicades; la vista anterior es conserva.';
 return s;
}
export function confirm(s,kind){if(s.job)return s;s.accepted[kind]=true;s.changes=s.changes.filter(k=>!(kind==='piece'?['size','plate']:['location','rotation']).includes(k));s.step=kind==='piece'?1:2;s.notice=kind==='piece'?'Mida confirmada. Tria ara el territori.':'Territori confirmat. Ja pots preparar el terreny.';if(!s.scene.layers.terrain||layerNames.every(id=>!['pending','working','error'].includes(s.layers[id].status)))s.lastGood=snapshot(s);return s;}
export function canApply(s,id){return !s.job&&s.accepted.piece&&s.accepted.place&&(id==='terrain'||s.layers.terrain.status==='ready');}
export function start(s,id){if(!canApply(s,id))return false;s.job={id,before:s.layers[id].status};s.layers[id].status='working';s.notice='Canvi il·lustratiu en curs. La vista anterior continua disponible.';return true;}
export function cancel(s){if(!s.job)return s;s.layers[s.job.id].status=s.job.before;s.job=null;s.notice='Canvi cancel·lat. Es conserva la vista vàlida.';return s;}
export function fail(s){if(!s.job)return s;const id=s.job.id;s.layers[id].status='error';s.job=null;s.notice='Error de prova: no s’han pogut obtenir les dades. Es conserva la vista vàlida. Pots reintentar o recuperar els ajustos anteriors.';return s;}
function collision(s,p){return s.scene.layers.transport&&Math.abs(p.y-(.2+.6*p.x))<.065||s.scene.layers.buildings&&p.x>.57&&p.x<.82&&p.y>.36&&p.y<.68;}
export function visibleStrokePoints(s){
 let points=[];
 for(const stroke of s.strokes.filter(t=>t.location===s.scene.location)){
  if(stroke.mode==='add')points.push(...stroke.points);
  else points=points.filter(p=>!stroke.points.some(e=>Math.hypot(e.x-p.x,e.y-p.y)<.07));
 }
 return points.map(p=>({...p,hidden:collision(s,p),erased:false}));
}
export function reconcile(s){
 const hidden=visibleStrokePoints(s).filter(p=>p.hidden&&!p.erased),unreviewed=hidden.some(p=>!s.reviewedHidden.includes(`${p.lat},${p.lon}`));s.conflicts=hidden.length;
 if(s.scene.layers.vegetation&&unreviewed&&s.layers.vegetation.status!=='pending')s.layers.vegetation.status='review';
 else if(!unreviewed&&s.layers.vegetation.status==='review')s.layers.vegetation.status='ready';
 return s;
}
export function finish(s,{omit=false}={}){
 if(!s.job)return s;const id=s.job.id;s.undo={...clone(s.lastGood),label:id};
 const handled=id==='terrain'?['size','plate','location','rotation','exaggeration','detail']:id==='vegetation'?['trees','treeType']:id==='transport'?['roadRise','railRise','tunnels']:['source','height'];
 if(id==='terrain'){
  s.reviewedHidden=[];
  s.scene={...s.settings,layers:{terrain:true,vegetation:false,transport:false,buildings:false}};
  for(const other of layerNames.filter(k=>k!=='terrain'))s.layers[other]={status:'pending',hasResult:false};
 }else{
  s.scene.layers[id]=!omit;const keys=id==='vegetation'?['trees','treeType']:id==='transport'?['roadRise','railRise','tunnels']:['source','height'];
  for(const key of keys)s.scene[key]=s.settings[key];
 }
 s.layers[id]={status:omit?'omitted':'ready',hasResult:!omit};s.job=null;
 if(id==='vegetation'&&(s.layers.transport.status==='pending'||s.layers.buildings.status==='pending'))s.notice='Arbres preparats. Els traços es conservaran quan afegeixis vies i edificis.';
 else s.notice=omit?'Capa omesa. Pots incorporar-la més endavant.':'Resultat il·lustratiu preparat.';
 if(id==='buildings'&&s.scene.layers.transport&&s.layers.transport.status==='pending'&&!s.changes.some(k=>['roadRise','railRise','tunnels'].includes(k)))s.layers.transport.status='ready';
 if(['transport','buildings'].includes(id)&&s.scene.layers.vegetation&&s.layers.vegetation.status==='pending')s.layers.vegetation.status='ready';
 reconcile(s);
 if(s.layers.vegetation.status==='review')s.notice=`${s.conflicts} arbres del pinzell ocults per obstacles. Els traços es conserven; revisa’ls abans de descarregar.`;
 s.changes=s.changes.filter(key=>!handled.includes(key));s.lastGood=snapshot(s);return s;
}
export function restore(s){const keep=clone(s.strokes),step=s.step;Object.assign(s,clone(s.lastGood));s.strokes=keep;s.step=step;s.job=null;s.changes=[];reconcile(s);s.notice='Ajustos anteriors recuperats. Es conserven tots els traços del pinzell.';return s;}
export function undoLayer(s){if(!s.undo||s.job)return s;const keep=clone(s.strokes),view=s.view,step=s.step,old=s.undo;Object.assign(s,clone(old));s.strokes=keep;s.view=view;s.step=step;s.undo=null;s.job=null;s.changes=[];reconcile(s);s.lastGood=snapshot(s);s.notice='Darrer canvi de capa desfet. Els traços continuen desats.';return s;}
export function addStroke(s,points,mode='add'){
 if(s.job||s.layers.terrain.status!=='ready'||!s.scene.layers.vegetation||s.layers.vegetation.status==='pending')return s;
 const origin=locations[s.scene.location],recorded=points.map(p=>({...p,lat:origin.lat+(p.y-.5)*.0135,lon:origin.lon+(p.x-.5)*.018}));
 s.strokes.push({id:s.strokes.length+1,location:s.scene.location,mode,points:recorded});reconcile(s);s.notice='Traç il·lustratiu desat. No modifica el terreny ni les altres capes.';return s;
}
export function undoStroke(s){if(s.job)return s;s.strokes.pop();reconcile(s);s.notice='Últim traç desfet.';return s;}
export function acceptTrees(s){if(s.job||s.layers.vegetation.status!=='review')return s;s.reviewedHidden=visibleStrokePoints(s).filter(p=>p.hidden&&!p.erased).map(p=>`${p.lat},${p.lon}`);s.layers.vegetation.status='ready';s.notice='Revisió dels arbres confirmada; els traços ocults continuen desats.';s.lastGood=snapshot(s);return s;}
export const canExport=s=>!s.job&&s.accepted.piece&&s.accepted.place&&layerNames.every(id=>['ready','omitted'].includes(s.layers[id].status));
export const statusText={pending:'Pendent',working:'En curs',ready:'A punt',omitted:'Omesa',error:'Error',review:'Revisa arbres'};
