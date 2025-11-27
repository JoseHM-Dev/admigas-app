import React, { useMemo } from "react";
import { Icon } from "@iconify/react";

export const DailySummary = ({ listaDiaria = [], pagosDiarios = [] }) => {
  
  // --- CÁLCULOS MATEMÁTICOS ---
  const resumen = useMemo(() => {
    // 1. Litros Totales del Turno
    const litros = listaDiaria.reduce((acc, item) => acc + (Number(item.consumo_litros) || 0), 0);
    
    // NUEVO: Litros RET
    const litrosRet = listaDiaria.reduce((acc, item) => acc + (Number(item.ret) || 0), 0);

    // 2. Ventas (Cargas) divididas por método
    const ventaEfectivo = listaDiaria
      .filter((item) => item.tipo_pago === "efectivo")
      .reduce((acc, item) => acc + (Number(item.monto_total) || 0), 0);
      
    const ventaDigital = listaDiaria
      .filter((item) => item.tipo_pago !== "efectivo")
      .reduce((acc, item) => acc + (Number(item.monto_total) || 0), 0);

    // 3. Cobranza (Abonos de Créditos) dividida por método
    const cobroEfectivo = pagosDiarios
      .filter((p) => p.tipo_pago === "efectivo")
      .reduce((acc, p) => acc + (Number(p.monto_pago) || 0), 0);

    const cobroDigital = pagosDiarios
      .filter((p) => p.tipo_pago !== "efectivo")
      .reduce((acc, p) => acc + (Number(p.monto_pago) || 0), 0);

    // 4. TOTALES FINALES
    const totalCaja = ventaEfectivo + cobroEfectivo; 
    const totalBancos = ventaDigital + cobroDigital;
    const totalCobranza = cobroEfectivo + cobroDigital;

    return {
      litros,
      litrosRet, // <--- Agregado al return
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
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        <div className="bg-linear-to-r from-blue-600 to-indigo-600 p-4">
          <h3 className="text-white font-bold flex items-center gap-2">
            <Icon icon="mdi:cash-register" width="24" /> Balance del Turno
          </h3>
        </div>
        <div className="p-5 space-y-3">
          
          {/* Litros Vendidos */}
          <div className="flex justify-between items-center p-3 bg-blue-50 rounded-xl border border-blue-100">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-blue-500 rounded-full text-white"><Icon icon="mdi:gas-station" /></div>
               <span className="text-gray-600 font-medium">Litros Vendidos</span>
            </div>
            <span className="text-xl font-bold text-blue-700">{resumen.litros.toFixed(2)} Lts</span>
          </div>

          {/* NUEVO: Litros RET */}
          <div className="flex justify-between items-center p-3 bg-red-50 rounded-xl border border-red-100">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-red-500 rounded-full text-white"><Icon icon="mdi:gas-burner" /></div>
               <span className="text-gray-600 font-medium">Litros RET</span>
            </div>
            <span className="text-xl font-bold text-red-600">{resumen.litrosRet.toFixed(2)} Lts</span>
          </div>

          <hr className="border-gray-100 my-2"/>

          {/* Gran Total Caja */}
          <div className="flex flex-col p-4 bg-green-50 rounded-xl border border-green-200 shadow-inner">
             <span className="text-sm font-bold text-green-600 uppercase tracking-wide mb-1">Total Efectivo en Caja</span>
             <div className="flex justify-between items-end">
                <span className="text-3xl font-extrabold text-green-700">{formatMoney(resumen.totalCaja)}</span>
                <Icon icon="mdi:safe" className="text-green-300 w-12 h-12 -mb-2" />
             </div>
             <div className="mt-2 text-xs text-green-600 flex gap-2">
                <span>(Ventas: {formatMoney(resumen.ventaEfectivo)})</span>
                <span>+</span>
                <span>(Cobros: {formatMoney(resumen.cobroEfectivo)})</span>
             </div>
          </div>
        </div>
      </div>

      {/* TARJETA 2: BANCOS / DIGITAL */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
         <div className="bg-linear-to-r from-purple-600 to-pink-600 p-4">
          <h3 className="text-white font-bold flex items-center gap-2">
            <Icon icon="mdi:bank" width="24" /> Digital / Bancos
          </h3>
        </div>
        <div className="p-5 flex flex-col justify-center h-full space-y-6">
            <div className="text-center">
                <p className="text-gray-500 font-medium mb-2">Total Ingresado a Cuentas</p>
                <p className="text-4xl font-extrabold text-purple-600">{formatMoney(resumen.totalBancos)}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-400 uppercase">Ventas Directas</p>
                    <p className="font-bold text-gray-700">
                       {formatMoney(resumen.ventaDigital)}
                    </p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-400 uppercase">Recuperado (Abonos)</p>
                    <p className="font-bold text-gray-700">{formatMoney(resumen.cobroDigital)}</p>
                </div>
            </div>
        </div>
      </div>

      {/* TARJETA 3: DETALLE DE COBRANZA (ABONOS) */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 flex flex-col md:col-span-2 lg:col-span-1">
        <div className="bg-linear-to-r from-emerald-500 to-teal-500 p-4 flex justify-between items-center shrink-0">
          <h3 className="text-white font-bold flex items-center gap-2">
            <Icon icon="mdi:hand-coin" width="24" /> Abonos Recibidos
          </h3>
          <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full font-bold">
            Total: {formatMoney(resumen.totalCobranza)}
          </span>
        </div>
        
        <div className="p-0 overflow-y-auto max-h-[250px] custom-scrollbar bg-gray-50/50">
           {pagosDiarios.length > 0 ? (
             <ul className="divide-y divide-gray-100">
               {pagosDiarios.map((pago) => (
                 <li key={pago.id} className="p-4 hover:bg-white transition-colors flex justify-between items-center group">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm 
                            ${pago.tipo_pago === 'efectivo' ? 'bg-green-100 text-green-600' : 
                              pago.tipo_pago === 'transferencia' ? 'bg-purple-100 text-purple-600' : 
                              'bg-blue-100 text-blue-600'}`}>
                            <Icon icon={getPaymentIcon(pago.tipo_pago)} width="20" />
                        </div>
                        <div>
                            <p className="font-bold text-gray-800 text-sm leading-tight">
                                {pago.nombre_cliente} {pago.apellidos_cliente}
                            </p>
                            <p className="text-xs text-gray-400 capitalize flex items-center gap-1">
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
                <p className="text-sm mt-2">Sin abonos registrados en este turno.</p>
             </div>
           )}
        </div>
      </div>

    </section>
  );
};