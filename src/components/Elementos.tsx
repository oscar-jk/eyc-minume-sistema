import { useId, type SVGProps } from 'react'

/* Elementos gráficos de la identidad MXVII (trazos tomados de los SVG oficiales del Drive). */

type Props = SVGProps<SVGSVGElement> & { tono?: 'azul' | 'rosa' | 'celeste' | 'actual' }

const TONOS = {
  azul: ['#002193', '#0090fb'],
  rosa: ['#ffc6ff', '#e53535'],
  celeste: ['#00b5ff', '#00f0e6'],
} as const

function useRelleno(tono: Props['tono']) {
  const id = useId().replace(/:/g, '')
  if (!tono || tono === 'actual') return { fill: 'currentColor', defs: null }
  const [a, b] = TONOS[tono]
  return {
    fill: `url(#g${id})`,
    defs: (
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
      </defs>
    ),
  }
}

/** Estrella de ocho puntas (elemento de marca y viñeta). */
export function Estrella8({ tono = 'actual', ...p }: Props) {
  const r = useRelleno(tono)
  return (
    <svg viewBox="0 0 100 100" aria-hidden {...p}>
      {r.defs}
      <path
        fill={r.fill}
        d="M50 0 61 23 86 14 77 39 100 50 77 61 86 86 61 77 50 100 39 77 14 86 23 61 0 50 23 39 14 14 39 23Z"
      />
    </svg>
  )
}

/** Destello de cuatro puntas (como en «2026 ✦ MINUME de ESTRELLAS»). */
export function Destello({ tono = 'actual', ...p }: Props) {
  const r = useRelleno(tono)
  return (
    <svg viewBox="0 0 100 100" aria-hidden {...p}>
      {r.defs}
      <path fill={r.fill} d="M50 0C54 30 70 46 100 50 70 54 54 70 50 100 46 70 30 54 0 50 30 46 46 30 50 0Z" />
    </svg>
  )
}

/** Flor geométrica (Recurso 27). */
export function Flor({ tono = 'rosa', ...p }: Props) {
  const r = useRelleno(tono)
  return (
    <svg viewBox="0 0 466.89 466.89" aria-hidden {...p}>
      {r.defs}
      <path
        fill={r.fill}
        d="M0,233.44c128.93,0,233.44,104.52,233.44,233.44h-116.72c0-64.46-52.26-116.72-116.72-116.72v-116.72ZM466.89,350.16c-64.46,0-116.72,52.26-116.72,116.72h-116.72c0-128.93,104.52-233.44,233.44-233.44v116.72ZM233.44,0c0,128.93-104.52,233.44-233.44,233.44v-116.72c64.46,0,116.72-52.26,116.72-116.72h116.72ZM350.16,0c0,64.46,52.26,116.72,116.72,116.72v116.72c-128.93,0-233.44-104.52-233.44-233.44h116.72Z"
      />
    </svg>
  )
}

/** «N» geométrica (Recurso 28). */
export function Bloques({ tono = 'azul', ...p }: Props) {
  const r = useRelleno(tono)
  return (
    <svg viewBox="0 0 489.22 489.22" aria-hidden {...p}>
      {r.defs}
      <path
        fill={r.fill}
        d="M244.61,366.91v122.3h-121.35l-62.11-63.06L0,366.91v-122.3h122.3l122.3,122.3ZM489.22,366.91v122.3h-121.35l-62.11-63.06-61.15-59.24v-122.3h122.3l122.3,122.3ZM244.61,122.3v122.3h-121.35l-62.11-63.06L0,122.3V0h122.3l122.3,122.3ZM489.22,122.3v122.3h-121.35l-62.11-63.06-61.15-59.24V0h122.3l122.3,122.3Z"
      />
    </svg>
  )
}

/** Damero (Recurso 31). */
export function Damero({ tono = 'azul', ...p }: Props) {
  const r = useRelleno(tono)
  return (
    <svg viewBox="0 0 493.18 493.18" aria-hidden {...p}>
      {r.defs}
      <path
        fill={r.fill}
        d="M246.59,493.18h-123.3v-123.3h123.3v123.3ZM493.18,493.18h-123.3v-123.3h123.3v123.3ZM123.3,369.89H0v-123.3h123.3v123.3ZM369.89,369.89h-123.3v-123.3h123.3v123.3ZM246.59,246.59h-123.3v-123.3h123.3v123.3ZM493.18,246.59h-123.3v-123.3h123.3v123.3ZM123.3,123.3H0V0h123.3v123.3ZM369.89,123.3h-123.3V0h123.3v123.3Z"
      />
    </svg>
  )
}

/** Rejilla de círculos (Recurso 15). */
export function Circulos({ tono = 'azul', ...p }: Props) {
  const r = useRelleno(tono)
  const cs = []
  for (let y = 0; y < 4; y++) for (let x = 0; x < 6; x++) cs.push(<circle key={`${x}-${y}`} cx={65 + x * 130} cy={65 + y * 130} r={63} fill={r.fill} />)
  return (
    <svg viewBox="0 0 781.81 521.2" aria-hidden {...p}>
      {r.defs}
      {cs}
    </svg>
  )
}

/** Piezas del anillo pixelado: generadas una sola vez con semilla fija (dibujo estable). */
const PIEZAS_ANILLO = (() => {
  const out: { k: string; w: number; r: number; ang: number; op: number }[] = []
  let semilla = 7
  const azar = () => (semilla = (semilla * 9301 + 49297) % 233280) / 233280
  for (const a of [
    { r: 150, n: 64, w: 16 },
    { r: 128, n: 56, w: 14 },
    { r: 107, n: 48, w: 12 },
    { r: 88, n: 40, w: 10 },
  ]) {
    for (let i = 0; i < a.n; i++) {
      if (azar() < 0.42) continue
      out.push({ k: a.r + '-' + i, w: a.w, r: a.r, ang: (i / a.n) * 360, op: 0.25 + azar() * 0.75 })
    }
  }
  return out
})()

/** Anillo pixelado radial (fondo de la portada de identidad). */
export function Anillo({ className = '', ...p }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="-170 -170 340 340" aria-hidden className={className} {...p}>
      <circle r="160" fill="none" stroke="currentColor" strokeOpacity="0.15" />
      <circle r="78" fill="none" stroke="currentColor" strokeOpacity="0.15" />
      {PIEZAS_ANILLO.map((x) => (
        <rect key={x.k} x={-x.w / 2} y={-x.r - x.w / 2} width={x.w} height={x.w} rx={2} fill="currentColor" opacity={x.op} transform={`rotate(${x.ang})`} />
      ))}
    </svg>
  )
}
