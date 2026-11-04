import { cargarBancoPreguntas, type BancoPreguntas } from './api'
import { opcionesDe, ROLES_RESPUESTA, type TipoCampo } from './tipos'

/** Banco de preguntas para compartir: un formulario, dibujado como los ve quien responde, listos para guardar como PDF. */

interface Comision {
  id: number
  sigla: string | null
  clave: string
  nombre: string
}

const esc = (s: unknown) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const COMO: Record<TipoCampo, string> = {
  texto: 'Escribe tu respuesta',
  parrafo: 'Escribe tu respuesta con el detalle que quieras',
  numero: 'Escribe un número',
  fecha: 'Elige una fecha',
  radio: 'Elige UNA opción',
  checkbox: 'Marca TODAS las que apliquen',
  lista: 'Elige una opción de la lista',
  escala: 'Elige un valor',
  si_no: 'Responde Sí o No',
  personas: 'Elige a la persona de la lista',
  seccion: '',
}

const CSS = `
@page { size: A4; margin: 14mm 12mm; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff; color-scheme: light; }
body { margin: 0; font-family: "Segoe UI", Arial, sans-serif; color: #07174a; font-size: 11pt; line-height: 1.35; }
h1, h2, h3, p { margin: 0; }
.form { page-break-before: always; }
.form:first-of-type { page-break-before: auto; }
.cab { background: linear-gradient(120deg, #002193 0%, #0043c5 45%, #0090fb 100%); color: #fff; border-radius: 5mm; padding: 6mm 7mm; margin-bottom: 4mm; }
.cab .sobre { color: #00f0e6; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; font-size: 8.5pt; }
.cab h2 { font-size: 20pt; font-weight: 900; line-height: 1.1; margin: 1mm 0; }
.cab p { color: rgba(255,255,255,.88); font-size: 10.5pt; white-space: pre-line; }
.meta { display: flex; flex-wrap: wrap; gap: 2mm; margin-bottom: 4mm; }
.meta span { background: #dfe9ff; color: #00329a; border-radius: 99px; padding: .8mm 3mm; font-size: 9pt; font-weight: 600; }
.como { border: 1px solid rgba(0,67,197,.3); background: #dfe9ff; border-radius: 4mm; padding: 3mm 4mm; font-size: 9.5pt; color: #33476a; margin-bottom: 4mm; }
.como b { color: #07174a; }
.paso { display: flex; align-items: center; gap: 3mm; margin: 4mm 0 3mm; }
.paso i { font-style: normal; background: #0043c5; color: #fff; border-radius: 3mm; width: 8mm; height: 8mm; display: grid; place-items: center; font-weight: 800; }
.paso b { font-size: 14pt; font-weight: 900; }
.card { border: 1px solid #cbd8ee; border-radius: 4mm; padding: 4mm 5mm; margin-bottom: 3mm; break-inside: avoid; page-break-inside: avoid; }
.card .n { color: #0043c5; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; font-size: 8pt; margin-bottom: 1.5mm; }
.card .et { font-weight: 700; font-size: 11.5pt; }
.card .et em { color: #c0262d; font-style: normal; }
.card .ayuda { color: #51668a; font-size: 9.5pt; margin-top: .5mm; white-space: pre-line; }
.card .solo { color: #7a4f00; background: #ffefc2; border-radius: 99px; display: inline-block; font-size: 8pt; font-weight: 600; padding: .4mm 2.5mm; margin-top: 1.5mm; }
.opciones { margin-top: 2.5mm; display: grid; gap: 1.6mm; }
.op { display: flex; align-items: center; gap: 3mm; border: 1.5px solid #cbd8ee; background: #e6eefc; border-radius: 3.5mm; padding: 2mm 3.5mm; font-weight: 600; }
.op .m { width: 4.2mm; height: 4.2mm; border: 1.5px solid #8597b3; background: #fff; flex: none; }
.op .m.r { border-radius: 50%; }
.op .m.c { border-radius: 1mm; }
.caja { margin-top: 2.5mm; border: 1.5px solid #cbd8ee; background: #e6eefc; border-radius: 3.5mm; padding: 2.5mm 3.5mm; color: #51668a; }
.caja.alta { min-height: 22mm; }
.escala { margin-top: 2.5mm; display: flex; flex-wrap: wrap; gap: 2mm; }
.escala b { min-width: 10mm; height: 10mm; display: grid; place-items: center; border: 1.5px solid #cbd8ee; background: #e6eefc; border-radius: 3.5mm; font-size: 13pt; color: #33476a; }
.extremos { display: flex; justify-content: space-between; color: #51668a; font-size: 8pt; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; margin-top: 1.5mm; }
.sec { background: #0043c5; color: #fff; border-radius: 4mm; padding: 4mm 5mm; margin: 5mm 0 3mm; break-inside: avoid; page-break-inside: avoid; break-after: avoid; }
.sec .s { color: #00f0e6; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; font-size: 8pt; }
.sec h3 { font-size: 14pt; font-weight: 900; line-height: 1.15; }
.sec p { color: rgba(255,255,255,.88); font-size: 10pt; margin-top: 1mm; white-space: pre-line; }
.vacio { color: #51668a; font-style: italic; }
`

