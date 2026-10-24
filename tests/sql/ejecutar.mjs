// Ejecuta las migraciones en un Postgres local (PGlite) y corre cada suite de supabase/tests/*.sql, sin tocar ninguna base real.
// Cada suite termina con una excepción controlada «<NOMBRE>_OK (n)» que revierte todo lo que creó.
// Uso: npm run test:sql
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { crear } from './db.mjs'

const dir = fileURLToPath(new URL('../../supabase/tests/', import.meta.url))
let fallos = 0
for (const archivo of fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
  const db = await crear()
  try {
    await db.exec(fs.readFileSync(dir + archivo, 'utf8'))
    console.error(`✗ ${archivo}: terminó sin la excepción de éxito esperada.`)
    fallos++
  } catch (e) {
    const m = String(e.message)
    if (/^[A-Z_]+_OK \(\d+\)/.test(m)) console.log(`✓ ${archivo}: ${m}`)
    else {
      console.error(`✗ ${archivo}: ${m}`)
      fallos++
    }
  }
}
process.exit(fallos ? 1 : 0)
