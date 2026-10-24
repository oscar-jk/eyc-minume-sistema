// Ejecuta las migraciones en un Postgres local (PGlite) y corre las pruebas de reglas, sin tocar ninguna base real.
// Uso: npm run test:sql
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { crear } from './db.mjs'

const db = await crear()
const sql = fs.readFileSync(fileURLToPath(new URL('../../supabase/tests/reglas.sql', import.meta.url)), 'utf8')
try {
  await db.exec(sql)
  console.error('✗ La suite terminó sin la excepción de éxito esperada.')
  process.exit(1)
} catch (e) {
  const m = String(e.message)
  if (m.startsWith('TODAS_LAS_PRUEBAS_OK')) {
    console.log('✓ ' + m)
  } else {
    console.error('✗ ' + m)
    process.exit(1)
  }
}
