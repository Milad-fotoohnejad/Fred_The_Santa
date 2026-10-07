import { isAdmin } from '@/lib/server';
import { getChatGPTUser,chatGPTSignInPath } from '@/app/chatgpt-auth';
import Workshop from '../components/Workshop';
export const dynamic='force-dynamic';
export default async function Manage(){if(!await isAdmin()){const user=await getChatGPTUser();return <main className="manage-shell"><a href="/">← Back to the site</a><h1>Santa’s workshop</h1>{user?<><p>This account does not have management access.</p><p>Your account ID for the site administrator: <code>{user.userId}</code></p></>:<a className="button primary" href={chatGPTSignInPath('/manage')} target="_top">Sign in to manage</a>}</main>;}return <Workshop/>;}
