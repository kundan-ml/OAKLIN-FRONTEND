import './globals.css';
import {ClientProviders} from '@/components/ClientProviders';
export const metadata={title:'Lens Inspection Control Center v6',description:'Classic premium 100vh production workstation for optical contact lens inspection and OKLIN3-compatible workflows'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><ClientProviders>{children}</ClientProviders></body></html>}
