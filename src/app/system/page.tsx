'use client';
import {useEffect,useState} from 'react';
import {BookOpen,CheckCircle2,CircleAlert,FolderTree,Info,RefreshCw,ServerCog,ShieldCheck} from 'lucide-react';
import {AppShell} from '@/components/AppShell';
import {TopBar} from '@/components/TopBar';
import {api,manualUrl} from '@/lib/api';
import type {LogRow,SystemInfo} from '@/types';

const roleMatrix=[
 ['NoUser','Production view, WT history, basic image filter / storage'],
 ['Operator','Operator functions and production workflow controls'],
 ['Service','Set-up, registration, camera/focus and direct Inbox registration'],
 ['Administrator','All service functions plus protected configuration outputs']
];
export default function SystemPage(){
 const[info,setInfo]=useState<SystemInfo|null>(null),[version,setVersion]=useState<any>(null),[caps,setCaps]=useState<any[]>([]),[folders,setFolders]=useState<any>(null),[logs,setLogs]=useState<LogRow[]>([]),[msg,setMsg]=useState('');
 async function load(){try{const[i,v,c,f,l]=await Promise.all([api.system(),api.version(),api.capabilities(),api.folderStructure(),api.logs()]);setInfo(i);setVersion(v);setCaps(c);setFolders(f);setLogs(l.items.reverse())}catch(e){setMsg((e as Error).message)}}
 useEffect(()=>{load()},[]);
 return <AppShell><TopBar info={info} onRefresh={load}/>
   <div className="pageHero entrance"><div><span className="eyebrowText"><ServerCog/> SYSTEM INFORMATION</span><h2>Version, Access, Help & Capability Status</h2><p>Version information, manual access, role semantics, Inbox/Outbox folder model, system messages and production-adapter readiness.</p></div><div className="pageActions"><a href={manualUrl()} target="_blank" rel="noreferrer"><BookOpen/>Open OKLIN3 manual</a><button onClick={load}><RefreshCw/>Refresh</button></div></div>
   <div className="systemGrid entrance delay1">
     <section className="glassPanel versionCard"><div className="panelHead compact"><div><span className="eyebrowText">VERSION INFO</span><h2>Software / Parameters</h2></div><Info/></div>{version&&<dl className="versionList"><dt>Software</dt><dd>{version.software_version}</dd><dt>Library / bridge</dt><dd>{version.library_version}</dd><dt>ML active</dt><dd>{String(version.machine_learning_active)}</dd><dt>ML model</dt><dd>{version.ml_model_id}</dd><dt>SmartCuvetteMemory</dt><dd>{String(version.smart_cuvette_memory_active)}</dd><dt>Last registration</dt><dd>{version.last_registration}</dd><dt>Lookup table</dt><dd>{version.lookup_table}</dd>{Object.entries(version.parameter_versions||{}).map(([k,v])=><span className="versionPair" key={k}><b>{k}</b><em>{String(v)}</em></span>)}</dl>}</section>
     <section className="glassPanel capabilityCard"><div className="panelHead compact"><div><span className="eyebrowText">MANUAL FEATURE COVERAGE</span><h2>Frontend / adapter capability map</h2></div><CheckCircle2/></div><div className="capabilityList">{caps.map(c=><div key={c.id}><i className={c.implemented?'ok':'pending'}>{c.implemented?<CheckCircle2/>:<CircleAlert/>}</i><span><b>{c.title}</b><small>{c.notes}</small></span><em>{c.mode}</em></div>)}</div></section>
     <section className="glassPanel accessCard"><div className="panelHead compact"><div><span className="eyebrowText">ACCESS PERMISSIONS</span><h2>Operator role model</h2><p>Matches the NoUser / Operator / Service / Administrator workflow.</p></div><ShieldCheck/></div><div className="roleMatrix">{roleMatrix.map(([role,detail],i)=><div key={role}><i>{i+1}</i><span><b>{role}</b><small>{detail}</small></span><em className={info?.session.role===role?'current':''}>{info?.session.role===role?'Current':''}</em></div>)}</div></section>
     <section className="glassPanel folderCard"><div className="panelHead compact"><div><span className="eyebrowText">FOLDER STRUCTURE</span><h2>Inbox / Outbox / Local Settings</h2></div><FolderTree/></div><div className="folderList">{folders?.folders?.map((f:any)=><div key={f.name}><b>{f.name}</b><span>{f.purpose}</span></div>)}</div></section>
     <section className="glassPanel systemLogCard wideSystem"><div className="panelHead compact"><div><span className="eyebrowText">SYSTEM MESSAGES</span><h2>Timestamped system log</h2><p>Internal flow messages, warnings and inspection events.</p></div></div><div className="messageList tall">{logs.map((l,i)=><div key={i}><time>{new Date(l.time).toLocaleString()}</time><i className={l.level}/><span>{l.message}</span></div>)}{!logs.length&&<div className="emptyState">No system messages</div>}</div></section>
   </div>{msg&&<button className="toast" onClick={()=>setMsg('')}>{msg}</button>}
 </AppShell>
}
