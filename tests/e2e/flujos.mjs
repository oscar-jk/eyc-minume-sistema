// Prueba de punta a punta de las funcionalidades principales, por rol, en el navegador real (Edge).
import { chromium } from 'playwright-core'
import fs from 'node:fs'

// Contraseña de los usuarios de prueba (e2e.*@prueba.test). Ver tests/e2e/LEEME.md
const PW = process.env.E2E_PASSWORD ?? ''
const B = process.env.BASE ?? 'http://localhost:5173'
const res = []
const ok = (n) => (res.push(['OK', n]), console.log('  ✓', n))
const mal = (n, e) => (res.push(['FALLO', n, String(e).split('\n')[0]]), console.log('  ✗', n, '→', String(e).split('\n')[0]))
const paso = async (n, f) => {
  try {
    await f()
    ok(n)
  } catch (e) {
    mal(n, e)
    if (actual) await actual.screenshot({ path: 'shots/fallo-' + n.replace(/[^a-z]+/gi, '_').slice(0, 40) + '.png', fullPage: true }).catch(() => {})
  }
}

const browser = await chromium.launch({ channel: 'msedge' })
const erroresConsola = []
let actual = null

async function sesion(email, vp = { width: 1366, height: 860 }) {
  const ctx = await browser.newContext({ viewport: vp })
  const p = await ctx.newPage()
  p.on('pageerror', (e) => erroresConsola.push(`[${email}] pageerror: ${e.message}`))
  p.on('console', (m) => m.type() === 'error' && !/\[EYC-/.test(m.text()) && erroresConsola.push(`[${email}] console: ${m.text().slice(0, 160)}`))
  await p.goto(B + '/login')
  await p.fill('input[type=email]', email)
  await p.fill('input[type=password]', PW)
  await p.press('input[type=password]', 'Enter')
  await p.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15000 })
  actual = p
  return { ctx, p }
}
const toast = (p, t) => p.getByText(t, { exact: false }).first().waitFor({ timeout: 8000 })
const dlg = (p) => p.locator('dialog[open]')

// ───── Administración ─────
console.log('\nADMIN')
{
  const { ctx, p } = await sesion('e2e.admin@prueba.test')
  await paso('Inicio de admin redirige a Monitoreo', async () => {
    await p.waitForURL(/\/monitoreo/)
  })
  await paso('Aviso de fase cerrada lleva a Configuración › Fases', async () => {
    await p.goto(B + '/comisiones/1')
    await p.getByRole('tab', { name: 'Actividades' }).click()
    await p.getByRole('link', { name: /Abrir o cambiar la fase/ }).click()
    await p.waitForURL(/\/configuracion\?tab=fases/)
    await p.getByRole('heading', { name: 'Fases' }).waitFor()
  })
  await paso('Abrir la fase de preparación', async () => {
    const sel = p.locator('li', { hasText: 'Incorporación y preparación' }).locator('select').first()
    await sel.selectOption('abierta')
    await toast(p, 'abierta.')
  })
  await paso('Editar comisión (nombre y sigla) desde Configuración › Catálogos', async () => {
    await p.goto(B + '/configuracion?tab=catalogos')
    await p.locator('li', { hasText: 'Corte Internacional de Justicia' }).getByRole('button', { name: 'Editar' }).click()
    await dlg(p).getByLabel('Nombre completo').fill('Corte Internacional de Justicia (E2E)')
    await dlg(p).getByRole('button', { name: 'Guardar' }).click()
    await toast(p, 'Comisión actualizada.')
    await p.getByText('Corte Internacional de Justicia (E2E)').waitFor()
  })
  await paso('Editar comisión desde su propia página', async () => {
    await p.goto(B + '/comisiones/7')
    await p.getByRole('button', { name: 'Editar comisión' }).click()
    await dlg(p).getByLabel('Nombre completo').fill('Corte Internacional de Justicia')
    await dlg(p).getByRole('button', { name: 'Guardar' }).click()
    await toast(p, 'Comisión actualizada.')
  })
  await paso('Renombrar un cargo y revertir', async () => {
    await p.goto(B + '/configuracion?tab=catalogos')
    await p.locator('li', { hasText: 'Miembro Aprendiz' }).getByRole('button', { name: 'Renombrar' }).click()
    await dlg(p).getByLabel('Nombre visible').fill('Miembro Aprendiz')
    await dlg(p).getByRole('button', { name: 'Guardar' }).click()
    await toast(p, 'Cargo actualizado.')
  })
  await paso('Carga masiva de 4 personas con asignación', async () => {
    await p.goto(B + '/personas')
    await p.getByRole('tab', { name: 'Carga masiva' }).click()
    await p.locator('textarea').fill('[E2E] Ana Uno; ctd; director\n[E2E] Luis Dos; ctd; adjunto1\n[E2E] Carla Tres; pnud; director\n[E2E] Eva EyC; ctd; eyc')
    await p.getByRole('button', { name: /Registrar 4 personas/ }).click()
    await toast(p, '4 personas registradas.')
  })
  await paso('Editar datos de una persona', async () => {
    await p.getByRole('tab', { name: 'Asignaciones' }).click()
    await p.locator('tr', { hasText: '[E2E] Luis Dos' }).getByRole('button', { name: 'Editar' }).click()
    await dlg(p).getByLabel('Correo').fill('luis@ejemplo.test')
    await dlg(p).getByRole('button', { name: 'Guardar' }).click()
    await toast(p, 'Datos actualizados.')
  })
  await paso('Pesos que no suman 100 no se pueden guardar', async () => {
    await p.goto(B + '/configuracion?tab=pesos')
    const inp = p.locator('fieldset', { hasText: 'Mesa directiva' }).locator('input[type=number]').first()
    await inp.fill('25')
    await p.getByText(/sobran 5/).first().waitFor()
    const dis = await p.locator('fieldset', { hasText: 'Mesa directiva' }).getByRole('button', { name: 'Guardar' }).isDisabled()
    if (!dis) throw new Error('el botón Guardar no se deshabilitó')
    await inp.fill('20')
  })
  await paso('Página inexistente muestra la pantalla amigable', async () => {
    await p.goto(B + '/no-existe-xyz')
    await p.getByText('Página no encontrada').waitFor()
  })
  await ctx.close()
}

