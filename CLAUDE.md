# ForexBot — Reglas del Proyecto

## 1. Versión — 4 lugares obligatorios

Cada vez que se cambie la versión hay que actualizarla en **exactamente estos 4 lugares** (arquitectura Node.js `src/`):

| # | Archivo | Ubicación |
|---|---|---|
| 1 | `src/ui/panel/index.html` | `<title>ForexBot vX.X — Panel</title>` |
| 2 | `src/ui/panel/index.html` | `<h1>FOREXBOT <small>vX.X</small>` |
| 3 | `src/adapters/telegram-bot.js` | `notify('✅ <b>ForexBot vX.X</b> conectado...')` |
| 4 | `src/adapters/telegram-bot.js` | `/status` y `/help` headers |

**Nunca actualizar solo algunos — los 4 siempre en el mismo commit.**

## 2. Versionado semántico

| Tipo de cambio | Qué incrementar | Ejemplo |
|---|---|---|
| Bugfix, ajuste pequeño, tweak, feature | Número minor | `v25.0` → `v25.1` |
| Cambio grande / refactor mayor | Versión mayor | `v25.x` → `v26.0` |

Regla práctica: si el cambio afecta el comportamiento core del bot (motor de señales, gestión de riesgo, arquitectura) → versión mayor. Si es fix, ajuste o feature adicional → v25.X.

## 3. Commit y push obligatorio al terminar

Después de cada tarea completada:

```bash
git add src/ui/panel/index.html src/adapters/telegram-bot.js <otros archivos modificados>
git commit -m "vX.X — <descripción breve>"
git push origin main
```

- El mensaje de commit debe incluir la versión nueva.
- No dejar cambios sin commitear al final de la sesión.
- Si hay múltiples archivos modificados, incluirlos todos en el mismo commit.

## 4. Estructura del proyecto

- `server.js` — entry point Node.js
- `src/engine/` — state, tick-manager, kill-switch, storage
- `src/layers/` — l1-regime → l6-position (pipeline de señales)
- `src/adapters/` — binance-connector, telegram-bot
- `src/ui/` — servidor Express + panel web (`panel/index.html`)
- `memory/` — memoria persistente de Claude para este proyecto

## 5. Notas de desarrollo

- Backend Node.js — `npm start` / `npm run dev` (con --watch).
- Panel web en `http://localhost:3000`, datos via WebSocket.
- Las credenciales de Telegram y Binance están en `.env` — no commitear.
