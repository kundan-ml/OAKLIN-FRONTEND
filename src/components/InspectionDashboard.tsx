'use client';

import {useCallback,useEffect,useMemo,useRef,useState,type PointerEvent as ReactPointerEvent} from 'react';
import {
  Archive,Camera,ChevronLeft,ChevronRight,CircleAlert,Columns3,Eye,EyeOff,Flag,FolderArchive,
  FolderOpen,GripHorizontal,GripVertical,LayoutDashboard,Loader2,Maximize2,Minimize2,Pause,Play,
  RefreshCw,RotateCcw,Square,Target,TriangleAlert
} from 'lucide-react';
import {api,previewUrl,WS_API} from '@/lib/api';
import type {DatasetSummary,InspectionResult,Job,LogRow,Sample,SystemInfo,StorageRuntime} from '@/types';
import {DatasetLoader} from './DatasetLoader';
import {LensViewer} from './LensViewer';
import {StatusMatrix} from './StatusMatrix';
import {TopBar} from './TopBar';
import {TrendChart} from './TrendChart';
import {useUI} from './UIProvider';

type WorkspaceTab='quality'|'activity'|'control';

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
 const[workspaceTab,setWorkspaceTab]=useState<WorkspaceTab>('quality');
 const[logFilter,setLogFilter]=useState<'all'|'warning'|'error'|'system'>('all');
 const[focusMode,setFocusMode]=useState(false);
 const wsRef=useRef<WebSocket|null>(null);

 const refreshSystem=useCallback(async()=>{try{const[i,s]=await Promise.all([api.system(),api.storageState()]);setInfo(i);setStorage(s)}catch(e){setToast(`Backend unavailable: ${(e as Error).message}`)}},[]);
 async function refreshDatasets(prefer?:string){try{const ds=await api.datasets();setDatasets(ds);const id=prefer||datasetId||ds[0]?.id||'';if(id){setDatasetId(id);await loadDataset(id)}}catch(e){setToast(`Could not load datasets: ${(e as Error).message}`)}}
 async function loadDataset(id:string){try{const[s,r]=await Promise.all([api.samples(id),api.results(id)]);setSamples(s.items);setResults(r.items);if(s.items.length){setCurrent(c=>s.items.some(x=>x.id===c)?c:s.items[0].id);const first=s.items[0];setChannel(first.images.h?'h':first.images.d?'d':Object.keys(first.images)[0]||'h')}}catch(e){setToast(`Dataset load failed: ${(e as Error).message}`)}}
 useEffect(()=>{refreshSystem();refreshDatasets();api.logs().then(x=>setLogs(x.items.reverse())).catch(()=>{});return()=>{wsRef.current?.close();wsRef.current=null}},[]);

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
 const defectSummary=useMemo(()=>{const m=new Map<string,number>();results.flatMap(r=>r.defects||[]).forEach(d=>m.set(d.name,(m.get(d.name)||0)+1));return [...m.entries()].sort((a,b)=>b[1]-a[1]).slice(0,7)},[results]);
 const showHistory=prefs.showHistory&&!focusMode;
 const showDetails=prefs.showDetails;
 const showTray=prefs.showTray&&!focusMode;
 const showWorkspace=prefs.showWorkspace&&!focusMode;

 async function run(){
   if(!datasetId)return;
   setBusy(true);
   try{
     wsRef.current?.close();
     const j=await api.run(datasetId);setJob(j);
     const ws=new WebSocket(`${WS_API}/ws/jobs/${j.id}`);wsRef.current=ws;
     ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.job)setJob(m.job);if(m.result){setResults(prev=>[...prev.filter(x=>x.sample_id!==m.result.sample_id),m.result]);if(!hold){setCurrent(m.result.sample_id);setSelectedDefect(0)}}if(['completed','failed','cancelled'].includes(m.type)){api.logs().then(x=>setLogs(x.items.reverse())).catch(()=>{});api.storageState().then(setStorage).catch(()=>{});ws.close();if(wsRef.current===ws)wsRef.current=null}};
     ws.onerror=()=>setToast('Live inspection stream disconnected. REST results remain available.');
   }catch(e){setToast((e as Error).message)}finally{setBusy(false)}
 }
 async function stop(){if(!job||job.status!=='running')return;try{setJob(await api.cancel(job.id))}catch(e){setToast((e as Error).message)}}
 async function inspectSelected(){if(!datasetId||!sample)return;setBusy(true);try{const r=await api.inspectOne(datasetId,sample.id);setResults(p=>[...p.filter(x=>x.sample_id!==r.sample_id),r]);setSelectedDefect(0);await api.storageState().then(setStorage)}catch(e){setToast((e as Error).message)}finally{setBusy(false)}}
 async function snap(){if(!datasetId||!sample)return;try{const r=await api.snapshot(datasetId,sample.id,channel);setToast(`Lens snapshot saved: ${r.saved}`)}catch(e){setToast((e as Error).message)}}
 async function archiveCurrentWt(){if(!datasetId||!sample)return;try{const r=await api.archiveRing(datasetId,sample.wt_index);setToast(`WT ${sample.wt_index} archived · ${r.images} images`)}catch(e){setToast((e as Error).message)}}
 async function toggleStorage(){try{setStorage(storage?.active?await api.storageStop():await api.storageStart())}catch(e){setToast((e as Error).message)}}
 function select(id:string){setCurrent(id);setSelectedDefect(0);const s=samples.find(x=>x.id===id);if(s&&!s.images[channel])setChannel(s.images.h?'h':s.images.d?'d':Object.keys(s.images)[0]||'h')}
 function relative(step:number){if(!sample||!samples.length)return;const i=samples.findIndex(x=>x.id===sample.id),next=samples[(i+step+samples.length)%samples.length];select(next.id)}

 function beginResize(kind:'history'|'details',e:ReactPointerEvent<HTMLButtonElement>){
   if(window.innerWidth<1060)return;e.preventDefault();
   const host=e.currentTarget.parentElement;if(!host)return;
   const rect=host.getBoundingClientRect(),startX=e.clientX,h0=prefs.historyWidth,v0=prefs.viewerWidth,d0=prefs.detailsWidth,total=h0+v0+d0;
   let next={historyWidth:h0,viewerWidth:v0,detailsWidth:d0};
   document.body.classList.add('is-resizing-dashboard');
   const root=document.documentElement;
   const move=(ev:PointerEvent)=>{const delta=(ev.clientX-startX)/Math.max(1,rect.width)*total;if(kind==='history'){const h=Math.max(.46,Math.min(1.25,h0+delta)),v=Math.max(.82,Math.min(2.5,v0-delta));next={historyWidth:h,viewerWidth:v,detailsWidth:d0};root.style.setProperty('--history-fr',`${h}fr`);root.style.setProperty('--viewer-fr',`${v}fr`)}else{const v=Math.max(.82,Math.min(2.5,v0+delta)),d=Math.max(.48,Math.min(1.3,d0-delta));next={historyWidth:h0,viewerWidth:v,detailsWidth:d};root.style.setProperty('--viewer-fr',`${v}fr`);root.style.setProperty('--details-fr',`${d}fr`)}};
   const up=()=>{document.body.classList.remove('is-resizing-dashboard');window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);patch(next)};
   window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});
 }
 function beginBottomResize(e:ReactPointerEvent<HTMLButtonElement>){
   e.preventDefault();const startY=e.clientY,h0=prefs.bottomHeight;document.body.classList.add('is-resizing-dashboard');
   const move=(ev:PointerEvent)=>{const h=Math.max(126,Math.min(Math.min(340,window.innerHeight*.43),h0+(startY-ev.clientY)));document.documentElement.style.setProperty('--dashboard-bottom-height',`${h}px`)};
   const up=(ev:PointerEvent)=>{const h=Math.max(126,Math.min(Math.min(340,window.innerHeight*.43),h0+(startY-ev.clientY)));document.body.classList.remove('is-resizing-dashboard');window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);patch({bottomHeight:h})};
   window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});
 }
 function resetLayout(){setFocusMode(false);patch({historyWidth:.66,viewerWidth:1.52,detailsWidth:.78,bottomHeight:188,showHistory:true,showDetails:true,showTray:true,showWorkspace:true,density:'compact'})}

 const layoutClass=!showHistory&&!showDetails?'viewerOnly':!showHistory?'noHistory':!showDetails?'noDetails':'';
 return <div className={`premiumDashboardPage oakWorkstationPage ${focusMode?'focusMode':''}`}>
   <TopBar workstation info={info} onRefresh={refreshSystem} stats={prefs.showKpis?{yieldPct,total:samples.length,nokRate,evaluated:results.length}:undefined}/>
   <div className="oakCommandDeck">
     <div className="oakSourceControl"><FolderOpen/><span><small>SOURCE</small><select value={datasetId} onChange={e=>{setDatasetId(e.target.value);loadDataset(e.target.value)}}>{datasets.length?datasets.map(d=><option value={d.id} key={d.id}>{d.name} · {d.sample_count}</option>):<option value="">No dataset</option>}</select></span><button onClick={()=>setLoader(true)} title="Load image folder">Load</button><button onClick={()=>refreshDatasets()} title="Refresh datasets"><RefreshCw/></button></div>
     <div className="oakDeckGroup" aria-label="Dashboard modules">
       <button className={prefs.showHistory?'active':''} onClick={()=>patch({showHistory:!prefs.showHistory})} title="Show/hide WT History">{prefs.showHistory?<Eye/>:<EyeOff/>}<span>History</span></button>
       <button className={prefs.showDetails?'active':''} onClick={()=>patch({showDetails:!prefs.showDetails})} title="Show/hide Current Lens">{prefs.showDetails?<Eye/>:<EyeOff/>}<span>Details</span></button>
       <button className={prefs.showTray?'active':''} onClick={()=>patch({showTray:!prefs.showTray})} title="Show/hide Current WT"><Columns3/><span>WT Strip</span></button>
       <button className={prefs.showWorkspace?'active':''} onClick={()=>patch({showWorkspace:!prefs.showWorkspace})} title="Show/hide bottom workspace"><LayoutDashboard/><span>Workspace</span></button>
     </div>
     <div className="oakDeckGroup oakDeckRight">
       <div className="oakDensity"><button className={prefs.density==='compact'?'active':''} onClick={()=>patch({density:'compact'})}>Compact</button><button className={prefs.density==='comfortable'?'active':''} onClick={()=>patch({density:'comfortable'})}>Normal</button></div>
       <button className={`oakFocusButton ${focusMode?'active':''}`} onClick={()=>setFocusMode(v=>!v)}>{focusMode?<Minimize2/>:<Maximize2/>}<span>{focusMode?'Restore':'Focus'}</span></button>
       <button onClick={resetLayout} title="Reset dashboard layout"><RotateCcw/><span>Reset</span></button>
     </div>
   </div>

   <div className="oakDashboardViewport">
     <div className={`dashboardGrid productionDashboard premiumMainSurface oakMainGrid ${layoutClass}`}>
       {showHistory&&<StatusMatrix samples={samples} results={resultMap} current={current} onPick={select} onArchive={async wt=>{try{const r=await api.archiveRing(datasetId,wt);setToast(`WT ${wt} archived · ${r.images} images`)}catch(e){setToast((e as Error).message)}}}/>} 
       {showHistory&&<button className="dashboardSplitHandle oakSplit" onPointerDown={e=>beginResize('history',e)} title="Drag to resize history and viewer"><GripVertical/></button>}
       <LensViewer workstation datasetId={datasetId} sample={sample} channel={channel} defects={visibleDefects} onChannel={setChannel} labels={channelLabels} hold={hold} onHold={()=>setHold(v=>!v)} selectedDefect={selectedDefect} onProbe={setProbe} processing={job?.status==='running'}/>
       {showDetails&&<button className="dashboardSplitHandle oakSplit" onPointerDown={e=>beginResize('details',e)} title="Drag to resize viewer and details"><GripVertical/></button>}
       {showDetails&&<section className="glassPanel productionPanel currentLensPanel oakDetailsPanel">
         <div className="oakPanelHead"><div><small>CURRENT LENS</small><h2>{sample?.metadata.code||sample?.base_name||'No lens selected'}</h2></div><div className="lensNav"><button onClick={()=>relative(-1)} title="Previous lens"><ChevronLeft/></button><button onClick={()=>relative(1)} title="Next lens"><ChevronRight/></button></div></div>
         <div className={`oakResultBand ${currentResult?.status?.toLowerCase()||'idle'}`}><span><i/><small>RESULT</small><b>{currentResult?.status||'WAITING'}</b></span><em>{sample?`${sample.category} · ${channelLabels[currentPreviewChannel]||currentPreviewChannel}`:'Awaiting selection'}</em></div>
         <div className="oakMetaGrid"><MetaCell label="WT" value={sample?`WT-${String(sample.wt_index).padStart(4,'0')}`:'—'}/><MetaCell label="Position" value={sample?`${sample.position} / 16`:'—'}/><MetaCell label="Type" value={sample?.category}/><MetaCell label="Machine" value={sample?.metadata.machine}/><MetaCell label="Event" value={sample?.metadata.event_id}/><MetaCell label="Pixel" value={probe?`${probe.x}, ${probe.y} · ${probe.gray??'—'}`:'Hover image'}/></div>
         <div className="oakDefectHead"><h3>Detected defects <span>{visibleDefects.length}</span></h3><div className="errorFilter compactFilter">{(['all','at','none'] as const).map(x=><button key={x} className={errorMode===x?'active':''} onClick={()=>setErrorMode(x)}>{x==='all'?'All':x==='at'?'AT':'Hide'}</button>)}</div></div>
         <div className="defectList productionDefectList oakDefectList">{visibleDefects.length?visibleDefects.map((d,i)=><button className={i===selectedDefect?'defectItem selected':'defectItem'} key={`${d.name}-${i}`} onClick={()=>setSelectedDefect(i)}><i className={d.severity}/><span><b>{d.name}</b><small>{d.position_text||`${d.tolerance||'AT'} · ${(d.confidence*100).toFixed(1)}%`}</small></span><em className={d.severity}>{d.severity}</em></button>):<div className="emptyState"><CircleAlert/>No visible defects</div>}</div>
         <div className="oakLensActions"><button className="primary" onClick={inspectSelected} disabled={!sample||busy}>{busy?<Loader2 className="spin"/>:<Target/>}<span>Evaluate</span></button><button onClick={snap} disabled={!sample}><Camera/><span>Snapshot</span></button><button className={hold?'active':''} onClick={()=>setHold(v=>!v)} disabled={!sample}><Pause/><span>{hold?'Release':'Hold'}</span></button><button onClick={archiveCurrentWt} disabled={!sample}><FolderArchive/><span>Archive</span></button><button onClick={()=>setToast('Lens marked for operator review')} disabled={!sample}><Flag/><span>Review</span></button></div>
       </section>}
     </div>

     {showTray&&<section className="oakTraySurface">
       <div className="oakTrayHead"><span><small>CURRENT WT</small><b>{sample?`WT-${String(sample.wt_index).padStart(4,'0')}`:'—'}</b></span><em>{wtSamples.length}/16 positions</em></div>
       <div className="oakTrayStrip">{Array.from({length:16},(_,i)=>{const s=wtSamples.find(x=>x.position===i+1);if(!s)return <div key={i} className="oakTrayCell empty"><b>{i+1}</b><i/></div>;const r=resultMap.get(s.id),ch=s.images.h?'h':s.images.d?'d':Object.keys(s.images)[0];return <button className={`oakTrayCell ${(r?.status||'idle').toLowerCase()} ${s.id===current?'selected':''}`} key={s.id} onClick={()=>select(s.id)} title={`Position ${s.position} · ${r?.status||'WAIT'}`}><b>{s.position}</b><img src={previewUrl(datasetId,s.id,ch)} alt={`Lens position ${s.position}`}/><span>{r?.status||'WAIT'}</span></button>})}</div>
     </section>}

     {showWorkspace&&<>
       <button className="oakHorizontalSplit" onPointerDown={beginBottomResize} title="Drag to resize bottom workspace"><GripHorizontal/></button>
       <section className="oakBottomWorkspace">
         <div className="oakWorkspaceTabs"><button className={workspaceTab==='quality'?'active':''} onClick={()=>setWorkspaceTab('quality')}>Quality</button><button className={workspaceTab==='activity'?'active':''} onClick={()=>setWorkspaceTab('activity')}>System Activity</button><button className={workspaceTab==='control'?'active':''} onClick={()=>setWorkspaceTab('control')}>Quick Control</button><span/>{job&&<em className={`jobState ${job.status}`}><i/>{job.status} · {job.completed}/{job.total}</em>}</div>
         {workspaceTab==='quality'&&<div className="oakQualityView"><div className="oakTrend"><TrendChart results={results}/></div><div className="oakQualityMetrics"><Metric label="Yield" value={`${yieldPct.toFixed(1)}%`} tone="good"/><Metric label="NOK" value={`${nokRate.toFixed(1)}%`} tone={nokRate>5?'bad':''}/><Metric label="OK" value={String(counts.OK)}/><Metric label="Warnings" value={String(counts.WARN)} tone="warn"/></div><div className="oakDefectSummary">{defectSummary.length?defectSummary.map(([name,count])=><div key={name}><span>{name}</span><i><b style={{width:`${Math.min(100,count/Math.max(...defectSummary.map(x=>x[1]))*100)}%`}}/></i><em>{count}</em></div>):<div className="emptyState">No defect statistics yet</div>}</div></div>}
         {workspaceTab==='activity'&&<div className="oakActivityView"><div className="miniTabs logTabs"><button className={logFilter==='all'?'active':''} onClick={()=>setLogFilter('all')}>All</button><button className={logFilter==='warning'?'active':''} onClick={()=>setLogFilter('warning')}>Warnings</button><button className={logFilter==='error'?'active':''} onClick={()=>setLogFilter('error')}>Errors</button><button className={logFilter==='system'?'active':''} onClick={()=>setLogFilter('system')}>System</button><button onClick={()=>api.logs().then(x=>setLogs(x.items.reverse()))}><RefreshCw/> Refresh</button></div><div className="messageList productionLogs oakLogs">{filteredLogs.slice(0,18).map((l,i)=><div key={`${l.time}-${i}`}><time>{new Date(l.time).toLocaleTimeString()}</time><i className={l.level.toLowerCase()}/><span>{l.message}</span></div>)}{!filteredLogs.length&&<div className="emptyState">No matching system messages</div>}</div></div>}
         {workspaceTab==='control'&&<div className="oakQuickControl"><button className="start" onClick={run} disabled={busy||!datasetId}><Play/><span><b>Start inspection</b><small>Run loaded dataset / stream</small></span></button><button className="stop" onClick={stop} disabled={!job||job.status!=='running'}><Square/><span><b>Stop</b><small>Cancel active inspection</small></span></button><button className={hold?'active':''} onClick={()=>setHold(v=>!v)}><Pause/><span><b>{hold?'Release lens':'Hold lens'}</b><small>Freeze current selection</small></span></button><button onClick={()=>setLoader(true)}><FolderOpen/><span><b>Load folder</b><small>Select inspection images</small></span></button><button className={storage?.active?'active':''} onClick={toggleStorage}><Archive/><span><b>{storage?.active?'Stop storage':'Start storage'}</b><small>{storage?.saved_images||0} images saved</small></span></button><button onClick={snap} disabled={!sample}><Camera/><span><b>Snapshot</b><small>Current lens / channel</small></span></button><button onClick={archiveCurrentWt} disabled={!sample}><FolderArchive/><span><b>Archive WT</b><small>Preserve current tray</small></span></button><button onClick={()=>{refreshSystem();refreshDatasets();api.logs().then(x=>setLogs(x.items.reverse())).catch(()=>{})}}><RefreshCw/><span><b>Refresh</b><small>System, datasets and logs</small></span></button></div>}
         {job&&<div className="oakJobProgress"><i style={{width:`${job.total?job.completed/job.total*100:0}%`}}/></div>}
       </section>
     </>}
   </div>

   {toast&&<button className="toast oakToast" onClick={()=>setToast('')}><TriangleAlert/>{toast}</button>}
   <DatasetLoader open={loader} onClose={()=>setLoader(false)} onLoaded={id=>refreshDatasets(id)}/>
 </div>
}

function MetaCell({label,value}:{label:string;value?:string|number|null}){return <div className="premiumMetaCell"><small>{label}</small><b title={String(value||'—')}>{value||'—'}</b></div>}
function Metric({label,value,tone='' }:{label:string;value:string;tone?:string}){return <div className={`oakMetric ${tone}`}><small>{label}</small><b>{value}</b></div>}