// ───── EyC (en teléfono) ─────
console.log('\nEYC (teléfono)')
{
  const { ctx, p } = await sesion('e2e.eyc@prueba.test', { width: 390, height: 844 })
  await paso('Inicio de EyC redirige a Mi comisión', async () => {
    await p.waitForURL(/\/comision$/)
  })
  await paso('Sin actividades: el aviso lleva a crear una', async () => {
    await p.getByRole('button', { name: 'Crear una actividad' }).click()
    await p.getByRole('heading', { name: 'Nueva actividad' }).waitFor()
  })
  await paso('Crear y editar una actividad', async () => {
    await p.getByLabel('Nombre').fill('[E2E] Taller')
    await p.getByRole('button', { name: 'Crear' }).click()
    await toast(p, 'Actividad creada.')
    await p.locator('li', { hasText: '[E2E] Taller' }).getByRole('button', { name: 'Editar' }).click()
    await dlg(p).getByLabel('Nombre').fill('[E2E] Taller de procedimiento')
    await dlg(p).getByRole('button', { name: 'Guardar' }).click()
    await toast(p, 'Actividad actualizada.')
  })
  await paso('Evaluar: falta comentario bloquea completar (criterio negativo B1)', async () => {
    await p.getByRole('tab', { name: 'Evaluar' }).click()
    await p.locator('li', { hasText: '[E2E] Ana Uno' }).getByRole('link', { name: 'Evaluar' }).click()
    await p.waitForURL(/\/evaluar/)
    await p.locator('fieldset[id^=criterio-]').first().waitFor({ state: 'attached' })
    const cerradas = p.locator('section h3 button[aria-expanded="false"]')
    while (await cerradas.count()) await cerradas.first().click()
    for (const fs of await p.locator('fieldset[id^=criterio-]').all()) {
      const cod = (await fs.locator('legend').textContent()).split('.')[0].trim()
      const neg = await fs.getByText('lo esperado es «No»').count()
      const val = cod === 'B1' ? 'Sí' : neg ? 'No' : 'Sí'
      await fs.locator(`input[value=${val === 'Sí' ? 'si' : 'no'}]`).dispatchEvent('click')
    }
    await p.getByRole('button', { name: 'Marcar completa' }).click()
    await toast(p, 'No se puede completar')
    await p.getByText('Lo que falta para marcarla completa').waitFor()
  })
  await paso('Con el comentario, la evaluación queda completa y con puntaje', async () => {
    await p.getByPlaceholder('Describe lo observado').first().fill('Confundió el orden de las mociones.')
    await p.getByRole('button', { name: 'Marcar completa' }).click()
    await toast(p, 'Evaluación completa.')
    await p.getByText(/Puntaje \d/).waitFor()
  })
  await paso('EyC no ve personas de otra comisión (PNUD)', async () => {
    await p.goto(B + '/comision')
    await p.getByRole('tab', { name: 'Mesa directiva' }).click()
    await p.getByText('[E2E] Ana Uno').first().waitFor()
    if (await p.getByText('[E2E] Carla Tres').count()) throw new Error('ve a una persona de PNUD')
  })
  await paso('EyC no entra a Configuración (aviso con acción)', async () => {
    await p.goto(B + '/configuracion')
    await p.getByText('Esta sección no es para tu rol').waitFor()
    await p.getByRole('link', { name: /Ir a mi inicio/ }).click()
    await p.waitForURL(/\/comision$/)
  })
  await paso('Manual accesible desde «Más»', async () => {
    await p.getByRole('navigation', { name: 'Secciones' }).last().getByRole('link', { name: 'Manual' }).click()
    await p.waitForURL(/\/manual/)
  })
  await ctx.close()
}

