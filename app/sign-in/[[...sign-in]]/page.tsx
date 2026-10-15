import { ClerkProvider, SignIn } from '@clerk/nextjs';
import { authConfigured } from '@/lib/config';
export const dynamic = 'force-dynamic';
export default function SignInPage() {
  if (!authConfigured()) return <main className="manage-shell"><h1>Admin sign-in</h1><p>Sign-in is not available yet.</p><a href="/">Back to website</a></main>;
  return <ClerkProvider><main className="manage-shell"><a href="/">← Back to the site</a><div style={{ display: 'flex', justifyContent: 'center', paddingTop: 36 }}><SignIn routing="path" path="/sign-in" forceRedirectUrl="/manage" /></div></main></ClerkProvider>;
}
