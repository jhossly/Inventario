// Simulación de Montecarlo para predecir agotamiento de stock.
// Se ejecuta en background y devuelve alertas de reposición.
// No requiere librerías externas, solo matemáticas básicas.

export function simularAgotamiento(ventasPorDia, stockActual, diasProyeccion = 7, simulaciones = 1000, leadTimeDias = 0) {
  if (!ventasPorDia || ventasPorDia.length === 0) {
    return { probabilidadAgotamiento: 0, stockSugerido: stockActual, alerta: false, diasInventarioRestante: Infinity, mediaDiaria: 0, desviacionDiaria: 0, leadTimeDias }
  }

  const media = ventasPorDia.reduce((a, b) => a + b, 0) / ventasPorDia.length
  const varianza = ventasPorDia.reduce((a, b) => a + Math.pow(b - media, 2), 0) / ventasPorDia.length
  const desviacion = Math.sqrt(varianza) || 1

  let agotados = 0
  let stockSugeridoTotal = 0

  const dias = diasProyeccion + (leadTimeDias || 0)

  for (let i = 0; i < simulaciones; i++) {
    let stockSimulado = stockActual
    for (let d = 0; d < dias; d++) {
      let u1 = Math.random()
      while (u1 === 0) u1 = Math.random()
      const u2 = Math.random()
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
      const demandaDiaria = Math.max(0, Math.round(media + z * desviacion))
      stockSimulado -= demandaDiaria
    }
    if (stockSimulado <= 0) agotados++
    stockSugeridoTotal += Math.max(0, Math.round(media * dias + 1.65 * desviacion * Math.sqrt(dias)))
  }

  const probabilidadAgotamiento = agotados / simulaciones
  const stockSugerido = Math.round(stockSugeridoTotal / simulaciones)
  const diasInventarioRestante = media > 0 ? Math.round(stockActual / media) : Infinity

  return {
    probabilidadAgotamiento,
    stockSugerido,
    alerta: probabilidadAgotamiento > 0.5,
    diasProyeccion,
    simulaciones,
    mediaDiaria: Math.round(media * 100) / 100,
    desviacionDiaria: Math.round(desviacion * 100) / 100,
    diasInventarioRestante,
    leadTimeDias
  }
}
