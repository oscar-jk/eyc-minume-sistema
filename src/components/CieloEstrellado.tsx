import { useEffect, useRef } from 'react'

/**
 * Cielo nocturno realista (sin librerías ni imágenes):
 * - Campo de estrellas diminutas con temperatura de color real (azuladas, blancas, amarillas, ámbar).
 * - Franja tenue de Vía Láctea: neblina y densidad de estrellas mayor a lo largo de una diagonal.
 * - Las estrellas brillantes llevan destello de difracción en cruz, no halos circulares.
 * - Centelleo sutil y estrellas fugaces ocasionales.
 * El fondo se pinta una vez en un lienzo aparte; cada cuadro solo redibuja las estrellas que centellean.
 * Respeta prefers-reduced-motion y se pausa con la pestaña oculta.
 */

// Colores por tipo espectral (O/B azuladas → M ámbar), con su frecuencia aproximada en el cielo visible.
const ESPECTRO: [string, number][] = [
  ['170,195,255', 0.1],
  ['202,216,255', 0.2],
  ['248,247,255', 0.3],
  ['255,244,232', 0.2],
  ['255,221,180', 0.13],
  ['255,196,150', 0.07],
]
function colorEstelar(r: number) {
  let acc = 0
  for (const [c, p] of ESPECTRO) {
    acc += p
    if (r <= acc) return c
  }
  return ESPECTRO[2][0]
}

interface Brillante {
  x: number
  y: number
  r: number
  c: string
  fase: number
  vel: number
}

