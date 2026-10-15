import { ClerkProvider } from '@clerk/nextjs';
import { authConfigured } from '@/lib/config';
export default function ManageLayout({ children }: { children: React.ReactNode }) {
  return authConfigured() ? <ClerkProvider>{children}</ClerkProvider> : children;
}
