/** Formularios sin cuenta: tipos compartidos por el constructor, la página pública y los resultados. */

export type TipoCampo = 'texto' | 'parrafo' | 'numero' | 'fecha' | 'radio' | 'checkbox' | 'lista' | 'escala' | 'si_no'

export const TIPOS_CAMPO: Record<TipoCampo, { nombre: string; descripcion: string }> = {
  texto: { nombre: 'Texto corto', descripcion: 'Una línea de texto' },
  parrafo: { nombre: 'Párrafo', descripcion: 'Respuesta larga' },
  numero: { nombre: 'Número', descripcion: 'Una cifra' },
  fecha: { nombre: 'Fecha', descripcion: 'Un día del calendario' },
  radio: { nombre: 'Opción única', descripcion: 'Se elige una de varias (botones)' },
  checkbox: { nombre: 'Casillas', descripcion: 'Se eligen una o varias' },
  lista: { nombre: 'Lista desplegable', descripcion: 'Se elige una de una lista' },
  escala: { nombre: 'Escala', descripcion: 'Un valor de menos a más (por ejemplo 1 a 5)' },
  si_no: { nombre: 'Sí o no', descripcion: 'Una pregunta de dos respuestas' },
}

/** Quién puede estar respondiendo. La persona elige su rol al entrar al formulario. */
export const ROLES_RESPUESTA: Record<string, string> = {
  delegado: 'Delegado o delegada',
  mesa: 'Miembro de mesa directiva',
  aprendiz: 'Miembro aprendiz',
  eyc: 'Miembro de Evaluación y Control',
  otro: 'Otro',
}

export interface CampoDef {
  id: string
  tipo: TipoCampo
  etiqueta: string
  ayuda: string | null
  obligatorio: boolean
  opciones: string[]
  escala_min: number
  escala_max: number
  /** Vacío = lo responden todos. */
  roles: string[]
}

/** Lo que devuelve `formulario_publico`: lo justo para dibujar el formulario. */
export interface FormularioPublicoDef {
  titulo: string
  descripcion: string | null
  roles: string[]
  pide_comision: boolean
  pide_referencia: boolean
  comisiones: { id: number; sigla: string; nombre: string }[]
  campos: CampoDef[]
}

export type Valor = string | number | boolean | string[] | undefined
export type Valores = Record<string, Valor>

export const opcionesDe = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

/** ¿Este campo le toca responderlo a este rol? */
export const aplicaA = (c: Pick<CampoDef, 'roles'>, rol: string | null) => c.roles.length === 0 || (!!rol && c.roles.includes(rol))

/** Para el borrador local del constructor (los campos nuevos aún no tienen id en la base). */
export interface CampoBorrador {
  clave: string
  id?: string
  tipo: TipoCampo
  etiqueta: string
  ayuda: string
  obligatorio: boolean
  opcionesTexto: string
  escala_min: number
  escala_max: number
  roles: string[]
  /** Solo en preguntas de escala: cuenta para la puntuación de la rotación. */
  puntua: boolean
}

/** Enlace público de un formulario: lo abre cualquier persona, sin cuenta. */
export const enlacePublico = (codigo: string) => `${window.location.origin}/f/${codigo}`
