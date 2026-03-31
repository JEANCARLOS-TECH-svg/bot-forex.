# ForexBot — Reglas del Proyecto

## 1. Versión — 4 lugares obligatorios

Cada vez que se cambie la versión hay que actualizarla en **exactamente estos 4 lugares** de `index.html`:

| # | Ubicación | Línea aprox. | Ejemplo actual |
|---|---|---|---|
| 1 | `<title>` del HTML | ~6 | `<title>ForexBot v24.10.7 — PC Edition</title>` |
| 2 | Header del panel principal | ~1015 | `<small>v24.10.7 — PC Edition</small>` |
| 3 | Mensaje Telegram `/connect` | ~5675 | `'<b>ForexBot v24.10.7</b>\n'` |
| 4 | Mensaje Telegram al conectar | ~5745 | `tgSend('✅ ForexBot v24.10.7 conectado...` |

**Nunca actualizar solo algunos — los 4 siempre en el mismo commit.**

## 2. Versionado semántico

| Tipo de cambio | Qué incrementar | Ejemplo |
|---|---|---|
| Bugfix, ajuste pequeño, tweak | Último número | `v24.10.7` → `v24.10.8` |
| Feature nueva, cambio moderado | Último número | `v24.10.7` → `v24.10.8` |
| Cambio grande / refactor mayor | Versión mayor | `v24.10.x` → `v25.0.0` |

Regla práctica: si el cambio afecta el comportamiento core del bot (motor de señales, gestión de riesgo, arquitectura) → versión mayor. Si es UI, fix, o feature adicional → último número.

## 3. Commit y push obligatorio al terminar

Después de cada tarea completada:

```bash
git add index.html
git commit -m "Update version vX.Y.Z — <descripción breve>"
git push origin main
```

- El mensaje de commit debe incluir la versión nueva.
- No dejar cambios sin commitear al final de la sesión.
- Si hay múltiples archivos modificados, incluirlos todos en el mismo commit.

## 4. Estructura del proyecto

- `index.html` — toda la aplicación (HTML + CSS + JS en un solo archivo)
- `sw.js` — Service Worker para PWA / caché offline
- `manifest.json` — metadatos PWA (versión independiente, no actualizar aquí)
- `memory/` — memoria persistente de Claude para este proyecto

## 5. Notas de desarrollo

- La app es una PWA de archivo único — no hay build system ni bundler.
- Todos los datos persisten en `localStorage` del navegador.
- El auto-backup (cerebro IA + shadow stats) usa File System Access API — requiere Chrome/Edge.
- Las credenciales de Telegram están hardcodeadas en el JS — no extraer a archivos separados.