function caja(texto: string, alta = false) {
  return `<div class="caja${alta ? ' alta' : ''}">${esc(texto)}</div>`
}

function opcion(texto: string, tipo: 'r' | 'c') {
  return `<div class="op"><span class="m ${tipo}"></span><span>${esc(texto)}</span></div>`
}

type CampoFila = BancoPreguntas['campos'][number]
type FormularioFila = BancoPreguntas['formularios'][number]

function cuerpoCampo(c: CampoFila): string {
  const ops = opcionesDe(c.opciones)
  switch (c.tipo) {
    case 'texto': return caja('Escribe tu respuesta')
    case 'parrafo': return caja('Escribe tu respuesta', true)
    case 'numero': return caja('0')
    case 'fecha': return caja('dd / mm / aaaa')
    case 'lista': return `<div class="opciones">${ops.map((o) => caja(o)).join('')}</div>`
    case 'radio': return `<div class="opciones">${ops.map((o) => opcion(o, 'r')).join('')}${c.con_otro ? opcion('Otro: ________________', 'r') : ''}</div>`
    case 'checkbox': return `<div class="opciones">${ops.map((o) => opcion(o, 'c')).join('')}${c.con_otro ? opcion('Otro: ________________', 'c') : ''}</div>`
    case 'si_no': return `<div class="escala"><b style="min-width:30mm">Sí</b><b style="min-width:30mm">No</b></div>`
    case 'escala': {
      const min = c.escala_min ?? 1
      const max = c.escala_max ?? 5
      const n = Array.from({ length: Math.max(0, max - min + 1) }, (_, i) => min + i)
      return `<div class="escala">${n.map((v) => `<b>${v}</b>`).join('')}</div><div class="extremos"><span>${min} · menos</span><span>más · ${max}</span></div>`
    }
    case 'personas': return caja('Elige a la persona (integrantes de la comisión) · Otro (persona externa)…')
    case 'seccion': return ''
  }
}

