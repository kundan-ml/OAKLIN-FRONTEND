'use client';

import {useCallback,useEffect,useRef,useState} from 'react';
import {Crosshair,Focus,Maximize2,Minus,MousePointer2,Plus,RotateCcw,ScanSearch} from 'lucide-react';
import type {Defect} from '@/types';

type Probe={x:number;y:number;gray:number|null};
type Props={imageUrl:string;defects:Defect[];selectedDefect?:number;showDefects?:boolean;showCrosshair?:boolean;onProbe?:(p:Probe)=>void};
type View={scale:number;x:number;y:number};

export function InspectionCanvas({imageUrl,defects,selectedDefect=0,showDefects=true,showCrosshair=true,onProbe}:Props){
 const host=useRef<HTMLDivElement>(null);const canvas=useRef<HTMLCanvasElement>(null);const source=useRef<HTMLImageElement|null>(null);const pixels=useRef<HTMLCanvasElement|null>(null);const frame=useRef<number|null>(null);
 const[view,setView]=useState<View>({scale:1,x:0,y:0});const[drag,setDrag]=useState<{sx:number;sy:number;vx:number;vy:number}|null>(null);const[state,setState]=useState<'idle'|'loading'|'ready'|'error'>('idle');const[error,setError]=useState('');const[probe,setProbe]=useState<Probe|null>(null);

 const fit=useCallback(()=>{const h=host.current,i=source.current;if(!h||!i||!i.naturalWidth)return;const r=h.getBoundingClientRect();const padding=Math.max(28,Math.min(r.width,r.height)*.055);const s=Math.max(.01,Math.min((r.width-padding*2)/i.naturalWidth,(r.height-padding*2)/i.naturalHeight));setView({scale:s,x:(r.width-i.naturalWidth*s)/2,y:(r.height-i.naturalHeight*s)/2})},[]);

 useEffect(()=>{
   let revoked='';setProbe(null);setError('');
   if(!imageUrl){source.current=null;pixels.current=null;setState('idle');return}
   setState('loading');
   const controller=new AbortController();
   (async()=>{try{
     const res=await fetch(imageUrl,{cache:'no-store',signal:controller.signal});if(!res.ok)throw new Error(`Image request failed (${res.status})`);
     const blob=await res.blob();revoked=URL.createObjectURL(blob);const i=new Image();i.decoding='async';
     i.onload=()=>{source.current=i;const p=document.createElement('canvas');p.width=i.naturalWidth;p.height=i.naturalHeight;const ctx=p.getContext('2d',{willReadFrequently:true});ctx?.drawImage(i,0,0);pixels.current=p;setState('ready');requestAnimationFrame(fit)};
     i.onerror=()=>{setState('error');setError('The browser could not decode this preview image.')};i.src=revoked;
   }catch(e){if(!controller.signal.aborted){setState('error');setError(e instanceof Error?e.message:'Unable to load image')}}})();
   return()=>{controller.abort();if(revoked)URL.revokeObjectURL(revoked)};
 },[imageUrl,fit]);

 const paint=useCallback(()=>{
   const c=canvas.current,h=host.current;if(!c||!h)return;const r=h.getBoundingClientRect();if(r.width<2||r.height<2)return;const dpr=Math.min(window.devicePixelRatio||1,2);const w=Math.max(1,Math.round(r.width*dpr)),hh=Math.max(1,Math.round(r.height*dpr));if(c.width!==w||c.height!==hh){c.width=w;c.height=hh;c.style.width=`${r.width}px`;c.style.height=`${r.height}px`}
   const ctx=c.getContext('2d');if(!ctx)return;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,r.width,r.height);
   const bg=ctx.createRadialGradient(r.width*.50,r.height*.44,10,r.width*.50,r.height*.50,Math.max(r.width,r.height)*.75);bg.addColorStop(0,'#122236');bg.addColorStop(.52,'#07111c');bg.addColorStop(1,'#02060b');ctx.fillStyle=bg;ctx.fillRect(0,0,r.width,r.height);
   ctx.save();ctx.strokeStyle='rgba(112,176,222,.035)';ctx.lineWidth=1;for(let x=0;x<r.width;x+=32){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,r.height);ctx.stroke()}for(let y=0;y<r.height;y+=32){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(r.width,y);ctx.stroke()}ctx.restore();
   const i=source.current;if(!i||state!=='ready'){
     ctx.textAlign='center';ctx.fillStyle=state==='error'?'#ff8da0':'#87a1b6';ctx.font='600 13px Inter,system-ui';ctx.fillText(state==='loading'?'Loading inspection image…':state==='error'?'Image preview unavailable':'Select a lens to start inspection',r.width/2,r.height/2-4);if(state==='error'){ctx.fillStyle='#60798d';ctx.font='11px Inter,system-ui';ctx.fillText(error.slice(0,90),r.width/2,r.height/2+18)}return;
   }
   ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(i,view.x,view.y,i.naturalWidth*view.scale,i.naturalHeight*view.scale);
   if(showDefects){defects.forEach((d,index)=>{if(!d.bbox_xywh_norm)return;const[x,y,bw,bh]=d.bbox_xywh_norm;const rx=view.x+x*i.naturalWidth*view.scale,ry=view.y+y*i.naturalHeight*view.scale,rw=bw*i.naturalWidth*view.scale,rh=bh*i.naturalHeight*view.scale;const selected=index===selectedDefect;const color=d.severity==='critical'?'#ff4968':d.severity==='major'?'#ff6b57':'#ffbd4a';ctx.save();ctx.strokeStyle=color;ctx.lineWidth=selected?3:1.8;ctx.setLineDash(selected?[]:[6,5]);ctx.shadowColor=color;ctx.shadowBlur=selected?16:5;ctx.strokeRect(rx,ry,rw,rh);ctx.shadowBlur=0;ctx.fillStyle='rgba(3,8,14,.84)';const label=`${d.name} · ${Math.round(d.confidence*100)}%`;ctx.font='600 11px Inter,system-ui';const tw=ctx.measureText(label).width;ctx.fillRect(rx,Math.max(2,ry-22),tw+13,18);ctx.fillStyle=color;ctx.fillText(label,rx+6,Math.max(15,ry-9));ctx.restore()})}
   if(showCrosshair){const cx=view.x+i.naturalWidth*view.scale/2,cy=view.y+i.naturalHeight*view.scale/2;ctx.save();ctx.strokeStyle='rgba(81,188,255,.78)';ctx.lineWidth=1;ctx.setLineDash([7,7]);ctx.beginPath();ctx.moveTo(cx-90,cy);ctx.lineTo(cx+90,cy);ctx.moveTo(cx,cy-90);ctx.lineTo(cx,cy+90);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.arc(cx,cy,8,0,Math.PI*2);ctx.stroke();ctx.restore()}
 },[defects,error,selectedDefect,showCrosshair,showDefects,state,view]);

 useEffect(()=>{if(frame.current)cancelAnimationFrame(frame.current);frame.current=requestAnimationFrame(paint);return()=>{if(frame.current)cancelAnimationFrame(frame.current)}},[paint]);
 useEffect(()=>{const h=host.current;if(!h)return;const ro=new ResizeObserver(()=>{paint();if(state==='ready'&&source.current){}});ro.observe(h);return()=>ro.disconnect()},[paint,state]);

 function zoomAt(factor:number,cx?:number,cy?:number){const h=host.current,i=source.current;if(!h||!i)return;const rect=h.getBoundingClientRect(),px=cx??rect.width/2,py=cy??rect.height/2;setView(v=>{const ns=Math.max(.025,Math.min(12,v.scale*factor));const ix=(px-v.x)/v.scale,iy=(py-v.y)/v.scale;return{scale:ns,x:px-ix*ns,y:py-iy*ns}})}
 function wheel(e:React.WheelEvent){e.preventDefault();const rect=e.currentTarget.getBoundingClientRect();zoomAt(e.deltaY<0?1.13:.885,e.clientX-rect.left,e.clientY-rect.top)}
 function pointerDown(e:React.PointerEvent){if(e.button!==0)return;e.currentTarget.setPointerCapture(e.pointerId);setDrag({sx:e.clientX,sy:e.clientY,vx:view.x,vy:view.y})}
 function updateProbe(e:React.PointerEvent){const h=host.current,i=source.current,p=pixels.current;if(!h||!i||!p||state!=='ready')return;const r=h.getBoundingClientRect(),px=e.clientX-r.left,py=e.clientY-r.top,ix=Math.floor((px-view.x)/view.scale),iy=Math.floor((py-view.y)/view.scale);if(ix<0||iy<0||ix>=i.naturalWidth||iy>=i.naturalHeight){setProbe(null);return}let gray:number|null=null;try{const d=p.getContext('2d',{willReadFrequently:true})?.getImageData(ix,iy,1,1).data;if(d)gray=Math.round(.299*d[0]+.587*d[1]+.114*d[2])}catch{}const next={x:ix,y:iy,gray};setProbe(next);onProbe?.(next)}
 function pointerMove(e:React.PointerEvent){if(drag)setView(v=>({...v,x:drag.vx+e.clientX-drag.sx,y:drag.vy+e.clientY-drag.sy}));updateProbe(e)}
 function oneToOne(){const h=host.current,i=source.current;if(!h||!i)return;const r=h.getBoundingClientRect();setView({scale:1,x:(r.width-i.naturalWidth)/2,y:(r.height-i.naturalHeight)/2})}
 function focusDefect(){const i=source.current,h=host.current,d=defects[selectedDefect];if(!i||!h||!d?.bbox_xywh_norm)return;const[x,y,w,hh]=d.bbox_xywh_norm,r=h.getBoundingClientRect();const targetW=Math.max(w*i.naturalWidth,60),targetH=Math.max(hh*i.naturalHeight,60),s=Math.min(r.width*.58/targetW,r.height*.58/targetH,8);const cx=(x+w/2)*i.naturalWidth,cy=(y+hh/2)*i.naturalHeight;setView({scale:s,x:r.width/2-cx*s,y:r.height/2-cy*s})}
 return <div className={`canvasHost canvas-${state}`} ref={host} onWheel={wheel} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={()=>setDrag(null)} onPointerCancel={()=>setDrag(null)} onPointerLeave={()=>setDrag(null)} onDoubleClick={fit}>
   <canvas ref={canvas}/><div className="scanBeam" aria-hidden/>
   <div className="canvasTools" onPointerDown={e=>e.stopPropagation()}><button onClick={()=>zoomAt(1.22)} title="Zoom in"><Plus/></button><button onClick={()=>zoomAt(.82)} title="Zoom out"><Minus/></button><button onClick={fit} title="Fit image"><RotateCcw/></button><button onClick={oneToOne} title="1:1 pixels"><ScanSearch/></button><button onClick={focusDefect} disabled={!defects[selectedDefect]?.bbox_xywh_norm} title="Focus selected defect"><Focus/></button><button onClick={()=>host.current?.requestFullscreen?.()} title="Fullscreen"><Maximize2/></button></div>
   {probe&&<div className="pixelProbe"><MousePointer2/><b>X {probe.x}</b><b>Y {probe.y}</b><b>Gray {probe.gray??'—'}</b></div>}
   <div className="canvasHint"><Crosshair/> drag to pan · wheel to zoom · double click fit</div>
   {state==='ready'&&<div className="canvasScale"><span/><b>1 mm</b></div>}
 </div>
}
