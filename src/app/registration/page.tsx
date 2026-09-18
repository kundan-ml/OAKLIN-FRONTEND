'use client';

import { useEffect, useMemo, useState } from 'react';
import { Boxes, Download, RefreshCw, Save, ShieldCheck } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { TopBar } from '@/components/TopBar';
import { LensViewer } from '@/components/LensViewer';
import { api } from '@/lib/api';
import type { DatasetSummary, Sample, SystemInfo } from '@/types';

export default function RegistrationPage() {
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [ds, setDs] = useState<DatasetSummary[]>([]);
  const [did, setDid] = useState('');
  const [samples, setSamples] = useState<Sample[]>([]);
  const [sid, setSid] = useState('');
  const [channel, setChannel] = useState('h');
  const [result, setResult] = useState<any>(null);
  const [msg, setMsg] = useState('');

  async function refresh(prefer?: string) {
    const [i, d, r] = await Promise.all([api.system(), api.datasets(), api.registrationCurrent()]);
    setInfo(i); setDs(d); if (r?.transforms) setResult(r);
    const id = prefer || did || d[0]?.id || '';
    if (!id) return;
    setDid(id);
    const s = await api.samples(id); setSamples(s.items);
    const use = s.items.find(x => x.id === sid) || s.items[0];
    if (use) { setSid(use.id); setChannel(Object.keys(use.images)[0] || 'h'); }
  }
  useEffect(() => { refresh(); }, []);
  const sample = useMemo(() => samples.find(x => x.id === sid) || null, [samples, sid]);

  async function calculate() {
    try { setResult(await api.registrationRun(did, sid, 1)); setMsg('Registration calculated'); }
    catch (e) { setMsg((e as Error).message); }
  }
  async function saveOutbox() {
    try { const r = await api.registrationOutbox(); setMsg(`Saved to Outbox: ${r.saved}`); }
    catch (e) { setMsg((e as Error).message); }
  }
  async function directInbox() {
    try { const r = await api.registrationInbox(); setMsg(`Transferred to Inbox: ${r.saved}`); }
    catch (e) { setMsg((e as Error).message); }
  }

  return <AppShell>
    <TopBar info={info} onRefresh={() => refresh(did)} />
    <div className="pageHero">
      <div><span className="eyebrowText"><Boxes /> REGISTRATION</span><h2>Camera Registration & Image Scale</h2><p>Offline registration workflow for camera-head alignment, corrective transforms and µm-per-pixel scale. Save first to Outbox or transfer directly to Inbox with Service access.</p></div>
      <div className="pageActions">
        <select value={did} onChange={e => refresh(e.target.value)}>{ds.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
        <select value={sid} onChange={e => setSid(e.target.value)}>{samples.map(s => <option key={s.id} value={s.id}>{s.position} · {s.metadata.code || s.category}</option>)}</select>
        <button className="primaryAction" onClick={calculate}><RefreshCw />Register</button>
      </div>
    </div>
    <div className="registrationLayout">
      <LensViewer datasetId={did} sample={sample} channel={channel} defects={[]} onChannel={setChannel} labels={info?.settings.channel_labels || { h: 'High Contrast', d: 'Dark Field' }} />
      <section className="glassPanel regResult">
        <div className="panelHead compact"><div><span className="eyebrowText">CAMERA HEAD 1</span><h2>Corrective transforms</h2><p>Translation · rotation · scale · image scale</p></div><ShieldCheck /></div>
        {result?.transforms?.length ? <div className="transformList">{result.transforms.map((t: any) => <div key={t.channel}>
          <span className="channelBadge">{(info?.settings.channel_labels[t.channel] || t.channel).toUpperCase()}</span>
          <dl><dt>Translation X</dt><dd>{t.tx_px} px</dd><dt>Translation Y</dt><dd>{t.ty_px} px</dd><dt>Rotation</dt><dd>{t.rotation_deg}°</dd><dt>Scale</dt><dd>{t.scale}</dd><dt>Image scale</dt><dd>{t.um_per_pixel} µm/px</dd></dl>
        </div>)}</div> : <div className="largeEmpty"><Boxes /><b>No registration result</b><span>Choose stored registration images and press Register.</span></div>}
        <div className="regActions"><button onClick={saveOutbox}><Save />Save in Outbox</button><button className="warningAction" onClick={directInbox}><Download />Direct Inbox (Service)</button></div>
        <p className="noteText">Direct Inbox transfer automatically archives previous registration data and keeps the latest five backups.</p>
      </section>
    </div>
    {msg && <button className="toast" onClick={() => setMsg('')}>{msg}</button>}
  </AppShell>;
}
