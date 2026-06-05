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
      <div className="bg-blue-900 dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden border border-blue-800 dark:border-slate-700 relative group text-white print:bg-white print:text-black print:shadow-none print:border-gray-300 transition-colors duration-300">
        <div className="p-5 pb-3 border-b border-blue-800 dark:border-slate-700 print:border-gray-200">
          <h3 className="font-bold flex items-center gap-2 text-blue-50 dark:text-slate-100 print:text-black text-lg">
            <Icon icon="mdi:cash-register" width="24" className="text-sky-400 dark:text-sky-400 print:text-gray-600" /> Balance del Turno
          </h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col items-center p-3 bg-blue-800/50 dark:bg-slate-900/50 rounded-xl border border-blue-700/50 dark:border-slate-600 print:bg-gray-50">
              <span className="text-xs text-sky-300 dark:text-sky-400 font-bold uppercase tracking-wider print:text-gray-500">Vendidos</span>
              <span className="text-xl font-bold">
                {resumen.litros.toFixed(2)} L
              </span>
            </div>
            <div className="flex flex-col items-center p-3 bg-blue-800/50 dark:bg-slate-900/50 rounded-xl border border-blue-700/50 dark:border-slate-600 print:bg-gray-50">
              <span className="text-xs text-rose-300 dark:text-rose-400 font-bold uppercase tracking-wider print:text-gray-500">RET</span>
              <span className="text-xl font-bold">
                {resumen.litrosRet.toFixed(2)} L
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center p-4 bg-blue-800/60 dark:bg-slate-900/80 rounded-xl border border-blue-700/60 dark:border-slate-600 shadow-sm print:bg-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-sky-500/20 dark:bg-sky-500/10 rounded-full text-sky-400 print:hidden">
                <Icon icon="mdi:gas-station-outline" width="20" />
              </div>
              <span className="text-blue-100 dark:text-slate-300 font-bold text-sm tracking-wide print:text-gray-700">
                LITROS REALES
              </span>
            </div>
            <span className="text-2xl font-black text-white dark:text-slate-100 print:text-black">
              {resumen.litrosNetos.toFixed(2)} L
            </span>
          </div>
          
          <hr className="border-blue-800 dark:border-slate-700 print:border-gray-200" />
          
          <div className="flex flex-col p-5 bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-xl border border-emerald-500/20 dark:border-emerald-800/30 print:bg-white">
            <span className="text-xs font-bold text-emerald-400 dark:text-emerald-500 uppercase tracking-wider mb-2 print:text-gray-600">
              Total Efectivo en Caja
            </span>
            <div className="flex justify-between items-end">
              <span className="text-3xl font-extrabold text-emerald-400 dark:text-emerald-400 print:text-black drop-shadow-sm">
                {formatMoney(resumen.totalCaja)}
              </span>
              <Icon
                icon="mdi:safe"
                className="text-emerald-500/50 w-12 h-12 -mb-2 print:hidden"
              />
            </div>
            <div className="mt-3 text-xs text-emerald-300/80 dark:text-emerald-400/80 flex justify-between print:text-gray-500 font-medium">
              <span>Ventas: {formatMoney(resumen.ventaEfectivo)}</span>
              <span>Cobros: {formatMoney(resumen.cobroEfectivo)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* TARJETA 2: Digital / Bancos / Créditos */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden relative group print:shadow-none print:border-gray-300 transition-colors duration-300">
        <div className="p-5 pb-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-2 print:bg-transparent">
          <h3 className="font-bold flex items-center gap-2 text-slate-700 dark:text-slate-200 text-lg">
            <Icon icon="mdi:bank" width="24" className="text-emerald-500" /> Digital / Bancos
          </h3>
        </div>
        <div className="p-5 flex flex-col h-[calc(100%-60px)] space-y-5">
          <div className="text-center pb-4 border-b border-slate-100 dark:border-slate-700">
            <p className="text-slate-400 dark:text-slate-500 font-bold text-xs uppercase tracking-wider mb-1">
              Total Ingresado (Bancos)
            </p>
            <p className="text-3xl font-extrabold text-slate-800 dark:text-white">
              {formatMoney(resumen.totalBancos)}
            </p>
          </div>
          
          <div className="space-y-3 flex-1 flex flex-col justify-center">
            <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Icon icon="mdi:bank-transfer" width="20" className="text-sky-500" />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                  Transferencias
                </span>
              </div>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {formatMoney(resumen.totalTransferencia)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Icon icon="mdi:credit-card" width="20" className="text-sky-500" />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                  Tarjetas
                </span>
              </div>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {formatMoney(resumen.totalTarjeta)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-rose-50 dark:bg-rose-900/20 rounded-xl border border-rose-100 dark:border-rose-800/50 mt-2">
              <div className="flex items-center gap-2">
                <Icon icon="mdi:book-clock" width="20" className="text-rose-500" />
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wide">
                  Ventas a Crédito (Deuda)
                </span>
              </div>
              <span className="font-bold text-rose-700 dark:text-rose-300">
                {formatMoney(resumen.totalCreditosOtorgados)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* TARJETA 3: Abonos */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col md:col-span-2 lg:col-span-1 relative print:shadow-none print:border-gray-300 transition-colors duration-300">
        <div className="p-5 pb-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center shrink-0 print:bg-transparent">
          <h3 className="font-bold text-slate-700 dark:text-slate-200 text-lg flex items-center gap-2">
            <Icon icon="mdi:hand-coin" width="24" className="text-emerald-500" /> Abonos
          </h3>
          <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs px-3 py-1.5 rounded-lg font-extrabold print:text-black print:bg-gray-200">
            Total: {formatMoney(resumen.totalCobranza)}
          </span>
        </div>
        <div className="p-0 overflow-y-auto max-h-[300px] custom-scrollbar bg-white dark:bg-slate-800 print:max-h-none transition-colors duration-300">
          {pagosDiarios.length > 0 ? (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700">
              {pagosDiarios.map((pago) => (
                <li
                  key={pago.id}
                  className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex justify-between items-center group cursor-default"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${
                        pago.tipo_pago === "efectivo"
                          ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                          : pago.tipo_pago === "transferencia"
                          ? "bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400"
                          : "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400"
                      }`}
                    >
                      <Icon icon={getPaymentIcon(pago.tipo_pago)} width="20" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-700 dark:text-slate-200 text-sm leading-tight">
                        {pago.nombre_cliente} {pago.apellidos_cliente}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider mt-0.5">
                        {pago.tipo_pago}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-extrabold text-emerald-600 dark:text-emerald-400 text-[15px]">
                        {formatMoney(pago.monto_pago)}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                        {new Date(pago.fecha_pago).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    {onDeletePago && (
                      <button
                        onClick={() => onDeletePago(pago.id)}
                        className="p-2 text-slate-300 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-full transition-all opacity-0 group-hover:opacity-100 md:opacity-100"
                        title="Eliminar Abono"
                      >
                        <Icon icon="mdi:trash-can-outline" width="20" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-16 text-slate-300 dark:text-slate-600">
              <Icon icon="mdi:invoice-text-clock-outline" width="56" className="mb-3 opacity-50 dark:opacity-30" />
              <p className="text-sm font-medium text-slate-400 dark:text-slate-500">
                Sin abonos registrados.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};