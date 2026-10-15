import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse, type NextRequest, type NextFetchEvent } from 'next/server';
import { authConfigured } from './lib/config';
const authenticate = clerkMiddleware();
export default function proxy(request: NextRequest, event: NextFetchEvent) {
  // Public pages can deploy before Clerk is connected. Admin handlers deny access independently.
  if (!authConfigured()) return NextResponse.next();
  return authenticate(request, event);
}
export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|txt|map)).*)', '/(api|trpc)(.*)'],
};
