import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../../supabaseClient";
import { useAuth } from "../../../auth/useAuth";
import { Icon } from "@iconify/react";
import html2canvas from "html2canvas";
import ModalNuevoCliente from "./ModalNuevoCliente";
import ModalFactura from "./ModalFactura";

const getLocalDateString = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  const adjustedDate = new Date(date.getTime() - offset * 60 * 1000);
  return adjustedDate.toISOString().split("T")[0];
};

export default function ModalNuevaVenta({
  isOpen,
  onClose,
  onVentaGuardada,
  venta,
}) {
  const { user } = useAuth();

  // ESTADOS
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCasaId, setSelectedCasaId] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  const [fecha, setFecha] = useState(getLocalDateString());
  const [consumoLitros, setConsumoLitros] = useState("");
  const [ret, setRet] = useState("");
  const [precioVigente, setPrecioVigente] = useState(null);
  const [montoTotal, setMontoTotal] = useState(0);
  const [tipoPago, setTipoPago] = useState("credito");
  const [montoPendiente, setMontoPendiente] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [fechaProximaCarga, setFechaProximaCarga] = useState("");
  const [comentarioProximaCarga, setComentarioProximaCarga] = useState("");

  const [isModalNuevoClienteOpen, setIsModalNuevoClienteOpen] = useState(false);
  const [nuevoContrato, setNuevoContrato] = useState(null);

  // Estados para Factura
  const [facturaUrl, setFacturaUrl] = useState(null);
  const [showModalFactura, setShowModalFactura] = useState(false);
  const [datosUnidad, setDatosUnidad] = useState(null);
  const [datosBancarios, setDatosBancarios] = useState([]);
  const ticketRef = useRef(null);

  // --- EFECTOS (Lógica de datos igual que antes) ---
  useEffect(() => {
    if (venta) {
      setSearchTerm(`${venta.calle} #${venta.numero}, ${venta.colonia}`);
      setSelectedCasaId(venta.id_casa);
      setSelectedClient({
        id_casa: venta.id_casa,
        calle: venta.calle,
        numero: venta.numero,
        colonia: venta.colonia,
        nombre_cliente: venta.nombre_cliente || "Cliente",
      });
      setFecha(venta.fecha_carga || getLocalDateString());
      setConsumoLitros(venta.consumo_litros || "");
      setRet(venta.ret || "");
      setMontoTotal(venta.monto_total || 0);
      setTipoPago(venta.tipo_pago || "credito");
      setMontoPendiente(venta.monto_pendiente || "");
      setFechaProximaCarga(venta.fecha_proxima_carga || "");
      setComentarioProximaCarga("");
    } else {
      resetForm();
    }
  }, [venta]);

  useEffect(() => {
    const fetchDatos = async () => {
      // Tarifa
      try {
        const { data } = await supabase
          .from("tarifa")
          .select("precio_litro")
          .lte("fecha_vigente", new Date().toISOString())
          .order("fecha_vigente", { ascending: false })
          .limit(1);
        if (data && data.length > 0) setPrecioVigente(data[0].precio_litro);
        else setPrecioVigente(0);
      } catch (e) {
        console.error(e);
      }

      // Unidad y Bancos
      const { data: uData } = await supabase
        .from("unidad")
        .select("*")
        .limit(1)
        .single();
      if (uData) setDatosUnidad(uData);

      const { data: bData } = await supabase
        .from("datos_bancarios")
        .select("*");
      if (bData) setDatosBancarios(bData);
    };
    if (isOpen) fetchDatos();
  }, [isOpen]);

  useEffect(() => {
    const litros = parseFloat(consumoLitros);
    const total =
      !isNaN(litros) && precioVigente > 0 ? litros * precioVigente : 0;
    setMontoTotal(total);
  }, [consumoLitros, precioVigente]);

  useEffect(() => {
    if (tipoPago === "credito" || tipoPago === "transferencia") {
      setMontoPendiente(montoTotal > 0 ? montoTotal.toFixed(2) : "");
    } else {
      setMontoPendiente("0");
    }
  }, [tipoPago, montoTotal]);

  // --- BUSCADOR ---
  const searchClients = useCallback(async (term) => {
    if (term.length < 3) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from("casa_habitacion")
        .select("id_casa,nombre_cliente, calle, numero, colonia")
        .or(
          `nombre_cliente.ilike."%${term}%",calle.ilike."%${term}%",numero.ilike."%${term}%"`
        )
        .limit(10);
      if (!error) setSearchResults(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      searchClients(searchTerm);
    }, 500);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm, searchClients]);

  const handleSelectClient = (client) => {
    setSelectedClient(client);
    setSelectedCasaId(client.id_casa);
    setSearchTerm(
      `${client.nombre_cliente} - ${client.calle} #${client.numero}, ${client.colonia}`
    );
    setSearchResults([]);
  };

  const resetForm = () => {
    setSearchTerm("");
    setSearchResults([]);
    setSelectedCasaId(null);
    setSelectedClient(null);
    setFecha(getLocalDateString());
    setConsumoLitros("");
    setRet("");
    setMontoTotal(0);
    setTipoPago("credito");
    setMontoPendiente("");
    setFechaProximaCarga("");
    setComentarioProximaCarga("");
    setNuevoContrato(null);
    setIsModalNuevoClienteOpen(false);
    setFacturaUrl(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // --- LOGICA GUARDADO ---
  const executeSaveVenta = async () => {
    if (!selectedCasaId || !consumoLitros || montoTotal <= 0) {
      alert("Por favor, completa Cliente, Consumo y verifica el monto.");
      return null;
    }

    const esPagado = !(tipoPago === "credito" || tipoPago === "transferencia");
    const ventaData = {
      id_casa: selectedCasaId,
      fecha_carga: fecha,
      consumo_litros: parseFloat(consumoLitros),
      ret: ret ? parseFloat(ret) : null,
      monto_total: montoTotal,
      estado_pago: esPagado,
      tipo_pago: tipoPago,
      monto_pendiente: parseFloat(montoPendiente),
      fecha_proxima_carga: fechaProximaCarga || null,
    };

    let resultId = null;
    try {
      if (venta) {
        // ============================================================
        // CORRECCIÓN: Usamos .update() en lugar de .delete() + .insert()
        // ============================================================
        const { data, error } = await supabase
          .from("carga_casa")
          .update(ventaData) // Actualizamos los datos
          .eq("id_carga", venta.id_carga) // Buscamos por el ID existente
          .select("id_carga")
          .single();

        if (error) throw error;
        resultId = data.id_carga; // Mantenemos el mismo ID
      } else {
        // CREAR NUEVA (Esto se queda igual)
        const { data, error } = await supabase
          .from("carga_casa")
          .insert([ventaData])
          .select("id_carga")
          .single();

        if (error) throw error;
        resultId = data.id_carga;
      }
      if (fechaProximaCarga) {
        await supabase.from("agenda").upsert(
          [
            {
              id_casa: selectedCasaId,
              fecha_proxima_carga: fechaProximaCarga,
              comentario: comentarioProximaCarga,
            },
          ],
          { onConflict: "id_casa" }
        );
      }
      return resultId;
    } catch (error) {
      console.error("Error guardando:", error);
      throw error;
    }
  };

  const handleSaveButton = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await executeSaveVenta();
      alert(venta ? "Actualizado con éxito" : "Guardado con éxito");
      onVentaGuardada();
      handleClose();
    } catch (error) {
      alert("Error al guardar: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrintFactura = async () => {
    setIsSaving(true);
    try {
      const idCarga = await executeSaveVenta();
      if (!idCarga) {
        setIsSaving(false);
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 300)); // Espera leve para render

      if (!ticketRef.current) throw new Error("Error renderizando ticket");

      // Configuración robusta para html2canvas
      const canvas = await html2canvas(ticketRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.9)
      );
      const fileName = `factura_${idCarga}_${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("facturas")
        .upload(fileName, blob, { contentType: "image/jpeg" });
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("facturas").getPublicUrl(fileName);

      await supabase.from("factura_casa").insert(
        [
          {
            id_carga: idCarga,
            url: publicUrl,
            fecha_factura: new Date().toISOString(),
          },
        ],
        { returning: "minimal" }
      );

      setFacturaUrl(publicUrl);
      setShowModalFactura(true);
      onVentaGuardada();
    } catch (error) {
      console.error(error);
      alert("Error generando factura.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenModalNuevoCliente = async () => {
    // Tu lógica existente para nuevo cliente
    try {
      const todayDate = getLocalDateString();
      const { data, error } = await supabase
        .from("contrato")
        .insert([{ fecha_inicio: todayDate }])
        .select()
        .single();
      if (error) throw error;
      setNuevoContrato(data);
      setIsModalNuevoClienteOpen(true);
      setSearchTerm("");
      setSearchResults([]);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCloseModalNuevoCliente = () => {
    setIsModalNuevoClienteOpen(false);
    setNuevoContrato(null);
  };

  if (!isOpen) return null;

  // --- ESTILOS CSS EN JAVASCRIPT ---
  const styles = {
    overlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 50,
    },
    modalContainer: {
      backgroundColor: "white",
      padding: "30px",
      borderRadius: "10px",
      width: "100%",
      maxWidth: "650px",
      position: "relative",
      boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
      maxHeight: "90vh",
      overflowY: "auto",
    },
    closeBtn: {
      position: "absolute",
      top: "15px",
      right: "15px",
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "#666",
    },
    title: {
      textAlign: "center",
      color: "#4677F8",
      fontSize: "24px",
      marginBottom: "20px",
      fontWeight: "bold",
    },
    label: {
      display: "block",
      marginBottom: "5px",
      fontWeight: "600",
      color: "#374151",
    },
    input: {
      width: "100%",
      padding: "10px",
      border: "1px solid #D1D5DB",
      borderRadius: "6px",
      fontSize: "16px",
      boxSizing: "border-box", // Importante box-sizing
    },
    row: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "15px",
      marginBottom: "15px",
    },
    searchResultContainer: {
      position: "absolute",
      width: "100%",
      backgroundColor: "white",
      border: "1px solid #ddd",
      borderRadius: "0 0 5px 5px",
      maxHeight: "200px",
      overflowY: "auto",
      zIndex: 10,
      boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
    },
    searchItem: {
      padding: "10px",
      borderBottom: "1px solid #eee",
      cursor: "pointer",
    },
    totalBox: {
      backgroundColor: "#F3F4F6",
      padding: "15px",
      borderRadius: "6px",
      margin: "15px 0",
    },
    totalText: {
      fontSize: "28px",
      fontWeight: "bold",
      color: "#059669",
      textAlign: "right",
      margin: 0,
    },
    btnContainer: {
      display: "flex",
      justifyContent: "flex-end",
      gap: "15px",
      marginTop: "20px",
    },
    btnSave: {
      backgroundColor: "#2563EB",
      color: "white",
      padding: "10px 20px",
      borderRadius: "6px",
      border: "none",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    btnPrint: {
      backgroundColor: "#6B7280",
      color: "white",
      padding: "10px 20px",
      borderRadius: "6px",
      border: "none",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    // --- ESTILOS DEL TICKET REDISEÑADO ---
    ticketContainer: {
      width: "400px", // Un poco más ancho para mejor layout
      backgroundColor: "#ffffff",
      color: "#1f2937", // Gris oscuro profesional
      padding: "0", // Quitamos padding externo, lo manejaremos dentro
      fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif", // Fuente moderna
      borderRadius: "16px", // Bordes redondeados
      overflow: "hidden", // Para que el header respete el borde
      boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
      border: "1px solid #e5e7eb",
    },
    ticketHeaderBg: {
      backgroundColor: "#2563EB", // Azul corporativo
      color: "white",
      padding: "20px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
    },
    ticketLogo: {
      width: "100px",
      height: "100px",
      borderRadius: "50%",
      objectFit: "cover",
      marginBottom: "10px",
      border: "3px solid white",
      backgroundColor: "white",
    },
    ticketTitle: {
      fontSize: "20px",
      fontWeight: "700",
      textTransform: "uppercase",
      margin: "0 0 5px 0",
      letterSpacing: "0.5px",
    },
    ticketSubtitle: {
      fontSize: "13px",
      opacity: 0.9,
      margin: "2px 0",
    },
    ticketBody: {
      padding: "25px",
    },
    ticketSectionTitle: {
      fontSize: "14px",
      fontWeight: "600",
      color: "#6B7280", // Gris medio
      textTransform: "uppercase",
      marginBottom: "10px",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    ticketClientBox: {
      backgroundColor: "#F3F4F6", // Fondo gris claro
      padding: "15px",
      borderRadius: "10px",
      marginBottom: "20px",
    },
    ticketClientName: {
      fontSize: "16px",
      fontWeight: "bold",
      marginBottom: "5px",
    },
    ticketClientInfo: {
      fontSize: "14px",
      color: "#4B5563",
      display: "flex",
      alignItems: "center",
      gap: "5px",
      marginBottom: "3px",
    },
    ticketRow: {
      display: "flex",
      justifyContent: "space-between",
      marginBottom: "8px",
      fontSize: "15px",
      color: "#374151",
    },
    ticketRowTotal: {
      display: "flex",
      justifyContent: "space-between",
      marginTop: "15px",
      paddingTop: "15px",
      borderTop: "2px dashed #D1D5DB",
      fontSize: "20px",
      fontWeight: "800",
      color: "#111827",
    },
    ticketBadge: {
      padding: "4px 10px",
      borderRadius: "20px",
      fontSize: "12px",
      fontWeight: "600",
      textTransform: "uppercase",
      // El color se definirá dinámicamente
    },
    ticketFooter: {
      backgroundColor: "#F9FAFB",
      padding: "20px",
      textAlign: "center",
      borderTop: "1px solid #e5e7eb",
    },
    ticketBankBox: {
      textAlign: "left",
      backgroundColor: "white",
      border: "1px solid #e5e7eb",
      borderRadius: "8px",
      padding: "10px",
      marginBottom: "8px",
      fontSize: "13px",
    },
  };

  const fechaMexico = new Date().toLocaleDateString("es-MX", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      <div style={styles.overlay}>
        <div style={styles.modalContainer}>
          <button onClick={handleClose} style={styles.closeBtn}>
            <Icon icon="mdi:close" width="24" />
          </button>

          <h2 style={styles.title}>
            {venta ? "Editar Venta" : "Registrar Nueva Venta"}
          </h2>

          <form onSubmit={handleSaveButton}>
            {/* BUSCADOR DE CLIENTE */}
            <div style={{ position: "relative", marginBottom: "15px" }}>
              <label style={styles.label}>Buscar Cliente</label>
              <input
                type="text"
                placeholder="Nombre, calle o número..."
                style={styles.input}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (selectedClient) {
                    setSelectedClient(null);
                    setSelectedCasaId(null);
                  }
                }}
              />
              {selectedClient && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClient(null);
                    setSelectedCasaId(null);
                    setSearchTerm("");
                  }}
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "35px",
                    background: "none",
                    border: "none",
                    color: "red",
                    cursor: "pointer",
                  }}
                >
                  <Icon icon="mdi:close-circle" width="20" />
                </button>
              )}
              {searchResults.length > 0 && (
                <div style={styles.searchResultContainer}>
                  {searchResults.map((client) => (
                    <div
                      key={client.id_casa}
                      style={styles.searchItem}
                      onClick={() => handleSelectClient(client)}
                      onMouseOver={(e) =>
                        (e.currentTarget.style.backgroundColor = "#EFF6FF")
                      }
                      onMouseOut={(e) =>
                        (e.currentTarget.style.backgroundColor = "white")
                      }
                    >
                      {client.calle} #{client.numero}, {client.colonia}
                    </div>
                  ))}
                </div>
              )}
              {/* Mensaje si no encuentra (Simplificado) */}
              {searchResults.length === 0 &&
                searchTerm.length > 2 &&
                !isSearching &&
                !selectedClient && (
                  <div style={{ marginTop: "5px", color: "#666" }}>
                    No encontrado.{" "}
                    <button
                      type="button"
                      onClick={handleOpenModalNuevoCliente}
                      style={{
                        color: "blue",
                        background: "none",
                        border: "none",
                        textDecoration: "underline",
                        cursor: "pointer",
                      }}
                    >
                      Crear Nuevo
                    </button>
                  </div>
                )}
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={styles.label}>Fecha</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.row}>
              <div>
                <label style={styles.label}>Consumo (Litros)</label>
                <input
                  type="number"
                  value={consumoLitros}
                  onChange={(e) => setConsumoLitros(e.target.value)}
                  style={styles.input}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label style={styles.label}>RET</label>
                <input
                  type="text"
                  value={ret}
                  onChange={(e) => setRet(e.target.value)}
                  style={styles.input}
                />
              </div>
            </div>

            <div style={styles.totalBox}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <label style={styles.label}>Monto Total</label>
                <span style={{ color: "#666" }}>
                  Precio: ${precioVigente?.toFixed(2)}
                </span>
              </div>
              <p style={styles.totalText}>
                {montoTotal.toLocaleString("es-MX", {
                  style: "currency",
                  currency: "MXN",
                })}
              </p>
            </div>

            <div style={styles.row}>
              <div>
                <label style={styles.label}>Tipo de Pago</label>
                <select
                  value={tipoPago}
                  onChange={(e) => setTipoPago(e.target.value)}
                  style={styles.input}
                >
                  <option value="credito">Crédito</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="tarjeta">Tarjeta Bancaria</option>
                  <option value="transferencia">Transferencia</option>
                </select>
              </div>
              <div>
                <label style={styles.label}>Monto Pendiente</label>
                <input
                  type="number"
                  value={montoPendiente}
                  onChange={(e) => setMontoPendiente(e.target.value)}
                  disabled={
                    !(tipoPago === "credito" || tipoPago === "transferencia")
                  }
                  style={{
                    ...styles.input,
                    backgroundColor:
                      tipoPago === "credito" || tipoPago === "transferencia"
                        ? "white"
                        : "#F3F4F6",
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={styles.label}>Fecha Próxima Carga</label>
              <input
                type="date"
                value={fechaProximaCarga}
                onChange={(e) => setFechaProximaCarga(e.target.value)}
                style={styles.input}
              />
            </div>

            {fechaProximaCarga && (
              <div style={{ marginBottom: "15px" }}>
                <label style={styles.label}>Comentario</label>
                <textarea
                  rows="2"
                  value={comentarioProximaCarga}
                  onChange={(e) => setComentarioProximaCarga(e.target.value)}
                  style={styles.input}
                />
              </div>
            )}

            <div style={styles.btnContainer}>
              <button
                type="button"
                onClick={handlePrintFactura}
                disabled={isSaving}
                style={styles.btnPrint}
              >
                <Icon icon="mdi:printer" /> {isSaving ? "..." : "Factura"}
              </button>
              <button type="submit" disabled={isSaving} style={styles.btnSave}>
                <Icon icon="mdi:content-save" />{" "}
                {isSaving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </form>
        </div>

        <ModalNuevoCliente
          isOpen={isModalNuevoClienteOpen}
          onClose={handleCloseModalNuevoCliente}
          contrato={nuevoContrato}
        />
      </div>

      {/* MODAL PREVISUALIZACIÓN */}
      <ModalFactura
        isOpen={showModalFactura}
        onClose={() => {
          setShowModalFactura(false);
          handleClose();
        }}
        facturaUrl={facturaUrl}
      />

      {/* --- TICKET OCULTO PARA HTML2CANVAS --- */}
      <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
        <div ref={ticketRef} style={styles.ticketContainer}>
          {/* HEADER AZUL */}
          <div style={styles.ticketHeaderBg}>
            {user?.user_metadata?.avatar_url && (
              <img
                src={user.user_metadata.avatar_url}
                alt="Logo"
                style={styles.ticketLogo}
                crossOrigin="anonymous"
              />
            )}
            <h2 style={styles.ticketTitle}>
              {datosUnidad?.empresa || "GAS LP"}
            </h2>
            <div style={styles.ticketSubtitle}>
              Unidad: <strong>{datosUnidad?.num_unidad}</strong>
            </div>
            <div
              style={{
                ...styles.ticketSubtitle,
                marginTop: "5px",
                fontSize: "12px",
              }}
            >
              {fechaMexico}
            </div>
            {/* Agregamos los teléfonos si existen */}
            {(datosUnidad?.telefono_1 || datosUnidad?.telefono_2) && (
              <div
                style={{
                  ...styles.ticketSubtitle,
                  marginTop: "8px",
                  display: "flex",
                  gap: "10px",
                  justifyContent: "center",
                }}
              >
                {datosUnidad?.telefono_1 && (
                  <span>📞 {datosUnidad.telefono_1}</span>
                )}
                {datosUnidad?.telefono_2 && (
                  <span>📞 {datosUnidad.telefono_2}</span>
                )}
              </div>
            )}
          </div>

          <div style={styles.ticketBody}>
            {/* SECCIÓN CLIENTE */}
            <div style={styles.ticketSectionTitle}>
              <Icon icon="mdi:account" width="18" /> CLIENTE
            </div>
            <div style={styles.ticketClientBox}>
              <div style={styles.ticketClientName}>
                {selectedClient?.nombre_cliente || "Público General"}
              </div>
              <div style={styles.ticketClientInfo}>
                <Icon
                  icon="mdi:map-marker"
                  width="16"
                  style={{ flexShrink: 0 }}
                />
                <span>
                  {selectedClient?.calle} #{selectedClient?.numero},{" "}
                  {selectedClient?.colonia}
                </span>
              </div>
            </div>

            {/* SECCIÓN DETALLES */}
            <div style={styles.ticketSectionTitle}>
              <Icon icon="mdi:receipt" width="18" /> DETALLES DE VENTA
            </div>

            <div style={styles.ticketRow}>
              <span>
                <Icon
                  icon="mdi:gas-cylinder"
                  width="16"
                  style={{ verticalAlign: "middle", marginRight: "5px" }}
                />{" "}
                Consumo:
              </span>
              <strong>{consumoLitros} Litros</strong>
            </div>
            <div style={styles.ticketRow}>
              <span>
                <Icon
                  icon="mdi:currency-usd"
                  width="16"
                  style={{ verticalAlign: "middle", marginRight: "5px" }}
                />{" "}
                Precio Unitario:
              </span>
              <strong>${precioVigente?.toFixed(2)}</strong>
            </div>

            {/* TOTAL Y PAGO */}
            <div style={styles.ticketRowTotal}>
              <span>TOTAL:</span>
              <span>
                $
                {montoTotal.toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>

            <div
              style={{
                ...styles.ticketRow,
                marginTop: "15px",
                alignItems: "center",
              }}
            >
              <span style={{ fontWeight: "600" }}>Estado de Pago:</span>
              <span
                style={{
                  ...styles.ticketBadge,
                  backgroundColor:
                    tipoPago === "credito" || tipoPago === "transferencia"
                      ? "#FEF3C7"
                      : "#D1FAE5", // Amarillo o Verde claro
                  color:
                    tipoPago === "credito" || tipoPago === "transferencia"
                      ? "#92400E"
                      : "#065F46", // Texto oscuro correspondiente
                }}
              >
                {tipoPago.toUpperCase()}
              </span>
            </div>

            {(tipoPago === "credito" || tipoPago === "transferencia") &&
              parseFloat(montoPendiente) > 0 && (
                <div
                  style={{
                    ...styles.ticketRow,
                    color: "#DC2626",
                    fontWeight: "bold",
                  }}
                >
                  <span>Pendiente por pagar:</span>
                  <span>${montoPendiente}</span>
                </div>
              )}
          </div>

          {/* FOOTER / BANCOS */}
          <div style={styles.ticketFooter}>
            {datosBancarios.length > 0 && (
              <>
                <div
                  style={{
                    ...styles.ticketSectionTitle,
                    justifyContent: "center",
                    marginBottom: "15px",
                  }}
                >
                  <Icon icon="mdi:bank" width="18" /> DATOS BANCARIOS PARA PAGO
                </div>
                {datosBancarios.map((b) => (
                  <div key={b.id} style={styles.ticketBankBox}>
                    <div
                      style={{
                        fontWeight: "bold",
                        color: "#2563EB",
                        marginBottom: "3px",
                      }}
                    >
                      {b.nom_banco} - {b.nom_responsable}
                    </div>
                    <div>
                      <strong>CTA:</strong> {b.cuenta}
                    </div>
                    {b.clave_int && (
                      <div>
                        <strong>CLABE:</strong> {b.clave_int}
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}

            <div
              style={{
                marginTop: "20px",
                fontWeight: "bold",
                color: "#4B5563",
                fontSize: "14px",
              }}
            >
              ¡GRACIAS POR SU PREFERENCIA!
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
