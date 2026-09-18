'use client';

import {createContext,useCallback,useContext,useEffect,useMemo,useState} from 'react';

export type ThemePreset='midnight'|'graphite'|'arctic';
export type AccentPreset='azure'|'cyan'|'violet'|'emerald';
export type Density='compact'|'comfortable'|'spacious';
export type UiPreferences={
  theme:ThemePreset;
  accent:AccentPreset;
  density:Density;
  fontScale:number;
  radius:number;
  glass:number;
  motion:boolean;
  glow:boolean;
  sidebarCollapsed:boolean;
  historyWidth:number;
  viewerWidth:number;
  detailsWidth:number;
  showCommandBar:boolean;
  showKpis:boolean;
  showTray:boolean;
  showWorkspace:boolean;
};

const DEFAULTS:UiPreferences={
  theme:'midnight',accent:'azure',density:'compact',fontScale:1,radius:8,glass:.98,motion:true,glow:false,
  sidebarCollapsed:false,historyWidth:.80,viewerWidth:1.48,detailsWidth:.80,showCommandBar:false,showKpis:true,showTray:true,showWorkspace:true
};

type Ctx={prefs:UiPreferences;set:<K extends keyof UiPreferences>(key:K,value:UiPreferences[K])=>void;patch:(value:Partial<UiPreferences>)=>void;reset:()=>void};
const UIContext=createContext<Ctx|null>(null);

const ACCENT_HUES:Record<AccentPreset,string>={azure:'207',cyan:'190',violet:'252',emerald:'155'};

export function UIProvider({children}:{children:React.ReactNode}){
  const[prefs,setPrefs]=useState<UiPreferences>(DEFAULTS);
  useEffect(()=>{
    try{const saved=localStorage.getItem('lens-ui-prefs-v6');if(saved)setPrefs({...DEFAULTS,...JSON.parse(saved)})}catch{}
  },[]);
  useEffect(()=>{
    try{localStorage.setItem('lens-ui-prefs-v6',JSON.stringify(prefs))}catch{}
    const root=document.documentElement;
    root.dataset.theme=prefs.theme;
    root.dataset.density=prefs.density;
    root.dataset.motion=prefs.motion?'on':'off';
    root.style.setProperty('--accent-hue',ACCENT_HUES[prefs.accent]);
    root.style.setProperty('--ui-font-scale',String(prefs.fontScale));
    root.style.setProperty('--radius',`${prefs.radius}px`);
    root.style.setProperty('--glass-alpha',String(prefs.glass));
    root.style.setProperty('--history-fr',`${prefs.historyWidth}fr`);
    root.style.setProperty('--viewer-fr',`${prefs.viewerWidth}fr`);
    root.style.setProperty('--details-fr',`${prefs.detailsWidth}fr`);
    root.dataset.glow=prefs.glow?'on':'off';
    root.dataset.sidebar=prefs.sidebarCollapsed?'collapsed':'expanded';
  },[prefs]);
  const set=useCallback(<K extends keyof UiPreferences>(key:K,value:UiPreferences[K])=>setPrefs(p=>({...p,[key]:value})),[]);
  const patch=useCallback((value:Partial<UiPreferences>)=>setPrefs(p=>({...p,...value})),[]);
  const reset=useCallback(()=>setPrefs(DEFAULTS),[]);
  const value=useMemo(()=>({prefs,set,patch,reset}),[prefs,set,patch,reset]);
  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI(){const c=useContext(UIContext);if(!c)throw new Error('useUI must be used inside UIProvider');return c}
