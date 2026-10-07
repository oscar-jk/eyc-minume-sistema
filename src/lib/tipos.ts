import type { Database } from './database.types'

type Pub = Database['public']
export type Tabla<T extends keyof Pub['Tables']> = Pub['Tables'][T]['Row']
export type Vista<T extends keyof Pub['Views']> = Pub['Views'][T]['Row']
export type Enum<T extends keyof Pub['Enums']> = Pub['Enums'][T]

export type Rol = Enum<'rol_app'>
export type Ambito = Enum<'ambito'>
export type Semaforo = Enum<'semaforo'>
export type Estatus = Enum<'estatus_continuidad'>
export type Respuesta = Enum<'respuesta_criterio'>
export type EstadoFase = Enum<'estado_fase'>
export type MotivoAsignacion = Enum<'motivo_asignacion'>
export type TipoActividad = Enum<'tipo_actividad'>

export type Perfil = Tabla<'perfiles'>
export type Fase = Tabla<'fases'>
export type Corte = Tabla<'cortes'>
export type Comision = Tabla<'comisiones'>
export type Cargo = Tabla<'cargos'>
export type Dimension = Tabla<'dimensiones'>
export type Criterio = Tabla<'criterios'>
export type Persona = Tabla<'personas'>
export type Actividad = Tabla<'actividades'>
