function brushFrame({widthMM,heightMM,selectionPose:pose}){
  const position=JSON.stringify([pose?.center.map(value=>value.toFixed(9)),pose?.rotation]);
  const key=JSON.stringify([widthMM,heightMM,position,pose?.widthM.toFixed(5),pose?.heightM.toFixed(5)]);
  return {key,position,widthMM,heightMM,xScale:pose?.widthM/widthMM,yScale:pose?.heightM/heightMM};
}

function projectStroke({stroke,frame:source},target){
  if(source.key===target.key)return stroke;
  const xRatio=source.xScale/target.xScale,yRatio=source.yScale/target.yScale;
  const x=(stroke.x-source.widthMM/2)*xRatio+target.widthMM/2;
  const y=(stroke.y-source.heightMM/2)*yRatio+target.heightMM/2;
  // A stroke outside the model stays in the original frame for a future resize.
  if(x<-.0001||y<-.0001||x>target.widthMM+.0001||y>target.heightMM+.0001)return null;
  const radius=Math.max(.001,Math.min(30,stroke.radius*Math.sqrt(xRatio*yRatio)));
  return {...stroke,x:Math.max(0,Math.min(x,target.widthMM)),y:Math.max(0,Math.min(y,target.heightMM)),radius};
}

export function createProjectBrushHistory({breakOnClipped=false}={}){
  // Frames explicitly resized from one another share edits in their original
  // coordinates. A normal map move or rotation still gets its own history.
  const byFrame=new Map();
  let active=null;

  function syncActive(current){
    if(!active)return;
    const {frame,edits,visible}=active;
    const remaining=new Set(current);
    const removed=new Set();
    for(const [stroke,record] of visible){
      if(!remaining.has(stroke))removed.add(record);
    }
    if(removed.size)edits.records=edits.records.filter(record=>!removed.has(record));
    active.visible=new Map();
    for(const stroke of current){
      let record=visible.get(stroke);
      if(!record){
        record={stroke,frame};
        edits.records.push(record);
      }
      active.visible.set(stroke,record);
    }
  }

  return {
    resize(previousOptions,nextOptions,current){
      const previous=brushFrame(previousOptions),next=brushFrame(nextOptions);
      if(previous.key===next.key||previous.position!==next.position||
        ![previous.xScale,previous.yScale,next.xScale,next.yScale].every(scale=>scale>0&&Number.isFinite(scale)))return;
      syncActive(current);
      const edits=byFrame.get(previous.key);
      if(edits?.records.length&&next.key!==active?.frame.key)byFrame.set(next.key,edits);
    },
    prepare(options,current){
      const frame=brushFrame(options);
      if(frame.key===active?.frame.key)return {key:frame.key,strokes:current};
      syncActive(current);
      const edits=byFrame.get(frame.key)??{records:[]};
      const visible=new Map();
      let skipped=null;
      for(const record of edits.records){
        const stroke=projectStroke(record,frame);
        if(stroke){
          const separated=breakOnClipped&&skipped&&skipped.gesture===stroke.gesture&&skipped.mode===stroke.mode;
          visible.set(separated?{...stroke,breakBefore:true}:stroke,record);
          skipped=null;
        }else skipped=record.stroke;
      }
      return {key:frame.key,strokes:[...visible.keys()],frame,edits,visible};
    },
    accept(candidate,current){
      if(candidate.key===active?.frame.key)return current;
      syncActive(current);
      const {frame,edits,visible,strokes}=candidate;
      byFrame.set(frame.key,edits);
      active={frame,edits,visible};
      syncActive(strokes);
      return strokes;
    }
  };
}
