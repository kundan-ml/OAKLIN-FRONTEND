'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {Activity,Camera,ChartNoAxesCombined,Clock3,Database,FolderArchive,History,ImageIcon,Microscope,PanelTop,Settings,SlidersHorizontal,Wrench} from 'lucide-react';
const items=[
 ['/', 'Inspection',PanelTop],['/history','WT History',History],['/storage','Image Storage',FolderArchive],['/bv-test','BV Test',Microscope],['/focus','Focus / Jig',ChartNoAxesCombined],['/registration','Registration',ImageIcon],['/setup','Camera Setup',Camera],['/settings','Settings',Settings],['/system','System',Wrench]
] as const;
export function AppShell({children}:{children:React.ReactNode}){const path=usePathname();return <div className="appShell"><aside className="sideRail"><div className="brandMark"><Activity/></div><nav>{items.map(([href,label,Icon])=><Link key={href} href={href} className={`sideNav ${path===href?'active':''}`}><Icon/><span>{label}</span></Link>)}</nav><div className="railFoot"><Database/><span>v3.0</span></div></aside><main className="appMain">{children}</main></div>}