// ───── Subsecretaría ─────
console.log('\nSUBSECRETARÍA')
{
  const { ctx, p } = await sesion('e2e.subse@prueba.test')
  await paso('Monitoreo muestra el semáforo del corte (Ana en Cumple)', async () => {
    await p.goto(B + '/monitoreo')
    await p.getByRole('button', { name: /Cumple/ }).first().click()
    await p.getByText('[E2E] Ana Uno').waitFor()
  })
  await paso('Cobertura por comisión carga', async () => {
    await p.getByRole('tab', { name: 'Cobertura' }).click()
    await p.getByRole('region', { name: 'Cobertura de evaluación' }).waitFor()
  })
  await paso('Editar una dimensión', async () => {
    await p.goto(B + '/configuracion?tab=catalogos')
    await p.locator('li', { hasText: 'Comunicación' }).getByRole('button', { name: 'Editar' }).click()
    await dlg(p).getByRole('button', { name: 'Guardar' }).click()
    await toast(p, 'Dimensión actualizada.')
  })
  await paso('Abrir fase Corte 1 y recomendar sustitución (elevada)', async () => {
    await p.goto(B + '/configuracion?tab=fases')
    await p.locator('li', { hasText: /^Corte 1/ }).locator('select').first().selectOption('abierta')
    await toast(p, 'abierta.')
    await p.goto(B + '/monitoreo')
    await p.locator('li', { hasText: '[E2E] Luis Dos' }).getByRole('button', { name: 'Recomendar' }).click()
    await dlg(p).locator('select').selectOption('sustitucion')
    await dlg(p).getByText('se elevará a la Secretaría General').waitFor()
    await dlg(p).locator('textarea').fill('No asistió a las capacitaciones.')
    await dlg(p).getByRole('button', { name: 'Registrar' }).click()
    await toast(p, 'Recomendación registrada.')
  })
  await paso('La Subsecretaría no puede decidir un caso elevado', async () => {
    await p.goto(B + '/decisiones')
    await p.locator('select').nth(1).selectOption('todas')
    await p.getByText('[E2E] Luis Dos').waitFor()
    if (await p.getByRole('button', { name: 'Decidir' }).count()) throw new Error('aparece Decidir')
  })
  await ctx.close()
}

// ───── Secretaría General ─────
console.log('\nSECRETARÍA GENERAL')
{
  const { ctx, p } = await sesion('e2e.sg@prueba.test')
  await paso('Decidir sustitución con persona entrante', async () => {
    await p.waitForURL(/\/decisiones/)
    await p.getByRole('button', { name: 'Ver historial completo' }).first().click()
    await p.getByRole('region', { name: 'Resultados por corte' }).first().waitFor()
    await p.getByRole('button', { name: 'Decidir' }).click()
    await dlg(p).locator('select').selectOption('sustitucion')
    await dlg(p).locator('textarea').fill('Se confirma la sustitución.')
    await dlg(p).getByRole('checkbox').check()
    await dlg(p).getByLabel(/Nombre completo de quien entra/).fill('[E2E] Nora Entra')
    await dlg(p).getByRole('button', { name: 'Confirmar decisión' }).click()
    await toast(p, 'Decisión registrada.')
  })
  await paso('La persona entrante ocupa el cargo en la comisión', async () => {
    await p.goto(B + '/comisiones/1')
    await p.getByRole('tab', { name: 'Mesa directiva' }).click()
    await p.getByText('[E2E] Nora Entra').first().waitFor()
  })
  await ctx.close()
}

await browser.close()
console.log('\nRESUMEN:', res.filter((r) => r[0] === 'OK').length, 'OK ·', res.filter((r) => r[0] === 'FALLO').length, 'FALLOS')
for (const r of res.filter((r) => r[0] === 'FALLO')) console.log('  FALLO:', r[1], '→', r[2])
console.log('Errores de consola:', erroresConsola.length)
for (const e of [...new Set(erroresConsola)].slice(0, 15)) console.log('  ', e)
