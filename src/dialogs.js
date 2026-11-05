export function initDialogs(){
  const reduce=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  async function close(dialog){
    if(!dialog.open||dialog.dataset.closing)return;
    dialog.dataset.closing='true';
    if(!reduce())await dialog.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(8px)'}],{duration:220,easing:'ease-in'}).finished.catch(()=>{});
    dialog.close();delete dialog.dataset.closing;
  }
  for(const [id,target]of [['help-open','help-dialog'],['version-open','changelog-dialog']])document.getElementById(id).onclick=()=>document.getElementById(target).showModal();
  document.querySelectorAll('[data-open]').forEach(button=>button.onclick=()=>document.getElementById(button.dataset.open).showModal());
  document.querySelectorAll('[data-close]').forEach(button=>button.onclick=()=>close(button.closest('dialog')));
  const helpGallery=document.getElementById('help-gallery');
  helpGallery.onclick=()=>{
    helpGallery.closest('dialog').close();
    const gallery=document.getElementById('projects-open');
    gallery.focus();
    gallery.click();
  };
  document.querySelectorAll('dialog').forEach(dialog=>{
    dialog.addEventListener('cancel',event=>{event.preventDefault();close(dialog);});
    dialog.onclick=event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close(dialog);};
  });
}
