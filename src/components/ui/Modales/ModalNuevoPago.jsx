// ModalNuevoPago.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "../../../supabaseClient";
import { Icon } from "@iconify/react";
import { useAuth } from "../../../auth/useAuth";

export const ModalNuevoPago = ({ isOpen, onClose, onPagoGuardado, cuenta }) => {
  const { user, appUser } = useAuth();
  const [monto, setMonto] = useState("");
  const [tipoPago, setTipoPago] = useState("efectivo");
  const [loading, setLoading] = useState(false);
  const [activeTurnoId, setActiveTurnoId] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setMonto("");
      checkTurno();
    }
  }, [isOpen]);

  const checkTurno = async () => {
    const { data } = await supabase
      .from("porcentaje_diario")
      .select("id")
      .is("porcentaje_final", null)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();
    setActiveTurnoId(data?.id || null);
  };

  // --- FUNCIÓN PARA LIQUIDAR ---
  const handleLiquidar = () => {
    if (cuenta && cuenta.saldo_actual) {
      setMonto(cuenta.saldo_actual.toString());
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (parseFloat(monto) > cuenta.saldo_actual) {
      if (!confirm("Estás abonando más de la deuda total. ¿Continuar?")) return;
    }

    setLoading(true);
    try {
      // 1. REGISTRAR EN EL HISTORIAL DEL CLIENTE (Movimientos)
      const { error } = await supabase.rpc("registrar_movimiento_credito", {
        p_id_casa: cuenta.id_casa,
        p_tipo: "ABONO",
        p_monto: parseFloat(monto),
        p_descripcion: `Abono vía ${tipoPago}`,
        p_id_carga: null,
        p_id_turno: activeTurnoId,
        p_user_id: user?.id,
        p_app_users_id: appUser?.id
      });

      if (error) throw error;

      // 2. REGISTRAR EN EL CORTE DE CAJA (Pagos)
      // IMPORTANTE: Aquí agregamos 'id_cuenta' para que el Dashboard sepa el nombre
      await supabase.from("pagos").insert([
        {
          monto_pago: parseFloat(monto),
          fecha_pago: new Date().toISOString(),
          tipo_pago: tipoPago,
          id_turno: activeTurnoId,
          id_cuenta: cuenta.id // <--- ESTA ES LA CLAVE QUE FALTABA
        },
      ]);

      onPagoGuardado();
      onClose();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 shadow-2xl">
        <div className="bg-blue-600 p-4 text-white font-bold flex justify-between items-center">
          <span className="flex items-center gap-2">
            <Icon icon="mdi:cash-plus" width="24"/> Registrar Abono
          </span>
          <button onClick={onClose} className="hover:bg-white/20 rounded-full p-1 transition">
            <Icon icon="mdi:close" width="24" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Tarjeta de Deuda */}
          <div className="bg-blue-50 p-4 rounded-xl text-center border border-blue-100 shadow-inner">
            <p className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-1">
              Deuda Total Actual
            </p>
            <p className="text-3xl font-black text-blue-700">
              ${Number(cuenta?.saldo_actual).toLocaleString("es-MX")}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Monto a Abonar</label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-400 font-bold">$</span>
              <input
                type="number"
                step="0.01"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className="w-full border border-gray-300 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 p-3 pl-8 rounded-lg text-xl font-bold outline-none transition-all"
                placeholder="0.00"
                required
              />
              {/* BOTÓN LIQUIDAR DENTRO DEL INPUT */}
              <button
                type="button"
                onClick={handleLiquidar}
                className="absolute right-2 top-2 px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded hover:bg-blue-200 transition-colors uppercase"
              >
                Liquidar
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Método de Pago</label>
            <div className="relative">
               <div className="absolute left-3 top-3 text-gray-400">
                 <Icon icon="mdi:credit-card-outline" width="20"/>
               </div>
              <select
                value={tipoPago}
                onChange={(e) => setTipoPago(e.target.value)}
                className="w-full border border-gray-300 bg-white p-3 pl-10 rounded-lg outline-none focus:border-blue-500 font-medium text-gray-700 cursor-pointer appearance-none"
              >
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="tarjeta">Tarjeta</option>
              </select>
            </div>
          </div>

          {activeTurnoId && (
            <div className="flex items-center justify-center gap-2 text-xs text-green-600 font-bold bg-green-50 p-2 rounded-lg border border-green-100">
              <Icon icon="mdi:check-circle" /> Se registrará en el turno actual.
            </div>
          )}

          <button
            disabled={loading}
            className="w-full bg-linear-to-r from-green-600 to-emerald-600 text-white py-3.5 rounded-xl font-bold hover:shadow-lg hover:to-emerald-700 transition-all transform active:scale-95 flex justify-center items-center gap-2"
          >
            {loading ? (
              <Icon icon="line-md:loading-loop" width="24"/>
            ) : (
              <>
                <Icon icon="mdi:check" width="24" /> Aplicar Abono
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};