import { useEffect, useRef } from 'react'

/**
 * Cielo con estrellas reales: titileo suave y alguna estrella fugaz ocasional.
 * Respeta prefers-reduced-motion (queda estático) y se pausa con la pestaña oculta.
 */
export function CieloEstrellado({ densidad = 1, className = '' }: { densidad?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let w = 0
    let h = 0
    let raf = 0
    let estrellas: { x: number; y: number; r: number; fase: number; vel: number; tono: string }[] = []
    let fugaz: { x: number; y: number; vx: number; vy: number; vida: number } | null = null
    const TONOS = ['255,255,255', '200,230,255', '160,240,255', '255,214,255']

    const crear = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const n = Math.round(((w * h) / 2600) * densidad)
      estrellas = Array.from({ length: n }, () => {
        const grande = Math.random() < 0.06
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          r: grande ? 1.2 + Math.random() * 1.1 : 0.3 + Math.random() * 0.8,
          fase: Math.random() * Math.PI * 2,
          vel: 0.4 + Math.random() * 1.4,
          tono: TONOS[Math.floor(Math.random() * TONOS.length)],
        }
      })
    }

    const dibujar = (t: number) => {
      ctx.clearRect(0, 0, w, h)
      for (const s of estrellas) {
        const a = quieto ? 0.75 : 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(s.fase + (t / 1000) * s.vel))
        ctx.beginPath()
        ctx.fillStyle = `rgba(${s.tono},${a})`
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fill()
        if (s.r > 1.3) {
          ctx.fillStyle = `rgba(${s.tono},${a * 0.18})`
          ctx.beginPath()
          ctx.arc(s.x, s.y, s.r * 4, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      if (!quieto) {
        if (!fugaz && Math.random() < 0.0025) {
          fugaz = { x: Math.random() * w * 0.8, y: Math.random() * h * 0.4, vx: 7 + Math.random() * 4, vy: 3 + Math.random() * 2, vida: 1 }
        }
        if (fugaz) {
          const g = ctx.createLinearGradient(fugaz.x, fugaz.y, fugaz.x - fugaz.vx * 14, fugaz.y - fugaz.vy * 14)
          g.addColorStop(0, `rgba(255,255,255,${fugaz.vida})`)
          g.addColorStop(1, 'rgba(255,255,255,0)')
          ctx.strokeStyle = g
          ctx.lineWidth = 1.6
          ctx.beginPath()
          ctx.moveTo(fugaz.x, fugaz.y)
          ctx.lineTo(fugaz.x - fugaz.vx * 14, fugaz.y - fugaz.vy * 14)
          ctx.stroke()
          fugaz.x += fugaz.vx
          fugaz.y += fugaz.vy
          fugaz.vida -= 0.012
          if (fugaz.vida <= 0 || fugaz.x > w || fugaz.y > h) fugaz = null
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
