import { Boton } from './Boton'

/** Botón para deshacer los filtros puestos; solo aparece cuando hay alguno activo, y dice cuántos son. */
export function QuitarFiltros({ activos, onQuitar, className = '' }: { activos: number; onQuitar: () => void; className?: string }) {
  if (!activos) return null
  return (
    <Boton variante="secundario" className={className} onClick={onQuitar}>
      ✕ Quitar {activos === 1 ? 'el filtro' : `los ${activos} filtros`}
    </Boton>
  )
}
