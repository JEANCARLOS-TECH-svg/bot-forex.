// ── L1 REGIME ─────────────────────────────────────────────────────────────────
// Determina régimen de mercado: TRENDING vs LATERAL.
// Lógica extraída de getMarketRegime() en index.html.

let lastRegimeTrending = false;

function evaluate(indicators) {
  if (!indicators || indicators.adx === undefined) return { adx: null, trending: lastRegimeTrending, label: 'LATERAL_EXTREMO' };
  const adx = indicators.adx;

  // Zona de histéresis ±0.5 — evita cambios de régimen por ruido
  let trending;
  if (adx >= 25.5)      trending = true;
  else if (adx <= 24.5) trending = false;
  else                  trending = lastRegimeTrending; // zona gris — mantiene régimen anterior
  lastRegimeTrending = trending;

  // ADX < 20 → LATERAL_EXTREMO, 20-25 → LATERAL, ≥25.5 → TENDENCIAL
  const label = trending ? 'TENDENCIAL' : (adx < 20 ? 'LATERAL_EXTREMO' : 'LATERAL');

  return { adx, trending, label };
}

module.exports = { evaluate };
