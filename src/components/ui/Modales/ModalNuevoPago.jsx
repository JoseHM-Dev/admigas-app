import React, { useState, useEffect } from "react";
import { supabase } from "../../../supabaseClient";
import { Icon } from "@iconify/react";

export const ModalNuevoPago = ({
  isOpen,
  onClose,
  onPagoGuardado,
  credito,
  montoInicial = "",
}) => {
  const [monto, setMonto] = useState("");
  const [tipoPago, setTipoPago] = useState("efectivo");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [activeTurnoId, setActiveTurnoId] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setMonto(montoInicial || "");
      setTipoPago("efectivo");
      setError(null);
      checkTurnoActivo();
    }
  }, [isOpen, montoInicial]);

  // --- LÓGICA DE TURNO ACTIVO ---
  const checkTurnoActivo = async () => {
    try {
      const { data, error } = await supabase
        .from("porcentaje_diario")
        .select("id, porcentaje_final")
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error consultando turno:", error);
        return;
      }

      // Si el turno existe y NO tiene porcentaje_final (es null), está abierto.
      if (data && data.porcentaje_final === null) {
        setActiveTurnoId(data.id);
      } else {
        setActiveTurnoId(null);
      }
    } catch (err) {
      console.error("Error verificando turno:", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!credito || !credito.id_carga) {
      setError("Error: Crédito no válido.");
      return;
    }
    const montoNumerico = parseFloat(monto);
    if (isNaN(montoNumerico) || montoNumerico <= 0) {
      setError("Ingresa un monto válido mayor a 0.");
      return;
    }

    // Validación de pago excedente (con margen de 0.5 pesos)
    if (montoNumerico > credito.monto_pendiente + 0.5) {
      if (
        !confirm("El monto ingresado es mayor a la deuda. ¿Deseas continuar?")
      )
        return;
    }

    setGuardando(true);
    setError(null);

    try {
      // --- AQUÍ SE GUARDA LA FECHA Y EL TURNO ---
      const { error } = await supabase.from("pagos").insert([
        {
          id_carga: credito.id_carga,
          monto_pago: montoNumerico,

          // .toISOString() es CORRECTO. Guarda el momento exacto en formato universal.
          // Tu filtro de MainVentas se encargará de traducir esto a "Día Mexicano".
          fecha_pago: new Date().toISOString(),

          tipo_pago: tipoPago,
          id_porcentaje: activeTurnoId,

          // GUARDAMOS EL ID DEL TURNO (si existe, si no, se va como null)
          id_turno: activeTurnoId,
        },
      ]);

      if (error) throw new Error(error.message || "Error al guardar el pago.");

      // Actualizar deuda en la tabla carga_casa
      const nuevoMontoPendiente = credito.monto_pendiente - montoNumerico;
      const montoFinal = nuevoMontoPendiente < 0 ? 0 : nuevoMontoPendiente;

      const { error: updateError } = await supabase
        .from("carga_casa")
        .update({
          monto_pendiente: montoFinal,
          estado_pago: montoFinal <= 0.1, // Se considera pagado si debe menos de 10 centavos
        })
        .eq("id_carga", credito.id_carga);

      if (updateError) throw new Error(updateError.message);

      onPagoGuardado();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-all duration-300">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all scale-100 animate-in fade-in zoom-in duration-200">
        {/* HEADER */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
              <Icon icon="mdi:cash-register" className="text-white w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-wide">
              Registrar Abono
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <Icon icon="mdi:close" width="28" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-8 space-y-6">
            {/* INFO DEUDA */}
            {credito && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-red-400 uppercase tracking-wider">
                    Deuda Actual
                  </p>
                  <p className="text-xs text-red-300">Antes del pago</p>
                </div>
                <div className="text-2xl font-extrabold text-red-600">
                  ${credito.monto_pendiente?.toFixed(2)}
                </div>
              </div>
            )}

            {/* AVISO DE TURNO (Feedback Visual) */}
            <div
              className={`text-xs px-3 py-2 rounded-md border flex items-center gap-2 ${
                activeTurnoId
                  ? "bg-green-50 border-green-200 text-green-700"
                  : "bg-gray-50 border-gray-200 text-gray-500"
              }`}
            >
              <Icon
                icon={
                  activeTurnoId
                    ? "mdi:clock-check-outline"
                    : "mdi:clock-remove-outline"
                }
                width="16"
              />
              {activeTurnoId ? (
                <span>
                  <b>Turno Activo (#{activeTurnoId}):</b> El pago se registrará
                  en el corte de hoy.
                </span>
              ) : (
                <span>
                  <b>Sin Turno:</b> Caja cerrada. El pago se registra, pero no
                  aparecerá en el corte operativo.
                </span>
              )}
            </div>

            {/* INPUT MONTO */}
            <div className="group">
              <label
                htmlFor="monto"
                className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1"
              >
                Monto a Abonar <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-emerald-500 transition-colors">
                  <Icon icon="mdi:currency-usd" width="24" />
                </div>
                <input
                  type="number"
                  id="monto"
                  step="0.01"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  placeholder="0.00"
                  className="block w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-xl font-bold focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all duration-200 shadow-sm"
                  required
                />
              </div>
            </div>

            {/* SELECT TIPO DE PAGO */}
            <div className="group">
              <label
                htmlFor="tipoPago"
                className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1"
              >
                Método de Pago
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500">
                  <Icon icon="mdi:credit-card-settings-outline" width="24" />
                </div>
                <select
                  id="tipoPago"
                  value={tipoPago}
                  onChange={(e) => setTipoPago(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 font-medium focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all cursor-pointer appearance-none"
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta Bancaria</option>
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                  <Icon icon="mdi:chevron-down" />
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 flex items-center gap-2 rounded-r animate-pulse">
                <Icon icon="mdi:alert-circle" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}
          </div>

          <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-white hover:text-gray-900 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className={`px-6 py-2.5 rounded-lg text-white font-medium shadow-lg shadow-emerald-500/30 flex items-center gap-2 transition-all transform active:scale-95 ${
                guardando
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 hover:-translate-y-0.5"
              }`}
            >
              {guardando ? (
                <>
                  <Icon icon="line-md:loading-loop" /> Procesando...
                </>
              ) : (
                <>
                  <Icon icon="mdi:check-circle" /> Aplicar Pago
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
