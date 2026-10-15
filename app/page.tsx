import { loadPublicContent } from '@/lib/server';
import { bookingsConfigured } from '@/lib/config';
import { today } from '@/lib/content';
import Home from './components/Home';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const { site, storageReady } = await loadPublicContent();
  return <Home site={site} today={today()} bookingEnabled={storageReady && bookingsConfigured()} />;
}
