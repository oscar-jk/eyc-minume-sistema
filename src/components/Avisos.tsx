import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type Tono = 'exito' | 'error'
interface Item {
  id: number
  texto: string
  tono: Tono
}

const Ctx = createContext<(texto: string, tono?: Tono) => void>(() => {})

/** Notificaciones breves, anunciadas a lectores de pantalla. */
export function ProveedorAvisos({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([])
  const avisar = useCallback((texto: string, tono: Tono = 'exito') => {
    const id = Date.now() + Math.random()
    setItems((xs) => [...xs, { id, texto, tono }])
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), tono === 'error' ? 7000 : 4000)
  }, [])

  return (
    <Ctx.Provider value={avisar}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 sm:bottom-6">
        {items.map((i) => (
          <div
            key={i.id}
            role={i.tono === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto max-w-md rounded-xl px-4 py-3 text-sm font-semibold shadow-card ${
              i.tono === 'error' ? 'bg-danger text-accent-ink' : 'bg-ink text-bg'
            }`}
          >
            {i.texto}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAvisar = () => useContext(Ctx)
