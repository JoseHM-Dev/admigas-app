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
  const { user, tarifa, unidad, datosBancarios: bancoContexto } = useAuth();

  // ESTADOS
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCasaId, setSelectedCasaId] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  // Estado para el ID del turno actual
  const [idPorcentajeActual, setIdPorcentajeActual] = useState(null); // <--- NUEVO ESTADO

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

  // --- EFECTOS ---

  // 1. Efecto para cargar el ID del turno activo al abrir el modal
  useEffect(() => {
    const fetchCurrentTurno = async () => {
      try {
        // Buscamos el último registro creado en porcentaje_diario
        const { data, error } = await supabase
          .from("porcentaje_diario")
          .select("id")
          .order("id", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data) {
          setIdPorcentajeActual(data.id);
        }
      } catch (error) {
        console.error("Error obteniendo turno actual:", error);
      }
    };

    if (isOpen) {
      fetchCurrentTurno();
    }
  }, [isOpen]);

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
      // Si estamos editando, mantenemos el ID original (no lo sobrescribimos con el actual si fuera diferente)
      if (venta.id_porcentaje) setIdPorcentajeActual(venta.id_porcentaje);
    } else {
      resetForm();
    }
  }, [venta]);

  useEffect(() => {
    if (isOpen) {
      // Cargar Tarifa Global
      if (tarifa) {
        setPrecioVigente(tarifa.precio_litro);
      } else {
        setPrecioVigente(0);
      }

      // Cargar Unidad Global
      if (unidad) {
        setDatosUnidad(unidad);
      }

      // Cargar Bancos Globales
      if (bancoContexto) {
        setDatosBancarios([bancoContexto]);
      } else {
        setDatosBancarios([]);
      }
    }
  }, [isOpen, tarifa, unidad, bancoContexto]);

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
        .select("id_casa,nombre_cliente, calle, numero, colonia, telefono")
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
    // No reseteamos idPorcentajeActual aquí porque queremos que persista mientras el modal está abierto o se re-abra
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

    // Validación de seguridad: debe haber un turno detectado
    if (!idPorcentajeActual) {
      alert(
        "Error: No se detectó un turno activo. Inicia un 'Nuevo Día' primero."
      );
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
      id_porcentaje: idPorcentajeActual, // <--- GUARDAMOS LA FK
    };

    let resultId = null;
    try {
      if (venta) {
        // Al editar, NO cambiamos el id_porcentaje original a menos que sea necesario
        const { data, error } = await supabase
          .from("carga_casa")
          .update(ventaData)
          .eq("id_carga", venta.id_carga)
          .select("id_carga")
          .single();
        if (error) throw error;
        resultId = data.id_carga;
      } else {
        const { data, error } = await supabase
          .from("carga_casa")
          .insert([ventaData])
          .select("id_carga")
          .single();
        if (error) throw error;
        resultId = data.id_carga;
      }

      // Agenda (Proxima Carga)
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

  // ... (El resto del código: handleSaveButton, handlePrintFactura, Render, TicketStyles se mantienen igual)
  // SOLO ASEGÚRATE DE COPIAR TODO EL RESTO DEL ARCHIVO ORIGINAL AQUÍ ABAJO PARA QUE NO SE CORTE
  // Para ahorrar espacio en la respuesta, asumo que mantienes el resto del renderizado UI intacto.

  const handleSaveButton = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await executeSaveVenta();
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

      await new Promise((resolve) => setTimeout(resolve, 300));
      if (!ticketRef.current) throw new Error("Error renderizando ticket");

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

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-all duration-300">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden transform transition-all scale-100 animate-in fade-in zoom-in duration-200">
          <div className="bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
                <Icon
                  icon={venta ? "mdi:file-edit" : "mdi:file-plus"}
                  className="text-white w-7 h-7"
                />
              </div>
              <h2 className="text-xl font-bold text-white tracking-wide">
                {venta ? "Editar Venta" : "Registrar Venta"}
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <Icon icon="mdi:close" width="28" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto space-y-6">
            <form onSubmit={handleSaveButton}>
              {/* BUSCADOR DE CLIENTE */}
              <div className="relative group z-30">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">
                  Cliente
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500">
                    <Icon icon="mdi:account-search" width="20" />
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar por nombre, calle o número..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      if (selectedClient) {
                        setSelectedClient(null);
                        setSelectedCasaId(null);
                      }
                    }}
                    className="block w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                  />
                  {selectedClient && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedClient(null);
                        setSelectedCasaId(null);
                        setSearchTerm("");
                      }}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-red-400 hover:text-red-600 cursor-pointer"
                    >
                      <Icon icon="mdi:close-circle" width="20" />
                    </button>
                  )}
                </div>

                {searchResults.length > 0 && (
                  <ul className="absolute left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-xl max-h-56 overflow-y-auto z-50 animate-in fade-in slide-in-from-top-2">
                    {searchResults.map((client) => (
                      <li
                        key={client.id_casa}
                        onClick={() => handleSelectClient(client)}
                        className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0 flex flex-col"
                      >
                        <span className="font-bold text-gray-800">
                          {client.nombre_cliente}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Icon icon="mdi:map-marker" width="12" />{" "}
                          {client.calle} #{client.numero}, {client.colonia}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {searchResults.length === 0 &&
                  searchTerm.length > 2 &&
                  !isSearching &&
                  !selectedClient && (
                    <div className="mt-2 text-sm text-gray-500 flex items-center justify-between bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                      <span>No encontrado.</span>
                      <button
                        type="button"
                        onClick={handleOpenModalNuevoCliente}
                        className="text-blue-600 font-bold hover:underline flex items-center gap-1"
                      >
                        <Icon icon="mdi:plus-circle" /> Crear Nuevo Cliente
                      </button>
                    </div>
                  )}
              </div>

              {/* DATOS VENTA */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                <InputGroup
                  label="Fecha"
                  icon="mdi:calendar"
                  name="fecha"
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                />
                <div className="group">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">
                    Precio x Litro
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <Icon icon="mdi:tag-text" width="20" />
                    </div>
                    <input
                      type="text"
                      value={
                        precioVigente ? `$ ${precioVigente.toFixed(2)}` : "N/A"
                      }
                      disabled
                      className="block w-full pl-10 pr-3 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-gray-600 font-medium"
                    />
                  </div>
                </div>
                <InputGroup
                  label="Consumo (Litros)"
                  icon="mdi:gas-station"
                  name="consumo"
                  type="number"
                  placeholder="0.00"
                  value={consumoLitros}
                  onChange={(e) => setConsumoLitros(e.target.value)}
                />
                <InputGroup
                  label="RET (Opcional)"
                  icon="mdi:percent"
                  name="ret"
                  type="number"
                  placeholder="0"
                  value={ret}
                  onChange={(e) => setRet(e.target.value)}
                />
              </div>

              <div className="bg-linear-to-br from-emerald-50 to-teal-100 border border-emerald-200 rounded-xl p-5 my-6 flex justify-between items-center shadow-sm">
                <div>
                  <h4 className="text-emerald-800 text-sm font-bold uppercase tracking-wider">
                    Monto Total
                  </h4>
                  <span className="text-emerald-600/70 text-xs">
                    Calculado automáticamente
                  </span>
                </div>
                <div className="text-4xl font-extrabold text-emerald-600">
                  {montoTotal.toLocaleString("es-MX", {
                    style: "currency",
                    currency: "MXN",
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="group">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">
                    Método de Pago
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500">
                      <Icon icon="mdi:credit-card-outline" width="20" />
                    </div>
                    <select
                      value={tipoPago}
                      onChange={(e) => setTipoPago(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all appearance-none cursor-pointer"
                    >
                      <option value="credito">Crédito</option>
                      <option value="efectivo">Efectivo</option>
                      <option value="tarjeta">Tarjeta Bancaria</option>
                      <option value="transferencia">Transferencia</option>
                    </select>
                  </div>
                </div>
                <InputGroup
                  label="Monto Pendiente"
                  icon="mdi:cash-clock"
                  name="pendiente"
                  type="number"
                  value={montoPendiente}
                  onChange={(e) => setMontoPendiente(e.target.value)}
                  disabled={
                    !(tipoPago === "credito" || tipoPago === "transferencia")
                  }
                  className={
                    !(tipoPago === "credito" || tipoPago === "transferencia")
                      ? "bg-gray-100 text-gray-400"
                      : ""
                  }
                />
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100">
                <h4 className="text-sm font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                  <Icon icon="mdi:calendar-clock" /> Próxima Carga
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <InputGroup
                    label="Fecha Estimada"
                    icon="mdi:calendar-arrow-right"
                    type="date"
                    value={fechaProximaCarga}
                    onChange={(e) => setFechaProximaCarga(e.target.value)}
                  />
                  {fechaProximaCarga && (
                    <InputGroup
                      label="Comentario / Nota"
                      icon="mdi:comment-text-outline"
                      value={comentarioProximaCarga}
                      onChange={(e) =>
                        setComentarioProximaCarga(e.target.value)
                      }
                      placeholder="Ej. Llamar antes..."
                    />
                  )}
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handlePrintFactura}
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 hover:text-gray-900 shadow-sm transition-all flex items-center gap-2"
                >
                  <Icon icon="mdi:printer" />{" "}
                  {isSaving ? "..." : "Factura / Ticket"}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className={`
                     px-6 py-2.5 rounded-lg text-white font-medium shadow-lg shadow-blue-500/30
                     flex items-center gap-2 transition-all transform active:scale-95
                     ${
                       isSaving
                         ? "bg-gray-400 cursor-not-allowed"
                         : "bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:-translate-y-0.5"
                     }
                   `}
                >
                  {isSaving ? (
                    <>
                      <Icon icon="line-md:loading-loop" width="24" />{" "}
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Icon icon="mdi:content-save-check" width="20" /> Guardar
                      Venta
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* MODALES HIJOS */}
        <ModalNuevoCliente
          isOpen={isModalNuevoClienteOpen}
          onClose={handleCloseModalNuevoCliente}
          contrato={nuevoContrato}
        />
        <ModalFactura
          isOpen={showModalFactura}
          onClose={() => {
            setShowModalFactura(false);
            handleClose();
          }}
          facturaUrl={facturaUrl}
          clienteTelefono={selectedClient?.telefono || ""}
        />

        {/* TICKET RENDER */}
        <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
          <div ref={ticketRef} style={ticketStyles.ticketContainer}>
            <div style={ticketStyles.ticketHeaderBg}>
              {user?.user_metadata?.avatar_url && (
                <img
                  src={user.user_metadata.avatar_url}
                  alt="Logo"
                  style={ticketStyles.ticketLogo}
                  crossOrigin="anonymous"
                />
              )}
              <h2 style={ticketStyles.ticketTitle}>
                {datosUnidad?.empresa || "GAS LP"}
              </h2>
              <div style={ticketStyles.ticketSubtitle}>
                Unidad: <strong>{datosUnidad?.num_unidad}</strong>
              </div>
              <div
                style={{
                  ...ticketStyles.ticketSubtitle,
                  marginTop: "5px",
                  fontSize: "12px",
                }}
              >
                {new Date().toLocaleDateString("es-MX", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
              {(datosUnidad?.telefono_1 || datosUnidad?.telefono_2) && (
                <div
                  style={{
                    ...ticketStyles.ticketSubtitle,
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
            <div style={ticketStyles.ticketBody}>
              <div style={ticketStyles.ticketSectionTitle}>CLIENTE</div>
              <div style={ticketStyles.ticketClientBox}>
                <div style={ticketStyles.ticketClientName}>
                  {selectedClient?.nombre_cliente || "Público General"}
                </div>
                <div style={ticketStyles.ticketClientInfo}>
                  {selectedClient?.calle} #{selectedClient?.numero},{" "}
                  {selectedClient?.colonia}
                </div>
              </div>

              <div style={ticketStyles.ticketSectionTitle}>
                DETALLES DE VENTA
              </div>
              <div style={ticketStyles.ticketRow}>
                <span>Consumo:</span>
                <strong>{consumoLitros} Litros</strong>
              </div>
              <div style={ticketStyles.ticketRow}>
                <span>Precio Unitario:</span>
                <strong>${precioVigente?.toFixed(2)}</strong>
              </div>
              <div style={ticketStyles.ticketRowTotal}>
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
                  ...ticketStyles.ticketRow,
                  marginTop: "15px",
                  alignItems: "center",
                }}
              >
                <span style={{ fontWeight: "600" }}>Estado de Pago:</span>
                <span
                  style={{
                    ...ticketStyles.ticketBadge,
                    backgroundColor:
                      tipoPago === "credito" || tipoPago === "transferencia"
                        ? "#FEF3C7"
                        : "#D1FAE5",
                    color:
                      tipoPago === "credito" || tipoPago === "transferencia"
                        ? "#92400E"
                        : "#065F46",
                  }}
                >
                  {tipoPago.toUpperCase()}
                </span>
              </div>
              {(tipoPago === "credito" || tipoPago === "transferencia") &&
                parseFloat(montoPendiente) > 0 && (
                  <div
                    style={{
                      ...ticketStyles.ticketRow,
                      color: "#DC2626",
                      fontWeight: "bold",
                    }}
                  >
                    <span>Pendiente por pagar:</span>
                    <span>${montoPendiente}</span>
                  </div>
                )}
            </div>
            <div style={ticketStyles.ticketFooter}>
              {datosBancarios.length > 0 && (
                <>
                  <div
                    style={{
                      ...ticketStyles.ticketSectionTitle,
                      justifyContent: "center",
                      marginBottom: "15px",
                    }}
                  >
                    DATOS BANCARIOS
                  </div>
                  {datosBancarios.map((b) => (
                    <div key={b.id} style={ticketStyles.ticketBankBox}>
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
      </div>
    </>
  );
}

const InputGroup = ({ label, icon, className = "", ...props }) => (
  <div className="group">
    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">
      {label}
    </label>
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
        <Icon icon={icon} width="20" />
      </div>
      <input
        {...props}
        className={`block w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all duration-200 sm:text-sm shadow-sm ${className}`}
      />
    </div>
  </div>
);

const ticketStyles = {
  ticketContainer: {
    width: "400px",
    backgroundColor: "#ffffff",
    color: "#1f2937",
    fontFamily: "Arial, sans-serif",
    borderRadius: "16px",
    overflow: "hidden",
    border: "1px solid #e5e7eb",
  },
  ticketHeaderBg: {
    backgroundColor: "#2563EB",
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
  },
  ticketSubtitle: { fontSize: "13px", opacity: 0.9, margin: "2px 0" },
  ticketBody: { padding: "25px" },
  ticketSectionTitle: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    marginBottom: "10px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  ticketClientBox: {
    backgroundColor: "#F3F4F6",
    padding: "15px",
    borderRadius: "10px",
    marginBottom: "20px",
  },
  ticketClientName: {
    fontSize: "16px",
    fontWeight: "bold",
    marginBottom: "5px",
  },
  ticketClientInfo: { fontSize: "14px", color: "#4B5563" },
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
