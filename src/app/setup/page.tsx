'use client';

import { useEffect, useState } from 'react';
import { Camera, PlugZap, Save, ScanLine } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { TopBar } from '@/components/TopBar';
import { api } from '@/lib/api';
import type { SystemInfo } from '@/types';

export default function SetupPage(){
  const[info,setInfo]=useState<SystemInfo|null>(null),[cfg,setCfg]=useState<any>(null),[msg,setMsg]=useState('');
  async function load(){const[i,c]=await Promise.all([api.system(),api.getCameraSystem()]);setInfo(i);setCfg(c)}
  useEffect(()=>{load()},[]);
  if(!cfg)return <AppShell><div className="loadingPage">Loading camera system…</div></AppShell>;
  function patch(idx:number,key:string,value:any){const cameras=[...cfg.cameras];cameras[idx]={...cameras[idx],[key]:value};setCfg({...cfg,cameras})}
  async function save(){try{setCfg(await api.saveCameraSystem(cfg));setMsg('Camera system saved to Outbox')}catch(e){setMsg((e as Error).message)}}
  return <AppShell>
    <TopBar info={info} onRefresh={load}/>
    <div className="pageHero"><div><span className="eyebrowText"><Camera/> CAMERA SYSTEM</span><h2>Camera Assignment & Triggerbox Setup</h2><p>Assign cameras by MAC address, configure image channels, ROI/exposure/gain and LED trigger parameters. Physical SDK writes are isolated behind the backend adapter.</p></div><div className="pageActions"><button className="primaryAction" onClick={save}><Save/>Save / Take over</button></div></div>
    <div className="cameraGrid">{cfg.cameras.map((c:any,i:number)=><section className={`glassPanel cameraCard ${c.assigned?'':'disabled'}`} key={c.id}>
      <div className="cameraPreview"><div className="cameraOrb"><ScanLine/></div><span>{c.display_name}</span><small>{c.assigned?c.mac_address:'Not assigned'}</small></div>
      <div className="cameraForm"><label className="switchRow"><input type="checkbox" checked={c.assigned} onChange={e=>patch(i,'assigned',e.target.checked)}/><span/>Assigned</label><Field label="Display name"><input value={c.display_name} onChange={e=>patch(i,'display_name',e.target.value)}/></Field><Field label="MAC address"><input value={c.mac_address} onChange={e=>patch(i,'mac_address',e.target.value)}/></Field><Field label="Channel"><input value={c.channel} onChange={e=>patch(i,'channel',e.target.value)}/></Field>
        <div className="miniGrid"><Num label="Exposure µs" v={c.exposure_us} set={v=>patch(i,'exposure_us',v)}/><Num label="Black level" v={c.black_level} set={v=>patch(i,'black_level',v)}/><Num label="Gain" v={c.gain} set={v=>patch(i,'gain',v)}/><Num label="Line debounce" v={c.line_debouncer_time_us} set={v=>patch(i,'line_debouncer_time_us',v)}/><Num label="Width" v={c.width} set={v=>patch(i,'width',v)}/><Num label="Height" v={c.height} set={v=>patch(i,'height',v)}/><Num label="Offset X" v={c.offset_x} set={v=>patch(i,'offset_x',v)}/><Num label="Offset Y" v={c.offset_y} set={v=>patch(i,'offset_y',v)}/></div>
        <div className="triggerStrip"><PlugZap/><Num label="LED channel" v={c.led_channel} set={v=>patch(i,'led_channel',v)}/><Num label="Pulse width µs" v={c.pulse_width_us} set={v=>patch(i,'pulse_width_us',v)}/><label>Current A<input type="number" step="0.05" value={c.current_a} onChange={e=>patch(i,'current_a',Number(e.target.value))}/></label></div>
      </div>
    </section>)}</div>
    {msg&&<button className="toast" onClick={()=>setMsg('')}>{msg}</button>}
  </AppShell>;
}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="field"><span>{label}</span>{children}</label>}
function Num({label,v,set}:{label:string;v:number;set:(n:number)=>void}){return <label>{label}<input type="number" value={v} onChange={e=>set(Number(e.target.value))}/></label>}
