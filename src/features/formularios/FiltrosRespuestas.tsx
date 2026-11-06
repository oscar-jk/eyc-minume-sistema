import { useMemo } from 'react'
import { Boton } from '@/components/Boton'
import { Campo, Selector } from '@/components/Campo'
import { siglaDe } from '@/features/comisiones/api'
import { opcionesDe, ROLES_RESPUESTA } from './tipos'
import { FILTROS_VACIOS, OTRO, hayFiltros, type CampoMin, type EnvioMin, type FiltroCampo, type Filtros, type ModoCampo } from './filtrarRespuestas'

interface ComisionMin {
  id: number
  sigla: string | null
  clave: string
}

const TIPOS_OPCION = ['radio', 'lista', 'checkbox']

/** Un filtro por pregunta: elige la pregunta y qué respuesta buscar. */
function FilaCampo({ f, campos, onCambio, onQuitar }: { f: FiltroCampo; campos: CampoMin[]; onCambio: (c: Partial<FiltroCampo>) => void; onQuitar: () => void }) {
  const c = campos.find((x) => x.id === f.campoId)
  const ops = c ? opcionesDe(c.opciones) : []
  return (
    <li className="grid items-end gap-3 rounded-2xl border border-line bg-surface-2 p-3 sm:grid-cols-[1.4fr_1fr_1.2fr_auto] dark:bg-white/[0.04]">
      <Selector etiqueta="Pregunta" value={f.campoId} onChange={(e) => onCambio({ campoId: e.target.value, valor: '', min: '', max: '' })}>
        {campos.map((x) => (
          <option key={x.id} value={x.id}>
            {x.etiqueta}
            {x.activo ? '' : ' (oculta)'}
          </option>
        ))}
      </Selector>
      <Selector etiqueta="Condición" value={f.modo} onChange={(e) => onCambio({ modo: e.target.value as ModoCampo })}>
        <option value="valor">{c && TIPOS_OPCION.includes(c.tipo) ? 'Eligió' : c?.tipo === 'escala' || c?.tipo === 'numero' ? 'Está entre' : c?.tipo === 'si_no' ? 'Respondió' : 'Contiene'}</option>
        <option value="lleno">La respondió (cualquier cosa)</option>
        <option value="vacio">No la respondió</option>
      </Selector>
      {f.modo !== 'valor' || !c ? (
        <div />
      ) : TIPOS_OPCION.includes(c.tipo) ? (
        <Selector etiqueta="Opción" value={f.valor} onChange={(e) => onCambio({ valor: e.target.value })}>
          <option value="">Elige…</option>
          {ops.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
          {c.con_otro && <option value={OTRO}>Otro (escribieron la suya)</option>}
        </Selector>
      ) : c.tipo === 'si_no' ? (
        <Selector etiqueta="Respuesta" value={f.valor} onChange={(e) => onCambio({ valor: e.target.value })}>
          <option value="">Elige…</option>
          <option value="si">Sí</option>
          <option value="no">No</option>
        </Selector>
      ) : c.tipo === 'escala' || c.tipo === 'numero' ? (
        <div className="grid grid-cols-2 gap-2">
          <Campo etiqueta="Desde" type="number" inputMode="decimal" value={f.min} onChange={(e) => onCambio({ min: e.target.value })} />
          <Campo etiqueta="Hasta" type="number" inputMode="decimal" value={f.max} onChange={(e) => onCambio({ max: e.target.value })} />
        </div>
      ) : (
        <Campo etiqueta="Texto" placeholder="Palabra o frase" value={f.valor} onChange={(e) => onCambio({ valor: e.target.value })} />
      )}
      <Boton variante="fantasma" className="text-danger" onClick={onQuitar}>
        Quitar
      </Boton>
    </li>
  )
}

/** Filtros de las respuestas: quién respondió (comisión, rol, sesión, fechas), qué respondió (por pregunta) y búsqueda libre. */
export function FiltrosRespuestas({
  filtros,
  onCambio,
  campos,
  envios,
  comisiones,
  miComision,
  mostrados,
}: {
  filtros: Filtros
  onCambio: (f: Filtros) => void
  campos: CampoMin[]
  envios: EnvioMin[]
  comisiones: ComisionMin[]
  /** Comisión de la cuenta (solo EyC): activa el atajo «Mi comisión». */
  miComision: number | null
  mostrados: number
}) {
  const poner = (c: Partial<Filtros>) => onCambio({ ...filtros, ...c })
  const siglaCom = (id: number) => siglaDe(comisiones.find((c) => c.id === id))

  const presentes = useMemo(() => {
    const coms = new Map<number, number>()
    const roles = new Map<string, number>()
    const refs = new Set<string>()
    for (const e of envios) {
      if (e.comision_id != null) coms.set(e.comision_id, (coms.get(e.comision_id) ?? 0) + 1)
      roles.set(e.rol ?? '', (roles.get(e.rol ?? '') ?? 0) + 1)
      if (e.referencia) refs.add(e.referencia)
    }
    return {
      comisiones: [...coms.entries()].map(([id, n]) => ({ id, n, sigla: siglaDe(comisiones.find((c) => c.id === id)) })).sort((a, b) => a.sigla.localeCompare(b.sigla)),
      roles: [...roles.entries()].sort(([a], [b]) => a.localeCompare(b)),
      referencias: [...refs].sort((a, b) => a.localeCompare(b)),
    }
  }, [envios, comisiones])

  const nueva = () => poner({ campos: [...filtros.campos, { clave: Date.now(), campoId: campos[0]?.id ?? '', modo: 'valor', valor: '', min: '', max: '' }] })
  const cambiarCampo = (clave: number, c: Partial<FiltroCampo>) => poner({ campos: filtros.campos.map((x) => (x.clave === clave ? { ...x, ...c } : x)) })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {miComision != null && (
          <Boton variante={filtros.comision === String(miComision) ? 'primario' : 'secundario'} onClick={() => poner({ comision: filtros.comision === String(miComision) ? '' : String(miComision) })}>
            Solo mi comisión ({siglaCom(miComision)})
          </Boton>
        )}
        <p className="font-cond text-sm text-ink-3" aria-live="polite">
          {hayFiltros(filtros) ? `Mostrando ${mostrados} de ${envios.length} respuestas` : `${envios.length} respuestas`}
        </p>
        {hayFiltros(filtros) && (
          <Boton variante="fantasma" onClick={() => onCambio(FILTROS_VACIOS)}>
            Quitar filtros
          </Boton>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Selector filtro etiqueta="Comisión de quien respondió" value={filtros.comision} onChange={(e) => poner({ comision: e.target.value })}>
          <option value="">Todas</option>
          {presentes.comisiones.map((c) => (
            <option key={c.id} value={c.id}>
              {c.sigla} ({c.n})
            </option>
          ))}
        </Selector>
        <Selector filtro etiqueta="Quién respondió (rol)" value={filtros.rol} onChange={(e) => poner({ rol: e.target.value })}>
          <option value="">Todos</option>
          {presentes.roles.map(([r, n]) => (
            <option key={r} value={r}>
              {ROLES_RESPUESTA[r] ?? (r || 'Sin rol')} ({n})
            </option>
          ))}
        </Selector>
        {presentes.referencias.length > 0 && (
          <Selector filtro etiqueta="Sesión o taller" value={filtros.referencia} onChange={(e) => poner({ referencia: e.target.value })}>
            <option value="">Todos</option>
            {presentes.referencias.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Selector>
        )}
        <Campo filtro etiqueta="Desde (fecha de envío)" type="date" value={filtros.desde} onChange={(e) => poner({ desde: e.target.value })} />
        <Campo filtro etiqueta="Hasta (fecha de envío)" type="date" value={filtros.hasta} onChange={(e) => poner({ hasta: e.target.value })} />
        <Campo filtro etiqueta="Buscar en las respuestas" placeholder="Una palabra o frase" value={filtros.texto} onChange={(e) => poner({ texto: e.target.value })} />
      </div>

      {campos.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold">Por lo que respondieron</p>
            <Boton variante="secundario" onClick={nueva}>
              Agregar filtro por pregunta
            </Boton>
          </div>
          {filtros.campos.length === 0 ? (
            <p className="text-sm text-ink-3">Por ejemplo: quienes eligieron «No» en una pregunta, o respondieron 3 o menos en una escala. Puedes combinar varios.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {filtros.campos.map((f) => (
                <FilaCampo key={f.clave} f={f} campos={campos} onCambio={(c) => cambiarCampo(f.clave, c)} onQuitar={() => poner({ campos: filtros.campos.filter((x) => x.clave !== f.clave) })} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
