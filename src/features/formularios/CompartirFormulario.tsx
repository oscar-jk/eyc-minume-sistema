import { useEffect, useState } from 'react'
import { useAvisar } from '@/components/Avisos'
import { Boton } from '@/components/Boton'
import { Modal } from '@/components/Modal'
import { enlacePublico } from './tipos'

/** Parte un texto en líneas que quepan en `ancho` px con la fuente actual del lienzo. */
function envolver(ctx: CanvasRenderingContext2D, texto: string, ancho: number, maxLineas: number): string[] {
  const palabras = texto.split(/\s+/)
  const lineas: string[] = []
  let actual = ''
  for (const p of palabras) {
    const prueba = actual ? `${actual} ${p}` : p
    if (ctx.measureText(prueba).width > ancho && actual) {
      lineas.push(actual)
      actual = p
    } else actual = prueba
  }
  if (actual) lineas.push(actual)
  if (lineas.length > maxLineas) {
    const corte = lineas.slice(0, maxLineas)
    corte[maxLineas - 1] = corte[maxLineas - 1].replace(/\s*\S*$/, '') + '…'
    return corte
  }
  return lineas
}

/** Pone el texto con el tamaño más grande que quepa en `ancho` px (parte de `tam`). */
function ajustado(ctx: CanvasRenderingContext2D, texto: string, peso: number, tam: number, ancho: number) {
  let t = tam
  do {
    ctx.font = `${peso} ${t}px Barlow, system-ui, sans-serif`
    t -= 2
  } while (ctx.measureText(texto).width > ancho && t > 16)
}

function cargarImagen(src: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const img = new Image()
    img.onload = () => res(img)
    img.onerror = () => res(null)
    img.src = src
  })
}

/** Imagen lista para compartir (WhatsApp, redes): «Llena el formulario», su título, el QR y el enlace. 1080 × 1350 px. */
async function crearImagenFormulario(titulo: string, enlace: string): Promise<Blob> {
  const QR = await import('qrcode')
  const qrUrl = await QR.toDataURL(enlace, { margin: 1, width: 640, errorCorrectionLevel: 'M', color: { dark: '#001a78', light: '#ffffff' } })
  const [qr, logo] = await Promise.all([cargarImagen(qrUrl), cargarImagen('/brand/header-logo-dark.png')])
  await Promise.all([document.fonts.load('900 80px Barlow'), document.fonts.load('600 40px Barlow')]).catch(() => undefined)

  const W = 1080
  const H = 1350
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!

  const fondo = ctx.createLinearGradient(0, 0, W, H)
  fondo.addColorStop(0, '#0a4fd6')
  fondo.addColorStop(1, '#001a78')
  ctx.fillStyle = fondo
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = 'rgba(0,240,230,0.10)'
  ctx.beginPath()
  ctx.arc(W - 80, 120, 260, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(60, H - 160, 220, 0, Math.PI * 2)
  ctx.fill()

  ctx.textAlign = 'center'
  ctx.fillStyle = '#ffffff'
  if (logo) {
    const h = 74
    const w = (logo.width / logo.height) * h
    ctx.drawImage(logo, (W - w) / 2, 70, w, h)
  }

  ctx.font = '900 112px Barlow, system-ui, sans-serif'
  ctx.fillText('Llena el', W / 2, 300)
  ctx.fillText('formulario', W / 2, 410)

  ctx.font = '600 46px Barlow, system-ui, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  const lineas = envolver(ctx, titulo, W - 200, 2)
  lineas.forEach((l, i) => ctx.fillText(l, W / 2, 485 + i * 58))

  // Tarjeta blanca con el QR.
  const lado = 500
  const x = (W - lado) / 2
  const y = 600
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.roundRect(x - 36, y - 36, lado + 72, lado + 72, 48)
  ctx.fill()
  if (qr) ctx.drawImage(qr, x, y, lado, lado)

  ctx.fillStyle = '#ffffff'
  ctx.font = '600 40px Barlow, system-ui, sans-serif'
  ctx.fillText('Escanea el código o entra a:', W / 2, y + lado + 96)
  const corto = enlace.replace(/^https?:\/\//, '')
  ajustado(ctx, corto, 700, 38, W - 140)
  ctx.fillStyle = '#7ff6f0'
  ctx.fillText(corto, W / 2, y + lado + 150)

  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  const pie = 'No necesitas cuenta · Sistema de Evaluación y Control · MINUME de Estrellas'
  ajustado(ctx, pie, 600, 30, W - 120)
  ctx.fillText(pie, W / 2, H - 44)

  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('No se pudo crear la imagen'))), 'image/png'))
}

