import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../../../supabaseClient";
import { Icon } from "@iconify/react";
import ModalCargaAutotanque from "./ModalCargaAutotanque";
import ModalCarburacion from "./ModalCarburacion";

export const ModalFinDiaCompleto = ({
  isOpen,
  onClose,
  registrador: initialRegistrador,
  onDiaFinalizado,
  listaDiaria = [],
  pagosDiarios = [],
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [registrador, setRegistrador] = useState(initialRegistrador);
  const [registradorId, setRegistradorId] = useState(null);
  const [loading, setLoading] = useState(false);

  // Modales internos
  const [showCargaModal, setShowCargaModal] = useState(false);
  const [showCarburacionModal, setShowCarburacionModal] = useState(false);
  const [cargaDone, setCargaDone] = useState(false);
  const [carburacionDone, setCarburacionDone] = useState(false);

  // CÁLCULOS MATEMÁTICOS (Igual que DailySummary)
  const resumen = useMemo(() => {
    const litros = listaDiaria.reduce((acc, item) => acc + (Number(item.consumo_litros) || 0), 0);
    const litrosRet = listaDiaria.reduce((acc, item) => acc + (Number(item.ret) || 0), 0);
    const ventaEfectivo = listaDiaria.filter((i) => i.tipo_pago === "efectivo").reduce((acc, i) => acc + (Number(i.monto_total) || 0), 0);
    const ventaDigital = listaDiaria.filter((i) => i.tipo_pago !== "efectivo").reduce((acc, i) => acc + (Number(i.monto_total) || 0), 0);
    const cobroEfectivo = pagosDiarios.filter((p) => p.tipo_pago === "efectivo").reduce((acc, p) => acc + (Number(p.monto_pago) || 0), 0);
    const cobroDigital = pagosDiarios.filter((p) => p.tipo_pago !== "efectivo").reduce((acc, p) => acc + (Number(p.monto_pago) || 0), 0);
    
    return {
      litros,
      litrosRet,
      ventaEfectivo,
      ventaDigital,
      cobroEfectivo,
      cobroDigital,
      totalCobranza: cobroEfectivo + cobroDigital,
    };
  }, [listaDiaria, pagosDiarios]);

  const fetchDataParaReporte = useCallback(async () => {
    setLoading(true);
    const fechaLocal = new Date().toLocaleDateString("fr-CA", { timeZone: "America/Mexico_City" });

    try {
      const { data: pDiario, error: pError } = await supabase
        .from("porcentaje_diario")
        .select(`*, registrador_inicial:personal (nombre, apellidos)`)
        .eq("fecha", fechaLocal)
        .order("id", { ascending: false })
        .limit(1)
        .single();

      if (pError && pError.code !== "PGRST116") throw pError;

      if (pDiario) {
        setRegistradorId(pDiario.registrador_id);
        if (!initialRegistrador && pDiario.registrador_inicial) {
          setRegistrador(pDiario.registrador_inicial);
        }
      }
    } catch (error) {
      console.error("Error cargando datos:", error);
      setErrorMsg("Error al preparar los datos.");
    } finally {
      setLoading(false);
    }
  }, [initialRegistrador]);

  useEffect(() => {
    if (isOpen) {
      setRegistrador(initialRegistrador);
      fetchDataParaReporte();
      setCargaDone(false);
      setCarburacionDone(false);
      setErrorMsg("");
      setSuccessMsg("");
    }
  }, [isOpen, initialRegistrador, fetchDataParaReporte]);

  // --- LÓGICA SIMPLIFICADA: SOLO INSERTAR DATOS ---
  const handleFinalizarDia = async () => {
    setIsSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("Finalizando día y cerrando caja...");

    try {
      const today = new Date().toLocaleDateString("fr-CA", { timeZone: "America/Mexico_City" });

      const reporte = {
        fecha: today,
        litros_totales: resumen.litros,
        ret_total: resumen.litrosRet,
        litros_reales: resumen.litros - resumen.litrosRet,
        efectivo: resumen.ventaEfectivo,
        transferencia: resumen.ventaDigital, // Usamos campo 'transferencia' para total digital
        tarjeta: 0, 
        credito: 0,
        cobrados: resumen.totalCobranza,
        id_personal: registradorId,
        finalizado: true,
        url: null, // YA NO GUARDAMOS PDF
      };

      const { error: insertError } = await supabase.from("reporte_diario").insert(reporte);
      if (insertError) throw insertError;

      setSuccessMsg("¡Día finalizado exitosamente!");

      setTimeout(() => {
        onDiaFinalizado();
        onClose();
      }, 1500);
    } catch (error) {
      console.error("Error al finalizar:", error);
      setErrorMsg("Error: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 animate-fadeIn">
          <div className="flex justify-between items-center border-b pb-4 mb-4">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Icon icon="streamline-ultimate:factory-building-1-bold" className="text-blue-600" width="24" />
              Cierre de Actividades
            </h3>
            <button onClick={onClose} disabled={isSubmitting} className="text-gray-400 hover:text-red-500">
              <Icon icon="line-md:close" width="24" />
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <Icon icon="line-md:loading-loop" width="48" className="animate-spin text-blue-600 mx-auto mb-2" />
              <p>Cargando...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-center text-sm text-gray-600 bg-blue-50 p-3 rounded">
                Confirma las actividades en planta. Al finalizar, el sistema cerrará el turno.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowCargaModal(true)}
                  disabled={cargaDone}
                  className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                    cargaDone ? "bg-green-50 border-green-500 text-green-700" : "bg-white border-gray-200 text-gray-600 hover:border-blue-500"
                  }`}
                >
                  <Icon icon="hugeicons:tanker-truck" width="32" className="mb-2" />
                  <span className="text-xs font-bold text-center">Carga Autotanque</span>
                  {cargaDone && <Icon icon="line-md:confirm-circle" className="mt-1 text-green-600" />}
                </button>

                <button
                  onClick={() => setShowCarburacionModal(true)}
                  disabled={carburacionDone}
                  className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                    carburacionDone ? "bg-green-50 border-green-500 text-green-700" : "bg-white border-gray-200 text-gray-600 hover:border-orange-500"
                  }`}
                >
                  <Icon icon="mdi:gas-station" width="32" className="mb-2" />
                  <span className="text-xs font-bold text-center">Carburación</span>
                  {carburacionDone && <Icon icon="line-md:confirm-circle" className="mt-1 text-green-600" />}
                </button>
              </div>

              {errorMsg && <div className="p-3 bg-red-100 text-red-700 rounded text-sm text-center">{errorMsg}</div>}
              {successMsg && <div className="p-3 bg-green-100 text-green-700 rounded text-sm text-center">{successMsg}</div>}

              <button
                onClick={handleFinalizarDia}
                disabled={isSubmitting}
                className="w-full mt-4 flex items-center justify-center gap-3 px-6 py-4 bg-slate-900 text-white font-bold rounded-lg shadow-lg hover:bg-slate-800 disabled:opacity-50"
              >
                <Icon icon={isSubmitting ? "line-md:loading-loop" : "line-md:check-list-3"} width="24" className={isSubmitting ? "animate-spin" : ""} />
                {isSubmitting ? "Finalizando..." : "Cerrar Día"}
              </button>
            </div>
          )}
        </div>
        
        {/* Modales Hijos */}
        {showCargaModal && (
            <ModalCargaAutotanque
            isOpen={showCargaModal}
            onClose={() => setShowCargaModal(false)}
            registradorId={registradorId}
            onCargaSuccess={() => {
                setCargaDone(true);
                setShowCargaModal(false);
                fetchDataParaReporte();
            }}
            />
        )}
        {showCarburacionModal && (
            <ModalCarburacion
            isOpen={showCarburacionModal}
            onClose={() => setShowCarburacionModal(false)}
            registradorId={registradorId}
            onCarburacionSuccess={() => {
                setCarburacionDone(true);
                setShowCarburacionModal(false);
                fetchDataParaReporte();
            }}
            />
        )}
    </div>
  );
};

export default ModalFinDiaCompleto;