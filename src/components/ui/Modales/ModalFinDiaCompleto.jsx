import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "../../../supabaseClient";
import { Icon } from "@iconify/react";
import ModalCargaAutotanque from "./ModalCargaAutotanque";
import ModalCarburacion from "./ModalCarburacion";
import { useAuth } from "../../../auth/useAuth";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// Frases de superación para el footer
const frasesSuperacion = [
  "El éxito es la suma de pequeños esfuerzos repetidos cada día.",
  "La calidad de tu trabajo define la calidad de tus resultados.",
  "Hoy has dado un paso más hacia tus metas. ¡Gran trabajo!",
  "La excelencia no es un acto, es un hábito.",
  "Tu dedicación es el motor que impulsa grandes logros.",
];

export const ModalFinDiaCompleto = ({
  isOpen,
  onClose,
  registrador: initialRegistrador,
  onDiaFinalizado,
  listaDiaria = [],
  pagosDiarios = [],
  unidad,
}) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Datos del flujo
  const [registrador, setRegistrador] = useState(initialRegistrador);
  const [registradorId, setRegistradorId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [datosReporte, setDatosReporte] = useState({
    porcentajeDiario: null,
    carburacion: [],
    autotanque: [],
  });

  // Modales internos
  const [showCargaModal, setShowCargaModal] = useState(false);
  const [showCarburacionModal, setShowCarburacionModal] = useState(false);
  const [cargaDone, setCargaDone] = useState(false);
  const [carburacionDone, setCarburacionDone] = useState(false);

  // Referencia para el reporte imprimible
  const reportRef = useRef(null);
  const [fraseDelDia, setFraseDelDia] = useState("");

  // --- CÁLCULOS MATEMÁTICOS PARA EL REPORTE (Igual que DailySummary) ---
  const resumen = useMemo(() => {
    // 1. Litros
    const litros = listaDiaria.reduce(
      (acc, item) => acc + (Number(item.consumo_litros) || 0),
      0
    );
    const litrosRet = listaDiaria.reduce(
      (acc, item) => acc + (Number(item.ret) || 0),
      0
    );

    // 2. Ventas
    const ventaEfectivo = listaDiaria
      .filter((i) => i.tipo_pago === "efectivo")
      .reduce((acc, i) => acc + (Number(i.monto_total) || 0), 0);
    const ventaDigital = listaDiaria
      .filter((i) => i.tipo_pago !== "efectivo")
      .reduce((acc, i) => acc + (Number(i.monto_total) || 0), 0);

    // 3. Cobranza
    const cobroEfectivo = pagosDiarios
      .filter((p) => p.tipo_pago === "efectivo")
      .reduce((acc, p) => acc + (Number(p.monto_pago) || 0), 0);
    const cobroDigital = pagosDiarios
      .filter((p) => p.tipo_pago !== "efectivo")
      .reduce((acc, p) => acc + (Number(p.monto_pago) || 0), 0);

    // 4. Totales
    const totalCaja = ventaEfectivo + cobroEfectivo;
    const totalBancos = ventaDigital + cobroDigital;
    const totalCobranza = cobroEfectivo + cobroDigital;

    return {
      litros,
      litrosRet,
      ventaEfectivo,
      ventaDigital,
      cobroEfectivo,
      cobroDigital,
      totalCaja,
      totalBancos,
      totalCobranza,
    };
  }, [listaDiaria, pagosDiarios]);

  // 1. Cargar datos necesarios al abrir
  const fetchDataParaReporte = useCallback(async () => {
    setLoading(true);
    const fechaLocal = new Date().toLocaleDateString("fr-CA", {
      timeZone: "America/Mexico_City",
    });

    try {
      // A) Obtener datos de porcentaje_diario (Inicio y Fin del TURNO ACTUAL o último)
      const { data: pDiario, error: pError } = await supabase
        .from("porcentaje_diario")
        .select(`*, registrador_inicial:personal (nombre, apellidos)`)
        .eq("fecha", fechaLocal)
        .order("id", { ascending: false })
        .limit(1)
        .single();

      if (pError && pError.code !== "PGRST116") throw pError;

      // B) Obtener Carburación del día (TODAS las del día)
      const { data: carbData, error: cError } = await supabase
        .from("carburacion")
        .select("*")
        .eq("fecha", fechaLocal); // Filtro por fecha para traer todo lo del día

      if (cError) throw cError;

      // C) Obtener Carga Autotanque del día (TODAS las del día)
      const { data: tankData, error: tError } = await supabase
        .from("carga_autotanque")
        .select("*")
        .eq("fecha", fechaLocal); // Filtro por fecha

      if (tError) throw tError;

      setDatosReporte({
        porcentajeDiario: pDiario,
        carburacion: carbData || [],
        autotanque: tankData || [],
      });

      if (pDiario) {
        setRegistradorId(pDiario.registrador_id);
        if (!initialRegistrador && pDiario.registrador_inicial) {
          setRegistrador(pDiario.registrador_inicial);
        }
      }
    } catch (error) {
      console.error("Error cargando datos para reporte:", error);
      setErrorMsg("Error al preparar los datos del reporte.");
    } finally {
      setLoading(false);
    }
  }, [initialRegistrador]);

  useEffect(() => {
    if (isOpen) {
      setFraseDelDia(
        frasesSuperacion[Math.floor(Math.random() * frasesSuperacion.length)]
      );
      setRegistrador(initialRegistrador);
      fetchDataParaReporte();
      setCargaDone(false);
      setCarburacionDone(false);
      setErrorMsg("");
      setSuccessMsg("");
    }
  }, [isOpen, initialRegistrador, fetchDataParaReporte]);

  // 2. Función Principal: Generar PDF/Imagen y Guardar
  const handleFinalizarDia = async () => {
    setIsSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("Generando reporte y finalizando día...");

    try {
      const today = new Date().toLocaleDateString("fr-CA", {
        timeZone: "America/Mexico_City",
      });

      // B. Generar Imagen del Reporte
      if (!reportRef.current)
        throw new Error("No se pudo generar la vista del reporte.");

      await new Promise((resolve) => setTimeout(resolve, 800)); // Esperar renderizado

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");

      // --- LÓGICA DE PAGINACIÓN PDF ---
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Reporte_Diario_${today}.pdf`);

      // C. Subir Imagen
      const blob = await (await fetch(imgData)).blob();
      const fileName = `reportes/${today}_reporte_final_${Date.now()}.png`;

      const { error: uploadError } = await supabase.storage
        .from("fotos_diarias")
        .upload(fileName, blob, { contentType: "image/png" });

      if (uploadError)
        throw new Error("Error subiendo el reporte: " + uploadError.message);

      const {
        data: { publicUrl },
      } = supabase.storage.from("fotos_diarias").getPublicUrl(fileName);

      // D. Insertar en BD
      const reporte = {
        fecha: today,
        litros_totales: resumen.litros,
        ret_total: resumen.litrosRet,
        litros_reales: resumen.litros - resumen.litrosRet,
        efectivo: resumen.ventaEfectivo,
        transferencia: resumen.ventaDigital, // Guardamos total digital en columna transferencia por compatibilidad o ajustar BD
        tarjeta: 0, // Si quieres separar, ajusta el reduce
        credito: 0,
        cobrados: resumen.totalCobranza,
        id_personal: registradorId,
        finalizado: true,
        url: publicUrl,
      };

      const { error: insertError } = await supabase
        .from("reporte_diario")
        .insert(reporte);

      if (insertError) throw insertError;

      setSuccessMsg("¡Reporte generado y día finalizado correctamente!");

      setTimeout(() => {
        onDiaFinalizado();
        onClose();
      }, 2000);
    } catch (error) {
      console.error("Error al finalizar:", error);
      setErrorMsg("Error: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatMoney = (amount) =>
    amount.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

  if (!isOpen) return null;

  // --- ESTILOS MEJORADOS PARA EL REPORTE (CSS-in-JS) ---
  const styles = {
    container: {
      position: "absolute",
      top: "0",
      left: "-9999px",
      width: "794px", // A4 Width
      backgroundColor: "#ffffff",
      fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
      color: "#333",
      padding: "0",
    },
    header: {
      backgroundColor: "#1e3a8a",
      color: "white",
      padding: "30px 40px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    headerTitle: {
      fontSize: "28px",
      fontWeight: "bold",
      textTransform: "uppercase",
      margin: 0,
    },
    headerSub: { fontSize: "12px", opacity: 0.9, marginTop: "5px" },
    content: { padding: "40px" },
    sectionTitle: {
      fontSize: "16px",
      fontWeight: "bold",
      color: "#1e3a8a",
      borderBottom: "2px solid #e5e7eb",
      paddingBottom: "8px",
      marginBottom: "20px",
      marginTop: "30px",
      textTransform: "uppercase",
    },
    // Estilos para las tarjetas de Inicio/Fin
    levelCard: {
      flex: 1,
      border: "1px solid #e2e8f0",
      borderRadius: "8px",
      overflow: "hidden",
      backgroundColor: "#f8fafc",
    },
    levelHeader: {
      padding: "10px 15px",
      color: "white",
      fontWeight: "bold",
      textTransform: "uppercase",
      fontSize: "12px",
      display: "flex",
      justifyContent: "space-between",
    },
    levelBody: {
      padding: "15px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "10px",
    },
    bigImage: {
      width: "100%",
      height: "220px", // IMAGEN GRANDE
      objectFit: "cover",
      borderRadius: "6px",
      border: "2px solid #cbd5e1",
    },
    percentageText: {
      fontSize: "32px",
      fontWeight: "800",
      color: "#334155",
    },
    // Estilos Tablas y Cards
    table: { width: "100%", borderCollapse: "collapse", fontSize: "11px" },
    th: {
      backgroundColor: "#f1f5f9",
      color: "#475569",
      fontWeight: "bold",
      padding: "10px",
      textAlign: "left",
      borderBottom: "1px solid #cbd5e1",
      textTransform: "uppercase",
    },
    td: {
      padding: "10px",
      borderBottom: "1px solid #f1f5f9",
      color: "#334155",
    },

    // Grid de resumen financiero
    summaryGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: "15px",
      marginBottom: "20px",
    },
    summaryCard: {
      padding: "15px",
      borderRadius: "8px",
      border: "1px solid #e2e8f0",
      backgroundColor: "#fff",
    },
  };

  return (
    <>
      {/* --- MODAL VISIBLE UI (Sin cambios funcionales) --- */}
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 animate-fadeIn">
          {/* ... Header del modal ... */}
          <div className="flex justify-between items-center border-b pb-4 mb-4">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Icon
                icon="streamline-ultimate:factory-building-1-bold"
                className="text-blue-600"
                width="24"
              />
              Cierre de Actividades
            </h3>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="text-gray-400 hover:text-red-500"
            >
              <Icon icon="line-md:close" width="24" />
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <Icon
                icon="line-md:loading-loop"
                width="48"
                className="animate-spin text-blue-600 mx-auto mb-2"
              />
              <p>Cargando...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-center text-sm text-gray-600 bg-blue-50 p-3 rounded">
                Confirma las actividades en planta para generar el reporte final
                con todas las evidencias.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowCargaModal(true)}
                  disabled={cargaDone}
                  className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                    cargaDone
                      ? "bg-green-50 border-green-500 text-green-700"
                      : "bg-white border-gray-200 text-gray-600 hover:border-blue-500"
                  }`}
                >
                  <Icon
                    icon="hugeicons:tanker-truck"
                    width="32"
                    className="mb-2"
                  />
                  <span className="text-xs font-bold text-center">
                    Carga Autotanque
                  </span>
                  {cargaDone && (
                    <Icon
                      icon="line-md:confirm-circle"
                      className="mt-1 text-green-600"
                    />
                  )}
                </button>

                <button
                  onClick={() => setShowCarburacionModal(true)}
                  disabled={carburacionDone}
                  className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                    carburacionDone
                      ? "bg-green-50 border-green-500 text-green-700"
                      : "bg-white border-gray-200 text-gray-600 hover:border-orange-500"
                  }`}
                >
                  <Icon icon="mdi:gas-station" width="32" className="mb-2" />
                  <span className="text-xs font-bold text-center">
                    Carburación
                  </span>
                  {carburacionDone && (
                    <Icon
                      icon="line-md:confirm-circle"
                      className="mt-1 text-green-600"
                    />
                  )}
                </button>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-100 text-red-700 rounded text-sm text-center">
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="p-3 bg-green-100 text-green-700 rounded text-sm text-center">
                  {successMsg}
                </div>
              )}

              <button
                onClick={handleFinalizarDia}
                disabled={isSubmitting}
                className="w-full mt-4 flex items-center justify-center gap-3 px-6 py-4 bg-slate-900 text-white font-bold rounded-lg shadow-lg hover:bg-slate-800 disabled:opacity-50"
              >
                <Icon
                  icon={
                    isSubmitting
                      ? "line-md:loading-loop"
                      : "line-md:check-list-3"
                  }
                  width="24"
                  className={isSubmitting ? "animate-spin" : ""}
                />
                {isSubmitting ? "Generando PDF..." : "Generar Reporte Final"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* --- ESTRUCTURA OCULTA DEL REPORTE (HTML PARA PDF) --- */}
      <div style={styles.container} ref={reportRef}>
        {/* 1. HEADER */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.headerTitle}>Reporte de Turno</h1>
            <p style={styles.headerSub}>Control Operativo y Financiero</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: "18px", fontWeight: "bold", margin: 0 }}>
              {unidad?.empresa}
            </p>
            <p style={{ margin: "2px 0" }}>Unidad: {unidad?.num_unidad}</p>
            <p style={{ margin: 0, fontSize: "12px", opacity: 0.8 }}>
              {new Date().toLocaleDateString("es-MX", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>

        <div style={styles.content}>
          {/* 2. REGISTRO DE NIVELES (INICIO Y FIN) - IMÁGENES GRANDES */}
          <h3 style={styles.sectionTitle}>Control de Niveles (Medidor)</h3>
          <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
            {/* LLEGADA / INICIO */}
            <div style={styles.levelCard}>
              <div
                style={{ ...styles.levelHeader, backgroundColor: "#2563eb" }}
              >
                <span>Inicio de Turno</span>
                <span>
                  {datosReporte.porcentajeDiario?.registrador_inicial?.nombre}
                </span>
              </div>
              <div style={styles.levelBody}>
                <div style={styles.percentageText}>
                  {datosReporte.porcentajeDiario?.porcentaje_inicial}%
                </div>
                {datosReporte.porcentajeDiario?.url_inicial ? (
                  <img
                    src={datosReporte.porcentajeDiario.url_inicial}
                    style={styles.bigImage}
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div
                    style={{
                      ...styles.bigImage,
                      backgroundColor: "#f1f5f9",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    Sin Imagen
                  </div>
                )}
              </div>
            </div>

            {/* SALIDA / FIN */}
            <div style={styles.levelCard}>
              <div
                style={{ ...styles.levelHeader, backgroundColor: "#dc2626" }}
              >
                <span>Cierre de Turno</span>
                <span>(Operador en Turno)</span>
              </div>
              <div style={styles.levelBody}>
                <div style={{ ...styles.percentageText, color: "#dc2626" }}>
                  {datosReporte.porcentajeDiario?.porcentaje_final
                    ? `${datosReporte.porcentajeDiario.porcentaje_final}%`
                    : "N/A"}
                </div>
                {datosReporte.porcentajeDiario?.url_final ? (
                  <img
                    src={datosReporte.porcentajeDiario.url_final}
                    style={styles.bigImage}
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div
                    style={{
                      ...styles.bigImage,
                      backgroundColor: "#f1f5f9",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    Sin Imagen
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3. LISTA DE VENTAS */}
          <h3 style={styles.sectionTitle}>Desglose de Ventas del Turno</h3>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: "40%" }}>
                  Cliente / Ubicación
                </th>
                <th style={{ ...styles.th, textAlign: "center" }}>Lts</th>
                <th style={{ ...styles.th, textAlign: "center" }}>RET</th>
                <th style={{ ...styles.th, textAlign: "right" }}>Total</th>
                <th style={{ ...styles.th, textAlign: "center" }}>Pago</th>
              </tr>
            </thead>
            <tbody>
              {listaDiaria.length > 0 ? (
                listaDiaria.map((item, idx) => (
                  <tr
                    key={idx}
                    style={{
                      backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f8fafc",
                    }}
                  >
                    <td style={styles.td}>
                      <strong>
                        {item.calle} #{item.numero}
                      </strong>
                      <br />
                      <span style={{ color: "#64748b" }}>{item.colonia}</span>
                    </td>
                    <td style={{ ...styles.td, textAlign: "center" }}>
                      {item.consumo_litros}
                    </td>
                    <td
                      style={{
                        ...styles.td,
                        textAlign: "center",
                        color: "#ef4444",
                      }}
                    >
                      {item.ret > 0 ? item.ret : "-"}
                    </td>
                    <td
                      style={{
                        ...styles.td,
                        textAlign: "right",
                        fontWeight: "bold",
                      }}
                    >
                      {formatMoney(item.monto_total)}
                    </td>
                    <td style={{ ...styles.td, textAlign: "center" }}>
                      <span
                        style={{
                          textTransform: "uppercase",
                          fontSize: "10px",
                          padding: "2px 5px",
                          borderRadius: "4px",
                          backgroundColor: "#e2e8f0",
                        }}
                      >
                        {item.tipo_pago}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="5"
                    style={{
                      padding: "20px",
                      textAlign: "center",
                      color: "#94a3b8",
                    }}
                  >
                    Sin ventas registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* 4. RESUMEN FINANCIERO (TARJETAS) */}
          <h3 style={styles.sectionTitle}>Balance Financiero</h3>
          <div style={styles.summaryGrid}>
            {/* Balance Operativo */}
            <div
              style={{ ...styles.summaryCard, borderLeft: "4px solid #2563eb" }}
            >
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: "bold",
                  color: "#64748b",
                  textTransform: "uppercase",
                }}
              >
                Operativo
              </div>
              <div style={{ marginTop: "5px" }}>
                <div style={{ display: "flex", justify: "space-between" }}>
                  <span>Litros Vendidos:</span>
                  <strong>{resumen.litros.toFixed(2)}</strong>
                </div>
                <div
                  style={{
                    display: "flex",
                    justify: "space-between",
                    color: "#dc2626",
                  }}
                >
                  <span>Litros RET:</span>
                  <strong>{resumen.litrosRet.toFixed(2)}</strong>
                </div>
              </div>
            </div>

            {/* Total Caja */}
            <div
              style={{
                ...styles.summaryCard,
                borderLeft: "4px solid #16a34a",
                backgroundColor: "#f0fdf4",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: "bold",
                  color: "#166534",
                  textTransform: "uppercase",
                }}
              >
                Efectivo en Caja
              </div>
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: "800",
                  color: "#15803d",
                  marginTop: "5px",
                }}
              >
                {formatMoney(resumen.totalCaja)}
              </div>
              <div style={{ fontSize: "10px", color: "#166534" }}>
                (Ventas Efec. + Cobros Efec.)
              </div>
            </div>

            {/* Total Digital/Bancos */}
            <div
              style={{ ...styles.summaryCard, borderLeft: "4px solid #9333ea" }}
            >
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: "bold",
                  color: "#6b21a8",
                  textTransform: "uppercase",
                }}
              >
                Digital / Bancos
              </div>
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: "800",
                  color: "#7e22ce",
                  marginTop: "5px",
                }}
              >
                {formatMoney(resumen.totalBancos)}
              </div>
              <div style={{ fontSize: "10px", color: "#6b21a8" }}>
                (Ventas Dig. + Cobros Dig.)
              </div>
            </div>

            {/* Cobranza Total */}
            <div
              style={{
                ...styles.summaryCard,
                borderLeft: "4px solid #0d9488",
                gridColumn: "span 3",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: "bold",
                      color: "#115e59",
                      textTransform: "uppercase",
                    }}
                  >
                    Cobranza Recuperada (Abonos)
                  </div>
                  <div
                    style={{
                      fontSize: "18px",
                      fontWeight: "bold",
                      color: "#0f766e",
                    }}
                  >
                    {formatMoney(resumen.totalCobranza)}
                  </div>
                </div>
                <div style={{ fontSize: "11px", textAlign: "right" }}>
                  <div>Efectivo: {formatMoney(resumen.cobroEfectivo)}</div>
                  <div>Digital: {formatMoney(resumen.cobroDigital)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* 5. ACTIVIDADES EN PLANTA (POR FECHA, IMÁGENES GRANDES) */}
          {(datosReporte.autotanque.length > 0 ||
            datosReporte.carburacion.length > 0) && (
            <>
              <h3 style={styles.sectionTitle}>Actividades en Planta</h3>

              {/* Cargas Autotanque */}
              {datosReporte.autotanque.map((at, index) => (
                <div
                  key={`at-${index}`}
                  style={{
                    marginBottom: "20px",
                    border: "1px solid #bbf7d0",
                    borderRadius: "8px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      backgroundColor: "#f0fdf4",
                      padding: "10px",
                      color: "#166534",
                      fontWeight: "bold",
                      borderBottom: "1px solid #bbf7d0",
                    }}
                  >
                    Carga Autotanque #{index + 1} ({at.litros} Litros -{" "}
                    {formatMoney(at.monto)})
                  </div>
                  <div
                    style={{ display: "flex", gap: "10px", padding: "10px" }}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: "11px",
                          fontWeight: "bold",
                          textAlign: "center",
                          marginBottom: "5px",
                        }}
                      >
                        Inicial ({at.porcentaje_inicial}%)
                      </div>
                      <img
                        src={at.url_inicial}
                        style={{
                          width: "100%",
                          height: "180px",
                          objectFit: "cover",
                          borderRadius: "4px",
                          border: "1px solid #ddd",
                        }}
                        crossOrigin="anonymous"
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: "11px",
                          fontWeight: "bold",
                          textAlign: "center",
                          marginBottom: "5px",
                        }}
                      >
                        Final ({at.porcentaje_final}%)
                      </div>
                      <img
                        src={at.url_final}
                        style={{
                          width: "100%",
                          height: "180px",
                          objectFit: "cover",
                          borderRadius: "4px",
                          border: "1px solid #ddd",
                        }}
                        crossOrigin="anonymous"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* Carburaciones */}
              {datosReporte.carburacion.length > 0 && (
                <div
                  style={{
                    marginTop: "15px",
                    border: "1px solid #fed7aa",
                    borderRadius: "8px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      backgroundColor: "#fff7ed",
                      padding: "10px",
                      color: "#9a3412",
                      fontWeight: "bold",
                      borderBottom: "1px solid #fed7aa",
                    }}
                  >
                    Salidas por Carburación
                  </div>
                  <div style={{ padding: "10px" }}>
                    {datosReporte.carburacion.map((cb, idx) => (
                      <div
                        key={`cb-${idx}`}
                        style={{
                          padding: "8px",
                          borderBottom: "1px solid #eee",
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span>Registro #{idx + 1}</span>
                        <strong>{cb.litros} Litros</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* 6. PIE DE PÁGINA */}
          <div
            style={{
              marginTop: "40px",
              textAlign: "center",
              borderTop: "2px solid #e2e8f0",
              paddingTop: "20px",
            }}
          >
            <p
              style={{
                fontStyle: "italic",
                fontSize: "14px",
                color: "#475569",
                marginBottom: "10px",
              }}
            >
              "{fraseDelDia}"
            </p>
            <p style={{ fontSize: "10px", color: "#94a3b8" }}>
              Reporte Generado Automáticamente - {new Date().toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Modales Hijos (sin cambios) */}
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
    </>
  );
};

export default ModalFinDiaCompleto;
