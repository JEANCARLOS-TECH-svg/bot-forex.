# 🤖 ForexBot v20

Bot de trading algorítmico con IA adaptativa. Archivo HTML único — no requiere instalación.

## 🌐 Demo en vivo
**[https://jeancarlos-tech-svg.github.io/Forex-bot/](https://jeancarlos-tech-svg.github.io/Forex-bot/)**

---

## ✨ Características

### 🔒 Seguridad
- PIN de 6 dígitos con cifrado AES-GCM
- Datos exportados cifrados con tu PIN
- API Key enmascarada en pantalla
- Bloqueo automático tras 5 intentos fallidos

### 🤖 IA Adaptativa
- 6 indicadores: RSI, MACD, Bollinger Bands, EMA Cross, Stochastic RSI, ATR
- Filtro de tendencia (EMA50 vs EMA200)
- Aprendizaje por refuerzo — ajusta pesos según resultados
- Umbral dinámico según volatilidad del mercado
- Modo **⚠️ Libertad Absoluta** — IA con control total

### 📊 Indicadores
| Indicador | Rol |
|-----------|-----|
| EMA Cross | Detecta dirección de tendencia |
| MACD | Confirma momentum |
| RSI | Timing de sobrecompra/sobreventa |
| Bollinger Bands | Volatilidad y zonas de precio |
| Stochastic RSI | Timing fino de entrada |
| ATR | Calcula SL/TP dinámicos |

### ☠️ Perfiles de Riesgo (Piratas)
| Perfil | Multiplicador ATR |
|--------|------------------|
| 🟢 Grumete | ×0.5 |
| 🔵 Marinero | ×0.8 |
| 🟡 Contramaestre | ×1.0 |
| 🟠 Corsario | ×1.3 |
| 🔴 Capitán Pirata | ×1.8 |

### 🛡️ Sistemas de Protección
- **Kill Switch** — para el bot si las pérdidas superan X% (1-20%)
- **Bloqueo de Horario** — no opera en horas de baja liquidez
- **Bloqueo de Racha** — pausa tras 3 pérdidas consecutivas
- **Bloqueo de Volatilidad** — congela en movimientos extremos

### 💾 Datos Persistentes
- Exportar/Importar aprendizaje de la IA en archivo cifrado
- Autoguardado cada 5 operaciones
- Los datos sobreviven actualizaciones del bot

### 📡 Conexión Binance Testnet
- WebSocket Spot + Futures en tiempo real
- Reconexión automática con backoff exponencial
- Badge LIVE/SIM por instrumento

### 🧬 Optimizador Pro
- Optimiza 6 parámetros incluyendo multiplicador ATR
- 4 tipos de mercado simulado: Todos, Alcista, Bajista, Lateral
- Métricas: Win Rate, Profit, Drawdown, Racha máxima
- Aplica mejores parámetros al bot con un clic

---

## 🚀 Uso

1. Descarga `index.html`
2. Ábrelo en cualquier navegador
3. Crea tu PIN de seguridad (6 dígitos)
4. Selecciona un instrumento y perfil de riesgo
5. Conecta tu API Key de Binance Testnet (opcional)
6. Inicia el bot

## 📱 PWA (Android)
Compatible con instalación como PWA en Android:
- Abre en Chrome
- Menú → "Añadir a pantalla de inicio"

---

## ⚠️ Disclaimer
Simulación educativa. No ejecuta operaciones reales con dinero real.
El trading implica riesgo de pérdida de capital.

---

## 📈 Historial de versiones
- **v19** — Seguridad PIN + cifrado AES-GCM
- **v18** — Datos persistentes + Optimizador Pro + 3 bloqueos de protección
- **v17** — Kill Switch con slider 1-20%
- **v16** — Botón ⚠️ Libertad Absoluta + Stochastic RSI + ATR
- **v15** — Filtro de tendencia + IA con jerarquía de indicadores
- **v14** — WebSocket Binance Testnet (Spot + Futures)
- **v13** — Versión base con RSI + MACD + BB + EMA
