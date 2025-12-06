import React, { useMemo } from "react";
import { Icon } from "@iconify/react";

export const DailySummary = ({
  listaDiaria = [],
  pagosDiarios = [],
  onDeletePago,
}) => {
  // --- CÁLCULOS MATEMÁTICOS ---
  const resumen = useMemo(() => {
    const litros = listaDiaria.reduce(
      (acc, item) => acc + (Number(item.consumo_litros) || 0),
      0
    );
    const litrosRet = listaDiaria.reduce(
      (acc, item) => acc + (Number(item.ret) || 0),
      0
    );
    const litrosNetos = litros - litrosRet;

    // 1. Efectivo Puro
    const ventasEfectivoPuro = listaDiaria
      .filter((i) => i.tipo_pago === "efectivo")
      .reduce((acc, i) => acc + (Number(i.monto_total) || 0), 0);

    // 2. Efectivo "oculto" en Tarjetas Mixtas
    const ventasEfectivoDeMixtoTarjeta = listaDiaria
      .filter((i) => i.tipo_pago === "tarjeta")
      .reduce((acc, i) => {
        const total = Number(i.monto_total) || 0;
        const enTarjeta = Number(i.monto_pendiente) || 0;
        return acc + (total - enTarjeta);
      }, 0);

    // 3. Efectivo "oculto" en Transferencias Mixtas
    const ventasEfectivoDeMixtoTransferencia = listaDiaria
      .filter((i) => i.tipo_pago === "transferencia")
      .reduce((acc, i) => {
        const total = Number(i.monto_total) || 0;
        const enTransferencia = Number(i.monto_pendiente) || 0;
        return acc + (total - enTransferencia);
      }, 0);

    // 4. (NUEVO) Efectivo "oculto" en Créditos Mixtos (Lo que no es deuda y NO se fue a tarjeta, es efectivo)
    const ventasEfectivoDeMixtoCredito = listaDiaria
      .filter((i) => i.tipo_pago === "credito" && i.tipo_pago_resto !== "tarjeta") // CHECK HERE
      .reduce((acc, i) => {
        const total = Number(i.monto_total) || 0;
        const deuda = Number(i.monto_pendiente) || 0;
        return acc + (total - deuda);
      }, 0);

    // 5. (NUEVO) Tarjeta "oculta" en Créditos Mixtos
    const ventasTarjetaDeMixtoCredito = listaDiaria
      .filter((i) => i.tipo_pago === "credito" && i.tipo_pago_resto === "tarjeta") // CHECK HERE
      .reduce((acc, i) => {
        const total = Number(i.monto_total) || 0;
        const deuda = Number(i.monto_pendiente) || 0;
        return acc + (total - deuda);
      }, 0);

    // SUMA TOTAL DE EFECTIVO (Ahora incluye el sobrante de Créditos)
    const ventaEfectivo =
      ventasEfectivoPuro +
      ventasEfectivoDeMixtoTarjeta +
      ventasEfectivoDeMixtoTransferencia +
      ventasEfectivoDeMixtoCredito;

    // --- Otros Totales ---
    const ventaTransferencia = listaDiaria
      .filter((i) => i.tipo_pago === "transferencia")
      .reduce((acc, i) => acc + (Number(i.monto_pendiente) || 0), 0);

    // Tarjeta Total: Lo directo + lo que vino de créditos mixtos
    const ventaTarjetaDirecta = listaDiaria
      .filter((i) => i.tipo_pago === "tarjeta")
      .reduce((acc, i) => acc + (Number(i.monto_pendiente) || 0), 0);
    const ventaTarjeta = ventaTarjetaDirecta + ventasTarjetaDeMixtoCredito;

    const ventaCredito = listaDiaria
      .filter((i) => i.tipo_pago === "credito")
      .reduce((acc, i) => acc + (Number(i.monto_pendiente) || 0), 0);

    const cobroEfectivo = pagosDiarios
      .filter((p) => p.tipo_pago === "efectivo")
      .reduce((acc, p) => acc + (Number(p.monto_pago) || 0), 0);
    const cobroTransferencia = pagosDiarios
      .filter((p) => p.tipo_pago === "transferencia")
      .reduce((acc, p) => acc + (Number(p.monto_pago) || 0), 0);
    const cobroTarjeta = pagosDiarios
      .filter((p) => p.tipo_pago === "tarjeta")
      .reduce((acc, p) => acc + (Number(p.monto_pago) || 0), 0);

    const totalCaja = ventaEfectivo + cobroEfectivo;
    const totalTransferencia = ventaTransferencia + cobroTransferencia;
    const totalTarjeta = ventaTarjeta + cobroTarjeta;
    const totalBancos = totalTransferencia + totalTarjeta;
    const totalCreditosOtorgados = ventaCredito;
    const totalCobranza = cobroEfectivo + cobroTransferencia + cobroTarjeta;

    return {
      litros,
      litrosRet,
      litrosNetos,
      ventaEfectivo,
      cobroEfectivo,
      totalCaja,
      ventaTransferencia,
      cobroTransferencia,
      totalTransferencia,
      ventaTarjeta,
      cobroTarjeta,
      totalTarjeta,
      totalCreditosOtorgados,
      totalBancos,
      totalCobranza,
    };
  }, [listaDiaria, pagosDiarios]);

  const formatMoney = (amount) =>
    Number(amount).toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
    });
  const getPaymentIcon = (tipo) => {
    if (tipo === "efectivo") return "mdi:cash";
    if (tipo === "transferencia") return "mdi:bank-transfer";
    if (tipo === "tarjeta") return "mdi:credit-card";
    return "mdi:currency-usd";
  };

  return (
    <section className="m-auto max-w-6xl p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10 print:grid-cols-3 print:gap-4">
      {/* TARJETA 1: Balance del Turno */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 relative group print:shadow-none print:border-gray-300">
        <div className="absolute top-0 left-0 w-1 h-full bg-blue-600 group-hover:bg-blue-500 transition-colors"></div>
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 print:bg-none print:bg-gray-100 print:text-black">
          <h3 className="text-white font-bold flex items-center gap-2 print:text-black">
            <Icon icon="mdi:cash-register" width="24" /> Balance del Turno
          </h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col items-center p-2 bg-blue-50 rounded-lg border border-blue-100">
              <span className="text-xs text-blue-500 font-bold uppercase">
                Vendidos
              </span>
              <span className="text-lg font-bold text-gray-700">
                {resumen.litros.toFixed(2)} L
              </span>
            </div>
            <div className="flex flex-col items-center p-2 bg-red-50 rounded-lg border border-red-100">
              <span className="text-xs text-red-500 font-bold uppercase">
                RET
              </span>
              <span className="text-lg font-bold text-gray-700">
                {resumen.litrosRet.toFixed(2)} L
              </span>
            </div>
          </div>
          <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-xl border border-indigo-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500 rounded-full text-white shadow-md print:hidden">
                <Icon icon="mdi:gas-station-outline" width="20" />
              </div>
              <span className="text-indigo-900 font-bold text-sm">
                LITROS REALES
              </span>
            </div>
            <span className="text-2xl font-black text-indigo-700">
              {resumen.litrosNetos.toFixed(2)} L
            </span>
          </div>
          <hr className="border-gray-200" />
          <div className="flex flex-col p-4 bg-emerald-50 rounded-xl border border-emerald-200 shadow-inner">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wide mb-1">
              Total Efectivo en Caja
            </span>
            <div className="flex justify-between items-end">
              <span className="text-3xl font-extrabold text-emerald-700">
                {formatMoney(resumen.totalCaja)}
              </span>
              <Icon
                icon="mdi:safe"
                className="text-emerald-300 w-10 h-10 -mb-2 print:hidden"
              />
            </div>
            <div className="mt-2 text-[10px] text-emerald-600 flex justify-between">
              <span>Ventas: {formatMoney(resumen.ventaEfectivo)}</span>
              <span>Cobros: {formatMoney(resumen.cobroEfectivo)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* TARJETA 2: Digital / Bancos / Créditos */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 relative group print:shadow-none print:border-gray-300">
        <div className="absolute top-0 left-0 w-1 h-full bg-purple-600 group-hover:bg-purple-500 transition-colors"></div>
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 print:bg-none print:bg-gray-100">
          <h3 className="text-white font-bold flex items-center gap-2 print:text-black">
            <Icon icon="mdi:bank" width="24" /> Digital / Bancos
          </h3>
        </div>
        <div className="p-5 flex flex-col h-full space-y-4">
          <div className="text-center pb-2 border-b border-gray-100">
            <p className="text-gray-500 font-medium text-xs uppercase tracking-wider">
              Total Ingresado (Bancos)
            </p>
            <p className="text-3xl font-extrabold text-purple-600 drop-shadow-sm">
              {formatMoney(resumen.totalBancos)}
            </p>
          </div>
          <div className="space-y-3 flex-1">
            <div className="flex justify-between items-center p-2 bg-purple-50 rounded-lg border border-purple-100">
              <div className="flex items-center gap-2">
                <Icon icon="mdi:bank-transfer" className="text-purple-500" />
                <span className="text-xs font-bold text-purple-700 uppercase">
                  Transferencias
                </span>
              </div>
              <span className="font-bold text-gray-700">
                {formatMoney(resumen.totalTransferencia)}
              </span>
            </div>
            <div className="flex justify-between items-center p-2 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-center gap-2">
                <Icon icon="mdi:credit-card" className="text-blue-500" />
                <span className="text-xs font-bold text-blue-700 uppercase">
                  Tarjetas
                </span>
              </div>
              <span className="font-bold text-gray-700">
                {formatMoney(resumen.totalTarjeta)}
              </span>
            </div>
            <div className="flex justify-between items-center p-2 bg-orange-50 rounded-lg border border-orange-100 mt-2">
              <div className="flex items-center gap-2">
                <Icon icon="mdi:book-clock" className="text-orange-500" />
                <span className="text-xs font-bold text-orange-700 uppercase">
                  Ventas a Crédito (Deuda)
                </span>
              </div>
              <span className="font-bold text-gray-700">
                {formatMoney(resumen.totalCreditosOtorgados)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* TARJETA 3: Abonos (Igual que antes) */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 flex flex-col md:col-span-2 lg:col-span-1 relative print:shadow-none print:border-gray-300">
        <div className="absolute top-0 left-0 w-1 h-full bg-teal-500"></div>
        <div className="bg-gradient-to-r from-teal-500 to-emerald-500 p-4 flex justify-between items-center shrink-0 print:bg-none print:bg-gray-100">
          <h3 className="text-white font-bold flex items-center gap-2 print:text-black">
            <Icon icon="mdi:hand-coin" width="24" /> Abonos Recibidos
          </h3>
          <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full font-bold backdrop-blur-sm print:text-black print:bg-gray-200">
            Total: {formatMoney(resumen.totalCobranza)}
          </span>
        </div>
        <div className="p-0 overflow-y-auto max-h-[250px] custom-scrollbar bg-gray-50/50 print:bg-white print:max-h-none">
          {pagosDiarios.length > 0 ? (
            <ul className="divide-y divide-gray-100">
              {pagosDiarios.map((pago) => (
                <li
                  key={pago.id}
                  className="p-4 hover:bg-white transition-colors flex justify-between items-center group cursor-default"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${
                        pago.tipo_pago === "efectivo"
                          ? "bg-green-100 text-green-600"
                          : pago.tipo_pago === "transferencia"
                          ? "bg-purple-100 text-purple-600"
                          : "bg-blue-100 text-blue-600"
                      }`}
                    >
                      <Icon icon={getPaymentIcon(pago.tipo_pago)} width="16" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 text-xs leading-tight">
                        {pago.nombre_cliente} {pago.apellidos_cliente}
                      </p>
                      <p className="text-[10px] text-gray-400 uppercase font-semibold">
                        {pago.tipo_pago}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-bold text-emerald-600 text-sm">
                        {formatMoney(pago.monto_pago)}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {new Date(pago.fecha_pago).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    {onDeletePago && (
                      <button
                        onClick={() => onDeletePago(pago.id)}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                        title="Eliminar Abono"
                      >
                        <Icon icon="mdi:trash-can-outline" width="18" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-10 text-gray-400 opacity-60">
              <Icon icon="mdi:invoice-text-clock-outline" width="48" />
              <p className="text-sm mt-2 font-medium">
                Sin abonos registrados.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};