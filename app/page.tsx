import { readContent } from '@/lib/server';
import Home from './components/Home';
import { today } from '@/lib/content';
export const dynamic='force-dynamic';
export default async function Page(){const site=await readContent();return <Home site={site}today={today()}/>;}
