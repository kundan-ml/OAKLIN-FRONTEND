'use client';

import {useEffect,useState} from 'react';
import {ChevronDown,CircleUserRound,Database,LogIn,Palette,RefreshCw,ShieldCheck} from 'lucide-react';
import {api} from '@/lib/api';
import type {Role,SystemInfo} from '@/types';

type DashboardStats={yieldPct:number;total:number;nokRate:number;evaluated:number};

export function TopBar({info,onRefresh,stats}:{info:SystemInfo|null;onRefresh:()=>void;stats?:DashboardStats}){
  const[now,setNow]=useState(new Date());
  const[busy,setBusy]=useState(false);
  const[open,setOpen]=useState(false);
  const[user,setUser]=useState(info?.session.username||'service.dev');
  const[role,setRole]=useState<Role>(info?.session.role||'Administrator');
  useEffect(()=>{const t=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(t)},[]);
  useEffect(()=>{if(info){setUser(info.session.username);setRole(info.session.role)}},[info]);
  const mode=info?.mode||'SETUP';
  const yieldPct=Math.max(0,Math.min(100,stats?.yieldPct||0));

  async function toggle(){setBusy(true);try{await api.setMode(mode==='AUTO'?'SETUP':'AUTO');onRefresh()}catch(e){alert((e as Error).message)}finally{setBusy(false)}}
  async function login(){setBusy(true);try{await api.login(user,role);setOpen(false);onRefresh()}finally{setBusy(false)}}

  return <header className="topBar productionTopBar premiumTopBar">
    <div className="titleGroup productionTitle premiumTitleGroup">
      <div className="titleIcon apertureLogo" aria-hidden><span/><span/><span/><span/><span/><span/></div>
      <div className="premiumTitleText">
        <div className="premiumTitleLine"><h1>Lens Inspection Control Center</h1><span>Dashboard</span></div>
        <p>Optical Quality Inspection · Live workstation</p>
      </div>
    </div>

    <div className="premiumHeaderCenter">
      <div className="premiumMachineContext">
        <span><small>LINE</small><b>{info?.settings.line_name||'GDL6BV2'}</b></span>
        <i/>
        <span><small>STATION</small><b>{info?.settings.station_name||'Station 2'}</b></span>
      </div>
      <button className={`modePill productionMode premiumMode ${mode.toLowerCase()}`} onClick={toggle} disabled={busy} title="Switch operating mode">
        <i/><span><b>{mode}</b><small>{mode==='AUTO'?'Automatic':'Set-up'}</small></span>
      </button>
      <div className="connectionPill productionConnection premiumConnection" title="API / HALCON bridge connected"><i/><span><b>Connected</b><small><Database/> API / HALCON</small></span></div>
    </div>

    <div className="topStatus productionStatus premiumHeaderRight">
      {stats&&<>
        <div className="premiumHeaderMetric yield"><small>YIELD</small><b>{yieldPct.toFixed(1)}%</b><em>{stats.evaluated} evaluated</em></div>
        <div className="premiumHeaderMetric total"><small>LENSES</small><b>{stats.total.toLocaleString()}</b><em className={stats.nokRate>5?'dangerText':''}>{stats.nokRate.toFixed(1)}% NOK</em></div>
      </>}
      <div className="premiumHeaderMetric clock"><small>{now.toLocaleDateString(undefined,{month:'short',day:'2-digit'})}</small><b>{now.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</b><em>{now.toLocaleDateString(undefined,{weekday:'short'})}</em></div>
      <div className="userMenu">
        <button className="userButton productionUser premiumUser" onClick={()=>setOpen(v=>!v)} title="User & workstation">
          <CircleUserRound/><span><b>{info?.session.username||'Operator'}</b><small>{info?.session.role||'Production'}</small></span><ChevronDown/>
        </button>
        {open&&<div className="userPopover premiumUserPopover">
          <div className="popoverTitle"><ShieldCheck/> User & workstation</div>
          <p className="popoverHint">Development identity. Production can be replaced with Active Directory / 5-2-1 authentication.</p>
          <label>User<input value={user} onChange={e=>setUser(e.target.value)}/></label>
          <label>Role<select value={role} onChange={e=>setRole(e.target.value as Role)}><option>NoUser</option><option>Operator</option><option>Service</option><option>Administrator</option></select></label>
          <button onClick={login}><LogIn/> Apply user</button>
          <div className="userUtilityRow"><button onClick={()=>{setOpen(false);window.dispatchEvent(new Event('lens-open-customizer'))}}><Palette/>Customize UI</button><button onClick={()=>{setOpen(false);onRefresh()}}><RefreshCw/>Refresh</button></div>
        </div>}
      </div>
    </div>
  </header>
}
