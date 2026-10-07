export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      actividades: {
        Row: {
          ambito: Database["public"]["Enums"]["ambito"]
          cerrada: boolean
          comision_id: number | null
          creado_en: string
          creado_por: string | null
          fase_id: number
          fecha: string
          id: string
          nombre: string
          tipo: Database["public"]["Enums"]["tipo_actividad"]
        }
        Insert: {
          ambito?: Database["public"]["Enums"]["ambito"]
          cerrada?: boolean
          comision_id?: number | null
          creado_en?: string
          creado_por?: string | null
          fase_id: number
          fecha: string
          id?: string
          nombre: string
          tipo: Database["public"]["Enums"]["tipo_actividad"]
        }
        Update: {
          ambito?: Database["public"]["Enums"]["ambito"]
          cerrada?: boolean
          comision_id?: number | null
          creado_en?: string
          creado_por?: string | null
          fase_id?: number
          fecha?: string
          id?: string
          nombre?: string
          tipo?: Database["public"]["Enums"]["tipo_actividad"]
        }
        Relationships: [
          {
            foreignKeyName: "actividades_comision_id_fkey"
            columns: ["comision_id"]
            isOneToOne: false
            referencedRelation: "comisiones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actividades_comision_id_fkey"
            columns: ["comision_id"]
            isOneToOne: false
            referencedRelation: "v_cobertura"
            referencedColumns: ["comision_id"]
          },
          {
            foreignKeyName: "actividades_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actividades_fase_id_fkey"
            columns: ["fase_id"]
            isOneToOne: false
            referencedRelation: "fases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actividades_fase_id_fkey"
            columns: ["fase_id"]
            isOneToOne: false
            referencedRelation: "v_cobertura"
            referencedColumns: ["fase_id"]
          },
        ]
      }
      asignaciones: {
        Row: {
          cargo_id: number
          cargo_unico: boolean
          comision_id: number
          creado_en: string
          creado_por: string | null
          desde: string
          hasta: string | null
          id: string
          motivo: Database["public"]["Enums"]["motivo_asignacion"]
          nota: string | null
          persona_id: string
        }
        Insert: {
          cargo_id: number
          cargo_unico?: boolean
          comision_id: number
          creado_en?: string
          creado_por?: string | null
          desde?: string
          hasta?: string | null
          id?: string
          motivo: Database["public"]["Enums"]["motivo_asignacion"]
          nota?: string | null
          persona_id: string
        }
        Update: {
          cargo_id?: number
          cargo_unico?: boolean
          comision_id?: number
          creado_en?: string
          creado_por?: string | null
          desde?: string
          hasta?: string | null
          id?: string
          motivo?: Database["public"]["Enums"]["motivo_asignacion"]
          nota?: string | null
          persona_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asignaciones_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignaciones_comision_id_fkey"
            columns: ["comision_id"]
            isOneToOne: false
            referencedRelation: "comisiones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignaciones_comision_id_fkey"
            columns: ["comision_id"]
            isOneToOne: false
            referencedRelation: "v_cobertura"
            referencedColumns: ["comision_id"]
          },
          {
            foreignKeyName: "asignaciones_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignaciones_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "v_continuidad_actual"
            referencedColumns: ["persona_id"]
          },
          {
            foreignKeyName: "asignaciones_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "v_monitoreo"
            referencedColumns: ["persona_id"]
          },
          {
            foreignKeyName: "asignaciones_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "v_puntaje_corte"
            referencedColumns: ["persona_id"]
          },
          {
            foreignKeyName: "asignaciones_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "v_puntaje_final"
            referencedColumns: ["persona_id"]
          },
        ]
      }
      auditoria: {
        Row: {
          accion: string
          antes: Json | null
          autor: string | null
          despues: Json | null
          fecha: string
          id: number
          registro: string | null
          tabla: string
        }
        Insert: {
          accion: string
          antes?: Json | null
          autor?: string | null
          despues?: Json | null
          fecha?: string
          id?: never
          registro?: string | null
          tabla: string
        }
        Update: {
          accion?: string
          antes?: Json | null
          autor?: string | null
          despues?: Json | null
          fecha?: string
          id?: never
          registro?: string | null
          tabla?: string
        }
        Relationships: []
      }
      cargos: {
        Row: {
          ambito: Database["public"]["Enums"]["ambito"]
          clave: string
          id: number
          nombre: string
          orden: number
          unico_por_comision: boolean
        }
        Insert: {
          ambito: Database["public"]["Enums"]["ambito"]
          clave: string
          id?: never
          nombre: string
          orden?: number
          unico_por_comision?: boolean
        }
        Update: {
          ambito?: Database["public"]["Enums"]["ambito"]
          clave?: string
          id?: never
          nombre?: string
          orden?: number
          unico_por_comision?: boolean
        }
        Relationships: []
      }
      comisiones: {
        Row: {
          activa: boolean
          clave: string
          id: number
          nombre: string
          orden: number
          sigla: string | null
        }
        Insert: {
          activa?: boolean
          clave: string
          id?: never
          nombre: string
          orden?: number
          sigla?: string | null
        }
        Update: {
          activa?: boolean
          clave?: string
          id?: never
          nombre?: string
          orden?: number
          sigla?: string | null
        }
        Relationships: []
      }
      config: {
        Row: {
          clave: string
          descripcion: string
          provisional: boolean
          valor: Json
        }
        Insert: {
          clave: string
          descripcion: string
          provisional?: boolean
          valor: Json
        }
        Update: {
          clave?: string
          descripcion?: string
          provisional?: boolean
          valor?: Json
        }
        Relationships: []
      }
      cortes: {
        Row: {
          clave: string
          id: number
          nombre: string
          orden: number
          peso: number
          proposito: string
          umbral_amarillo: number
          umbral_verde: number
        }
        Insert: {
          clave: string
          id?: never
          nombre: string
          orden?: number
          peso: number
          proposito: string
          umbral_amarillo?: number
          umbral_verde?: number
        }
        Update: {
          clave?: string
          id?: never
          nombre?: string
          orden?: number
          peso?: number
          proposito?: string
          umbral_amarillo?: number
          umbral_verde?: number
        }
        Relationships: []
      }
      criterios: {
        Row: {
          activo: boolean
          actualizado_en: string
          actualizado_por: string | null
          ambito: Database["public"]["Enums"]["ambito"]
          codigo: string
          dimension_id: number
          favorable: Database["public"]["Enums"]["respuesta_criterio"]
          id: number
          orden: number
          texto: string
          version: number
        }
        Insert: {
          activo?: boolean
          actualizado_en?: string
          actualizado_por?: string | null
          ambito: Database["public"]["Enums"]["ambito"]
          codigo: string
          dimension_id: number
          favorable: Database["public"]["Enums"]["respuesta_criterio"]
          id?: never
          orden?: number
          texto: string
          version?: number
        }
        Update: {
          activo?: boolean
          actualizado_en?: string
          actualizado_por?: string | null
          ambito?: Database["public"]["Enums"]["ambito"]
          codigo?: string
          dimension_id?: number
          favorable?: Database["public"]["Enums"]["respuesta_criterio"]
          id?: never
          orden?: number
          texto?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "criterios_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "dimensiones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "criterios_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "v_evaluacion_dimension"
            referencedColumns: ["dimension_id"]
          },
        ]
      }
      criterios_historial: {
        Row: {
          activo: boolean
          autor: string | null
          criterio_id: number
          favorable: Database["public"]["Enums"]["respuesta_criterio"]
          id: number
          texto: string
          version: number
          vigente_hasta: string
        }
        Insert: {
          activo: boolean
          autor?: string | null
          criterio_id: number
          favorable: Database["public"]["Enums"]["respuesta_criterio"]
          id?: never
          texto: string
          version: number
          vigente_hasta?: string
        }
        Update: {
          activo?: boolean
          autor?: string | null
          criterio_id?: number
          favorable?: Database["public"]["Enums"]["respuesta_criterio"]
          id?: never
          texto?: string
          version?: number
          vigente_hasta?: string
        }
        Relationships: [
          {
            foreignKeyName: "criterios_historial_criterio_id_fkey"
            columns: ["criterio_id"]
            isOneToOne: false
            referencedRelation: "criterios"
            referencedColumns: ["id"]
          },
        ]
      }
      decisiones: {
        Row: {
          autor_id: string
          comentario: string | null
          corte_id: number
          creado_en: string
          decision: Database["public"]["Enums"]["estatus_continuidad"]
          elevada: boolean
          id: string
          persona_id: string
          recomendacion_id: string
        }
        Insert: {
          autor_id: string
          comentario?: string | null
          corte_id: number
          creado_en?: string
          decision: Database["public"]["Enums"]["estatus_continuidad"]
          elevada: boolean
          id?: string
          persona_id: string
          recomendacion_id: string
        }
        Update: {
          autor_id?: string
          comentario?: string | null
          corte_id?: number
          creado_en?: string
          decision?: Database["public"]["Enums"]["estatus_continuidad"]
          elevada?: boolean
          id?: string
          persona_id?: string
          recomendacion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "decisiones_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisiones_corte_id_fkey"
            columns: ["corte_id"]
            isOneToOne: false
            referencedRelation: "cortes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisiones_corte_id_fkey"
            columns: ["corte_id"]
            isOneToOne: false
            referencedRelation: "v_monitoreo"
            referencedColumns: ["corte_id"]
          },
          {
            foreignKeyName: "decisiones_corte_id_fkey"
            columns: ["corte_id"]
            isOneToOne: false
            referencedRelation: "v_puntaje_corte"
            referencedColumns: ["corte_id"]
          },
          {
            foreignKeyName: "decisiones_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisiones_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "v_continuidad_actual"
            referencedColumns: ["persona_id"]
          },
          {
            foreignKeyName: "decisiones_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "v_monitoreo"
            referencedColumns: ["persona_id"]
          },
          {
            foreignKeyName: "decisiones_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "v_puntaje_corte"
            referencedColumns: ["persona_id"]
          },
          {
            foreignKeyName: "decisiones_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "v_puntaje_final"
            referencedColumns: ["persona_id"]
          },
          {
            foreignKeyName: "decisiones_recomendacion_id_fkey"
            columns: ["recomendacion_id"]
            isOneToOne: true
            referencedRelation: "recomendaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisiones_recomendacion_id_fkey"
            columns: ["recomendacion_id"]
            isOneToOne: true
            referencedRelation: "v_casos"
            referencedColumns: ["recomendacion_id"]
          },
          {
            foreignKeyName: "decisiones_recomendacion_id_fkey"
            columns: ["recomendacion_id"]
            isOneToOne: true
            referencedRelation: "v_monitoreo"
            referencedColumns: ["recomendacion_id"]
          },
        ]
      }
      dimensiones: {
        Row: {
          clave: string
          competencias: string
          id: number
          nombre: string
          orden: number
        }
        Insert: {
          clave: string
          competencias: string
          id?: never
          nombre: string
          orden?: number
        }
        Update: {
          clave?: string
          competencias?: string
          id?: never
          nombre?: string
          orden?: number
        }
        Relationships: []
      }
      evaluacion_dimensiones: {
        Row: {
          comentario: string | null
          dimension_id: number
          evaluacion_id: string
          no_observado: boolean
        }
        Insert: {
          comentario?: string | null
          dimension_id: number
          evaluacion_id: string
          no_observado?: boolean
        }
        Update: {
          comentario?: string | null
          dimension_id?: number
          evaluacion_id?: string
          no_observado?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "evaluacion_dimensiones_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "dimensiones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluacion_dimensiones_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "v_evaluacion_dimension"
            referencedColumns: ["dimension_id"]
          },
          {
            foreignKeyName: "evaluacion_dimensiones_evaluacion_id_fkey"
            columns: ["evaluacion_id"]
            isOneToOne: false
            referencedRelation: "evaluaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluacion_dimensiones_evaluacion_id_fkey"
            columns: ["evaluacion_id"]
            isOneToOne: false
            referencedRelation: "v_evaluacion_dimension"
            referencedColumns: ["evaluacion_id"]
          },
          {
            foreignKeyName: "evaluacion_dimensiones_evaluacion_id_fkey"
            columns: ["evaluacion_id"]
            isOneToOne: false
            referencedRelation: "v_evaluacion_puntaje"
            referencedColumns: ["evaluacion_id"]
          },
          {
            foreignKeyName: "evaluacion_dimensiones_evaluacion_id_fkey"
            columns: ["evaluacion_id"]
            isOneToOne: false
            referencedRelation: "v_evaluaciones"
            referencedColumns: ["evaluacion_id"]
          },
        ]
      }
      evaluaciones: {
        Row: {
          actividad_id: string | null
          actualizado_en: string
          ambito: Database["public"]["Enums"]["ambito"]
          asignacion_id: string | null
          comentario_general: string | null
          completada_en: string | null
          corte_id: number
          creado_en: string
          estado: Database["public"]["Enums"]["estado_evaluacion"]
          evaluador_id: string | null
          fase_id: number
          fecha_jornada: string | null
          id: string
          observacion_rotacion: string | null
          persona_id: string
        }
        Insert: {
          actividad_id?: string | null
          actualizado_en?: string
          ambito: Database["public"]["Enums"]["ambito"]
          asignacion_id?: string | null
          comentario_general?: string | null
          completada_en?: string | null
          corte_id: number
          creado_en?: string
          estado?: Database["public"]["Enums"]["estado_evaluacion"]
          evaluador_id?: string | null
          fase_id: number
          fecha_jornada?: string | null
          id?: string
          observacion_rotacion?: string | null
          persona_id: string
        }
        Update: {
          actividad_id?: string | null
          actualizado_en?: string
          ambito?: Database["public"]["Enums"]["ambito"]
          asignacion_id?: string | null
          comentario_general?: string | null
          completada_en?: string | null
          corte_id?: number
          creado_en?: string
          estado?: Database["public"]["Enums"]["estado_evaluacion"]
          evaluador_id?: string | null
          fase_id?: number
          fecha_jornada?: string | null
          id?: string
          observacion_rotacion?: string | null
          persona_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluaciones_actividad_id_fkey"
            columns: ["actividad_id"]
            isOneToOne: false
            referencedRelation: "actividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluaciones_asignacion_id_fkey"
            columns: ["asignacion_id"]
            isOneToOne: false
            referencedRelation: "asignaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluaciones_asignacion_id_fkey"
            columns: ["asignacion_id"]
            isOneToOne: false
            referencedRelation: "v_asignaciones_vigentes"
            referencedColumns: ["asignacion_id"]
          },
          {
            foreignKeyName: "evaluaciones_corte_id_fkey"
            columns: ["corte_id"]
            isOneToOne: false
            referencedRelation: "cortes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluaciones_corte_id_fkey"
            columns: ["corte_id"]
            isOneToOne: false
            referencedRelation: "v_monitoreo"
            referencedColumns: ["corte_id"]
          },
          {
            foreignKeyName: "evaluaciones_corte_id_fkey"
            columns: ["corte_id"]
            isOneToOne: false
            referencedRelation: "v_puntaje_corte"
            referencedColumns: ["corte_id"]
          },
          {
            foreignKeyName: "evaluaciones_evaluador_id_fkey"
            columns: ["evaluador_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluaciones_fase_id_fkey"
            columns: ["fase_id"]
            isOneToOne: false
            referencedRelation: "fases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluaciones_fase_id_fkey"
            columns: ["fase_id"]
            isOneToOne: false
            referencedRelation: "v_cobertura"
            referencedColumns: ["fase_id"]
          },
          {
            foreignKeyName: "evaluaciones_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluaciones_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "v_continuidad_actual"
            referencedColumns: ["persona_id"]
          },
          {
            foreignKeyName: "evaluaciones_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "v_monitoreo"
            referencedColumns: ["persona_id"]
          },
          {
            foreignKeyName: "evaluaciones_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "v_puntaje_corte"
            referencedColumns: ["persona_id"]
          },
          {
            foreignKeyName: "evaluaciones_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "v_puntaje_final"
            referencedColumns: ["persona_id"]
          },
        ]
      }
      fases: {
        Row: {
          clave: string
          corte_id: number
          es_evento: boolean
          estado: Database["public"]["Enums"]["estado_fase"]
          fin: string | null
          id: number
          inicio: string | null
          nombre: string
          orden: number
          permite_rotacion: boolean
          tipo: Database["public"]["Enums"]["tipo_fase"]
        }
        Insert: {
          clave: string
          corte_id: number
          es_evento?: boolean
          estado?: Database["public"]["Enums"]["estado_fase"]
          fin?: string | null
          id?: never
          inicio?: string | null
          nombre: string
          orden?: number
          permite_rotacion?: boolean
          tipo: Database["public"]["Enums"]["tipo_fase"]
        }
        Update: {
          clave?: string
          corte_id?: number
          es_evento?: boolean
          estado?: Database["public"]["Enums"]["estado_fase"]
          fin?: string | null
          id?: never
          inicio?: string | null
          nombre?: string
          orden?: number
          permite_rotacion?: boolean
          tipo?: Database["public"]["Enums"]["tipo_fase"]
        }
        Relationships: [
          {
            foreignKeyName: "fases_corte_id_fkey"
            columns: ["corte_id"]
            isOneToOne: false
            referencedRelation: "cortes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fases_corte_id_fkey"
            columns: ["corte_id"]
            isOneToOne: false
            referencedRelation: "v_monitoreo"
            referencedColumns: ["corte_id"]
          },
          {
            foreignKeyName: "fases_corte_id_fkey"
            columns: ["corte_id"]
            isOneToOne: false
            referencedRelation: "v_puntaje_corte"
            referencedColumns: ["corte_id"]
          },
        ]
      }
      perfiles: {
        Row: {
          activo: boolean
          comision_id: number | null
          creado_en: string
          email: string
          id: string
          nombre: string
          persona_id: string | null
          rol: Database["public"]["Enums"]["rol_app"] | null
        }
        Insert: {
          activo?: boolean
          comision_id?: number | null
          creado_en?: string
          email: string
          id: string
          nombre?: string
          persona_id?: string | null
          rol?: Database["public"]["Enums"]["rol_app"] | null
        }
        Update: {
          activo?: boolean
          comision_id?: number | null
          creado_en?: string
          email?: string
          id?: string
          nombre?: string
          persona_id?: string | null
          rol?: Database["public"]["Enums"]["rol_app"] | null
        }
        Relationships: [
          {
            foreignKeyName: "perfiles_comision_id_fkey"
            columns: ["comision_id"]
            isOneToOne: false
            referencedRelation: "comisiones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "perfiles_comision_id_fkey"
            columns: ["comision_id"]
            isOneToOne: false
            referencedRelation: "v_cobertura"
            referencedColumns: ["comision_id"]
          },
          {
            foreignKeyName: "perfiles_persona_fk"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "perfiles_persona_fk"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "v_continuidad_actual"
            referencedColumns: ["persona_id"]
          },
          {
            foreignKeyName: "perfiles_persona_fk"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "v_monitoreo"
            referencedColumns: ["persona_id"]
          },
          {
            foreignKeyName: "perfiles_persona_fk"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "v_puntaje_corte"
            referencedColumns: ["persona_id"]
          },
          {
            foreignKeyName: "perfiles_persona_fk"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "v_puntaje_final"
            referencedColumns: ["persona_id"]
          },
        ]
      }
      personas: {
        Row: {
          activa: boolean
          ambito: Database["public"]["Enums"]["ambito"]
          cargo_base_id: number | null
          comision_origen_id: number | null
          correo: string | null
          creado_en: string
          creado_por: string | null
          id: string
          nombre: string
          notas: string | null
        }
        Insert: {
          activa?: boolean
          ambito: Database["public"]["Enums"]["ambito"]
          cargo_base_id?: number | null
          comision_origen_id?: number | null
          correo?: string | null
          creado_en?: string
          creado_por?: string | null
          id?: string
          nombre: string
          notas?: string | null
        }
        Update: {
          activa?: boolean
          ambito?: Database["public"]["Enums"]["ambito"]
          cargo_base_id?: number | null
          comision_origen_id?: number | null
          correo?: string | null
          creado_en?: string
          creado_por?: string | null
          id?: string
          nombre?: string
          notas?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personas_cargo_base_id_fkey"
            columns: ["cargo_base_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personas_comision_origen_id_fkey"
            columns: ["comision_origen_id"]
            isOneToOne: false
            referencedRelation: "comisiones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personas_comision_origen_id_fkey"
            columns: ["comision_origen_id"]
            isOneToOne: false
            referencedRelation: "v_cobertura"
            referencedColumns: ["comision_id"]
          },
        ]
      }
      pesos_dimension: {
        Row: {
          ambito: Database["public"]["Enums"]["ambito"]
          dimension_id: number
          peso: number
        }
        Insert: {
          ambito: Database["public"]["Enums"]["ambito"]
          dimension_id: number
          peso: number
        }
        Update: {
          ambito?: Database["public"]["Enums"]["ambito"]
          dimension_id?: number
          peso?: number
        }
        Relationships: [
          {
            foreignKeyName: "pesos_dimension_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "dimensiones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pesos_dimension_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "v_evaluacion_dimension"
            referencedColumns: ["dimension_id"]
          },
        ]
      }
      recomendaciones: {
        Row: {
          actualizado_en: string
          autor_id: string
          comentario: string | null
          corte_id: number
          creado_en: string
          id: string
          n_evaluaciones: number
          persona_id: string
          puntaje_registrado: number | null
          recomendacion: Database["public"]["Enums"]["estatus_continuidad"]
          semaforo_registrado: Database["public"]["Enums"]["semaforo"]
        }
        Insert: {
          actualizado_en?: string
          autor_id: string
          comentario?: string | null
          corte_id: number
          creado_en?: string
          id?: string
          n_evaluaciones?: number
          persona_id: string
          puntaje_registrado?: number | null
          recomendacion: Database["public"]["Enums"]["estatus_continuidad"]
          semaforo_registrado: Database["public"]["Enums"]["semaforo"]
        }
        Update: {
          actualizado_en?: string
          autor_id?: string
          comentario?: string | null
          corte_id?: number
          creado_en?: string
          id?: string
          n_evaluaciones?: number
          persona_id?: string
          puntaje_registrado?: number | null
          recomendacion?: Database["public"]["Enums"]["estatus_continuidad"]
          semaforo_registrado?: Database["public"]["Enums"]["semaforo"]
        }
        Relationships: [
          {
            foreignKeyName: "recomendaciones_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recomendaciones_corte_id_fkey"
            columns: ["corte_id"]
            isOneToOne: false
            referencedRelation: "cortes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recomendaciones_corte_id_fkey"
            columns: ["corte_id"]
            isOneToOne: false
            referencedRelation: "v_monitoreo"
            referencedColumns: ["corte_id"]
          },
          {
            foreignKeyName: "recomendaciones_corte_id_fkey"
            columns: ["corte_id"]
            isOneToOne: false
            referencedRelation: "v_puntaje_corte"
            referencedColumns: ["corte_id"]
          },
          {
            foreignKeyName: "recomendaciones_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recomendaciones_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "v_continuidad_actual"
            referencedColumns: ["persona_id"]
          },
          {
            foreignKeyName: "recomendaciones_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "v_monitoreo"
            referencedColumns: ["persona_id"]
          },
          {
            foreignKeyName: "recomendaciones_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "v_puntaje_corte"
            referencedColumns: ["persona_id"]
          },
          {
            foreignKeyName: "recomendaciones_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "v_puntaje_final"
            referencedColumns: ["persona_id"]
          },
        ]
      }
      respuestas: {
        Row: {
          comentario: string | null
          criterio_id: number
          dimension_id: number
          evaluacion_id: string
          favorable: Database["public"]["Enums"]["respuesta_criterio"]
          respuesta: Database["public"]["Enums"]["respuesta_criterio"]
          texto: string
        }
        Insert: {
          comentario?: string | null
          criterio_id: number
          dimension_id: number
          evaluacion_id: string
          favorable: Database["public"]["Enums"]["respuesta_criterio"]
          respuesta: Database["public"]["Enums"]["respuesta_criterio"]
          texto: string
        }
        Update: {
          comentario?: string | null
          criterio_id?: number
          dimension_id?: number
          evaluacion_id?: string
          favorable?: Database["public"]["Enums"]["respuesta_criterio"]
          respuesta?: Database["public"]["Enums"]["respuesta_criterio"]
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "respuestas_criterio_id_fkey"
            columns: ["criterio_id"]
            isOneToOne: false
            referencedRelation: "criterios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respuestas_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "dimensiones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respuestas_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "v_evaluacion_dimension"
            referencedColumns: ["dimension_id"]
          },
          {
            foreignKeyName: "respuestas_evaluacion_id_fkey"
            columns: ["evaluacion_id"]
            isOneToOne: false
            referencedRelation: "evaluaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respuestas_evaluacion_id_fkey"
            columns: ["evaluacion_id"]
            isOneToOne: false
            referencedRelation: "v_evaluacion_dimension"
            referencedColumns: ["evaluacion_id"]
          },
          {
            foreignKeyName: "respuestas_evaluacion_id_fkey"
            columns: ["evaluacion_id"]
            isOneToOne: false
            referencedRelation: "v_evaluacion_puntaje"
            referencedColumns: ["evaluacion_id"]
          },
          {
            foreignKeyName: "respuestas_evaluacion_id_fkey"
            columns: ["evaluacion_id"]
            isOneToOne: false
            referencedRelation: "v_evaluaciones"
            referencedColumns: ["evaluacion_id"]
          },
        ]
      }
    }
    Views: {
      v_asignaciones_vigentes: {
        Row: {
          ambito: Database["public"]["Enums"]["ambito"] | null
          asignacion_id: string | null
          cargo_id: number | null
          cargo_nombre: string | null
          cargo_orden: number | null
          comision_clave: string | null
          comision_id: number | null
          comision_nombre: string | null
          comision_sigla: string | null
          desde: string | null
          motivo: Database["public"]["Enums"]["motivo_asignacion"] | null
          persona_id: string | null
          persona_nombre: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asignaciones_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignaciones_comision_id_fkey"
            columns: ["comision_id"]
            isOneToOne: false
            referencedRelation: "comisiones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignaciones_comision_id_fkey"
            columns: ["comision_id"]
            isOneToOne: false
            referencedRelation: "v_cobertura"
            referencedColumns: ["comision_id"]
          },
          {
            foreignKeyName: "asignaciones_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignaciones_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "v_continuidad_actual"
            referencedColumns: ["persona_id"]
          },
          {
            foreignKeyName: "asignaciones_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "v_monitoreo"
            referencedColumns: ["persona_id"]
          },
          {
            foreignKeyName: "asignaciones_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "v_puntaje_corte"
            referencedColumns: ["persona_id"]
          },
          {
            foreignKeyName: "asignaciones_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "v_puntaje_final"
            referencedColumns: ["persona_id"]
          },
        ]
      }
      v_casos: {
        Row: {
          activa: boolean | null
          ambito: Database["public"]["Enums"]["ambito"] | null
          corte_clave: string | null
          corte_id: number | null
          corte_nombre: string | null
          decision: Database["public"]["Enums"]["estatus_continuidad"] | null
          decision_autor: string | null
          decision_autor_nombre: string | null
          decision_comentario: string | null
          decision_fecha: string | null
          decision_id: string | null
          elevada: boolean | null
          n_evaluaciones: number | null
          pendiente: boolean | null
          persona_id: string | null
          persona_nombre: string | null
          puntaje_registrado: number | null
          recomendacion:
            | Database["public"]["Enums"]["estatus_continuidad"]
            | null
          recomendacion_autor: string | null
          recomendacion_autor_nombre: string | null
          recomendacion_comentario: string | null
          recomendacion_fecha: string | null
          recomendacion_id: string | null
          semaforo_registrado: Database["public"]["Enums"]["semaforo"] | null
        }
        Relationships: [
          {
            foreignKeyName: "decisiones_autor_id_fkey"
            columns: ["decision_autor"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recomendaciones_autor_id_fkey"
            columns: ["recomendacion_autor"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recomendaciones_corte_id_fkey"
            columns: ["corte_id"]
            isOneToOne: false
            referencedRelation: "cortes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recomendaciones_corte_id_fkey"
            columns: ["corte_id"]
            isOneToOne: false
            referencedRelation: "v_monitoreo"
            referencedColumns: ["corte_id"]
          },
          {
            foreignKeyName: "recomendaciones_corte_id_fkey"
            columns: ["corte_id"]
            isOneToOne: false
            referencedRelation: "v_puntaje_corte"
            referencedColumns: ["corte_id"]
          },
          {
            foreignKeyName: "recomendaciones_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recomendaciones_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "v_continuidad_actual"
            referencedColumns: ["persona_id"]
          },
          {
            foreignKeyName: "recomendaciones_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "v_monitoreo"
            referencedColumns: ["persona_id"]
          },
          {
            foreignKeyName: "recomendaciones_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "v_puntaje_corte"
            referencedColumns: ["persona_id"]
          },
          {
            foreignKeyName: "recomendaciones_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "v_puntaje_final"
            referencedColumns: ["persona_id"]
          },
        ]
      }
      v_cobertura: {
        Row: {
          borradores: number | null
          comision_clave: string | null
          comision_id: number | null
          comision_nombre: string | null
          comision_sigla: string | null
          completas: number | null
          esperadas: number | null
          fase_estado: Database["public"]["Enums"]["estado_fase"] | null
          fase_id: number | null
          fase_nombre: string | null
          porcentaje: number | null
        }
        Relationships: []
      }
      v_continuidad_actual: {
        Row: {
          activa: boolean | null
          ambito: Database["public"]["Enums"]["ambito"] | null
          corte_id: number | null
          decidido_en: string | null
          estatus: Database["public"]["Enums"]["estatus_continuidad"] | null
          nombre: string | null
          persona_id: string | null
          tiene_pendiente: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "decisiones_corte_id_fkey"
            columns: ["corte_id"]
            isOneToOne: false
            referencedRelation: "cortes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisiones_corte_id_fkey"
            columns: ["corte_id"]
            isOneToOne: false
            referencedRelation: "v_monitoreo"
            referencedColumns: ["corte_id"]
          },
          {
            foreignKeyName: "decisiones_corte_id_fkey"
            columns: ["corte_id"]
            isOneToOne: false
            referencedRelation: "v_puntaje_corte"
            referencedColumns: ["corte_id"]
          },
        ]
      }
      v_evaluacion_dimension: {
        Row: {
          ambito: Database["public"]["Enums"]["ambito"] | null
          clave: string | null
          dimension_id: number | null
          evaluacion_id: string | null
          marcada_no_observada: boolean | null
          n_favorables: number | null
          n_observados: number | null
          observada: boolean | null
          peso: number | null
          puntos: number | null
        }
        Relationships: []
      }
      v_evaluacion_puntaje: {
        Row: {
          actividad_id: string | null
          actualizado_en: string | null
          ambito: Database["public"]["Enums"]["ambito"] | null
          asignacion_id: string | null
          comentario_general: string | null
          completada_en: string | null
          corte_id: number | null
          creado_en: string | null
          dimensiones_observadas: number | null
          estado: Database["public"]["Enums"]["estado_evaluacion"] | null
          evaluacion_id: string | null
          evaluador_id: string | null
          fase_id: number | null
          fecha_jornada: string | null
          observacion_rotacion: string | null
          persona_id: string | null
          pesos_validos: boolean | null
          puntaje: number | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluaciones_actividad_id_fkey"
            columns: ["actividad_id"]
            isOneToOne: false
            referencedRelation: "actividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluaciones_asignacion_id_fkey"
            columns: ["asignacion_id"]
            isOneToOne: false
            referencedRelation: "asignaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluaciones_asignacion_id_fkey"
            columns: ["asignacion_id"]
            isOneToOne: false
            referencedRelation: "v_asignaciones_vigentes"
            referencedColumns: ["asignacion_id"]
          },
          {
            foreignKeyName: "evaluaciones_corte_id_fkey"
            columns: ["corte_id"]
            isOneToOne: false
            referencedRelation: "cortes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluaciones_corte_id_fkey"
            columns: ["corte_id"]
            isOneToOne: false
            referencedRelation: "v_monitoreo"
            referencedColumns: ["corte_id"]
          },
          {
            foreignKeyName: "evaluaciones_corte_id_fkey"
            columns: ["corte_id"]
            isOneToOne: false
            referencedRelation: "v_puntaje_corte"
            referencedColumns: ["corte_id"]
          },
          {
            foreignKeyName: "evaluaciones_evaluador_id_fkey"
            columns: ["evaluador_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluaciones_fase_id_fkey"
            columns: ["fase_id"]
            isOneToOne: false
            referencedRelation: "fases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluaciones_fase_id_fkey"
            columns: ["fase_id"]
            isOneToOne: false
            referencedRelation: "v_cobertura"
            referencedColumns: ["fase_id"]
          },
          {
            foreignKeyName: "evaluaciones_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluaciones_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "v_continuidad_actual"
            referencedColumns: ["persona_id"]
          },
          {
            foreignKeyName: "evaluaciones_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "v_monitoreo"
            referencedColumns: ["persona_id"]
          },
          {
            foreignKeyName: "evaluaciones_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "v_puntaje_corte"
            referencedColumns: ["persona_id"]
          },
          {
            foreignKeyName: "evaluaciones_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "v_puntaje_final"
            referencedColumns: ["persona_id"]
          },
        ]
      }
      v_evaluaciones: {
        Row: {
          actividad_id: string | null
          actividad_nombre: string | null
          actividad_tipo: Database["public"]["Enums"]["tipo_actividad"] | null
          actualizado_en: string | null
          ambito: Database["public"]["Enums"]["ambito"] | null
          asignacion_id: string | null
          cargo_nombre: string | null
          comentario_general: string | null
          comision_id: number | null
          comision_nombre: string | null
          comision_sigla: string | null
          completada_en: string | null
          corte_clave: string | null
          corte_id: number | null
          corte_nombre: string | null
          dimensiones_observadas: number | null
          estado: Database["public"]["Enums"]["estado_evaluacion"] | null
          evaluacion_id: string | null
          evaluador_id: string | null
          evaluador_nombre: string | null
          fase_estado: Database["public"]["Enums"]["estado_fase"] | null
          fase_id: number | null
          fase_nombre: string | null
          fecha: string | null
          fecha_jornada: string | null
          observacion_rotacion: string | null
          persona_id: string | null
          persona_nombre: string | null
          pesos_validos: boolean | null
          puntaje: number | null
        }
        Relationships: [
          {
            foreignKeyName: "asignaciones_comision_id_fkey"
            columns: ["comision_id"]
            isOneToOne: false
            referencedRelation: "comisiones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignaciones_comision_id_fkey"
            columns: ["comision_id"]
            isOneToOne: false
            referencedRelation: "v_cobertura"
            referencedColumns: ["comision_id"]
          },
          {
            foreignKeyName: "evaluaciones_actividad_id_fkey"
            columns: ["actividad_id"]
            isOneToOne: false
            referencedRelation: "actividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluaciones_asignacion_id_fkey"
            columns: ["asignacion_id"]
            isOneToOne: false
            referencedRelation: "asignaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluaciones_asignacion_id_fkey"
            columns: ["asignacion_id"]
            isOneToOne: false
            referencedRelation: "v_asignaciones_vigentes"
            referencedColumns: ["asignacion_id"]
          },
          {
            foreignKeyName: "evaluaciones_corte_id_fkey"
            columns: ["corte_id"]
            isOneToOne: false
            referencedRelation: "cortes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluaciones_corte_id_fkey"
            columns: ["corte_id"]
            isOneToOne: false
            referencedRelation: "v_monitoreo"
            referencedColumns: ["corte_id"]
          },
          {
            foreignKeyName: "evaluaciones_corte_id_fkey"
            columns: ["corte_id"]
            isOneToOne: false
            referencedRelation: "v_puntaje_corte"
            referencedColumns: ["corte_id"]
          },
          {
            foreignKeyName: "evaluaciones_evaluador_id_fkey"
            columns: ["evaluador_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluaciones_fase_id_fkey"
            columns: ["fase_id"]
            isOneToOne: false
            referencedRelation: "fases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluaciones_fase_id_fkey"
            columns: ["fase_id"]
            isOneToOne: false
            referencedRelation: "v_cobertura"
            referencedColumns: ["fase_id"]
          },
          {
            foreignKeyName: "evaluaciones_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluaciones_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "v_continuidad_actual"
            referencedColumns: ["persona_id"]
          },
          {
            foreignKeyName: "evaluaciones_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "v_monitoreo"
            referencedColumns: ["persona_id"]
          },
          {
            foreignKeyName: "evaluaciones_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "v_puntaje_corte"
            referencedColumns: ["persona_id"]
          },
          {
            foreignKeyName: "evaluaciones_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "v_puntaje_final"
            referencedColumns: ["persona_id"]
          },
        ]
      }
      v_monitoreo: {
        Row: {
          activa: boolean | null
          ambito: Database["public"]["Enums"]["ambito"] | null
          cargo_id: number | null
          cargo_nombre: string | null
          comision_id: number | null
          comision_nombre: string | null
          comision_sigla: string | null
          corte_clave: string | null
          corte_id: number | null
          corte_nombre: string | null
          decision: Database["public"]["Enums"]["estatus_continuidad"] | null
          decision_id: string | null
          elevada: boolean | null
          estatus: Database["public"]["Enums"]["estatus_continuidad"] | null
          n_borradores: number | null
          n_evaluaciones: number | null
          nombre: string | null
          persona_id: string | null
          pesos_validos: boolean | null
          puntaje: number | null
          recomendacion:
            | Database["public"]["Enums"]["estatus_continuidad"]
            | null
          recomendacion_comentario: string | null
          recomendacion_id: string | null
          semaforo: Database["public"]["Enums"]["semaforo"] | null
          tiene_pendiente: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "asignaciones_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignaciones_comision_id_fkey"
            columns: ["comision_id"]
            isOneToOne: false
            referencedRelation: "comisiones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignaciones_comision_id_fkey"
            columns: ["comision_id"]
            isOneToOne: false
            referencedRelation: "v_cobertura"
            referencedColumns: ["comision_id"]
          },
        ]
      }
      v_pesos_ambito: {
        Row: {
          ambito: Database["public"]["Enums"]["ambito"] | null
          diferencia: number | null
          suma: number | null
          valido: boolean | null
        }
        Relationships: []
      }
      v_pesos_cortes: {
        Row: {
          diferencia: number | null
          suma: number | null
          valido: boolean | null
        }
        Relationships: []
      }
      v_puntaje_corte: {
        Row: {
          activa: boolean | null
          ambito: Database["public"]["Enums"]["ambito"] | null
          corte_clave: string | null
          corte_id: number | null
          corte_nombre: string | null
          corte_peso: number | null
          n_borradores: number | null
          n_evaluaciones: number | null
          nombre: string | null
          persona_id: string | null
          pesos_validos: boolean | null
          puntaje: number | null
          semaforo: Database["public"]["Enums"]["semaforo"] | null
        }
        Relationships: []
      }
      v_puntaje_final: {
        Row: {
          activa: boolean | null
          ambito: Database["public"]["Enums"]["ambito"] | null
          c1_n: number | null
          c1_puntaje: number | null
          c1_semaforo: Database["public"]["Enums"]["semaforo"] | null
          c2_n: number | null
          c2_puntaje: number | null
          c2_semaforo: Database["public"]["Enums"]["semaforo"] | null
          completo: boolean | null
          final_n: number | null
          final_puntaje: number | null
          final_semaforo: Database["public"]["Enums"]["semaforo"] | null
          nombre: string | null
          persona_id: string | null
          puntaje_final: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      alta_personas: { Args: { p: Json; p_desde?: string }; Returns: number }
      asignados_en: {
        Args: { p_comision: number; p_fecha: string }
        Returns: {
          ambito: Database["public"]["Enums"]["ambito"]
          asignacion_id: string
          cargo_id: number
          cargo_nombre: string
          cargo_orden: number
          desde: string
          dominante: boolean
          evaluacion_estado: Database["public"]["Enums"]["estado_evaluacion"]
          evaluacion_id: string
          hasta: string
          persona_id: string
          persona_nombre: string
        }[]
      }
      contexto_actual: {
        Args: never
        Returns: {
          dia_evento: number
          evento_dias: number
          evento_inicio: string
          hoy: string
        }[]
      }
      decidir: {
        Args: {
          p_comentario?: string
          p_decision: Database["public"]["Enums"]["estatus_continuidad"]
          p_recomendacion: string
          p_sustitucion?: Json
        }
        Returns: string
      }
      faltantes_evaluacion: {
        Args: { p_evaluacion: string }
        Returns: {
          criterio: string
          dimension: string
          motivo: string
        }[]
      }
      guardar_cortes: { Args: { p_cortes: Json }; Returns: undefined }
      guardar_evaluacion: { Args: { p: Json }; Returns: string }
      guardar_pesos: {
        Args: { p_ambito: Database["public"]["Enums"]["ambito"]; p_pesos: Json }
        Returns: undefined
      }
      keepalive: { Args: never; Returns: string }
      mover_asignaciones: {
        Args: {
          p_desde?: string
          p_motivo?: Database["public"]["Enums"]["motivo_asignacion"]
          p_movs: Json
          p_nota?: string
        }
        Returns: undefined
      }
      registrar_recomendacion: {
        Args: {
          p_comentario?: string
          p_corte: number
          p_persona: string
          p_recomendacion: Database["public"]["Enums"]["estatus_continuidad"]
        }
        Returns: string
      }
      reprogramar_evento: {
        Args: { p_dias: number; p_inicio: string }
        Returns: undefined
      }
      semaforo_para: {
        Args: { p_amarillo: number; p_puntaje: number; p_verde: number }
        Returns: Database["public"]["Enums"]["semaforo"]
      }
      sustituir: {
        Args: {
          p_desde?: string
          p_entrante: Json
          p_nota?: string
          p_saliente: string
        }
        Returns: string
      }
    }
    Enums: {
      ambito: "mesa" | "eyc"
      estado_evaluacion: "borrador" | "completa"
      estado_fase: "pendiente" | "abierta" | "cerrada"
      estatus_continuidad:
        | "continua"
        | "seguimiento"
        | "sustitucion"
        | "no_evaluado"
      motivo_asignacion: "inicial" | "rotacion" | "sustitucion" | "ajuste"
      respuesta_criterio: "si" | "no" | "no_observado"
      rol_app: "eyc" | "subsecretario" | "secretario" | "admin"
      semaforo: "verde" | "amarillo" | "rojo" | "gris"
      tipo_actividad: "taller" | "capacitacion" | "reunion" | "otra"
      tipo_fase: "evaluacion" | "recomendacion"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      ambito: ["mesa", "eyc"],
      estado_evaluacion: ["borrador", "completa"],
      estado_fase: ["pendiente", "abierta", "cerrada"],
      estatus_continuidad: [
        "continua",
        "seguimiento",
        "sustitucion",
        "no_evaluado",
      ],
      motivo_asignacion: ["inicial", "rotacion", "sustitucion", "ajuste"],
      respuesta_criterio: ["si", "no", "no_observado"],
      rol_app: ["eyc", "subsecretario", "secretario", "admin"],
      semaforo: ["verde", "amarillo", "rojo", "gris"],
      tipo_actividad: ["taller", "capacitacion", "reunion", "otra"],
      tipo_fase: ["evaluacion", "recomendacion"],
    },
  },
} as const
