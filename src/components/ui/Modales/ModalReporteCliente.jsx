import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../../../supabaseClient";
import { Icon } from "@iconify/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function ModalReporteCliente({ isOpen, onClose, cliente }) {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtro, setFiltro] = useState("mes"); // opciones: 'semana', 'mes', 'anio', 'todo'

  // Cargar historial al abrir
  useEffect(() => {
    if (isOpen && cliente) {
      fetchHistorial();
    } else {
      setHistorial([]);
    }
  }, [isOpen, cliente]);

  const fetchHistorial = async () => {
    setLoading(true);
    try {
      // Traemos fecha, consumo y monto de la tabla carga_casa
      const { data, error } = await supabase
        .from("carga_casa")
        .select("fecha_carga, consumo_litros, monto_total")
        .eq("id_casa", cliente.id_casa)
        .order("fecha_carga", { ascending: true });

      if (error) throw error;
      setHistorial(data || []);
    } catch (error) {
      console.error("Error al cargar historial:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar datos según el botón seleccionado
  const datosFiltrados = useMemo(() => {
    if (!historial.length) return [];
    
    const hoy = new Date();
    const fechaLimite = new Date();

    if (filtro === "semana") fechaLimite.setDate(hoy.getDate() - 7);
    if (filtro === "mes") fechaLimite.setMonth(hoy.getMonth() - 1);
    if (filtro === "anio") fechaLimite.setFullYear(hoy.getFullYear() - 1);
    if (filtro === "todo") return historial;

    return historial.filter((item) => new Date(item.fecha_carga) >= fechaLimite);
  }, [historial, filtro]);

  // Calcular totales para las tarjetas de resumen
  const totales = useMemo(() => {
    return datosFiltrados.reduce(
      (acc, item) => ({
        litros: acc.litros + (Number(item.consumo_litros) || 0),
        dinero: acc.dinero + (Number(item.monto_total) || 0),
      }),
      { litros: 0, dinero: 0 }
    );
  }, [datosFiltrados]);

  if (!isOpen || !cliente) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="bg-linear-to-r from-blue-600 to-indigo-600 p-6 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Icon icon="mdi:chart-box" /> Reporte de Consumo
            </h2>
            <p className="text-blue-100 text-sm mt-1">
              Cliente: {cliente.nombre_cliente} {cliente.apellido_cliente}
            </p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <Icon icon="mdi:close" width="28" />
          </button>
        </div>

        {/* CONTENIDO SCROLLABLE */}
        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
          
          {/* 1. FILTROS */}
          <div className="flex justify-center gap-2 bg-gray-100 p-1 rounded-lg w-fit mx-auto">
            {["semana", "mes", "anio", "todo"].map((f) => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${
                  filtro === f
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {f === "anio" ? "Año" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="h-64 flex items-center justify-center text-gray-400">
              <Icon icon="line-md:loading-loop" width="48" />
            </div>
          ) : datosFiltrados.length > 0 ? (
            <>
              {/* 2. TARJETAS DE RESUMEN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-blue-500 text-xs font-bold uppercase">Consumo Total</p>
                    <p className="text-2xl font-extrabold text-blue-700">{totales.litros.toFixed(2)} Lts</p>
                  </div>
                  <Icon icon="mdi:gas-station" className="text-blue-300 w-10 h-10" />
                </div>
                <div className="bg-green-50 border border-green-100 p-4 rounded-xl flex items-center justify-between">
                   <div>
                    <p className="text-green-500 text-xs font-bold uppercase">Monto Pagado</p>
                    <p className="text-2xl font-extrabold text-green-700">
                      ${totales.dinero.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <Icon icon="mdi:currency-usd" className="text-green-300 w-10 h-10" />
                </div>
              </div>

              {/* 3. GRÁFICA */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm h-[350px] w-full">
                <ResponsiveContainer width="99%" height="100%" minWidth={0}>
                  <BarChart data={datosFiltrados}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="fecha_carga" 
                      tickFormatter={(fecha) => new Date(fecha).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                      tick={{fontSize: 12, fill: '#6b7280'}}
                      axisLine={false}
                      tickLine={false}
                      dy={10}
                    />
                    <YAxis 
                      yAxisId="left"
                      tick={{fontSize: 12, fill: '#6b7280'}}
                      axisLine={false}
                      tickLine={false}
                      //unit=" L"
                    />
                    <YAxis 
                      yAxisId="right" 
                      orientation="right" 
                      tick={{fontSize: 12, fill: '#10b981'}} 
                      axisLine={false} 
                      tickLine={false}
                      //unit="$"
                    />
                    <Tooltip 
                      contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                      labelFormatter={(label) => new Date(label).toLocaleDateString()}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="consumo_litros" name="Litros" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="monto_total" name="Monto ($)" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
             <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <p className="text-gray-500">No hay registros de consumo en este periodo.</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}