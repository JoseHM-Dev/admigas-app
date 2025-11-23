import { useState, useEffect, useCallback, useRef } from "react";
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
  const { user } = useAuth(); // Para obtener la imagen de perfil (avatar)
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

  // 1. Cargar datos necesarios al abrir
  const fetchDataParaReporte = useCallback(async () => {
    setLoading(true);
    const today = new Date();
    const fechaLocal = today.toISOString().split("T")[0];

    try {
      // A) Obtener datos de porcentaje_diario (Inicio y Fin)
      const { data: pDiario, error: pError } = await supabase
        .from("porcentaje_diario")
        .select(`
          *,
          registrador_inicial:registrador_id (nombre, apellidos)
        `)
        .eq("fecha", fechaLocal)
        .order("id", { ascending: false })
        .limit(1)
        .single();

      if (pError && pError.code !== "PGRST116") throw pError;

      // B) Obtener Carburación del día
      const { data: carbData, error: cError } = await supabase
        .from("carburacion")
        .select("*")
        .eq("fecha", fechaLocal);
      
      if (cError) throw cError;

      // C) Obtener Carga Autotanque del día
      const { data: tankData, error: tError } = await supabase
        .from("carga_autotanque")
        .select("*")
        .eq("fecha", fechaLocal);

      if (tError) throw tError;

      setDatosReporte({
        porcentajeDiario: pDiario,
        carburacion: carbData || [],
        autotanque: tankData || [],
      });

      if (pDiario) {
        setRegistradorId(pDiario.registrador_id);
        // Actualizar registrador visual si no vino por props
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
      setFraseDelDia(frasesSuperacion[Math.floor(Math.random() * frasesSuperacion.length)]);
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
      // A. Cálculos Finales (Totales)
      const today = new Date().toISOString().split("T")[0];
      let litros_totales = 0;
      let ret_total = 0;
      let efectivo = 0, transferencia = 0, tarjeta = 0, credito = 0;

      listaDiaria.forEach((carga) => {
        litros_totales += carga.consumo_litros || 0;
        ret_total += carga.ret || 0;
        const monto = carga.monto_total || 0;
        if (carga.tipo_pago === "efectivo") efectivo += monto;
        else if (carga.tipo_pago === "transferencia") transferencia += monto;
        else if (carga.tipo_pago === "tarjeta") tarjeta += monto;
        else if (carga.tipo_pago === "credito") credito += monto;
      });

      const litros_reales = litros_totales - ret_total;
      const cobrados = pagosDiarios.reduce((acc, p) => acc + (p.monto_pago || 0), 0);

      // B. Generar Imagen del Reporte (HTML2Canvas)
      if (!reportRef.current) throw new Error("No se pudo generar la vista del reporte.");
      
      // Esperar un momento para asegurar renderizado de imágenes
      await new Promise((resolve) => setTimeout(resolve, 800));

      const canvas = await html2canvas(reportRef.current, {
        scale: 2, // Mejor calidad
        useCORS: true, // Permitir imágenes externas (Supabase Storage)
        logging: false,
        backgroundColor: "#ffffff"
      });

      const imgData = canvas.toDataURL("image/png");
      
      // Opción A: Descargar PDF automáticamente (Petición: "obtener un pdf")
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Reporte_Diario_${today}.pdf`);

      // C. Subir Imagen a Supabase Storage para obtener URL
      const blob = await (await fetch(imgData)).blob();
      const fileName = `reportes/${today}_reporte_final_${Date.now()}.png`;
      
      const { error: uploadError } = await supabase.storage
        .from("fotos_diarias") // Usando el bucket existente
        .upload(fileName, blob, { contentType: 'image/png' });

      if (uploadError) throw new Error("Error subiendo el reporte: " + uploadError.message);

      const { data: { publicUrl } } = supabase.storage
        .from("fotos_diarias")
        .getPublicUrl(fileName);

      // D. Insertar en Base de Datos
      const reporte = {
        fecha: today,
        litros_totales,
        ret_total,
        litros_reales,
        efectivo,
        transferencia,
        tarjeta,
        credito,
        cobrados,
        id_personal: registradorId,
        finalizado: true,
        url: publicUrl, // <-- Guardamos la URL del reporte aquí
      };

      const { error: insertError } = await supabase
        .from("reporte_diario")
        .insert(reporte);

      if (insertError) throw insertError;

      setSuccessMsg("¡Reporte generado y día finalizado correctamente!");
      
      setTimeout(() => {
        onDiaFinalizado(); // Refrescar dashboard
        onClose(); // Cerrar modal
      }, 2000);

    } catch (error) {
      console.error("Error al finalizar:", error);
      setErrorMsg("Error: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* --- MODAL VISIBLE (Mantiene Tailwind para la UI del usuario) --- */}
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 transform transition-all duration-300 relative z-10">
          <div className="flex justify-between items-center border-b pb-3 mb-4">
            <h3 className="text-2xl font-bold text-[#e43264] flex items-center gap-2">
              <Icon icon="streamline-ultimate:factory-building-1-bold" width="28" />
              Cierre de Actividades
            </h3>
            <button onClick={onClose} disabled={isSubmitting} className="text-gray-400 hover:text-red-600">
              <Icon icon="line-md:close" width="24" />
            </button>
          </div>

          {loading ? (
             <div className="text-center py-8"><Icon icon="line-md:loading-loop" width="40" className="animate-spin text-blue-500 mx-auto"/></div>
          ) : (
            <div className="space-y-4">
              <p className="text-center text-gray-600 mb-4">
                Verifica que todas las actividades estén registradas antes de generar el reporte final.
              </p>

              <button
                onClick={() => setShowCargaModal(true)}
                disabled={cargaDone}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg font-bold transition-all ${cargaDone ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              >
                <div className="flex items-center gap-3">
                    <Icon icon="hugeicons:tanker-truck" width="24" />
                    {cargaDone ? "Autotanque Registrado" : "Registrar Carga Autotanque"}
                </div>
                {cargaDone && <Icon icon="line-md:confirm-circle" width="24" />}
              </button>

              <button
                onClick={() => setShowCarburacionModal(true)}
                disabled={carburacionDone}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg font-bold transition-all ${carburacionDone ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-orange-600 text-white hover:bg-orange-700'}`}
              >
                <div className="flex items-center gap-3">
                    <Icon icon="mdi:gas-station" width="24" />
                    {carburacionDone ? "Carburación Registrada" : "Registrar Carburación"}
                </div>
                {carburacionDone && <Icon icon="line-md:confirm-circle" width="24" />}
              </button>

              {errorMsg && <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">{errorMsg}</div>}
              {successMsg && <div className="p-3 bg-green-100 text-green-700 rounded-lg text-sm">{successMsg}</div>}

              <div className="mt-6 pt-4 border-t flex justify-end">
                <button
                  onClick={handleFinalizarDia}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-3 bg-linear-to-r from-green-500 to-emerald-600 text-white font-bold rounded-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50"
                >
                  <Icon icon={isSubmitting ? "line-md:loading-loop" : "line-md:check-all"} width="24" />
                  {isSubmitting ? "Generando Reporte..." : "Finalizar y Generar Reporte"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- ESTRUCTURA OCULTA DEL REPORTE (HTML PARA PDF/IMAGEN) --- */}
      {/* Aquí usamos ESTILOS EN LÍNEA (inline styles) para asegurar que html2canvas los renderice bien */}
      <div 
        style={{
            position: 'absolute',
            top: '0',
            left: '-9999px',
            width: '800px', // Ancho fijo para asegurar formato A4 aprox
            backgroundColor: '#ffffff',
            color: '#000000',
            padding: '40px',
            fontFamily: 'Arial, sans-serif'
        }}
        ref={reportRef}
      >
        
        {/* 1. ENCABEZADO */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #1f2937', paddingBottom: '20px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                {/* Imagen Perfil */}
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #d1d5db', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6' }}>
                    {user?.user_metadata?.avatar_url ? (
                        <img src={user.user_metadata.avatar_url} alt="Perfil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" />
                    ) : (
                        <span style={{ color: '#6b7280', fontSize: '12px' }}>N/A</span>
                    )}
                </div>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1f2937', margin: 0 }}>Reporte Diario</h1>
                    <p style={{ fontSize: '14px', color: '#4b5563', fontWeight: '600', margin: '4px 0 0 0' }}>
                        Responsable: {datosReporte.porcentajeDiario?.registrador_inicial?.nombre || "N/A"} {datosReporte.porcentajeDiario?.registrador_inicial?.apellidos || "N/A"}
                    </p>
                </div>
            </div>
            <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e40af', margin: 0 }}>{unidad?.empresa || "Empresa"}</p>
                <p style={{ fontSize: '14px', color: '#4b5563', margin: '2px 0' }}>Unidad: {unidad?.num_unidad || "S/N"}</p>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                    {new Date().toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
            </div>
        </div>

        {/* 2. PORCENTAJE INICIAL */}
        <div style={{ marginBottom: '24px', backgroundColor: '#eff6ff', padding: '16px', borderRadius: '8px', border: '1px solid #dbeafe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#1d4ed8', marginBottom: '8px', marginTop: 0 }}>Inicio de Jornada</h3>
                <p style={{ fontSize: '28px', fontWeight: '800', color: '#1f2937', margin: 0 }}>{datosReporte.porcentajeDiario?.porcentaje_inicial}%</p>
                <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>Reg. por: {datosReporte.porcentajeDiario?.registrador_inicial?.nombre || "N/A"}</p>
            </div>
            <div style={{ width: '120px', height: '90px', backgroundColor: '#ffffff', borderRadius: '4px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                {datosReporte.porcentajeDiario?.url_inicial ? (
                    <img src={datosReporte.porcentajeDiario.url_inicial} alt="Foto Inicial" style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous"/>
                ) : <span style={{ fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Sin Foto</span>}
            </div>
        </div>

        {/* 3. LISTA DIARIA (VENTAS) */}
        <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#374151', borderBottom: '1px solid #e5e7eb', marginBottom: '8px', paddingBottom: '4px' }}>Desglose de Ventas</h3>
            <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ backgroundColor: '#f3f4f6', color: '#4b5563' }}>
                        <th style={{ padding: '8px', borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>Dirección</th>
                        <th style={{ padding: '8px', borderBottom: '1px solid #e5e7eb', textAlign: 'center' }}>Lts</th>
                        <th style={{ padding: '8px', borderBottom: '1px solid #e5e7eb', textAlign: 'center' }}>Ret</th>
                        <th style={{ padding: '8px', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>Total</th>
                        <th style={{ padding: '8px', borderBottom: '1px solid #e5e7eb', textAlign: 'center' }}>Pago</th>
                    </tr>
                </thead>
                <tbody>
                    {listaDiaria.length > 0 ? listaDiaria.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '8px', maxWidth: '220px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.calle} #{item.numero}</td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>{item.consumo_litros}</td>
                            <td style={{ padding: '8px', textAlign: 'center', color: '#ef4444' }}>{item.ret > 0 ? `-${item.ret}` : '-'}</td>
                            <td style={{ padding: '8px', textAlign: 'right', fontWeight: '500' }}>${item.monto_total}</td>
                            <td style={{ padding: '8px', textAlign: 'center', fontSize: '10px', textTransform: 'uppercase', color: '#6b7280' }}>{item.tipo_pago}</td>
                        </tr>
                    )) : (
                        <tr><td colSpan="5" style={{ padding: '16px', textAlign: 'center', color: '#9ca3af' }}>Sin ventas registradas hoy.</td></tr>
                    )}
                </tbody>
            </table>
        </div>

        {/* 4. RESUMEN COMPACTO */}
        <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#374151', borderBottom: '1px solid #e5e7eb', marginBottom: '12px', paddingBottom: '4px' }}>Resumen Compacto</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', textAlign: 'center' }}>
                
                {/* Total del TET */}
                <div style={{ backgroundColor: '#f3f4f6', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <span style={{ display: 'block', fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600' }}>Total del TET</span>
                    <span style={{ fontWeight: 'bold', fontSize: '20px', color: '#1f2937', marginTop: '4px', display: 'block' }}>
                        {listaDiaria.reduce((a, b) => a + (Number(b.consumo_litros) || 0), 0).toFixed(2)} Lts
                    </span>
                </div>

                {/* Total Litros Reales */}
                <div style={{ backgroundColor: '#f3f4f6', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <span style={{ display: 'block', fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600' }}>Total Litros Reales</span>
                    <span style={{ fontWeight: 'bold', fontSize: '20px', color: '#16a34a', marginTop: '4px', display: 'block' }}>
                        {(listaDiaria.reduce((a, b) => a + (Number(b.consumo_litros) || 0), 0) - listaDiaria.reduce((a, b) => a + (Number(b.ret) || 0), 0)).toFixed(2)} Lts
                    </span>
                </div>

                {/* Efectivo Ventas */}
                <div style={{ backgroundColor: '#f3f4f6', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <span style={{ display: 'block', fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600' }}>Efectivo Ventas</span>
                    <span style={{ fontWeight: 'bold', fontSize: '20px', color: '#1f2937', marginTop: '4px', display: 'block' }}>
                        ${listaDiaria.filter(i => i.tipo_pago === 'efectivo').reduce((a, b) => a + (Number(b.monto_total) || 0), 0).toFixed(2)}
                    </span>
                </div>

                {/* Tarjeta */}
                <div style={{ backgroundColor: '#f3f4f6', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <span style={{ display: 'block', fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600' }}>Tarjeta</span>
                    <span style={{ fontWeight: 'bold', fontSize: '20px', color: '#1f2937', marginTop: '4px', display: 'block' }}>
                        ${listaDiaria.filter(i => i.tipo_pago === 'tarjeta').reduce((a, b) => a + (Number(b.monto_total) || 0), 0).toFixed(2)}
                    </span>
                </div>

                {/* Transferencia */}
                <div style={{ backgroundColor: '#f3f4f6', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <span style={{ display: 'block', fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600' }}>Transferencia</span>
                    <span style={{ fontWeight: 'bold', fontSize: '20px', color: '#1f2937', marginTop: '4px', display: 'block' }}>
                        ${listaDiaria.filter(i => i.tipo_pago === 'transferencia').reduce((a, b) => a + (Number(b.monto_total) || 0), 0).toFixed(2)}
                    </span>
                </div>

                {/* Efectivo en Caja */}
                <div style={{ backgroundColor: '#eef2ff', padding: '12px', borderRadius: '8px', border: '1px solid #c7d2fe' }}>
                    <span style={{ display: 'block', fontSize: '11px', color: '#4338ca', textTransform: 'uppercase', fontWeight: '600' }}>Efectivo en Caja</span>
                    <span style={{ fontWeight: 'bold', fontSize: '20px', color: '#4f46e5', marginTop: '4px', display: 'block' }}>
                        ${(listaDiaria.filter(i => i.tipo_pago === 'efectivo').reduce((a, b) => a + (Number(b.monto_total) || 0), 0) + pagosDiarios.reduce((a, b) => a + (Number(b.monto_pago) || 0), 0)).toFixed(2)}
                    </span>
                </div>
            </div>
        </div>

        {/* 5. DATOS ADICIONALES (CARGA / CARBURACION) */}
        {(datosReporte.autotanque.length > 0 || datosReporte.carburacion.length > 0) && (
            <div style={{ marginBottom: '24px', display: 'flex', gap: '16px' }}>
                {datosReporte.autotanque.length > 0 && (
                     <div style={{ flex: 1, backgroundColor: '#f0fdf4', padding: '12px', borderRadius: '4px', border: '1px solid #bbf7d0' }}>
                        <h4 style={{ fontWeight: 'bold', color: '#166534', fontSize: '12px', marginBottom: '8px', marginTop: 0 }}>Carga Autotanque</h4>
                        {datosReporte.autotanque.map((at, i) => (
                            <div key={i} style={{ fontSize: '11px', marginBottom: '8px' }}>
                                <p style={{ margin: '2px 0' }}><strong>Litros:</strong> {at.litros} Lts</p>
                                <p style={{ margin: '2px 0' }}><strong>Monto:</strong> ${at.monto}</p>
                                <div style={{ display: 'flex', gap: '50px', marginTop: '50px' }}>
                                    <div style={{ width: '48px', height: '32px', backgroundColor: '#e5e7eb', overflow: 'hidden' }}><img src={at.url_inicial} style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous"/></div>
                                    <div style={{ width: '48px', height: '32px', backgroundColor: '#e5e7eb', overflow: 'hidden' }}><img src={at.url_final} style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous"/></div>
                                </div>
                            </div>
                        ))}
                     </div>
                )}
                {datosReporte.carburacion.length > 0 && (
                    <div style={{ flex: 1, backgroundColor: '#fff7ed', padding: '12px', borderRadius: '4px', border: '1px solid #fed7aa' }}>
                        <h4 style={{ fontWeight: 'bold', color: '#9a3412', fontSize: '12px', marginBottom: '8px', marginTop: 0 }}>Carburación</h4>
                         {datosReporte.carburacion.map((cb, i) => (
                            <div key={i} style={{ fontSize: '11px', marginBottom: '4px', borderBottom: '1px solid #fed7aa', paddingBottom: '4px' }}>
                                <p style={{ margin: 0 }}><strong>Litros:</strong> {cb.litros} Lts</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}

        {/* 6. PORCENTAJE FINAL */}
        <div style={{ marginBottom: '32px', backgroundColor: '#fef2f2', padding: '16px', borderRadius: '8px', border: '1px solid #fee2e2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#b91c1c', marginBottom: '8px', marginTop: 0 }}>Cierre de Jornada</h3>
                <p style={{ fontSize: '28px', fontWeight: '800', color: '#1f2937', margin: 0 }}>
                    {datosReporte.porcentajeDiario?.porcentaje_final ? `${datosReporte.porcentajeDiario.porcentaje_final}%` : "--%"}
                </p>
                <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>Cierre realizado por el operador en turno.</p>
            </div>
             <div style={{ width: '120px', height: '90px', backgroundColor: '#ffffff', borderRadius: '4px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                {datosReporte.porcentajeDiario?.url_final ? (
                    <img src={datosReporte.porcentajeDiario.url_final} alt="Foto Final" style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous"/>
                ) : <span style={{ fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Sin Foto</span>}
            </div>
        </div>

        {/* 7. FOOTER CON FRASE */}
        <div style={{ textAlign: 'center', paddingTop: '16px', borderTop: '2px solid #9ca3af' }}>
            <p style={{ fontSize: '16px', fontStyle: 'italic', color: '#4b5563', margin: '0 0 8px 0', fontFamily: 'Times New Roman, serif' }}>"{fraseDelDia}"</p>
            <p style={{ fontSize: '10px', color: '#9ca3af', margin: 0 }}>Reporte generado automáticamente por Sistema de Gestión - {new Date().getFullYear()}</p>
        </div>

      </div>

      {/* Modales Hijos */}
      {showCargaModal && (
        <ModalCargaAutotanque
          isOpen={showCargaModal}
          onClose={() => setShowCargaModal(false)}
          registradorId={registradorId}
          onCargaSuccess={() => { setCargaDone(true); setShowCargaModal(false); fetchDataParaReporte(); }}
        />
      )}
      {showCarburacionModal && (
        <ModalCarburacion
          isOpen={showCarburacionModal}
          onClose={() => setShowCarburacionModal(false)}
          registradorId={registradorId}
          onCarburacionSuccess={() => { setCarburacionDone(true); setShowCarburacionModal(false); fetchDataParaReporte(); }}
        />
      )}
    </>
  );
};

export default ModalFinDiaCompleto;