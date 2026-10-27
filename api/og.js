// Vista previa de enlaces (WhatsApp, Telegram, redes…): los rastreadores no ejecutan JavaScript, así que vercel.json les
// entrega esta página mínima con el título, la descripción y la imagen del apartado. Las personas siguen viendo la app normal.
const SECCIONES = [
  ['/login', 'login', 'Iniciar sesión', 'Entra con tu cuenta personal al Sistema de Evaluación y Control del MINUME XVII.'],
  ['/recuperar', 'recuperar', 'Recuperar acceso', 'Pide un enlace nuevo para definir tu contraseña.'],
  ['/nueva-contrasena', 'recuperar', 'Define tu contraseña', 'Define tu contraseña personal para entrar al sistema.'],
  ['/comisiones', 'comisiones', 'Comisiones', 'Comisiones, mesas directivas y su avance de evaluación.'],
  ['/comision', 'comision', 'Mi comisión', 'Evalúa a la mesa directiva de tu comisión y crea actividades.'],
  ['/evaluar', 'evaluar', 'Evaluación', 'Evaluación de la mesa directiva con la rúbrica de nueve criterios.'],
  ['/evaluaciones', 'evaluar', 'Evaluación', 'Detalle de una evaluación.'],
  ['/monitoreo', 'monitoreo', 'Monitoreo del desempeño', 'Panel de indicadores, semáforo por persona, cobertura y recomendaciones.'],
  ['/decisiones', 'decisiones', 'Decisiones de continuidad', 'Casos elevados a la Secretaría General.'],
  ['/personas', 'personas', 'Personas y asignaciones', 'Registro de personas, calificación inicial y rotaciones.'],
  ['/formularios', 'formularios', 'Formularios', 'Crea formularios y recoge opiniones sin que quien responde necesite cuenta.'],
  ['/configuracion', 'configuracion', 'Configuración del sistema', 'Fases, pesos, cortes, criterios, cuentas y auditoría.'],
  ['/manual', 'manual', 'Manual de usuario', 'Cómo usar el sistema según tu rol, con capturas de cada pantalla.'],
]

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

async function tituloFormulario(codigo) {
  try {
    const url = process.env.VITE_SUPABASE_URL || 'https://hnlhhwululasvlckbcrq.supabase.co'
    const r = await fetch(url + '/rest/v1/rpc/formulario_publico', {
      method: 'POST',
      headers: { apikey: process.env.VITE_SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_codigo: codigo }),
    })
    if (!r.ok) return null
    const d = await r.json()
    return { titulo: d.titulo, descripcion: d.descripcion }
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  const origen = `https://${req.headers['x-forwarded-host'] || req.headers.host}`
  const ruta = '/' + String(req.query.path || '').replace(/^\/+/, '')
  let imagen = 'inicio'
  let titulo = 'Sistema de Evaluación y Control'
  let desc = 'Evaluación y seguimiento de las mesas directivas del MINUME XVII.'

  const f = ruta.match(/^\/f\/([A-Za-z0-9_-]{1,40})\/?$/)
  if (f) {
    imagen = 'formulario'
    const d = await tituloFormulario(f[1])
    titulo = d?.titulo || 'Formulario'
    desc = d?.descripcion || 'Responde este formulario: no necesitas cuenta.'
  } else {
    const s = SECCIONES.find(([p]) => ruta === p || ruta.startsWith(p + '/'))
    if (s) [, imagen, titulo, desc] = s
  }

  const url = origen + ruta
  const completo = `${titulo} · EyC MINUME XVII`
  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<title>${esc(completo)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="noindex">
<meta property="og:type" content="website">
<meta property="og:site_name" content="EyC · MINUME XVII">
<meta property="og:locale" content="es_DO">
<meta property="og:title" content="${esc(completo)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${origen}/og/${imagen}.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(completo)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${origen}/og/${imagen}.jpg">
</head><body><h1>${esc(completo)}</h1><p>${esc(desc)}</p><a href="${esc(url)}">Abrir</a></body></html>`
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
  res.status(200).send(html)
}
