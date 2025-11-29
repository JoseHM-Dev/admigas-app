import React, { useMemo } from "react";
import { Icon } from "@iconify/react";

export const DailySummary = ({ listaDiaria = [], pagosDiarios = [] }) => {
  
  // --- CÁLCULOS MATEMÁTICOS ---
  const resumen = useMemo(() => {
    // 1. Litros Totales del Turno
    const litros = listaDiaria.reduce((acc, item) => acc + (Number(item.consumo_litros) || 0), 0);
    
    // 2. Litros RET
    const litrosRet = listaDiaria.reduce((acc, item) => acc + (Number(item.ret) || 0), 0);

    // 3. NUEVO: Litros Netos (Vendidos - RET)
    const litrosNetos = litros - litrosRet;

    // 4. Ventas (Cargas) divididas por método
    const ventaEfectivo = listaDiaria
      .filter((item) => item.tipo_pago === "efectivo")
      .reduce((acc, item) => acc + (Number(item.monto_total) || 0), 0);
      
    const ventaDigital = listaDiaria
      .filter((item) => item.tipo_pago !== "efectivo")
      .reduce((acc, item) => acc + (Number(item.monto_total) || 0), 0);

    // 5. Cobranza (Abonos de Créditos) dividida por método
    const cobroEfectivo = pagosDiarios
      .filter((p) => p.tipo_pago === "efectivo")
      .reduce((acc, p) => acc + (Number(p.monto_pago) || 0), 0);

    const cobroDigital = pagosDiarios
      .filter((p) => p.tipo_pago !== "efectivo")
      .reduce((acc, p) => acc + (Number(p.monto_pago) || 0), 0);

    // 6. TOTALES FINALES
    const totalCaja = ventaEfectivo + cobroEfectivo; 
    const totalBancos = ventaDigital + cobroDigital;
    const totalCobranza = cobroEfectivo + cobroDigital;

    return {
      litros,
      litrosRet,
      litrosNetos, // <--- Agregado
      ventaEfectivo,
      ventaDigital,
      cobroEfectivo,
      cobroDigital,
      totalCaja,
      totalBancos,
      totalCobranza
    };
  }, [listaDiaria, pagosDiarios]);

  // Función auxiliar para iconos de pago
  const getPaymentIcon = (tipo) => {
    if (tipo === "efectivo") return "mdi:cash";
    if (tipo === "transferencia") return "mdi:bank-transfer";
    if (tipo === "tarjeta") return "mdi:credit-card";
    return "mdi:currency-usd";
  };

  const formatMoney = (amount) => {
    return amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
  };

  return (
    <section className="m-auto max-w-6xl p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
      
      {/* TARJETA 1: RESUMEN OPERATIVO Y CAJA */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 relative group">
        <div className="absolute top-0 left-0 w-1 h-full bg-blue-600 group-hover:bg-blue-500 transition-colors"></div>
        <div className="bg-linear-to-r from-blue-600 to-indigo-600 p-4">
          <h3 className="text-white font-bold flex items-center gap-2">
            <Icon icon="mdi:cash-register" width="24" /> Balance del Turno
          </h3>
        </div>
        <div className="p-5 space-y-4">
          
          {/* Bloque de Litros */}
          <div className="grid grid-cols-2 gap-2">
            {/* Vendidos */}
            <div className="flex flex-col items-center p-2 bg-blue-50 rounded-lg border border-blue-100">
                <span className="text-xs text-blue-500 font-bold uppercase">Vendidos</span>
                <span className="text-lg font-bold text-gray-700">{resumen.litros.toFixed(2)} L</span>
            </div>
            {/* RET */}
            <div className="flex flex-col items-center p-2 bg-red-50 rounded-lg border border-red-100">
                <span className="text-xs text-red-500 font-bold uppercase">RET</span>
                <span className="text-lg font-bold text-gray-700">{resumen.litrosRet.toFixed(2)} L</span>
            </div>
          </div>

          {/* NUEVO: Litros Reales (Netos) destacado */}
          <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-xl border border-indigo-200 shadow-sm">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-indigo-500 rounded-full text-white shadow-md">
                 <Icon icon="mdi:gas-station-outline" width="20" />
               </div>
               <span className="text-indigo-900 font-bold text-sm">LITROS REALES</span>
            </div>
            <span className="text-2xl font-black text-indigo-700">{resumen.litrosNetos.toFixed(2)} L</span>
          </div>

          <hr className="border-gray-200"/>

          {/* Gran Total Caja */}
          <div className="flex flex-col p-4 bg-emerald-50 rounded-xl border border-emerald-200 shadow-inner">
             <span className="text-xs font-bold text-emerald-600 uppercase tracking-wide mb-1">Total Efectivo en Caja</span>
             <div className="flex justify-between items-end">
                <span className="text-3xl font-extrabold text-emerald-700">{formatMoney(resumen.totalCaja)}</span>
                <Icon icon="mdi:safe" className="text-emerald-300 w-10 h-10 -mb-2" />
             </div>
             <div className="mt-2 text-[10px] text-emerald-600 flex justify-between">
                <span>Ventas: {formatMoney(resumen.ventaEfectivo)}</span>
                <span>Cobros: {formatMoney(resumen.cobroEfectivo)}</span>
             </div>
          </div>
        </div>
      </div>

      {/* TARJETA 2: BANCOS / DIGITAL */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 relative group">
        <div className="absolute top-0 left-0 w-1 h-full bg-purple-600 group-hover:bg-purple-500 transition-colors"></div>
         <div className="bg-linear-to-r from-purple-600 to-pink-600 p-4">
          <h3 className="text-white font-bold flex items-center gap-2">
            <Icon icon="mdi:bank" width="24" /> Digital / Bancos
          </h3>
        </div>
        <div className="p-5 flex flex-col justify-center h-full space-y-6">
            <div className="text-center">
                <p className="text-gray-500 font-medium mb-2 text-sm uppercase tracking-wider">Total Ingresado a Cuentas</p>
                <p className="text-4xl font-extrabold text-purple-600 drop-shadow-sm">{formatMoney(resumen.totalBancos)}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Ventas Directas</p>
                    <p className="font-bold text-gray-700 text-lg">
                       {formatMoney(resumen.ventaDigital)}
                    </p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Recuperado (Abonos)</p>
                    <p className="font-bold text-gray-700 text-lg">{formatMoney(resumen.cobroDigital)}</p>
                </div>
            </div>
        </div>
      </div>

      {/* TARJETA 3: DETALLE DE COBRANZA (ABONOS) */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 flex flex-col md:col-span-2 lg:col-span-1 relative">
        <div className="absolute top-0 left-0 w-1 h-full bg-teal-500"></div>
        <div className="bg-linear-to-r from-teal-500 to-emerald-500 p-4 flex justify-between items-center shrink-0">
          <h3 className="text-white font-bold flex items-center gap-2">
            <Icon icon="mdi:hand-coin" width="24" /> Abonos Recibidos
          </h3>
          <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full font-bold backdrop-blur-sm">
            Total: {formatMoney(resumen.totalCobranza)}
          </span>
        </div>
        
        <div className="p-0 overflow-y-auto max-h-[250px] custom-scrollbar bg-gray-50/50">
           {pagosDiarios.length > 0 ? (
             <ul className="divide-y divide-gray-100">
               {pagosDiarios.map((pago) => (
                 <li key={pago.id} className="p-4 hover:bg-white transition-colors flex justify-between items-center group cursor-default">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm transition-transform group-hover:scale-110 
                            ${pago.tipo_pago === 'efectivo' ? 'bg-green-100 text-green-600' : 
                              pago.tipo_pago === 'transferencia' ? 'bg-purple-100 text-purple-600' : 
                              'bg-blue-100 text-blue-600'}`}>
                            <Icon icon={getPaymentIcon(pago.tipo_pago)} width="20" />
                        </div>
                        <div>
                            <p className="font-bold text-gray-800 text-sm leading-tight">
                                {pago.nombre_cliente} {pago.apellidos_cliente}
                            </p>
                            <p className="text-[10px] text-gray-400 uppercase font-semibold flex items-center gap-1">
                                {pago.tipo_pago}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="font-bold text-emerald-600">{formatMoney(pago.monto_pago)}</p>
                        <p className="text-[10px] text-gray-400">
                            {new Date(pago.fecha_pago).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                    </div>
                 </li>
               ))}
             </ul>
           ) : (
             <div className="flex flex-col items-center justify-center h-full py-10 text-gray-400 opacity-60">
                <Icon icon="mdi:invoice-text-clock-outline" width="48" />
                <p className="text-sm mt-2 font-medium">Sin abonos registrados.</p>
             </div>
           )}
        </div>
      </div>

    </section>
  );
};