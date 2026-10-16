# Fred the Santa

A Christmas website for Fred Berg, built with **standard Next.js App Router, React, and TypeScript**, ready to import into Vercel using the **Next.js preset**.

- Repository: https://github.com/Milad-fotoohnejad/Fred_The_Santa
- Runtime: Node.js 24
- Database: Neon Postgres with Drizzle ORM
- Image uploads: public Vercel Blob store
- Administrator authentication: Clerk, with an explicit user-ID allowlist

The visual design, reusable sample Santa image, weekly calendar, gallery, booking request flow, and management UI are retained. The original Vinext / Cloudflare D1 / R2 / Sites authentication runtime has been replaced.

## Current readiness

The website can build and deploy **without service credentials**. In this initial state it displays sample content, shows “Booking requests open soon,” and denies management API access. It never pretends an unsaved request was accepted.

Database-backed requests, content editing, photo uploads, and administrator sign-in require the service connections described below. These external accounts/resources are not created by cloning or building this repository.

Fred controls available hours and private time blocks in the dashboard. Customer requests are checked against those hours, confirmed bookings, and public appearances. Approval reserves the time with transaction-protected overlap checks. Email/SMS notifications and payments are not implemented; admins must contact guests directly.

## Import into Vercel

1. Create a Vercel project and import `Milad-fotoohnejad/Fred_The_Santa`.
2. Select **Next.js** as the framework preset.
3. Use the repository root (`./`) as the Root Directory.
4. Use Node.js **24.x**. The project declares this in `package.json` and `.nvmrc`.
5. Use `pnpm install --frozen-lockfile` as Install Command and `pnpm build` as Build Command. These are also declared in `vercel.json`.
6. Leave Output Directory at the Next.js default; do not use `dist` or configure a static export.
7. The first deployment may have no environment variables. It will display the sample website with bookings closed.

Connect the services in the next section to activate the backend. This repository does not automatically provision paid resources or run schema migrations during builds.

After connecting the repository in Vercel, pushes to its configured production branch can deploy through Vercel's Git integration. The old ChatGPT Sites preview is a separate deployment and is not updated by this migration.

## Connect the backend

### 1. Neon Postgres

Connect a Neon database through the Vercel Marketplace / Storage settings and make its `DATABASE_URL` available to the appropriate Vercel environments. Use a separate development/preview database or Neon branch when testing; local tests against a production connection affect production records.

For local use, put that connection string in `.env.local`. If using the Vercel CLI with the correct project already linked, `vercel env pull .env.local` can retrieve the development environment values. Do not commit this file.

Apply the initial Postgres migration explicitly:

```sh
pnpm db:migrate
```

The script loads `.env.local` through Next's environment loader. Drizzle records applied migrations, so subsequent successful runs skip those migrations. Do not edit an already applied migration. If a migration fails partway, inspect the database and migration state before retrying.

### 2. Clerk administrator authentication

Connect Clerk and configure these environment variables:

```dotenv
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_publishable_key
CLERK_SECRET_KEY=your_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/manage
ADMIN_USER_IDS=user_your_clerk_user_id
```

Create or invite the intended administrator in Clerk. Obtain the user's `user_...` ID from the Clerk dashboard, or sign in and visit `/manage`: unauthorized signed-in users see their own ID. Add Fred's and/or your IDs to `ADMIN_USER_IDS`, separated by commas, and redeploy after changing hosted environment variables.

Use the Clerk instance and domain configuration appropriate to the deployment; use production keys for the final public production app. Do not paste secret keys into chat, source code, or `NEXT_PUBLIC_` variables.

Signing in does **not** grant administration by itself. Every management read/write and upload checks the allowlist server-side. No ChatGPT authentication headers are trusted, and the old `ALLOW_PRIVATE_PREVIEW_ADMIN` switch is no longer supported. Local development uses Clerk too; there is no mock-admin bypass.

### 3. Vercel Blob

Create a **public** Blob store and connect it to the project. A public store is appropriate for this public gallery; never upload confidential photos or booking records into it.

