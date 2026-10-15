import nextEnv from '@next/env';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';
nextEnv.loadEnvConfig(process.cwd());
if (!process.env.DATABASE_URL) {
  console.error('Set DATABASE_URL in .env.local before running pnpm db:migrate.');
  process.exit(1);
}
try {
  await migrate(drizzle(neon(process.env.DATABASE_URL)), { migrationsFolder: './drizzle' });
  console.log('Postgres migrations applied successfully.');
} catch {
  console.error('Migration failed. Check database access and migration state before retrying. No credentials were logged.');
  process.exitCode = 1;
}
