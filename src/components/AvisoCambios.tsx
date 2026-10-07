import { useEffect } from 'react'
import { useBlocker } from 'react-router-dom'
import { Boton } from './Boton'
import { Modal } from './Modal'

/** Bloquea la navegación con cambios sin guardar, con modal propio (y aviso nativo al cerrar la pestaña). */
export function AvisoCambios({ sucio }: { sucio: boolean }) {
  // Una navegación marcada con state.guardado (redirección tras guardar) nunca se bloquea.
  const bloqueo = useBlocker(
    ({ currentLocation, nextLocation }) =>
      sucio && currentLocation.pathname !== nextLocation.pathname && !(nextLocation.state as { guardado?: boolean } | null)?.guardado,
  )

  useEffect(() => {
    if (!sucio) return
    const h = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [sucio])

  return (
    <Modal
      abierto={bloqueo.state === 'blocked'}
      titulo="Tienes cambios sin guardar"
      onCerrar={() => bloqueo.reset?.()}
      acciones={
        <>
          <Boton variante="secundario" onClick={() => bloqueo.reset?.()}>
            Seguir editando
          </Boton>
          <Boton variante="peligro" onClick={() => bloqueo.proceed?.()}>
            Salir sin guardar
          </Boton>
        </>
      }
    >
      <p className="text-ink-2">Si sales ahora, se perderá lo que no hayas guardado.</p>
    </Modal>
  )
}
