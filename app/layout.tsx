import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Fred the Santa | A little Christmas magic',description:'Make room for a little Christmas magic. Request a Santa visit with Fred Berg, explore public appearances, and discover festive moments.',icons:{icon:'/favicon.svg'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
