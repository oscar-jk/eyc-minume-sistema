/**
 * Reglas de la rotación de mesas directivas (documento «Sistema de Rotación de Mesas Directivas»).
 *
 * - No rota la mesa completa: cada miembro de mesa pasa a OTRA comisión. La Subsecretaría de EyC decide a mano
 *   la comisión y el cargo de cada persona; el sistema solo cuida las reglas y avisa de lo que no cuadra.
 * - Los miembros de EyC y los aprendices se quedan fijos en su comisión.
 * - Las comisiones marcadas como «no rota» (CIJ) conservan a su mesa.
 * - Los días 2 y 3 de sesiones se rota; cada día cada persona debería ir a una comisión distinta de las que ya conoció (se avisa si no).
 *
 * Todo aquí es lógica pura (sin red): el resultado se envía a la base en una sola transacción.
 */

/** Un lugar ocupado hoy: quién está, en qué comisión y con qué cargo. */
export interface Casilla {
  personaId: string
  comisionId: number
  cargoId: number
  /** Orden de la comisión en el catálogo (para recorrerlas siempre igual). */
  orden: number
}

export interface Destino {
  comisionId: number
  cargoId: number
}

/** Destino propuesto para cada persona. */
export type Plan = Map<string, Destino>
/** Comisiones por las que ya pasó cada persona (incluida la actual). */
export type Historial = Map<string, Set<number>>

export const claveDestino = (d: Destino) => `${d.comisionId}:${d.cargoId}`

/** Comisiones que no rotan por defecto (CIJ) cuando todavía no se ha guardado la regla en la configuración. */
export const SIN_ROTACION_POR_DEFECTO = ['cij']
/** Primer día de sesiones (lunes 16 de noviembre de 2026) y cantidad de días de sesiones. */
export const SESIONES_INICIO_POR_DEFECTO = '2026-11-16'
export const SESIONES_DIAS_POR_DEFECTO = 3

/** Fecha ISO del día n de sesiones (1 = primer día). */
export function diaDeSesiones(inicio: string, n: number): string {
  const d = new Date(`${inicio}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n - 1)
  return d.toISOString().slice(0, 10)
}

/** Instante en que empieza ese día en la zona del evento (República Dominicana: UTC−4, sin horario de verano). */
export function inicioDelDia(fecha: string): string {
  return `${fecha}T00:00:00-04:00`
}

/** Plan de partida: nadie se mueve. La Subse decide a mano la comisión y el cargo de cada persona. */
export function planInicial(casillas: Casilla[]): Plan {
  return new Map(casillas.map((c) => [c.personaId, { comisionId: c.comisionId, cargoId: c.cargoId }]))
}

/** Cambia el destino de una persona. Si otra ya iba a ese lugar, recibe el que esta deja (nadie queda duplicado); si estaba libre, solo se ocupa. */
export function cambiarDestino(plan: Plan, personaId: string, nuevo: Destino): Plan {
  const copia: Plan = new Map(plan)
  const anterior = copia.get(personaId)
  if (!anterior) return copia
  const k = claveDestino(nuevo)
  const otro = [...copia.entries()].find(([id, d]) => id !== personaId && claveDestino(d) === k)
  copia.set(personaId, nuevo)
  if (otro) copia.set(otro[0], anterior)
  return copia
}

export interface Revision {
  /** Van a una comisión por la que ya pasaron. */
  repiten: string[]
  /** Se quedarían exactamente donde están. */
  sinCambio: string[]
}

export function revisarPlan(plan: Plan, casillas: Casilla[], historial: Historial): Revision {
  const repiten: string[] = []
  const sinCambio: string[] = []
  for (const c of casillas) {
    const d = plan.get(c.personaId)
    if (!d) continue
    if (d.comisionId === c.comisionId && d.cargoId === c.cargoId) sinCambio.push(c.personaId)
    else if (d.comisionId !== c.comisionId && historial.get(c.personaId)?.has(d.comisionId)) repiten.push(c.personaId)
  }
  return { repiten, sinCambio }
}

/** Solo los movimientos reales (quien se queda donde está no genera movimiento). */
export function movimientosDelPlan(plan: Plan, casillas: Casilla[]) {
  return casillas.flatMap((c) => {
    const d = plan.get(c.personaId)
    if (!d || (d.comisionId === c.comisionId && d.cargoId === c.cargoId)) return []
    return [{ persona_id: c.personaId, comision_id: d.comisionId, cargo_id: d.cargoId }]
  })
}

/**
 * ¿Rota esta persona? Solo los miembros de mesa con cargo rotable (no aprendices),
 * en comisiones que no estén marcadas como «no rota».
 */
export function esRotable(p: { ambito: string | null; cargoClave: string | null; comisionClave: string | null }, sinRotacion: ReadonlySet<string>): boolean {
  if (p.ambito !== 'mesa') return false
  if (!p.cargoClave || p.cargoClave === 'aprendiz' || p.cargoClave === 'eyc') return false
  if (!p.comisionClave || sinRotacion.has(p.comisionClave)) return false
  return true
}
