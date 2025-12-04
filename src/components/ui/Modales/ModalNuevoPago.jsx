import React, { useState, useEffect } from "react";
import  {supabase}  from "../../../supabaseClient";
import { Icon } from "@iconify/react";
import { useAuth } from "../../../auth/useAuth"; // Asumiendo que tienes user aquí

export const ModalNuevoPago = ({ isOpen, onClose, onPagoGuardado, cuenta }) => {
  const { user, appUser } = useAuth();
  const [monto, setMonto] = useState("");
  const [tipoPago, setTipoPago] = useState("efectivo");
  const [loading, setLoading] = useState(false);
  const [activeTurnoId, setActiveTurnoId] = useState(null);

  // 1. Detectar turno activo para el Dashboard (Req #4)
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
      .is("porcentaje_final", null) // Turno abierto
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();
    setActiveTurnoId(data?.id || null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (parseFloat(monto) > cuenta.saldo_actual) {
      if (!confirm("Estás abonando más de la deuda total. ¿Continuar?")) return;
    }

    setLoading(true);
    try {
      // USAMOS LA RPC PARA REGISTRAR ABONO (Req #5: No toca carga_casa)
      const { error } = await supabase.rpc("registrar_movimiento_credito", {
        p_id_casa: cuenta.id_casa,
        p_tipo: "ABONO", // RESTA DEUDA
        p_monto: parseFloat(monto),
        p_descripcion: `Abono vía ${tipoPago}`,
        p_id_carga: null,
        p_id_turno: activeTurnoId, // Req #4: Se va al turno actual
        p_user_id: user?.id,
        p_app_users_id: appUser?.id
      });

      if (error) throw error;

      // ADICIONAL: Insertar en tabla pagos para que aparezca en el Dashboard (reporte diario)
      // El Dashboard lee de la tabla 'pagos'. Podemos o bien migrar el dashboard a leer 'movimientos_credito'
      // o mantener la tabla 'pagos' como espejo simple para el turno.
      // Opción recomendada: Mantener 'pagos' sincronizada para no romper dashboard ahora.
      await supabase.from("pagos").insert([
        {
          monto_pago: parseFloat(monto),
          fecha_pago: new Date().toISOString(),
          tipo_pago: tipoPago,
          id_turno: activeTurnoId,
          // id_carga: null // Ya no ligamos a una carga específica, es un abono general
          // NOTA: Si tu dashboard requiere id_carga forzosamente, habrá que editar el dashboard
          // para que sea opcional. Ojo aquí.
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
    // ... (Tu UI de modal, igual que antes, solo cambia el onSubmit={handleSubmit})
    // Asegúrate de mostrar: "Saldo Actual: {cuenta.saldo_actual}"
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl w-full max-w-md overflow-hidden">
        <div className="bg-blue-600 p-4 text-white font-bold flex justify-between">
          <span>Registrar Abono</span>
          <button onClick={onClose}>
            <Icon icon="mdi:close" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-blue-50 p-3 rounded text-center">
            <p className="text-xs font-bold text-blue-500 uppercase">
              Deuda Total
            </p>
            <p className="text-2xl font-black text-blue-700">
              ${cuenta?.saldo_actual}
            </p>
          </div>

          {/* Input Monto */}
          <input
            type="number"
            step="0.01"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            className="w-full border p-3 rounded text-xl font-bold"
            placeholder="$ 0.00"
            required
          />

          {/* Select Tipo */}
          <select
            value={tipoPago}
            onChange={(e) => setTipoPago(e.target.value)}
            className="w-full border p-3 rounded"
          >
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
            <option value="tarjeta">Tarjeta</option>
          </select>

          {activeTurnoId && (
            <p className="text-xs text-green-600 font-bold text-center">
              ✅ Se registrará en el turno actual.
            </p>
          )}

          <button
            disabled={loading}
            className="w-full bg-green-600 text-white py-3 rounded font-bold hover:bg-green-700"
          >
            {loading ? "Procesando..." : "Aplicar Pago"}
          </button>
        </form>
      </div>
    </div>
  );
};
