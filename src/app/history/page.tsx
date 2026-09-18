'use client';

import {useEffect,useMemo,useState} from 'react';
import {Archive,History,Info,RefreshCw} from 'lucide-react';
import {AppShell} from '@/components/AppShell';
import {TopBar} from '@/components/TopBar';
import {StatusMatrix} from '@/components/StatusMatrix';
import {LensViewer} from '@/components/LensViewer';
import {api} from '@/lib/api';
import type {DatasetSummary,InspectionResult,Sample,SystemInfo} from '@/types';

export default function HistoryPage(){
 const[info,setInfo]=useState<SystemInfo|null>(null);const[ds,setDs]=useState<DatasetSummary[]>([]);const[did,setDid]=useState('');const[samples,setSamples]=useState<Sample[]>([]);const[results,setResults]=useState<InspectionResult[]>([]);const[current,setCurrent]=useState<string|null>(null);const[channel,setChannel]=useState('h');const[map,setMap]=useState<any>({history_symbols:[]});const[msg,setMsg]=useState('');
 async function sys(){try{setInfo(await api.system())}catch(e){setMsg((e as Error).message)}}
 async function load(id?:string){try{const all=await api.datasets();setDs(all);const use=id||did||all[0]?.id||'';if(!use)return;setDid(use);const[s,r,m]=await Promise.all([api.samples(use),api.results(use),api.errorMap()]);setSamples(s.items);setResults(r.items);setMap(m);const first=s.items[0];setCurrent(c=>s.items.some(x=>x.id===c)?c:first?.id||null);if(first)setChannel(first.images.h?'h':first.images.d?'d':Object.keys(first.images)[0]||'h')}catch(e){setMsg((e as Error).message)}}
 useEffect(()=>{sys();load()},[]);
 const resultMap=useMemo(()=>new Map(results.map(r=>[r.sample_id,r])),[results]);const sample=useMemo(()=>samples.find(s=>s.id===current)||null,[samples,current]);const result=current?resultMap.get(current):undefined;const labels={...(info?.settings.channel_labels||{}),h:'High Contrast',d:'Dark Field'};
 function select(id:string){setCurrent(id);const s=samples.find(x=>x.id===id);if(s&&!s.images[channel])setChannel(s.images.h?'h':s.images.d?'d':Object.keys(s.images)[0]||'h')}
 return <AppShell><TopBar info={info} onRefresh={sys}/>
   <div className="pageHero entrance"><div><span className="eyebrowText"><History/> RING BUFFER & HISTORY</span><h2>WT History, Lens Recall & Error Symbols</h2><p>Click any lens position to recall its stored image, lens data, result and defect regions. Archive a work tray permanently or review the configured history symbols.</p></div><div className="pageActions"><select value={did} onChange={e=>load(e.target.value)}>{ds.map(d=><option value={d.id} key={d.id}>{d.name}</option>)}</select><button onClick={()=>load(did)}><RefreshCw/>Refresh</button></div></div>
   <div className="historyExperienceGrid entrance delay1"><StatusMatrix samples={samples} results={resultMap} current={current} onPick={select} onArchive={async wt=>{try{const r=await api.archiveRing(did,wt);setMsg(`WT ${wt} archived: ${r.images} images`)}catch(e){setMsg((e as Error).message)}}}/><LensViewer datasetId={did} sample={sample} channel={channel} defects={result?.defects||[]} onChannel={setChannel} labels={labels}/><section className="glassPanel legendPanel"><div className="panelHead compact"><div><span className="eyebrowText">ICON EXPLANATION</span><h2>History symbols</h2><p>Configured result categories</p></div><Info/></div><div className="historySelection">{sample?<><span className={`historyResult ${(result?.status||'IDLE').toLowerCase()}`}>{result?.status||'NOT INSPECTED'}</span><b>{sample.metadata.code||sample.base_name}</b><small>WT {sample.wt_index} · Position {sample.position} · {sample.category}</small></>:<span>No lens selected</span>}</div><div className="symbolList compactSymbols">{map.history_symbols?.map((x:any)=><div key={x.key}><i style={{background:x.color}}>{x.symbol}</i><span><b>{x.label}</b><small>{x.key}</small></span></div>)}</div><div className="infoCallout"><Archive/><span><b>Ring-buffer archive</b><small>Archiving copies all images for the selected WT into the permanent archive. The source dataset is never modified.</small></span></div></section></div>
   {msg&&<button className="toast" onClick={()=>setMsg('')}>{msg}</button>}
 </AppShell>
}