The SDK supports a connected store's `BLOB_STORE_ID` with hosted OIDC authentication, or `BLOB_READ_WRITE_TOKEN`. Vercel Functions provide OIDC through the request context; the token does not need to appear in environment-variable settings. Let the SDK retrieve it automatically. Keep the default `BLOB` variable prefix and redeploy after connecting the store. For ordinary local development, use the read/write token in `.env.local`.

The management page accepts JPG, PNG, and WebP images up to **3 MiB**. This keeps the server upload below the Vercel Function request-body limit, including multipart overhead. Larger images should be resized before upload; direct browser uploads are not part of this release.

Uploads are checked by file signature and saved with generated filenames. After uploading, click **Save changes** to update the visible website. Removing a gallery entry removes its reference but does not automatically delete the stored Blob; manage unused uploads separately in the Blob dashboard.

### 4. Enable requests deliberately

Once the database migration is applied, Clerk is configured, at least one administrator is allowed, Fred has saved available hours, and the scheduling flow has been tested:

```dotenv
BOOKINGS_ENABLED=true
```

Redeploy. The request form appears only when the flag and backend/admin configuration are present and the content database is readable. If the database cannot be read, the public page falls back to sample content and closes the form.

Before enabling this flag for real customers, finalize Fred's contact details, service area, timezone, photos, public appearances, privacy/retention policy, and a process for reviewing requests. Add public-form rate limiting or bot protection appropriate to expected traffic; this release includes input validation and a honeypot, not a complete anti-abuse system.

## Fred’s scheduling workflow

1. Open **Santa’s workshop → Availability**. Select a date and add one or more available windows. No windows means the date is closed.
2. Add **Blocked time** for travel, breaks, or personal commitments. Notes are admin-only. Save availability.
3. **Copy day** copies that day’s hours and blocks to an empty target date; it never copies visits or public appearances. Save again after copying.
4. Customers choose a date and a fixed visit length (30, 60, 90, or 120 minutes). Start choices are spaced 30 minutes apart, anchored to each window’s start; the entire visit must fit. Adjacent windows are separate—combine them to offer a visit spanning their boundary.
5. Review requests, agree pricing/location/travel with the guest, and add travel blocks before approval. Pending requests may overlap; only one conflicting request can be approved.
6. Use **Reschedule / set length** to change a pending or confirmed visit. Old “Let’s discuss” requests need a fixed length before approval. Confirmed rescheduling changes the reservation atomically. Use **Cancel visit** to release time without deleting the record.
7. Public appearances outside bookable hours still reserve their times. Samples never reserve time. Changing availability does not cancel existing confirmed visits.

All times use `America/Vancouver`, independent of browser/server timezone. Visits must finish on the same date. Nonexistent or ambiguous local times at a daylight-saving transition are rejected. There is no automatic travel buffer, external calendar sync, instant confirmation, or email delivery in this release.

All scheduling writes use a request-scoped Neon WebSocket Pool transaction and the same transaction-level advisory lock (`68410327`). The lock is obtained before reading state under READ COMMITTED. This covers requests, approvals, reschedules, cancellations, availability updates, and public appearance edits. Availability revisions, site-content hashes, and booking versions reject stale admin edits. Photo edits cannot silently overwrite another admin’s updated appearances. Do not add a new scheduling write path that bypasses this lock.

The lock coordinates this application’s writers; direct SQL changes or older deployed code must not edit scheduling data concurrently. Database credentials must remain server-side. Public availability returns only date, duration, time choices, and timezone.

### Scheduling acceptance check before opening bookings

Use a separate preview database/Neon branch for tests. Configure two allowed test-admin sessions and enable `BOOKINGS_ENABLED` only in that test environment.

- Open 10:00–14:00 on a future date and block 11:00–12:00. A one-hour request should offer 10:00, 12:00, 12:30, and 13:00.
- Save, refresh the dashboard, and verify the hours and private note persist.
- Submit two requests for 12:00. Approve them simultaneously from the two admin sessions: exactly one should succeed; the other must report a conflict.
- Try moving a public appearance or block across the confirmed visit: save must fail. Try a stale availability save in a second tab: it must ask for a reload.
- Reschedule the confirmed visit; the old time should reopen and the new one should close. Cancel it and confirm the time reopens.
- Inspect `/api/availability?date=YYYY-MM-DD&duration=1%20hour`: no names, contact details, addresses, or block notes may appear. Anonymous `/api/schedule` must return 403.
- Test on a phone and confirm no automatic email is promised. Remove test data before launch.