export function CieloEstrellado({ densidad = 1, className = '' }: { densidad?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let w = 0
    let h = 0
    let dpr = 1
    let raf = 0
    let fondo: HTMLCanvasElement | null = null
    let brillantes: Brillante[] = []
    let fugaz: { x: number; y: number; vx: number; vy: number; vida: number; largo: number } | null = null

    const destello = (g: CanvasRenderingContext2D, x: number, y: number, r: number, c: string, a: number) => {
      // Núcleo con resplandor corto (gaussiano), no un disco
      const halo = g.createRadialGradient(x, y, 0, x, y, r * 3.2)
      halo.addColorStop(0, `rgba(${c},${a})`)
      halo.addColorStop(0.25, `rgba(${c},${a * 0.45})`)
      halo.addColorStop(1, `rgba(${c},0)`)
      g.fillStyle = halo
      g.beginPath()
      g.arc(x, y, r * 3.2, 0, Math.PI * 2)
      g.fill()
      // Picos de difracción en cruz, finos y que se desvanecen
      const largo = r * 9
      for (const [dx, dy] of [
        [1, 0],
        [0, 1],
      ]) {
        const lg = g.createLinearGradient(x - dx * largo, y - dy * largo, x + dx * largo, y + dy * largo)
        lg.addColorStop(0, `rgba(${c},0)`)
        lg.addColorStop(0.5, `rgba(${c},${a * 0.75})`)
        lg.addColorStop(1, `rgba(${c},0)`)
        g.strokeStyle = lg
        g.lineWidth = Math.max(0.6, r * 0.35)
        g.beginPath()
        g.moveTo(x - dx * largo, y - dy * largo)
        g.lineTo(x + dx * largo, y + dy * largo)
        g.stroke()
      }
      g.fillStyle = `rgba(255,255,255,${Math.min(1, a + 0.1)})`
      g.beginPath()
      g.arc(x, y, r * 0.55, 0, Math.PI * 2)
      g.fill()
    }

    const pintarFondo = () => {
      fondo = document.createElement('canvas')
      fondo.width = w * dpr
      fondo.height = h * dpr
      const g = fondo.getContext('2d')!
      g.scale(dpr, dpr)

      // Vía Láctea: banda diagonal de neblina azul-violeta muy tenue
      const ang = -0.55
      const cx = w * 0.55
      const cy = h * 0.45
      g.save()
      g.translate(cx, cy)
      g.rotate(ang)
      const banda = Math.max(w, h) * 0.22
      for (let i = 0; i < 26; i++) {
        const px = (Math.random() - 0.5) * Math.max(w, h) * 1.6
        const py = (Math.random() - 0.5) * banda * 0.8
        const rr = banda * (0.35 + Math.random() * 0.6)
        const neb = g.createRadialGradient(px, py, 0, px, py, rr)
        const tono = Math.random() < 0.5 ? '120,150,255' : '170,140,255'
        neb.addColorStop(0, `rgba(${tono},${0.035 * densidad})`)
        neb.addColorStop(1, `rgba(${tono},0)`)
        g.fillStyle = neb
        g.beginPath()
        g.arc(px, py, rr, 0, Math.PI * 2)
        g.fill()
      }
      g.restore()

      // Estrellas tenues: más densas cerca de la banda
      const n = Math.round(((w * h) / 900) * densidad)
      for (let i = 0; i < n; i++) {
        let x = Math.random() * w
        let y = Math.random() * h
        if (Math.random() < 0.45) {
          // concentrar sobre la banda galáctica
          const t = (Math.random() - 0.5) * Math.max(w, h) * 1.6
          const d = (Math.random() + Math.random() + Math.random() - 1.5) * banda * 0.5
          x = cx + t * Math.cos(ang) - d * Math.sin(ang)
          y = cy + t * Math.sin(ang) + d * Math.cos(ang)
        }
        // distribución de magnitudes: la mayoría muy débiles
        const m = Math.pow(Math.random(), 3)
        const r = 0.25 + m * 0.9
        const a = 0.18 + m * 0.6
        g.fillStyle = `rgba(${colorEstelar(Math.random())},${a})`
        g.beginPath()
        g.arc(x, y, r, 0, Math.PI * 2)
        g.fill()
      }
    }

    const crear = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = canvas.clientWidth
      h = canvas.clientHeight
      if (!w || !h) return
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      pintarFondo()
      const nb = Math.max(4, Math.round(((w * h) / 60000) * densidad))
      brillantes = Array.from({ length: nb }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.9 + Math.pow(Math.random(), 2) * 1.6,
        c: colorEstelar(Math.random()),
        fase: Math.random() * Math.PI * 2,
        vel: 0.6 + Math.random() * 1.6,
      }))
    }

    const dibujar = (t: number) => {
      ctx.clearRect(0, 0, w, h)
      if (fondo) ctx.drawImage(fondo, 0, 0, w, h)
      for (const s of brillantes) {
        // centelleo atmosférico: variación pequeña y rápida, no un parpadeo
        const a = quieto ? 0.85 : 0.68 + 0.22 * Math.sin(s.fase + (t / 1000) * s.vel) + 0.08 * Math.sin(s.fase * 3 + (t / 1000) * s.vel * 4.3)
        destello(ctx, s.x, s.y, s.r, s.c, a)
      }
      if (!quieto) {
        if (!fugaz && Math.random() < 0.0018) {
          const ang = Math.PI / 5 + Math.random() * 0.4
          const v = 9 + Math.random() * 5
          fugaz = { x: Math.random() * w * 0.7, y: Math.random() * h * 0.35, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, vida: 1, largo: 10 + Math.random() * 8 }
        }
        if (fugaz) {
          const x2 = fugaz.x - fugaz.vx * fugaz.largo
          const y2 = fugaz.y - fugaz.vy * fugaz.largo
          const g = ctx.createLinearGradient(fugaz.x, fugaz.y, x2, y2)
          g.addColorStop(0, `rgba(255,255,255,${0.9 * fugaz.vida})`)
          g.addColorStop(0.3, `rgba(190,230,255,${0.35 * fugaz.vida})`)
          g.addColorStop(1, 'rgba(255,255,255,0)')
          ctx.strokeStyle = g
          ctx.lineWidth = 1.4
          ctx.lineCap = 'round'
          ctx.beginPath()
          ctx.moveTo(fugaz.x, fugaz.y)
          ctx.lineTo(x2, y2)
          ctx.stroke()
          fugaz.x += fugaz.vx
          fugaz.y += fugaz.vy
          fugaz.vida -= 0.014
          if (fugaz.vida <= 0 || fugaz.x > w + 50 || fugaz.y > h + 50) fugaz = null
        }
        raf = requestAnimationFrame(dibujar)
      }
    }

    const iniciar = () => {
      cancelAnimationFrame(raf)
      crear()
      raf = requestAnimationFrame(dibujar)
    }
    const visibilidad = () => {
      if (document.hidden) cancelAnimationFrame(raf)
      else raf = requestAnimationFrame(dibujar)
    }
    iniciar()
    const ro = new ResizeObserver(iniciar)
    ro.observe(canvas)
    document.addEventListener('visibilitychange', visibilidad)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      document.removeEventListener('visibilitychange', visibilidad)
    }
  }, [densidad])

  return <canvas ref={ref} aria-hidden className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} />
}