function formularioHtml(f: FormularioFila, campos: CampoFila[], comisiones: Map<number, Comision>): string {
  const roles: string[] = f.roles ?? []
  const preguntas = campos.filter((c) => c.tipo !== 'seccion')
  const fija = f.comision_fija != null ? comisiones.get(f.comision_fija) : undefined
  const pideDatos = roles.length > 0 || f.pide_comision || f.pide_referencia
  let n = 0

  const datosHtml = pideDatos
    ? `<div class="paso"><i>1</i><b>Tus datos</b></div>
       ${roles.length ? `<div class="card"><div class="et">¿Quién eres? <em>*</em></div><div class="opciones">${roles.map((r) => caja(ROLES_RESPUESTA[r] ?? r)).join('')}</div></div>` : ''}
       ${f.pide_comision ? `<div class="card"><div class="et">Comisión${fija ? '' : ' <em>*</em>'}</div>${fija ? `<div class="ayuda">${esc(fija.sigla ?? fija.clave.toUpperCase())} · ${esc(fija.nombre)} (fija para este formulario)</div>` : caja('Elige la comisión de la lista')}</div>` : ''}
       ${f.pide_referencia ? `<div class="card"><div class="et">Sesión o taller <em>*</em></div>${caja('Ej.: Sesión del martes, Taller de procedimiento')}</div>` : ''}`
    : ''

  const camposHtml = campos
    .map((c) => {
      if (c.tipo === 'seccion')
        return `<div class="sec"><div class="s">Sección</div><h3>${esc(c.etiqueta)}</h3>${c.ayuda ? `<p>${esc(c.ayuda)}</p>` : ''}</div>`
      n++
      const como = c.tipo === 'escala' ? `Elige un valor del ${c.escala_min ?? 1} al ${c.escala_max ?? 5}` : COMO[c.tipo]
      const dirigido = (c.roles ?? []).length ? `<span class="solo">Solo para: ${esc((c.roles ?? []).map((r) => ROLES_RESPUESTA[r] ?? r).join(', '))}</span>` : ''
      return `<div class="card"><div class="n">Pregunta ${n} de ${preguntas.length} · ${esc(como)}${c.con_otro ? ' (puede escribir «Otro»)' : ''}</div>
        <div class="et">${esc(c.etiqueta)}${c.obligatorio ? ' <em>*</em>' : ''}</div>
        ${c.ayuda ? `<div class="ayuda">${esc(c.ayuda)}</div>` : ''}${dirigido}${cuerpoCampo(c)}</div>`
    })
    .join('')

  const alcance = fija ? `Solo ${fija.sigla ?? fija.clave.toUpperCase()}` : f.pide_comision ? 'La persona elige su comisión' : 'Sin comisión'
  return `<section class="form">
    <div class="cab"><div class="sobre">Formulario</div><h2>${esc(f.titulo)}</h2>${f.descripcion ? `<p>${esc(f.descripcion)}</p>` : ''}</div>
    <div class="meta"><span>${preguntas.length} ${preguntas.length === 1 ? 'pregunta' : 'preguntas'}</span><span>${esc(alcance)}</span><span>${roles.length ? `Para: ${esc(roles.map((r) => ROLES_RESPUESTA[r] ?? r).join(', '))}` : 'Para cualquier rol'}</span></div>
    <div class="como"><b>Cómo llenar este formulario</b><br>Las preguntas con <b style="color:#c0262d">*</b> son obligatorias. Sin cuenta: se responde con un enlace.</div>
    ${datosHtml}
    ${campos.length ? `<div class="paso"><i>${pideDatos ? 2 : 1}</i><b>Preguntas</b></div>${camposHtml}` : '<p class="vacio">Este formulario todavía no tiene preguntas.</p>'}
  </section>`
}

/** Arma el documento de UN formulario (sus preguntas como las ve quien responde) y abre el diálogo de impresión («Guardar como PDF»). Devuelve false si no existe. */
export async function exportarBancoPdf(formularioId: string, comisionesLista: Comision[]): Promise<boolean> {
  const { formularios, campos } = await cargarBancoPreguntas()
  const f = formularios.find((x) => x.id === formularioId)
  if (!f) return false

  const comisiones = new Map(comisionesLista.map((x) => [x.id, x]))
  const suyos = campos.filter((x) => x.formulario_id === f.id)

  // El título del documento es el nombre sugerido del archivo PDF.
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Banco de preguntas · ${esc(f.titulo)}</title><style>${CSS}</style></head><body>
    ${formularioHtml(f, suyos, comisiones)}
  </body></html>`

  await new Promise<void>((listo) => {
    const marco = document.createElement('iframe')
    marco.setAttribute('aria-hidden', 'true')
    marco.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'
    marco.onload = () => {
      const w = marco.contentWindow!
      const limpiar = () => {
        marco.remove()
        listo()
      }
      w.addEventListener('afterprint', limpiar)
      // Respaldo por si el navegador no avisa al cerrar el diálogo.
      setTimeout(limpiar, 120_000)
      w.focus()
      w.print()
    }
    marco.srcdoc = html
    document.body.appendChild(marco)
  })
  return true
}