## Run locally

If you cloned the original Cloudflare version, first commit or stash your own changes, then pull this migration. Existing `.wrangler` data is not used or deleted. The old `.dev.vars` file is not used; the new runtime reads `.env.local`.

```sh
git pull --ff-only
nvm install
nvm use
npm install -g pnpm@11.25.0
pnpm install --frozen-lockfile
cp -n .env.example .env.local
pnpm dev
```

Open http://localhost:3000. Leave the terminal running. Stop with Ctrl+C.

If nvm is not installed, install Node.js 24 using your preferred Node manager, then continue with pnpm. On Windows, copy `.env.example` to `.env.local` using File Explorer or PowerShell rather than the `cp` command.

No database is necessary to preview the sample public pages. To test saving requests or managing content, configure `.env.local`, run `pnpm db:migrate`, and restart the development server. Visit `/sign-in`, then `/manage` for administration.

### Commands

| Command | Purpose |
|---|---|
| `pnpm dev` | Next.js development server with hot reload, port 3000 |
| `pnpm build` | Standard Next.js production build |
| `pnpm start` | Serve the completed production build locally |
| `pnpm typecheck` | TypeScript checks |
| `pnpm test` | Configuration, authorization policy, validation, upload-signature, calendar, and migration checks |
| `pnpm db:generate` | Generate Postgres migrations after editing `db/schema.ts` |
| `pnpm db:migrate` | Apply pending migrations to the configured Neon database |

Do not run the old Wrangler database command or use the old port 5173 instructions.

## Environment reference

Copy `.env.example` to `.env.local` for local work. Add hosted values in the Vercel project environment settings and redeploy when they change.

| Variable | Purpose | Required for |
|---|---|---|
| `DATABASE_URL` | Neon Postgres connection string | Requests and editable content |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk client identifier | Admin sign-in |
| `CLERK_SECRET_KEY` | Clerk server credential | Server identity verification |
| `ADMIN_USER_IDS` | Comma-separated Clerk user IDs | Admin authorization |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` | Clerk routing |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL` | `/manage` | Post-sign-in destination |
| `BLOB_READ_WRITE_TOKEN` | Blob read/write credential | Uploads, unless hosted OIDC is configured |
| `BLOB_STORE_ID`, `VERCEL_OIDC_TOKEN` | Connected hosted Blob credentials | Alternative hosted upload authentication |
| `BOOKINGS_ENABLED` | Defaults to false; set exactly `true` | Opening the booking form |

Only the Clerk publishable key and routing URLs are intentionally public. Keep credentials and connection strings out of Git. The example file contains no working secrets.

## Content and images

- Initial content is in `lib/content.ts`; saved workshop content overrides those defaults.
- One AI-generated generic Santa photo is reused at `public/images/santa-placeholder.webp`. It is not a photograph of Fred.
- The main portrait is shared by the hero and Meet Fred sections. Gallery entries can be replaced individually.
- Sample appearances stay in the admin editor but are hidden from the public calendar and do not block bookings. Uncheck Sample only for confirmed public events.
- Times use `America/Vancouver` (Pacific) provisionally. Change `TIMEZONE` and the visible Pacific labels together if Fred operates elsewhere.
- Image paths are restricted to local `/images/` files or HTTPS public Vercel Blob URLs.

## Architecture and data

