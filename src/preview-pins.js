import {DoubleSide,Group,Mesh,MeshBasicMaterial,RingGeometry,Vector3} from 'three';
import './preview-pins.css';

export function createPreviewPins(view,scene,camera,{onSelect,onRemove}){
  const document=view.ownerDocument;
  const layer=document.createElement('div');
  layer.className='preview-pin-layer';
  view.append(layer);
  const rings=new Group(),geometry=new RingGeometry(.66,1,32);
  const normal=new MeshBasicMaterial({color:0xae432e,side:DoubleSide,depthTest:false,depthWrite:false});
  const selected=normal.clone();
  selected.color.setHex(0xe27639);
  scene.add(rings);
  const markers=new Map(),projected=new Vector3(),inCamera=new Vector3();
  let hovering=null,disabled=false;

  function add(id,point,{number,label,removeLabel}){
    const ring=new Mesh(geometry,normal);
    ring.position.copy(point);
    ring.renderOrder=6;
    rings.add(ring);

    const area=document.createElement('div'),choose=document.createElement('button'),remove=document.createElement('button');
    area.className='preview-pin';
    area.dataset.previewPin=String(id);
    area.hidden=true;
    choose.type=remove.type='button';
    choose.className='preview-pin-number';
    remove.className='preview-pin-remove';
    choose.textContent=number;
    remove.textContent='×';
    choose.setAttribute('aria-label',label);
    remove.setAttribute('aria-label',removeLabel);
    remove.title=removeLabel;
    choose.disabled=remove.disabled=disabled;
    choose.onclick=()=>onSelect(id);
    remove.onclick=()=>onRemove(id);
    area.addEventListener('pointerenter',event=>{if(event.pointerType!=='touch')hovering=id;});
    area.addEventListener('pointerleave',()=>{if(hovering===id)hovering=null;});
    area.append(choose,remove);
    layer.append(area);
    markers.set(id,{ring,area,choose,remove});
  }

  function render(visible){
    rings.visible=visible;
    layer.hidden=!visible;
    if(!visible||!markers.size)return;
    const {clientWidth:width,clientHeight:height}=view;
    if(!width||!height)return;
    camera.updateMatrixWorld();
    for(const {ring,area} of markers.values()){
      projected.copy(ring.position).project(camera);
      const shown=projected.z>=-1&&projected.z<=1&&Math.abs(projected.x)<=1&&Math.abs(projected.y)<=1;
      area.hidden=!shown;
      ring.visible=shown;
      if(!shown)continue;
      // Keep the hollow ring legible at a distance while retaining its perspective.
      inCamera.copy(ring.position).applyMatrix4(camera.matrixWorldInverse);
      const worldPerPixel=-2*inCamera.z/(camera.projectionMatrix.elements[5]*height);
      ring.scale.setScalar(Math.max(.83,worldPerPixel*8));
      const x=Math.round((projected.x+1)*width/2),y=Math.round((1-projected.y)*height/2);
      area.style.transform=`translate(${x}px,${y}px)`;
      area.classList.toggle('is-left',x>width-45);
      area.classList.toggle('is-below',y<34);
    }
  }

  return {
    element:layer,add,render,
    clear(){
      rings.clear();
      layer.replaceChildren();
      markers.clear();
      hovering=null;
    },
    select(id){
      for(const [key,{ring,area,choose}] of markers){
        ring.material=key===id?selected:normal;
        area.classList.toggle('is-selected',key===id);
        choose.setAttribute('aria-pressed',String(key===id));
      }
    },
    setDisabled(value){
      disabled=value;
      for(const {choose,remove} of markers.values())choose.disabled=remove.disabled=disabled;
    },
    interacting(){return !layer.hidden&&(hovering!==null||layer.contains(document.activeElement));},
    focusedId(){return Number(document.activeElement?.closest('.preview-pin')?.dataset.previewPin);},
    focus(id){
      const mark=markers.get(id);
      if(!mark||mark.area.hidden||mark.choose.disabled)return false;
      mark.choose.focus({preventScroll:true});
      return true;
    }
  };
}
