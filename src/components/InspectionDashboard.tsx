'use client';

import {useCallback,useEffect,useMemo,useState,type PointerEvent as ReactPointerEvent} from 'react';
import Link from 'next/link';
import {Archive,Camera,ChevronLeft,ChevronRight,CircleAlert,FolderOpen,Loader2,Pause,Play,RefreshCw,Settings,SlidersHorizontal,Square,Target,TriangleAlert,History,Wrench,Flag,FolderArchive,GripVertical} from 'lucide-react';
import {api,archiveUrl,previewUrl,WS_API} from '@/lib/api';
import type {DatasetSummary,InspectionResult,Job,LogRow,Sample,SystemInfo,StorageRuntime} from '@/types';
import {DatasetLoader} from './DatasetLoader';
import {LensViewer} from './LensViewer';
import {StatusMatrix} from './StatusMatrix';
import {TopBar} from './TopBar';
import {TrendChart} from './TrendChart';
import {useUI} from './UIProvider';

export function InspectionDashboard(){
 const{prefs,patch}=useUI();
 const[info,setInfo]=useState<SystemInfo|null>(null);
 const[datasets,setDatasets]=useState<DatasetSummary[]>([]);
 const[datasetId,setDatasetId]=useState('');
 const[samples,setSamples]=useState<Sample[]>([]);
 const[results,setResults]=useState<InspectionResult[]>([]);
 const[current,setCurrent]=useState<string|null>(null);
 const[channel,setChannel]=useState('h');
 const[job,setJob]=useState<Job|null>(null);
 const[logs,setLogs]=useState<LogRow[]>([]);
 const[loader,setLoader]=useState(false);
 const[busy,setBusy]=useState(false);
 const[toast,setToast]=useState('');
 const[hold,setHold]=useState(false);
 const[selectedDefect,setSelectedDefect]=useState(0);
 const[probe,setProbe]=useState<{x:number;y:number;gray:number|null}|null>(null);
 const[storage,setStorage]=useState<StorageRuntime|null>(null);
 const[errorMode,setErrorMode]=useState<'all'|'at'|'none'>('all');
 const[analyticsTab,setAnalyticsTab]=useState<'yield'|'defects'|'station'>('yield');
 const[logFilter,setLogFilter]=useState<'all'|'warning'|'error'|'system'>('all');

 const refreshSystem=useCallback(async()=>{try{const[i,s]=await Promise.all([api.system(),api.storageState()]);setInfo(i);setStorage(s)}catch(e){setToast(`Backend unavailable: ${(e as Error).message}`)}},[]);
 async function refreshDatasets(prefer?:string){try{const ds=await api.datasets();setDatasets(ds);const id=prefer||datasetId||ds[0]?.id||'';if(id){setDatasetId(id);await loadDataset(id)}}catch(e){setToast(`Could not load datasets: ${(e as Error).message}`)}}
 async function loadDataset(id:string){try{const[s,r]=await Promise.all([api.samples(id),api.results(id)]);setSamples(s.items);setResults(r.items);if(s.items.length){setCurrent(c=>s.items.some(x=>x.id===c)?c:s.items[0].id);const first=s.items[0];setChannel(first.images.h?'h':first.images.d?'d':Object.keys(first.images)[0]||'h')}}catch(e){setToast(`Dataset load failed: ${(e as Error).message}`)}}
 useEffect(()=>{refreshSystem();refreshDatasets();api.logs().then(x=>setLogs(x.items.reverse())).catch(()=>{})},[]);

 const resultMap=useMemo(()=>new Map(results.map(r=>[r.sample_id,r])),[results]);
 const sample=useMemo(()=>samples.find(s=>s.id===current)||null,[samples,current]);
 const currentResult=current?resultMap.get(current):undefined;
 const visibleDefects=useMemo(()=>errorMode==='none'?[]:(currentResult?.defects||[]).filter(d=>errorMode==='all'||(d.tolerance||'AT')==='AT'),[currentResult,errorMode]);
 const counts=useMemo(()=>results.reduce((a,r)=>{a[r.status]=(a[r.status]||0)+1;return a},{OK:0,NOK:0,WARN:0} as Record<string,number>),[results]);
 const yieldPct=results.length?counts.OK/results.length*100:0;
 const nokRate=results.length?counts.NOK/results.length*100:0;
 const wtSamples=useMemo(()=>samples.filter(s=>s.wt_index===(sample?.wt_index||1)),[samples,sample]);
 const channelLabels={...(info?.settings.channel_labels||{}),h:'High Contrast',d:'Dark Field'};
 const currentPreviewChannel=sample?.images[channel]?channel:sample?.images.h?'h':sample?.images.d?'d':Object.keys(sample?.images||{})[0]||'h';
 const filteredLogs=useMemo(()=>logs.filter(l=>logFilter==='all'||(logFilter==='system'?!['warning','error'].includes(l.level.toLowerCase()):l.level.toLowerCase()===logFilter)),[logs,logFilter]);
 const defectSummary=useMemo(()=>{const m=new Map<string,number>();results.flatMap(r=>r.defects||[]).forEach(d=>m.set(d.name,(m.get(d.name)||0)+1));return [...m.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6)},[results]);

 async function run(){if(!datasetId)return;setBusy(true);try{const j=await api.run(datasetId);setJob(j);const ws=new WebSocket(`${WS_API}/ws/jobs/${j.id}`);ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.job)setJob(m.job);if(m.result){setResults(prev=>[...prev.filter(x=>x.sample_id!==m.result.sample_id),m.result]);if(!hold){setCurrent(m.result.sample_id);setSelectedDefect(0)}}if(['completed','failed','cancelled'].includes(m.type)){api.logs().then(x=>setLogs(x.items.reverse()));api.storageState().then(setStorage)}};ws.onerror=()=>setToast('Live WebSocket disconnected. REST results remain available.')}catch(e){setToast((e as Error).message)}finally{setBusy(false)}}
 async function inspectSelected(){if(!datasetId||!sample)return;setBusy(true);try{const r=await api.inspectOne(datasetId,sample.id);setResults(p=>[...p.filter(x=>x.sample_id!==r.sample_id),r]);setSelectedDefect(0);await api.storageState().then(setStorage)}catch(e){setToast((e as Error).message)}finally{setBusy(false)}}
 async function snap(){if(!datasetId||!sample)return;try{const r=await api.snapshot(datasetId,sample.id,channel);setToast(`Lens snapshot saved: ${r.saved}`)}catch(e){setToast((e as Error).message)}}
 function select(id:string){setCurrent(id);setSelectedDefect(0);const s=samples.find(x=>x.id===id);if(s&&!s.images[channel])setChannel(s.images.h?'h':s.images.d?'d':Object.keys(s.images)[0]||'h')}
 function relative(step:number){if(!sample||!samples.length)return;const i=samples.findIndex(x=>x.id===sample.id),next=samples[(i+step+samples.length)%samples.length];select(next.id)}
 async function archiveCurrentWt(){if(!datasetId||!sample)return;try{const r=await api.archiveRing(datasetId,sample.wt_index);setToast(`WT ${sample.wt_index} archived · ${r.images} images`)}catch(e){setToast((e as Error).message)}}

 function beginResize(kind:'history'|'details',e:ReactPointerEvent<HTMLButtonElement>){
   if(window.innerWidth<1060)return;
   e.preventDefault();
   const host=e.currentTarget.parentElement;
   if(!host)return;
   const rect=host.getBoundingClientRect();
   const startX=e.clientX;
   const h0=prefs.historyWidth,v0=prefs.viewerWidth,d0=prefs.detailsWidth,total=h0+v0+d0;
   let next={historyWidth:h0,viewerWidth:v0,detailsWidth:d0};
   document.body.classList.add('is-resizing-dashboard');
   const root=document.documentElement;
   const move=(ev:PointerEvent)=>{
     const delta=(ev.clientX-startX)/Math.max(1,rect.width)*total;
     if(kind==='history'){
       const h=Math.max(.52,Math.min(1.35,h0+delta));
       const v=Math.max(.86,Math.min(2.25,v0-delta));
       next={historyWidth:h,viewerWidth:v,detailsWidth:d0};
       root.style.setProperty('--history-fr',`${h}fr`);root.style.setProperty('--viewer-fr',`${v}fr`);
     }else{
       const v=Math.max(.86,Math.min(2.25,v0+delta));
       const d=Math.max(.52,Math.min(1.35,d0-delta));
       next={historyWidth:h0,viewerWidth:v,detailsWidth:d};
       root.style.setProperty('--viewer-fr',`${v}fr`);root.style.setProperty('--details-fr',`${d}fr`);
     }
   };
   const up=()=>{document.body.classList.remove('is-resizing-dashboard');window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);patch(next)};
   window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});
 }

 return <div className="premiumDashboardPage">
   <TopBar info={info} onRefresh={refreshSystem} stats={prefs.showKpis?{yieldPct,total:samples.length,nokRate,evaluated:results.length}:undefined}/>
   <div className={`dashboardViewport ${prefs.showCommandBar?'withSource':''} ${!prefs.showTray?'withoutTray':''} ${!prefs.showWorkspace?'withoutWorkspace':''}`}>
     {prefs.showCommandBar&&<div className="sourceRibbon premiumSourceRibbon entrance"><FolderOpen/><span><small>IMAGE SOURCE</small><select value={datasetId} onChange={e=>{setDatasetId(e.target.value);loadDataset(e.target.value)}}>{datasets.length?datasets.map(d=><option value={d.id} key={d.id}>{d.name} · {d.sample_count} lenses</option>):<option value="">No dataset loaded</option>}</select></span><button onClick={()=>setLoader(true)}>Load Folder</button><button onClick={()=>refreshDatasets()} title="Refresh datasets"><RefreshCw/></button></div>}

     <div className="dashboardGrid productionDashboard premiumMainSurface entrance">
       <StatusMatrix samples={samples} results={resultMap} current={current} onPick={select} onArchive={async wt=>{try{const r=await api.archiveRing(datasetId,wt);setToast(`WT ${wt} archived · ${r.images} images`)}catch(e){setToast((e as Error).message)}}}/>
       <button className="dashboardSplitHandle" onPointerDown={e=>beginResize('history',e)} title="Drag to resize WT history and viewer"><GripVertical/></button>
       <LensViewer datasetId={datasetId} sample={sample} channel={channel} defects={visibleDefects} onChannel={setChannel} labels={channelLabels} hold={hold} onHold={()=>setHold(v=>!v)} selectedDefect={selectedDefect} onProbe={setProbe} processing={job?.status==='running'}/>
       <button className="dashboardSplitHandle" onPointerDown={e=>beginResize('details',e)} title="Drag to resize viewer and lens details"><GripVertical/></button>

       <section className="glassPanel lensInfoPanel productionPanel currentLensPanel">
         <div className="productionPanelHead lensInfoHeader"><div><h2>Current Lens</h2><p>{sample?`${sample.category} · ${channelLabels[currentPreviewChannel]||currentPreviewChannel}`:'No lens selected'}</p></div><div className="lensNav"><button onClick={()=>relative(-1)} title="Previous lens"><ChevronLeft/></button><button onClick={()=>relative(1)} title="Next lens"><ChevronRight/></button></div></div>

         <div className="premiumLensOverview">
           <div className="premiumLensPreviewWrap">
             <div className="currentLensPreview">{sample?<img src={previewUrl(datasetId,sample.id,currentPreviewChannel)} alt="Current lens preview"/>:<span>No image</span>}</div>
             <div className={`premiumResult ${currentResult?.status?.toLowerCase()||'idle'}`}><i/><span><small>RESULT</small><b>{currentResult?.status||'WAITING'}</b></span></div>
           </div>
           <div className="premiumLensMeta">
             <MetaCell label="Lens ID" value={sample?.metadata.code||sample?.base_name} wide/>
             <MetaCell label="WT" value={sample?`WT-${String(sample.wt_index).padStart(4,'0')}`:'—'}/>
             <MetaCell label="Position" value={sample?`${sample.position} / 16`:'—'}/>
             <MetaCell label="Category" value={sample?.category}/>
             <MetaCell label="Machine" value={sample?.metadata.machine}/>
             <MetaCell label="Event" value={sample?.metadata.event_id}/>
             <MetaCell label="Pixel" value={probe?`${probe.x},${probe.y} · ${probe.gray??'—'}`:'Hover image'}/>
           </div>
         </div>

         <div className="premiumLensActions">
           <button className="primary" onClick={inspectSelected} disabled={!sample||busy} title="Evaluate current lens">{busy?<Loader2 className="spin"/>:<Target/>}<span>Evaluate</span></button>
           <button onClick={snap} disabled={!sample} title="Capture lens snapshot"><Camera/><span>Snapshot</span></button>
           <button onClick={archiveCurrentWt} disabled={!sample} title="Archive current WT"><FolderArchive/><span>Archive</span></button>
           <button onClick={()=>setToast('Lens marked for operator review')} disabled={!sample} title="Mark lens for review"><Flag/><span>Review</span></button>
         </div>

         <div className="defectsHeader"><h3>Detected Defects <span>{visibleDefects.length}</span></h3><div className="errorFilter compactFilter">{(['all','at','none'] as const).map(x=><button key={x} className={errorMode===x?'active':''} onClick={()=>setErrorMode(x)}>{x==='all'?'All':x==='at'?'AT':'Hide'}</button>)}</div></div>
         <div className="defectList productionDefectList">{visibleDefects.length?visibleDefects.map((d,i)=><button className={i===selectedDefect?'defectItem selected':'defectItem'} key={`${d.name}-${i}`} onClick={()=>setSelectedDefect(i)}><i className={d.severity}/><span><b>{d.name}</b><small>{d.position_text||`${d.tolerance||'AT'} · ${(d.confidence*100).toFixed(1)}% confidence`}</small></span><em className={d.severity}>{d.severity}</em></button>):<div className="emptyState"><CircleAlert/>No visible defects</div>}</div>
       </section>
     </div>

     {prefs.showTray?<section className="glassPanel productionPanel trayPanel productionTray premiumTraySurface entrance delay1">
       <div className="productionPanelHead trayHeader"><div><h2>Current WT <span>{sample?`WT-${String(sample.wt_index).padStart(4,'0')}`:'—'}</span></h2><p>16-position lens overview</p></div><div className="trayHeaderActions"><button onClick={()=>relative(-1)} title="Previous lens"><ChevronLeft/></button><button onClick={()=>relative(1)} title="Next lens"><ChevronRight/></button><Link href="/history">History</Link></div></div>
       <div className="trayStrip productionTrayStrip">{Array.from({length:16},(_,i)=>{const s=wtSamples.find(x=>x.position===i+1);if(!s)return <div key={i} className="trayCard placeholder"><span>{i+1}</span><small>Empty</small></div>;const r=resultMap.get(s.id),ch=s.images.h?'h':s.images.d?'d':Object.keys(s.images)[0];return <button className={`trayCard ${s.id===current?'selected':''}`} key={s.id} onClick={()=>select(s.id)}><span className="posBadge">{s.position}</span><div className="trayImage"><img src={previewUrl(datasetId,s.id,ch)} alt={`Lens position ${s.position}`}/><i/></div><div className="trayMeta"><small>{s.metadata.code||`Position ${s.position}`}</small><b className={(r?.status||'idle').toLowerCase()}>{r?.status||'WAIT'}</b></div></button>})}</div>
     </section>:<div className="dashboardModulePlaceholder"/>}

     {prefs.showWorkspace?<div className="dashboardBottomGrid premiumBottomSurface entrance delay2">
       <section className="glassPanel productionPanel analyticsPanel">
         <div className="productionPanelHead bottomPanelHead"><div><h2>Quality Overview</h2><p>Yield & inspection trend</p></div></div>
         <div className="miniTabs"><button className={analyticsTab==='yield'?'active':''} onClick={()=>setAnalyticsTab('yield')}>Yield</button><button className={analyticsTab==='defects'?'active':''} onClick={()=>setAnalyticsTab('defects')}>Defects</button><button className={analyticsTab==='station'?'active':''} onClick={()=>setAnalyticsTab('station')}>Station</button></div>
         {analyticsTab==='yield'&&<div className="analyticsBody"><TrendChart results={results}/><div className="analyticsKpis"><div className="miniYieldRing" style={{'--yield':`${Math.max(0,Math.min(100,yieldPct))*3.6}deg`} as React.CSSProperties}><b>{yieldPct.toFixed(1)}%</b></div><StatLine label="Current Yield" value={`${counts.OK} / ${results.length||0}`}/><StatLine label="NOK Rate" value={`${nokRate.toFixed(1)}%`} tone="bad"/><StatLine label="Evaluated" value={results.length.toLocaleString()}/></div></div>}
         {analyticsTab==='defects'&&<div className="defectAnalytics">{defectSummary.length?defectSummary.map(([name,count])=><div key={name}><span>{name}</span><i><b style={{width:`${Math.min(100,count/Math.max(...defectSummary.map(x=>x[1]))*100)}%`}}/></i><em>{count}</em></div>):<div className="emptyState">No defect statistics yet</div>}</div>}
         {analyticsTab==='station'&&<div className="stationOverview"><StatCard label="Mode" value={info?.mode||'—'} tone={info?.mode==='AUTO'?'good':'warn'}/><StatCard label="Bridge" value={info?.bridge||'Offline'}/><StatCard label="Storage" value={storage?.active?'ACTIVE':'OFF'} tone={storage?.active?'good':''}/><StatCard label="Dataset" value={datasets.find(d=>d.id===datasetId)?.name||'None'}/></div>}
       </section>

       <section className="glassPanel productionPanel logsPanel">
         <div className="productionPanelHead bottomPanelHead"><div><h2>System Activity</h2><p>Runtime messages</p></div><button className="smallIconAction" onClick={()=>api.logs().then(x=>setLogs(x.items.reverse()))} title="Refresh logs"><RefreshCw/></button></div>
         <div className="miniTabs logTabs"><button className={logFilter==='all'?'active':''} onClick={()=>setLogFilter('all')}>All</button><button className={logFilter==='warning'?'active':''} onClick={()=>setLogFilter('warning')}>Warnings</button><button className={logFilter==='error'?'active':''} onClick={()=>setLogFilter('error')}>Errors</button><button className={logFilter==='system'?'active':''} onClick={()=>setLogFilter('system')}>System</button></div>
         <div className="messageList productionLogs">{filteredLogs.slice(0,9).map((l,i)=><div key={`${l.time}-${i}`}><time>{new Date(l.time).toLocaleTimeString()}</time><i className={l.level.toLowerCase()}/><span>{l.message}</span></div>)}{!filteredLogs.length&&<div className="emptyState">No matching system messages</div>}</div>
       </section>

       <section className="glassPanel productionPanel quickPanel">
         <div className="productionPanelHead bottomPanelHead"><div><h2>Quick Actions</h2><p>Operator shortcuts</p></div>{job&&<span className={`jobState ${job.status}`}><i/>{job.completed}/{job.total}</span>}</div>
         <div className="quickActionGrid">
           <button className="quickTile start" onClick={run} disabled={busy||!datasetId}>{busy?<Loader2 className="spin"/>:<Play/>}<span>Start</span></button>
           <button className="quickTile stop" onClick={()=>job&&api.cancel(job.id)} disabled={!job||job.status!=='running'}><Square/><span>Stop</span></button>
           <button className={`quickTile pause ${hold?'active':''}`} onClick={()=>setHold(v=>!v)}><Pause/><span>{hold?'Resume':'Hold'}</span></button>
           <button className="quickTile" onClick={()=>setLoader(true)}><FolderOpen/><span>Load</span></button>
           <Link className="quickTile" href="/storage"><SlidersHorizontal/><span>Filters</span></Link>
           <Link className="quickTile" href="/setup"><Settings/><span>Camera</span></Link>
           <a className={`quickTile ${!datasetId?'disabled':''}`} href={datasetId?archiveUrl(datasetId):'#'}><Archive/><span>Export</span></a>
           <Link className="quickTile" href="/history"><History/><span>History</span></Link>
           <Link className="quickTile" href="/system"><Wrench/><span>Service</span></Link>
         </div>
         {job&&<div className="jobProgress productionProgress"><i style={{width:`${job.total?job.completed/job.total*100:0}%`}}/></div>}
       </section>
     </div>:<div className="dashboardModulePlaceholder"/>}
   </div>

   {toast&&<button className="toast" onClick={()=>setToast('')}><TriangleAlert/>{toast}</button>}
   <DatasetLoader open={loader} onClose={()=>setLoader(false)} onLoaded={id=>refreshDatasets(id)}/>
 </div>
}

function MetaCell({label,value,wide=false}:{label:string;value?:string|number|null;wide?:boolean}){return <div className={`premiumMetaCell ${wide?'wide':''}`}><small>{label}</small><b title={String(value||'—')}>{value||'—'}</b></div>}
function StatLine({label,value,tone='' }:{label:string;value:string;tone?:string}){return <div className={`statLine ${tone}`}><small>{label}</small><b>{value}</b></div>}
function StatCard({label,value,tone='' }:{label:string;value:string;tone?:string}){return <div className={`stationStat ${tone}`}><small>{label}</small><b>{value}</b></div>}
