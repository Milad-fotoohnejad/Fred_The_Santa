import { auth } from '@clerk/nextjs/server';
import { UserButton } from '@clerk/nextjs';
import { authConfigured, isAllowedAdmin } from '@/lib/config';
import Workshop from '../components/Workshop';
export const dynamic = 'force-dynamic';
export default async function Manage() {
  if (!authConfigured()) return <main className="manage-shell"><a href="/">← Back to the site</a><h1>Santa’s workshop</h1><p>Admin sign-in is not configured yet. Connect Clerk and set the environment variables listed in the README.</p></main>;
  const { userId } = await auth();
  if (!userId) return <main className="manage-shell"><a href="/">← Back to the site</a><h1>Santa’s workshop</h1><a className="button primary" href="/sign-in">Sign in to manage</a></main>;
  if (!isAllowedAdmin(userId)) return <main className="manage-shell"><UserButton /><h1>Access required</h1><p>You are signed in, but this account is not an administrator.</p><p>Ask the project owner to add this Clerk user ID to ADMIN_USER_IDS:</p><code>{userId}</code><p><a href="/">Back to website</a></p></main>;
  return <><div className="manage-shell" style={{ paddingBottom: 0, paddingTop: 20 }}><UserButton /></div><Workshop /></>;
}
