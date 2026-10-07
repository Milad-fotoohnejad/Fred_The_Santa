# Fred the Santa

A responsive Christmas booking website for Fred Berg. Built with React 19, TypeScript, Vinext, Cloudflare Workers, D1 (Drizzle), and R2. The hosted review site is owner-private and uses clearly labelled sample content. The GitHub source repository is public.

- **Repository:** https://github.com/Milad-fotoohnejad/Fred_The_Santa
- **Hosted review site:** https://fred-the-santa.milad-f.chatgpt.site
- **Management area:** `/manage`

The site and this repository are separate: cloning the code does not copy hosted booking records, uploaded images, authentication sessions, or runtime secrets.

## Contents

- [Features](#features)
- [Local development](#local-development)
- [Content and images](#content-and-images)
- [Architecture](#architecture)
- [Runtime configuration](#runtime-configuration)
- [Data and request lifecycle](#data-and-request-lifecycle)
- [Before making the Site public](#before-making-the-site-public)
- [GitHub and deployment workflow](#github-and-deployment-workflow)
- [Troubleshooting](#troubleshooting)
- [Verification for this release](#verification-for-this-release)
- [Next development milestones](#next-development-milestones)
- [Image provenance](#image-provenance)

## Features

- Festive responsive home page, visit types, introduction, and FAQs.
- Weekly public appearance timetable, previous/next navigation, and directions for real entries.
- Filterable gallery with native accessible modal photo viewing.
- Booking requests stored in D1 with server-side validation and explicit pending status.
- Protected `/manage` workshop: review/approve/decline/delete requests, edit the public schedule, upload photos, change captions and categories, and replace the main portrait.
- No email notifications, payments, automatic reservations, or automated conflict prevention in this release. Approval is a manual administrative status; arrange details directly with guests first.

## Local development

Use Node.js 22.13 or newer and pnpm 11.25 (the pinned package manager in `package.json`). After cloning or extracting:

```sh
git clone https://github.com/Milad-fotoohnejad/Fred_The_Santa.git
cd Fred_The_Santa
corepack enable
pnpm install --frozen-lockfile
cp .dev.vars.example .dev.vars
pnpm build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_large_wendell_rand.sql
pnpm dev
```

If `corepack` is unavailable, install the pinned pnpm version with `npm install --global pnpm@11.25.0`, then continue with `pnpm install --frozen-lockfile`. Do not run `npm install` for project dependencies: this project uses `pnpm-lock.yaml`.

On Windows PowerShell, replace `cp .dev.vars.example .dev.vars` with `Copy-Item .dev.vars.example .dev.vars`.

Open `http://localhost:5173`. The migration command runs only once per fresh local database. Generated state is under `.wrangler/` and is not committed. The local database and uploaded photos are separate from hosted data.

The portable starter simulates ChatGPT identity on loopback only. Open `/signin-with-chatgpt?return_to=/manage` to use the local identity `local_seedy`. `.dev.vars.example` authorizes only that local identity. Production authentication is handled by Sites; the local identity simulator is excluded from production builds.

```sh
pnpm typecheck
pnpm build
```

### Useful commands

| Command | Purpose |
|---|---|
| `pnpm dev` | Start the local development server with hot reload |
| `pnpm typecheck` | Check TypeScript types without emitting files |
| `pnpm build` | Build the Cloudflare Worker and browser assets |
| `pnpm start` | Run the built Worker locally through Wrangler; does not simulate ChatGPT sign-in |
| `pnpm db:generate` | Generate a new migration after editing `db/schema.ts` |
| `pnpm lint` | Run the included ESLint configuration; not a completed verification gate for this release |

Use `pnpm install --frozen-lockfile` directly for a normal clone. The `install:ci` script is a managed Linux authoring helper and is not the portable installation command.

## Content and images

- Initial content: `lib/content.ts`. Changes in the workshop override this default through D1.
- Shared image: `public/images/santa-placeholder.webp` (AI-generated generic Santa; not a photo of Fred).
- The hero and Meet Fred portrait share `heroImage`. Gallery slots are independently replaceable.
- Upload photos from `/manage` → Photos, then click Save changes. Uploading alone does not update the visible gallery.
- All displayed times use America/Vancouver (Pacific), a provisional default. Update `TIMEZONE` in `lib/content.ts` and the visible Pacific labels together if Fred works elsewhere.
- Sample public appearances use December 18–20, 2026 and are visibly marked Sample. They are not real events.

## Architecture

| Path | Responsibility |
|---|---|
| `app/components/Home.tsx` | Public experience, calendar, gallery |
| `app/components/BookingForm.tsx` | Request form and saved receipt |
| `app/components/Workshop.tsx` | Management controls |
| `app/api/bookings` | Validated request submission |
| `app/api/admin` | Protected request and content operations |
| `app/api/photos` | Protected upload and public image reads |
| `lib/validation.ts` | Shared input and content schemas |
| `lib/server.ts` | Server-only identity and persistence helpers |
| `db/schema.ts`, `drizzle/` | Database schema and migrations |
| `.openai/hosting.json` | Sites identity and storage bindings |

No secrets are checked into the source. Keep `.dev.vars`, `.env*`, database state, and uploads out of Git. Hosted runtime variables must be configured in Sites.

## Runtime configuration

| Name | Local value | Hosted purpose |
|---|---|---|
| `ADMIN_USER_IDS` | `local_seedy` in `.dev.vars.example` | Comma-separated Site-specific authenticated user IDs allowed to manage the website |
| `ALLOW_PRIVATE_PREVIEW_ADMIN` | `false` | Temporary permission for authenticated users inside the confirmed owner-private Site; must be off before public sharing |
| `DB` | Simulated by the local Cloudflare runtime | D1 binding for booking and content records |
| `BUCKET` | Simulated by the local Cloudflare runtime | R2 binding for uploaded images |

`DB` and `BUCKET` are platform bindings, not strings to paste into `.env`. The binding names are declared in `.openai/hosting.json`. The starter configures local equivalents; Sites provisions hosted resources. No external API key is needed for this release. `.env.example` documents that fact; runtime variables belong in `.dev.vars` locally and the Site's runtime settings when hosted.

## Data and request lifecycle

The `bookings` table stores contact information, requested timing, visit length, event type, location, notes, creation time, and status. The `content` table stores the current editable website content as JSON under a single `site` record. Uploaded photos live in R2; the content record references their image endpoints.

1. A visitor submits `/api/bookings`; the server checks the input and saves a pending request.
2. The visitor receives a request reference. This is not an availability guarantee or a confirmed reservation.
3. An authorized administrator reviews it in `/manage` and contacts the guest separately.
4. The administrator marks the request approved or declined. No message is automatically sent.
5. A public calendar appearance is created separately when an event is open to visitors. Private requests never populate that calendar automatically.

Deleting a booking removes its database record. Removing a gallery item removes its reference from the gallery; it does not currently delete the underlying uploaded object from R2. Keep this distinction in mind when designing a photo retention policy.

### API map

| Endpoint | Methods | Access / role |
|---|---|---|
| `/api/bookings` | `POST` | Same-origin form submission; validated and stored as pending |
| `/api/content` | `GET` | Read published appearance and photo content |
| `/api/admin` | `GET`, `PUT` | Authorized administrators only; mutations also require same-origin requests |
| `/api/photos` | `POST` | Authorized same-origin image upload; JPG, PNG, or WebP, up to 8 MB |
| `/api/photos/[id]` | `GET` | Read uploaded images; private Site access still applies while the Site is private |

### Schema changes

Edit `db/schema.ts`, run `pnpm db:generate`, inspect the generated SQL and Drizzle metadata, and commit them together. Build again and apply each new migration once to your local D1 database using the same command pattern as initial setup, with the new SQL filename. Do not rewrite previously applied migrations. Sites applies hosted migrations during publication; local changes do not modify the hosted database.

## Before making the Site public

The first deployment is owner-private. It uses the platform’s owner-only access boundary plus authenticated identity for the workshop (`ALLOW_PRIVATE_PREVIEW_ADMIN=true`). **Before changing the Site audience:**

1. Set `ADMIN_USER_IDS` to the comma-separated Site-specific authenticated IDs for the intended administrators. IDs are available to signed-in users on `/manage` when they are not yet authorized.
2. Remove `ALLOW_PRIVATE_PREVIEW_ADMIN` or set it to `false`, then redeploy while still private. Confirm management authorization works for an explicitly allowed account.
3. Replace the sample schedule and imagery; confirm service area, timezone, pricing policy, public contact details, and privacy/retention details.
4. Connect notifications if wanted, and add public-form abuse controls before accepting broad anonymous traffic.
5. Verify the booking and management flows in a browser, then change sharing only when authorized.

Do not enable the private-preview admin switch on a public Site. Signing in alone does not make someone an administrator when the switch is off.

## GitHub and deployment workflow

Clone this repository and use normal Git branches for development:

```sh
git switch -c feature/your-change
# Edit the source, then check it.
pnpm typecheck
pnpm build
git add .
git commit -m "Describe the change"
git push -u origin feature/your-change
```

Open a pull request to `main` when ready. There is no GitHub Actions deployment pipeline configured in this release.

The hosted Site has its own versioned source repository. GitHub pushes do **not** automatically publish or synchronize that Site. To publish a local change through Sites, ask the Sites-enabled assistant to import the selected GitHub commit, preserve the project identity in `.openai/hosting.json`, run the build, synchronize the Site source, and deploy the resulting version. Likewise, ask for updated Site edits to be synchronized back to this GitHub repository.

Do not overwrite `.openai/hosting.json` with another Site's identity. It contains identifiers and storage binding names, not credentials. Treat an independently hosted fork as a separate deployment project.

### Deploying outside Sites

The application is built for Cloudflare Workers with D1 and R2. A move to another platform requires adapting database/storage access, environment bindings, authentication, and build/deployment configuration. It is not a drop-in standard Next.js deployment: preserve the Vinext setup unless you deliberately migrate it. Hosted sign-in currently depends on Sites dispatch and will need an equivalent authenticated identity integration outside Sites.

## Troubleshooting

| Symptom | Check or action |
|---|---|
| `pnpm` or `corepack` is missing | Install the pinned pnpm version; see Local development. Verify Node meets the required version. |
| `no such table: bookings` or `content` | Build once and run the initial local D1 migration command from the project root. |
| `table already exists` when applying the initial SQL | The initial migration has already been applied to this local database; do not replay it. Apply only subsequent migrations. |
| `/manage` says access denied locally | Copy `.dev.vars.example` to `.dev.vars`, restart the dev server, then use the local sign-in URL. |
| Local sign-in does not work with `pnpm start` | The simulator runs in portable development mode. Use `pnpm dev` on `localhost`. |
| Local sign-in does not work from a LAN address | The simulator intentionally accepts loopback access only. Open `localhost` on the development machine. |
| The dev port is already in use | Stop the previous process, or run `pnpm dev -- --port 5174` and use the printed URL. |
| Editing `lib/content.ts` does not update the page | Saved workshop content overrides the initial defaults. Edit it in the workshop instead. |
| A replaced photo is not visible | Click Save changes after uploading, then refresh the visitor page. |
| A booking is saved but no email arrives | Email and SMS notifications are not implemented in this version. Check `/manage`. |
| A local install complains about managed Linux tools | Use `pnpm install --frozen-lockfile`, not `pnpm install:ci`. A clean clone defaults to the portable profile. |
| A GitHub commit is not visible on the hosted website | Sites deployment is separate; use the publishing workflow above. |

## Verification for this release

TypeScript and the production build were checked. Validation checks cover malformed contact data, missing consent, invalid dates/times, overlong messages, unsafe image URLs, and reversed appearance times. Calendar checks cover a week spanning the new year. SQL migrations were inspected. Browser QA was unavailable in the authoring environment; visually review desktop and mobile and submit a test request before public launch.

### Manual review checklist

1. Check the home page on desktop and a narrow mobile viewport, including the mobile navigation.
2. Move the calendar backward/forward and across a month boundary; verify sample labels and Pacific-time wording.
3. Filter the gallery, open a photo, and close the dialog using its button and Escape.
4. Submit a future-dated test request. Verify the pending receipt and the same request in `/manage`.
5. Approve/decline the test request, refresh to verify persistence, then delete the test data.
6. Edit an appearance and upload a photo; save, then refresh the visitor view.
7. Test unauthorized management access before any public release.

## Next development milestones

- Replace sample photography and appearances with Fred's approved content.
- Finalize Fred's biography, service area, visit options, pricing process, and contact information.
- Add request notifications and a customer confirmation workflow.
- Add schedule conflict detection and travel buffers if instant booking becomes a requirement.
- Complete public-form abuse controls, retention rules, and browser accessibility review.
- Configure public sharing and a custom domain when the client is ready.

These are planned follow-up tasks, not existing functionality.

## Image provenance

The built-in image-generation tool created the shared Santa sample. Brief: a friendly older Santa with a natural white beard, deep red velvet suit and glasses, seated beside a Christmas tree in a warm traditional workshop, holding a storybook; photorealistic editorial lighting, no text or logos. The result was optimized to WebP. Replace with Fred’s authorized photographs before promoting the site as his real photo gallery.
