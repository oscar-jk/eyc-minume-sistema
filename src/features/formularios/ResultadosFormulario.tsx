import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Boton } from '@/components/Boton'
import { Cargando, EstadoError, EstadoVacio } from '@/components/Estados'
import { Insignia, Tabla, Tarjeta } from '@/components/Ui'
import { siglaDe, useComisiones } from '@/features/comisiones/api'
import { fechaHora, plural } from '@/lib/formato'
import { useEnviosFormulario, useFormulario, useResultados, type ResumenCampo } from './api'
import { ROLES_RESPUESTA, TIPOS_CAMPO } from './tipos'

const num = (v: unknown) => (typeof v === 'number' || typeof v === 'string' ? Number(v) : 0)
const texto = (v: unknown): string => (v && typeof v === 'object' && !Array.isArray(v) ? String((v as { nombre?: string; otro?: string }).nombre ?? (v as { otro?: string }).otro ?? '') : Array.isArray(v) ? v.join(' · ') : v === true ? 'Sí' : v === false ? 'No' : v == null ? '' : String(v))

function Barras({ datos, total }: { datos: [string, number][]; total: number }) {
  return (
    <ul className="flex flex-col gap-2">
      {datos.map(([k, n]) => {
        const pct = total ? Math.round((n / total) * 100) : 0
        return (
          <li key={k}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-semibold">{k}</span>
              <span className="font-cond tabular text-ink-3">
                {n} · {pct} %
              </span>
            </div>
            <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-surface-2" role="presentation">
              <div className="h-full rounded-full bg-grad-celeste" style={{ width: `${pct}%` }} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function Resumen({ c }: { c: ResumenCampo }) {
  const r = c.resumen as Record<string, unknown>
  if (!c.respuestas) return <p className="text-sm text-ink-3">Sin respuestas todavía.</p>
  switch (c.tipo) {
    case 'radio':
    case 'lista':
    case 'checkbox':
      return <Barras datos={Object.entries(r).map(([k, v]) => [k, num(v)] as [string, number])} total={c.respuestas} />
    case 'si_no':
      return (
        <Barras
          datos={[
            ['Sí', num(r.si)],
            ['No', num(r.no)],
          ]}
          total={c.respuestas}
        />
      )
    case 'escala':
      return (
        <div className="flex flex-col gap-3">
          <p className="flex items-baseline gap-2">
            <span className="texto-grad font-cond text-5xl font-extrabold tabular leading-none">{num(r.promedio).toLocaleString('es-DO')}</span>
            <span className="text-sm text-ink-3">promedio · de {num(r.minimo)} a {num(r.maximo)} entre las respuestas</span>
          </p>
          <Barras datos={Object.entries((r.distribucion ?? {}) as Record<string, number>).sort(([a], [b]) => Number(a) - Number(b))} total={c.respuestas} />
        </div>
      )
    case 'personas': {
      const otros = (r.otros as string[] | undefined) ?? []
      return (
        <div className="flex flex-col gap-3">
          <Barras datos={Object.entries((r.conteo ?? {}) as Record<string, number>).sort(([, a], [, b]) => b - a).map(([k, v]) => [k, num(v)] as [string, number])} total={c.respuestas} />
          {otros.length > 0 && (
            <div>
              <p className="mb-1 text-sm font-bold">Otras personas (externas)</p>
              <ul className="flex flex-wrap gap-1.5 text-sm">
                {otros.map((o, i) => (
                  <li key={i} className="rounded-xl bg-surface-2 px-3 py-1.5 dark:bg-white/[0.05]">
                    {o}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )
    }
    case 'numero':
      return (
        <p className="text-sm text-ink-2">
          Promedio <strong>{num(r.promedio).toLocaleString('es-DO')}</strong> · mínimo {num(r.minimo)} · máximo {num(r.maximo)}
        </p>
      )
    default: {
      const valores = (r.valores as string[] | undefined) ?? []
      return (
        <ul className="flex max-h-72 flex-col gap-1.5 overflow-y-auto pr-1 text-sm">
          {valores.map((v, i) => (
            <li key={i} className="rounded-xl bg-surface-2 px-3 py-2 dark:bg-white/[0.05]">
              {v}
            </li>
          ))}
        </ul>
      )
    }
  }
}

/** Resultados de un formulario: resumen por pregunta (lo calcula la base), cada respuesta y la descarga en CSV. */
export function ResultadosFormulario() {
  const { id } = useParams()
  const form = useFormulario(id)
  const res = useResultados(id)
  const envios = useEnviosFormulario(id)
  const comisiones = useComisiones()
  const campos = useMemo(() => form.data?.campos ?? [], [form.data])

  if (form.isPending || res.isPending) return <Cargando filas={4} />
  if (form.isError) return <EstadoError error={form.error} onReintentar={() => form.refetch()} />
  if (res.isError) return <EstadoError error={res.error} onReintentar={() => res.refetch()} />
  const r = res.data
  const nombreCom = (cid: number | null) => (cid == null ? '' : siglaDe(comisiones.data?.find((c) => c.id === cid)))

  const descargar = () => {
    const cab = ['Fecha', 'Rol', 'Comisión', 'Sesión o taller', ...campos.map((c) => c.etiqueta)]
    const filas = (envios.data ?? []).map((e) => [fechaHora(e.creado_en), ROLES_RESPUESTA[e.rol ?? ''] ?? e.rol ?? '', nombreCom(e.comision_id), e.referencia ?? '', ...campos.map((c) => texto(e.respuestas[c.id]))])
    const csv = [cab, ...filas].map((f) => f.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\r\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    a.download = `${form.data.formulario.titulo.replace(/[^\p{L}\p{N}]+/gu, '-')}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <nav className="text-sm">
        <Link to="/formularios" className="font-bold text-acento">
          ← Formularios
        </Link>
      </nav>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="sobretitulo text-acento">Resultados</p>
          <h1 className="text-[clamp(1.6rem,5vw,2.3rem)] font-black leading-tight tracking-tight">{form.data.formulario.titulo}</h1>
        </div>
        <div className="flex gap-2">
          <Link to={`/formularios/${id}`} className="inline-flex min-h-12 items-center rounded-2xl px-4 font-bold text-acento">
            Editar
          </Link>
          <Boton variante="secundario" onClick={descargar} disabled={!envios.data?.length}>
            Descargar CSV
          </Boton>
        </div>
      </header>

      <Tarjeta titulo={plural(r.envios, 'respuesta', 'respuestas')}>
        <div className="flex flex-wrap gap-2">
          {Object.entries(r.por_rol).map(([k, n]) => (
            <Insignia key={k} tono="acento">
              {ROLES_RESPUESTA[k] ?? k}: {n}
            </Insignia>
          ))}
          {r.envios === 0 && <p className="text-sm text-ink-3">Todavía nadie ha respondido. Comparte el enlace del formulario.</p>}
        </div>
      </Tarjeta>

      {r.campos.map((c) => (
        <Tarjeta key={c.campo_id} titulo={c.etiqueta + (c.activo ? '' : ' (oculta)')}>
          <p className="mb-3 font-cond text-sm text-ink-3">
            {TIPOS_CAMPO[c.tipo].nombre} · {plural(c.respuestas, 'respuesta', 'respuestas')}
          </p>
          <Resumen c={c} />
        </Tarjeta>
      ))}

      <Tarjeta titulo="Cada respuesta">
        {envios.isPending ? (
          <Cargando filas={3} />
        ) : !envios.data?.length ? (
          <EstadoVacio titulo="Sin respuestas" />
        ) : (
          <Tabla etiqueta="Respuestas recibidas">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Rol</th>
                <th>Comisión</th>
                <th>Sesión o taller</th>
                {campos.map((c) => (
                  <th key={c.id}>{c.etiqueta}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {envios.data.map((e) => (
                <tr key={e.id}>
                  <td className="tabular whitespace-nowrap">{fechaHora(e.creado_en)}</td>
                  <td>{ROLES_RESPUESTA[e.rol ?? ''] ?? e.rol}</td>
                  <td>{nombreCom(e.comision_id)}</td>
                  <td>{e.referencia}</td>
                  {campos.map((c) => (
                    <td key={c.id}>{texto(e.respuestas[c.id])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Tabla>
        )}
      </Tarjeta>
    </div>
  )
}
