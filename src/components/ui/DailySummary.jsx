import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';

const StatCard = ({ icon, title, value, colorClass, unit = 'currency' }) => (
  <div className={`p-4 rounded-lg shadow-md flex items-center ${colorClass}`}>
    <div className="p-3 bg-white/30 rounded-full">
      <Icon icon={icon} width="28" className="text-white" />
    </div>
    <div className="ml-4">
      <p className="text-white/90 font-medium">{title}</p>
      <p className="text-2xl font-bold text-white">
        {unit === 'currency'
          ? value.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
          : `${value.toLocaleString('es-MX')} ${unit}`}
      </p>
    </div>
  </div>
);

export const DailySummary = ({ listaDiaria, pagosDiarios }) => {
  const [summary, setSummary] = useState({
    efectivo: 0,
    transferencia: 0,
    tarjeta: 0,
    credito: 0,
    cobrados: 0,
    totalVentas: 0,
    litrosTotales: 0,
    retTotal: 0,
    litrosReales: 0,
  });

  useEffect(() => {
    let efectivo = 0;
    let transferencia = 0;
    let tarjeta = 0;
    let credito = 0;
    let litrosTotales = 0;
    let retTotal = 0;

    listaDiaria.forEach(carga => {
      litrosTotales += carga.consumo_litros || 0;
      retTotal += carga.ret || 0;

      switch (carga.tipo_pago) {
        case 'efectivo':
          efectivo += carga.monto_total || 0;
          break;
        case 'transferencia':
          transferencia += carga.monto_total || 0;
          break;
        case 'tarjeta':
          tarjeta += carga.monto_total || 0;
          break;
        case 'credito':
          credito += carga.monto_total || 0;
          break;
        default:
          break;
      }
    });

    const cobrados = pagosDiarios.reduce((acc, pago) => acc + (pago.monto_pago || 0), 0);
    const totalVentas = efectivo + transferencia + tarjeta + credito;
    const litrosReales = litrosTotales - retTotal;

    setSummary({ efectivo, transferencia, tarjeta, credito, cobrados, totalVentas, litrosTotales, retTotal, litrosReales });
  }, [listaDiaria, pagosDiarios]);

  return (
    <section className="m-auto max-w-4xl p-4 mt-6">
      <h2 className="font-extrabold flex justify-center text-2xl text-transparent bg-clip-text bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] mb-4">
        Resumen del Día
      </h2>
      
      {/* Sección de Litros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          icon="solar:bag-check-bold-duotone"
          title="Litros Vendidos"
          value={summary.litrosTotales}
          unit="lts"
          colorClass="bg-gradient-to-br from-sky-400 to-sky-600"
        />
        <StatCard
          icon="solar:refresh-outline"
          title="Retorno (RET)"
          value={summary.retTotal}
          unit="lts"
          colorClass="bg-gradient-to-br from-amber-400 to-amber-600"
        />
        <StatCard
          icon="solar:fire-bold-duotone"
          title="Litros Reales"
          value={summary.litrosReales}
          unit="lts"
          colorClass="bg-gradient-to-br from-lime-400 to-lime-600"
        />
      </div>

      {/* Sección Financiera */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          icon="bi:cash-coin"
          title="Efectivo (Ventas)"
          value={summary.efectivo}
          colorClass="bg-gradient-to-br from-green-400 to-green-600"
        />
        <StatCard
          icon="duo-icons:credit-card"
          title="Tarjeta"
          value={summary.tarjeta}
          colorClass="bg-gradient-to-br from-blue-400 to-blue-600"
        />
        <StatCard
          icon="arcticons:transfer"
          title="Transferencia"
          value={summary.transferencia}
          colorClass="bg-gradient-to-br from-purple-400 to-purple-600"
        />
        <StatCard
          icon="icon-park-twotone:time"
          title="Crédito"
          value={summary.credito}
          colorClass="bg-gradient-to-br from-orange-400 to-orange-600"
        />
        <StatCard
          icon="streamline-ultimate:cash-payment-bills-bold"
          title="Abonos a Crédito (Cobrados)"
          value={summary.cobrados}
          colorClass="bg-gradient-to-br from-teal-400 to-teal-600"
        />
        <StatCard
          icon="hugeicons:add-to-list"
          title="Total de Ventas"
          value={summary.totalVentas}
          colorClass="bg-gradient-to-br from-slate-500 to-slate-700"
        />
      </div>

       <div className="mt-6 p-4 rounded-lg shadow-md bg-linear-to-br from-indigo-500 to-indigo-700 flex items-center justify-center">
         <div className="p-3 bg-white/30 rounded-full">
            <Icon icon="fa7-solid:cash-register" width="32" className="text-white" />
         </div>
         <div className="ml-4 text-center">
            <p className="text-white/90 font-medium text-lg">Total en Caja (Efectivo Ventas + Cobranza)</p>
            <p className="text-3xl font-bold text-white">
                {(summary.efectivo + summary.cobrados).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
            </p>
         </div>
       </div>
    </section>
  );
};
