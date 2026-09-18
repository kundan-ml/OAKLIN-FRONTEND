'use client';

import {useEffect,useState} from 'react';
import {Camera,CheckCircle2,PlugZap,Save,ScanLine,TriangleAlert} from 'lucide-react';
import {AppShell} from '@/components/AppShell';
import {TopBar} from '@/components/TopBar';
import {api} from '@/lib/api';
import type {SystemInfo} from '@/types';

const CHANNELS=[['h','High Contrast (.h)'],['d','Dark Field (.d)'],['diffuse','Diffuse Light Field'],['phase','Phase Contrast']] as const;
export default function SetupPage(){
 const[info,setInfo]=useState<SystemInfo|null>(null);const[cfg,setCfg]=useState<any>(null);const[msg,setMsg]=useState('');
 async function load(){try{const[i,c]=await Promise.all([api.system(),api.getCameraSystem()]);setInfo(i);setCfg(c)}catch(e){setMsg((e as Error).message)}}
 useEffect(()=>{load()},[]);
 if(!cfg)return <AppShell><div className="loadingPage">Loading camera system…</div></AppShell>;
 function patch(idx:number,key:string,value:any){const cameras=[...cfg.cameras];cameras[idx]={...cameras[idx],[key]:value};setCfg({...cfg,cameras})}
 async function save(){try{setCfg(await api.saveCameraSystem(cfg));setMsg('Camera system settings saved to Outbox')}catch(e){setMsg((e as Error).message)}}
 return <AppShell>
   <TopBar info={info} onRefresh={load}/>
   <div className="pageHero entrance"><div><span className="eyebrowText"><Camera/> CAMERA SYSTEM</span><h2>Camera Assignment & Triggerbox Setup</h2><p>Assign cameras by MAC address, configure image channels, ROI, exposure, gain and illumination trigger parameters. High Contrast is mapped to <b>.h</b>; Dark Field is mapped to <b>.d</b>.</p></div><div className="pageActions"><button className="primaryAction" onClick={save}><Save/>Save / Take over</button></div></div>
   <div className="cameraGrid entrance delay1">{cfg.cameras.map((c:any,i:number)=><section className={`glassPanel cameraCard ${c.assigned?'':'disabled'}`} key={c.id}>
     <div className="cameraPreview"><div className="cameraOrb"><ScanLine/></div><span>{c.display_name}</span><small>{c.assigned?c.mac_address:'Camera not assigned'}</small><div className={`cameraState ${c.assigned?'ready':'offline'}`}>{c.assigned?<><CheckCircle2/>Configured</>:<><TriangleAlert/>Unassigned</>}</div></div>
     <div className="cameraForm">
       <label className="switchRow"><input type="checkbox" checked={c.assigned} onChange={e=>patch(i,'assigned',e.target.checked)}/><span/>Camera assigned</label>
       <Field label="Display name"><input value={c.display_name} onChange={e=>patch(i,'display_name',e.target.value)}/></Field>
       <Field label="MAC address"><input value={c.mac_address} onChange={e=>patch(i,'mac_address',e.target.value)} placeholder="00:30:53:…"/></Field>
       <Field label="Image channel"><select value={c.channel} onChange={e=>patch(i,'channel',e.target.value)}>{!CHANNELS.some(x=>x[0]===c.channel)&&<option value={c.channel}>{c.channel}</option>}{CHANNELS.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></Field>
       <div className="miniGrid"><Num label="Exposure µs" v={c.exposure_us} min={28} max={10000000} set={v=>patch(i,'exposure_us',v)}/><Num label="Black level" v={c.black_level} min={0} max={600} set={v=>patch(i,'black_level',v)}/><Num label="Gain" v={c.gain} min={0} max={490} set={v=>patch(i,'gain',v)}/><Num label="Line debounce µs" v={c.line_debouncer_time_us} min={0} max={100} set={v=>patch(i,'line_debouncer_time_us',v)}/><Num label="Width" v={c.width} min={1} max={2456} set={v=>patch(i,'width',v)}/><Num label="Height" v={c.height} min={1} max={2058} set={v=>patch(i,'height',v)}/><Num label="Offset X" v={c.offset_x} min={0} max={2455} set={v=>patch(i,'offset_x',v)}/><Num label="Offset Y" v={c.offset_y} min={0} max={2057} set={v=>patch(i,'offset_y',v)}/></div>
       <div className="triggerStrip"><PlugZap/><Num label="LED channel" v={c.led_channel} min={0} max={32} set={v=>patch(i,'led_channel',v)}/><Num label="Pulse width µs" v={c.pulse_width_us} min={0} max={200000} set={v=>patch(i,'pulse_width_us',v)}/><Num label="Current A" v={c.current_a} min={0} max={4} step={.05} set={v=>patch(i,'current_a',v)}/></div>
       <p className="parameterHint">ROI rule: Width/Height and Offset X/Y are coupled. Full sensor width/height requires offset 0. Production hardware validation should also enforce the camera SDK constraints.</p>
     </div>
   </section>)}</div>
   {msg&&<button className="toast" onClick={()=>setMsg('')}>{msg}</button>}
 </AppShell>;
}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="field"><span>{label}</span>{children}</label>}
function Num({label,v,set,min,max,step=1}:{label:string;v:number;set:(n:number)=>void;min:number;max:number;step?:number}){return <label>{label}<input type="number" value={v} min={min} max={max} step={step} onChange={e=>set(Number(e.target.value))}/><small>{min}–{max}</small></label>}
