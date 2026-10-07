import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Boton } from '@/components/Boton'
import { Selector } from '@/components/Campo'
import { Consulta, EstadoVacio } from '@/components/Estados'
import { Semaforo } from '@/components/Semaforo'
import { Acento, Aviso, Insignia, Titulo } from '@/components/Ui'
import { useSesion } from '@/features/auth/AuthProvider'
import { TablaCortes } from '@/features/cortes/TablaCortes'
import { ESTATUS, fechaHora } from '@/lib/formato'
import type { Semaforo as TSemaforo, Vista } from '@/lib/tipos'
import { useCasos } from './api'
import { DecisionModal } from './Modales'

type Caso = Vista<'v_casos'>

export function DecisionesPage() {
  const { perfil } = useSesion()
  const esSG = perfil?.rol === 'secretario' || perfil?.rol === 'admin'
  const esSub = perfil?.rol === 'subsecretario' || perfil?.rol === 'admin'
  const [estado, setEstado] = useState<'pendientes' | 'decididas' | 'todas'>('pendientes')
  const [alcance, setAlcance] = useState<'mios' | 'elevadas' | 'subse' | 'todas'>('mios')
  const [sem, setSem] = useState<'' | TSemaforo>('')
  const [decidir, setDecidir] = useState<Caso | null>(null)
  const q = useCasos()

  const puedeDecidir = (c: Caso) => c.pendiente && (c.elevada ? esSG : esSub)

  const filtrar = (c: Caso) =>
    (estado === 'todas' || (estado === 'pendientes' ? c.pendiente : !c.pendiente)) &&
    (alcance === 'todas' ||
      (alcance === 'elevadas' && c.elevada) ||
      (alcance === 'subse' && !c.elevada) ||
      (alcance === 'mios' && (c.elevada ? esSG : esSub))) &&
    (!sem || c.semaforo_registrado === sem)

  return (
    <>
      <Titulo sobre="Continuidad" adorno="flor" sub={esSG && !esSub ? 'Casos elevados: rojo o recomendación de sustitución' : 'Recomendaciones por cerrar y casos elevados'}>
        Decisiones <Acento>de</Acento> continuidad
      </Titulo>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Selector etiqueta="Estado" value={estado} onChange={(e) => setEstado(e.target.value as typeof estado)}>
          <option value="pendientes">Pendientes</option>
          <option value="decididas">Decididas</option>
          <option value="todas">Todas</option>
        </Selector>
        <Selector etiqueta="Casos" value={alcance} onChange={(e) => setAlcance(e.target.value as typeof alcance)}>
          <option value="mios">Los que me toca decidir</option>
          <option value="elevadas">Elevados a Secretaría General</option>
          <option value="subse">Los que cierra la Subsecretaría</option>
          <option value="todas">Todos</option>
        </Selector>
        <Selector etiqueta="Semáforo" value={sem} onChange={(e) => setSem(e.target.value as TSemaforo | '')}>
          <option value="">Todos</option>
          <option value="rojo">Rojo — En riesgo</option>
          <option value="amarillo">Amarillo — Seguimiento</option>
          <option value="verde">Verde — Cumple</option>
          <option value="gris">Gris — No evaluado</option>
        </Selector>
      </div>
      <Consulta q={q} filas={4} vacio={<EstadoVacio titulo="Aún no hay recomendaciones registradas" />}>
        {(casos) => {
          const lista = casos.filter(filtrar)
          if (!lista.length) return <EstadoVacio titulo={estado === 'pendientes' ? 'No hay casos pendientes' : 'Nada coincide con los filtros'} />
          return (
            <ul className="flex flex-col gap-3">
              {lista.map((c) => (
                <CasoTarjeta key={c.recomendacion_id} caso={c} puedeDecidir={!!puedeDecidir(c)} onDecidir={() => setDecidir(c)} />
              ))}
            </ul>
          )
        }}
      </Consulta>
      {decidir && <DecisionModal key={decidir.recomendacion_id} caso={decidir} onCerrar={() => setDecidir(null)} />}
    </>
  )
}

function CasoTarjeta({ caso: c, puedeDecidir, onDecidir }: { caso: Caso; puedeDecidir: boolean; onDecidir: () => void }) {
  const [ver, setVer] = useState(false)
  return (
    <li className={`rounded-2xl border bg-surface p-4 shadow-card ${c.elevada && c.pendiente ? 'border-rojo' : 'border-line'}`}>
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1 basis-56">
          <Link to={`/personas/${c.persona_id}`} className="text-lg font-bold hover:underline">
            {c.persona_nombre}
          </Link>
          <p className="font-cond text-sm text-ink-3">
            {c.corte_nombre} · recomendado por {c.recomendacion_autor_nombre ?? '—'} el {fechaHora(c.recomendacion_fecha)}
          </p>
        </div>
        {c.elevada && <Insignia tono="peligro">Elevado a Secretaría General</Insignia>}
        {c.pendiente ? <Insignia tono="alerta">Pendiente</Insignia> : <Insignia tono="exito">Decidido</Insignia>}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Semaforo semaforo={c.semaforo_registrado} puntaje={c.puntaje_registrado} n={c.n_evaluaciones} />
        <Insignia tono="acento">Recomendación: {c.recomendacion && ESTATUS[c.recomendacion]}</Insignia>
      </div>
      {c.recomendacion_comentario && <p className="mt-2 text-ink-2">«{c.recomendacion_comentario}»</p>}
      {!c.pendiente && (
        <div className="mt-3">
          <Aviso tono="exito" titulo={`Decisión: ${c.decision && ESTATUS[c.decision]}`}>
            {c.decision_comentario && <span className="block">«{c.decision_comentario}»</span>}
            <span className="block">
              {c.decision_autor_nombre} · {fechaHora(c.decision_fecha)}
            </span>
          </Aviso>
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Boton variante="fantasma" aria-expanded={ver} onClick={() => setVer((v) => !v)}>
          {ver ? 'Ocultar historial' : 'Ver historial completo'}
        </Boton>
        {puedeDecidir && <Boton onClick={onDecidir}>Decidir</Boton>}
      </div>
      {ver && (
        <div className="mt-3 border-t border-line pt-3">
          <TablaCortes personaId={c.persona_id!} />
        </div>
      )}
    </li>
  )
}
