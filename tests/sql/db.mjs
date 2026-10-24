// Postgres local (PGlite) con el esquema de Supabase mínimo para probar las migraciones de EyC sin tocar la base real.
import { PGlite } from '@electric-sql/pglite'
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const MIG = fileURLToPath(new URL('../../supabase/migrations', import.meta.url))

export async function crear({ hasta = 999, extra = [] } = {}) {
  const db = new PGlite({ extensions: { btree_gist, pgcrypto } })
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin;
    create schema extensions; create extension if not exists pgcrypto with schema extensions;
    create schema auth;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text, encrypted_password text,
      raw_app_meta_data jsonb default '{}', raw_user_meta_data jsonb default '{}', last_sign_in_at timestamptz, created_at timestamptz default now());
    create function auth.uid() returns uuid language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''), nullif((nullif(current_setting('request.jwt.claims', true), '')::jsonb) ->> 'sub', ''))::uuid $$;
    create function auth.role() returns text language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon') $$;
    grant usage on schema public, extensions to anon, authenticated, service_role;
  `)
  const archivos = fs.readdirSync(MIG).filter((f) => f.endsWith('.sql')).sort()
  for (const f of archivos) {
    const n = parseInt(f.slice(0, 14).slice(-3), 10)
    if (n > hasta) break
    const sql = fs.readFileSync(path.join(MIG, f), 'utf8')
    try {
      await db.exec(sql)
    } catch (e) {
      throw new Error(`Migración ${f}: ${e.message}`)
    }
  }
  for (const f of extra) await db.exec(fs.readFileSync(f, 'utf8'))
  return db
}

/** Ejecuta como un usuario autenticado (RLS activa). */
export async function como(db, uid, fn) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${uid}', false); select set_config('request.jwt.claim.role','authenticated', false);`)
  try {
    return await fn()
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`)
  }
}