| Path | Responsibility |
|---|---|
| `app/components/Home.tsx` | Public design, calendar, gallery |
| `app/components/BookingForm.tsx` | Closed/open booking state and request receipt |
| `app/components/Workshop.tsx` | Request review, rescheduling/cancellation, appearances, and photos |
| `app/components/AvailabilityEditor.tsx` | Daily available windows, private blocks, copy day, and private agenda |
| `lib/scheduling.ts`, `lib/schedule-store.ts` | Pacific time rules, slot calculations, and transaction-protected scheduling |
| `app/manage`, `app/sign-in` | Admin sign-in and access-controlled UI |
| `proxy.ts` | Clerk session integration for Next.js |
| `lib/config.ts`, `lib/server.ts` | Configuration, allowlist checks, and content access |
| `db/index.ts`, `db/schema.ts` | Lazy Neon connection and Postgres schema |
| `drizzle/`, `scripts/migrate.mjs` | Schema migrations and explicit migration runner |
| `vercel.json` | Next.js import/build settings |

| Endpoint | Method | Behaviour |
|---|---|---|
| `/api/bookings` | POST | Validated, same-origin request saved as pending when enabled |
| `/api/content` | GET | Public content or initial sample fallback |
| `/api/admin` | GET / PUT | Admin-only request review and content updates |
| `/api/photos` | POST | Admin-only upload to public Vercel Blob |
| `/api/availability` | GET | Public time choices for a date and visit length; no private details |
| `/api/schedule` | GET / PUT | Admin-only availability, private agenda, and revision-checked updates |

The `bookings` table stores contact details, requested date/time, visit length, event type, location, notes, status, and creation time. The `content` table stores site content in the `site` JSON row and availability in a separate `schedule` JSON row. This scheduling release needs **no new migration** after the original tables exist. The cancelled status is a text value, not a database enum change.

A pending request is not a reservation. Approval reserves its time and rejects overlaps. It does not send email, collect payment, or publish private details on the public timetable. Public appearances are added separately and also block availability. Cancelling or declining releases the reservation but keeps its record; deleting removes the row.

### Data migration from the original Site

This is a runtime/source migration, not an automatic production-data transfer. Any bookings or saved content in the original D1 database, or photos in R2, remain there. The public sample image is included in Git and needs no migration. If real records or photos were added to the old Site, export and import them explicitly before switching live traffic. Legacy `/api/photos/<id>` URLs will need replacement with Blob URLs. The prior source remains available in Git history at commit `2fa2423`.

## Troubleshooting

| Problem | Action |
|---|---|
| Node 20 / missing `node:sqlite` | Run `nvm install` and `nvm use` from this folder; Node 24 is required |
| `pnpm` not found after switching Node | Reinstall pnpm under that active Node version |
| Port 3000 busy | Use `pnpm dev -- --port 3001` and the printed URL |
| Database relation does not exist | Check `DATABASE_URL`, then run `pnpm db:migrate` |
| Form says bookings open soon | Check the flag, Neon connection/schema, Clerk keys, and admin allowlist |
| Sign-in succeeds but management is denied | Add the correct Clerk user ID to `ADMIN_USER_IDS` and redeploy/restart |
| Old ChatGPT sign-in link fails | Use `/sign-in`; Sites authentication was removed |
| Upload fails | Connect a public Blob store, check credentials, and choose a supported file below 3 MiB |
| Editing initial content has no visible effect | Existing saved content overrides defaults; edit through the workshop |
| Hosted changes are stale | Confirm the Vercel project tracks this repo/branch and the latest deployment succeeded |
| No email arrives | Notifications are not implemented; review requests in the workshop |

## Verification and remaining checks

Run `pnpm test`, `pnpm typecheck`, and `pnpm build`. The migration is checked without production credentials so the first import can succeed before provisioning services. Local HTTP checks cover public rendering, unavailable-booking responses, and rejection of unauthorized management/upload requests, including forged legacy auth headers.

Live Neon persistence, Clerk sign-in, Blob uploads, and the complete customer-to-admin flow must be verified once the real service connections are configured. No hosted service credentials or database records are included in this repository. Vercel deploys committed changes through its Git integration. Automated tests do not substitute for a signed-in live booking/approval check.

## Planned follow-up work

- Connect the chosen services and verify request → database → workshop → status updates.
- Replace sample content and finalize the client details.
- Add email notifications, retention rules, and public-form abuse controls.
- Add automatic email delivery and reminders after the scheduling flow is verified with Fred.
- Complete browser/mobile/accessibility review and connect a custom domain.
