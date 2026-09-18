'use client';

import { useEffect, useState } from 'react';
import { Clock3, Network, Save, ShieldCheck } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { TopBar } from '@/components/TopBar';
import { api } from '@/lib/api';
import type { SystemInfo } from '@/types';

export default function SettingsPage() {
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [v, setV] = useState<any>(null);
  const [timeouts, setTimeouts] = useState<any>(null);
  const [msg, setMsg] = useState('');
  async function load() { const [i,s,t]=await Promise.all([api.system(),api.getSettings(),api.timeoutTable()]); setInfo(i);setV(s);setTimeouts(t); }
  useEffect(()=>{load()},[]);
  if(!v) return <AppShell><div className="loadingPage">Loading settings…</div></AppShell>;
  async function save(){try{setV(await api.saveSettings(v));setTimeouts(await api.timeoutTable());setMsg('System settings saved')}catch(e){setMsg((e as Error).message)}}
  const fields:[string,string,string][]=[['Installation name','installation_name','text'],['Line name','line_name','text'],['Station name','station_name','text'],['Station index','station_index','number'],['Triggerbox IP','triggerbox_ip','text'],['PLC AMS Net ID','plc_ams_net_id','text'],['PLC port','plc_port','number'],['Autologoff (min)','autologoff_minutes','number']];
  return <AppShell>
    <TopBar info={info} onRefresh={load}/>
    <div className="pageHero"><div><span className="eyebrowText"><Network/> GENERAL SETTINGS</span><h2>System & Integration Configuration</h2><p>Service/Administrator configuration for installation identity, PLC/triggerbox connectivity, CSV/SPC storage, image format and trigger timeouts.</p></div><div className="pageActions"><button className="primaryAction" onClick={save}><Save/>Save settings</button></div></div>
    <div className="settingsGrid">
      <section className="glassPanel formCard"><CardHead title="Installation & network"/><div className="formBody twoCols">{fields.map(([label,key,type])=><Field key={key} label={label}><input type={type} value={v[key]??''} onChange={e=>setV({...v,[key]:type==='number'?Number(e.target.value):e.target.value})}/></Field>)}</div></section>
      <section className="glassPanel formCard"><CardHead title="Statistics & image storage"/><div className="formBody twoCols">
        <Field label="SPC image path"><input value={v.spc_image_path} onChange={e=>setV({...v,spc_image_path:e.target.value})}/></Field>
        <Field label="CSV interval (min)"><input type="number" value={v.csv_memory_interval_minutes} onChange={e=>setV({...v,csv_memory_interval_minutes:Number(e.target.value)})}/></Field>
        <Field label="CSV retention (min)"><input type="number" value={v.csv_retention_minutes} onChange={e=>setV({...v,csv_retention_minutes:Number(e.target.value)})}/></Field>
        <Field label="Image format"><select value={v.image_format} onChange={e=>setV({...v,image_format:e.target.value})}><option>BMP</option><option>TIF</option></select><small>TIF supports embedded metadata; BMP requires external registration data.</small></Field>
        <label className="switchRow"><input type="checkbox" checked={v.csv_memory_enabled} onChange={e=>setV({...v,csv_memory_enabled:e.target.checked})}/><span/>CSV statistics enabled</label>
      </div><div className="channelLock"><b>Filename channel mapping</b><span><code>.h.bmp</code> → High Contrast</span><span><code>.d.bmp</code> → Dark Field</span></div></section>
      <section className="glassPanel formCard wide"><div className="panelHead compact"><div><span className="eyebrowText">TRIGGER TIMEOUT</span><h2>Per-position deadline model</h2><p>Total deadline = lens trigger offset + image processing timeout.</p></div><Clock3/></div><div className="formBody twoCols compactFields"><Field label="Camera trigger pulse distance (ms)"><input type="number" value={v.camera_trigger_pulse_distance_ms} onChange={e=>setV({...v,camera_trigger_pulse_distance_ms:Number(e.target.value)})}/></Field><Field label="Image processing timeout (ms)"><input type="number" value={v.image_processing_timeout_ms} onChange={e=>setV({...v,image_processing_timeout_ms:Number(e.target.value)})}/></Field></div><div className="timeoutGrid">{timeouts?.positions?.map((x:any)=><div key={x.position}><span>{x.position}</span><small>trigger +{x.trigger_offset_ms} ms</small><b>{x.deadline_ms} ms</b></div>)}</div></section>
    </div>
    {msg&&<button className="toast" onClick={()=>setMsg('')}>{msg}</button>}
  </AppShell>;
}
function CardHead({title}:{title:string}){return <div className="panelHead compact"><div><span className="eyebrowText">CONFIGURATION</span><h2>{title}</h2></div><ShieldCheck/></div>}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="field"><span>{label}</span>{children}</label>}