function nombreArchivo(titulo: string) {
  const base = titulo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 50)
  return `formulario-${base || 'enlace'}.png`
}

/** Ventana para compartir un formulario: enlace, código QR e imagen descargable («Llena el formulario»). */
export function CompartirFormulario({ titulo, codigo, onCerrar }: { titulo: string; codigo: string; onCerrar: () => void }) {
  const avisar = useAvisar()
  const enlace = enlacePublico(codigo)
  const [qr, setQr] = useState('')
  const [trabajando, setTrabajando] = useState<'descarga' | 'compartir' | null>(null)
  const puedeCompartirArchivo = typeof navigator !== 'undefined' && typeof navigator.canShare === 'function'

  useEffect(() => {
    let vivo = true
    import('qrcode').then((m) => m.toDataURL(enlace, { margin: 1, width: 480, errorCorrectionLevel: 'M' })).then((u) => vivo && setQr(u))
    return () => {
      vivo = false
    }
  }, [enlace])

  const copiar = () =>
    navigator.clipboard.writeText(enlace).then(
      () => avisar('Enlace copiado.'),
      () => avisar('No se pudo copiar; selecciónalo manualmente.', 'error'),
    )

  const descargar = async () => {
    setTrabajando('descarga')
    try {
      const blob = await crearImagenFormulario(titulo, enlace)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = nombreArchivo(titulo)
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 2000)
      avisar('Imagen descargada: ya puedes compartirla.')
    } catch {
      avisar('No se pudo crear la imagen. Inténtalo de nuevo.', 'error')
    } finally {
      setTrabajando(null)
    }
  }

  const compartir = async () => {
    setTrabajando('compartir')
    try {
      const blob = await crearImagenFormulario(titulo, enlace)
      const archivo = new File([blob], nombreArchivo(titulo), { type: 'image/png' })
      const datos = { files: [archivo], title: titulo, text: `Llena el formulario: ${titulo}\n${enlace}` }
      if (navigator.canShare?.(datos)) await navigator.share(datos)
      else await navigator.share({ title: titulo, text: `Llena el formulario: ${titulo}`, url: enlace })
    } catch (e) {
      // Cerrar el menú de compartir no es un error.
      if (!(e instanceof DOMException && e.name === 'AbortError')) avisar('No se pudo abrir el menú de compartir.', 'error')
    } finally {
      setTrabajando(null)
    }
  }

  return (
    <Modal abierto titulo="Compartir formulario" onCerrar={onCerrar} acciones={<Boton variante="secundario" onClick={onCerrar}>Cerrar</Boton>}>
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="font-semibold">{titulo}</p>
        {qr ? <img src={qr} alt="Código QR del formulario" className="size-56 rounded-2xl bg-white p-2 shadow-card" /> : <span className="esqueleto size-56 rounded-2xl" />}
        <p className="text-sm text-ink-2">Cualquier persona con el enlace, el código QR o la imagen responde sin cuenta.</p>
        <input readOnly value={enlace} onFocus={(e) => e.target.select()} className="w-full rounded-lg border border-line-strong bg-surface-2 p-2 text-center font-mono text-sm" aria-label="Enlace público del formulario" />
        <div className="flex w-full flex-wrap justify-center gap-2">
          <Boton variante="secundario" onClick={copiar}>
            Copiar enlace
          </Boton>
          <Boton cargando={trabajando === 'descarga'} onClick={descargar}>
            Descargar imagen
          </Boton>
          {puedeCompartirArchivo && (
            <Boton variante="secundario" cargando={trabajando === 'compartir'} onClick={compartir}>
              Compartir…
            </Boton>
          )}
        </div>
        <p className="text-xs text-ink-3">La imagen dice «Llena el formulario» e incluye el código QR y el enlace, lista para WhatsApp o redes.</p>
      </div>
    </Modal>
  )
}
