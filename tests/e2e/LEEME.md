# Prueba de punta a punta (25 flujos)

Recorre el sistema en el navegador real, por rol: admin, EyC (en tamaño teléfono), Subsecretaría y Secretaría General.
Cubre la edición de comisiones, cargos, dimensiones, personas y actividades; la carga masiva; la evaluación con
comentario obligatorio; los permisos por rol; la recomendación elevada; la decisión con sustitución; y que los avisos
lleven a donde se resuelven.

## Requisitos
- `npm i -D playwright-core` y Microsoft Edge instalado (usa `channel: 'msedge'`).
- Servidor en marcha (`npm run dev`) o `BASE=https://…`.
- Cuatro cuentas de prueba con la misma contraseña: `e2e.admin@`, `e2e.subse@`, `e2e.sg@`, `e2e.eyc@prueba.test`
  (la de EyC asignada a CTD). Créalas desde *Configuración → Cuentas* o por SQL.
- Fases en «pendiente» y sin personas `[E2E]`.

## Ejecutar
```bash
E2E_PASSWORD=... node tests/e2e/flujos.mjs
```

Al terminar, borra los datos `[E2E]` y las cuentas `@prueba.test`. Resultado esperado: `RESUMEN: 25 OK · 0 FALLOS`.
