import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../../supabaseClient";
import { Icon } from "@iconify/react";
import html2canvas from "html2canvas";
import ModalNuevoCliente from "./ModalNuevoCliente";
import ModalFactura from "./ModalFactura";
import { useAuth } from "../../../auth/useAuth";

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
  tarifa,
  unidad,
  datosBancarios: bancoContexto,
  idTurnoExterno,
}) {
  // REFS
  const searchInputRef = useRef(null);
  const ticketRef = useRef(null);
  const { appUser, user: authUser } = useAuth();

  // ESTADOS
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCasaId, setSelectedCasaId] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  const [idPorcentajeActual, setIdPorcentajeActual] = useState(null);

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

  const [facturaUrl, setFacturaUrl] = useState(null);
  const [showModalFactura, setShowModalFactura] = useState(false);
  
  // Datos para el ticket
  const [datosUnidad, setDatosUnidad] = useState(null);
  const [listaBancos, setListaBancos] = useState([]);

  // --- EFECTOS ---

  // 1. Cargar Turno
  useEffect(() => {
    const fetchCurrentTurno = async () => {
      if (idTurnoExterno) {
        setIdPorcentajeActual(idTurnoExterno);
        return;
      }
      if (venta && venta.id_porcentaje) {
        setIdPorcentajeActual(venta.id_porcentaje);
        return;
      }
      try {
        const { data } = await supabase
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
  }, [isOpen, venta, idTurnoExterno]);

  // 2. Cargar Datos Edición
  useEffect(() => {
    if (venta) {
      setFecha(venta.fecha_carga || getLocalDateString());
      setConsumoLitros(venta.consumo_litros || "");
      setRet(venta.ret || "");
      setMontoTotal(venta.monto_total || 0);
      setTipoPago(venta.tipo_pago || "credito");
      setMontoPendiente(venta.monto_pendiente || "");
      setFechaProximaCarga(venta.fecha_proxima_carga || "");
      setComentarioProximaCarga("");

      if (venta.id_porcentaje) setIdPorcentajeActual(venta.id_porcentaje);

      setSearchTerm("");
      setSelectedCasaId(null);
      setSelectedClient(null);

      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 100);
    } else {
      resetForm();
    }
  }, [venta]);

  // 3. Cargar Datos Globales (Tarifa, Unidad, Bancos)
  useEffect(() => {
    if (isOpen) {
      if (tarifa && tarifa.precio_litro) {
        setPrecioVigente(parseFloat(tarifa.precio_litro));
      } else {
        setPrecioVigente(0);
      }

      if (unidad) setDatosUnidad(unidad);
      
      // Manejo robusto de bancos (puede ser objeto único o array)
      if (bancoContexto) {
         if(Array.isArray(bancoContexto)) {
             setListaBancos(bancoContexto);
         } else {
             setListaBancos([bancoContexto]);
         }
      } else {
         setListaBancos([]);
      }
    }
  }, [isOpen, tarifa, unidad, bancoContexto]);

  // Cálculos
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
        .select("id_casa, nombre_cliente, calle, numero, colonia, telefono")
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

  // --- GUARDAR ---
  const executeSaveVenta = async () => {
    if (!selectedCasaId) {
      alert("Debes buscar y seleccionar un Cliente nuevamente.");
      if (searchInputRef.current) searchInputRef.current.focus();
      return null;
    }
    if (!consumoLitros || montoTotal <= 0) {
      alert("Verifica el consumo y el monto total.");
      return null;
    }

    const ventaData = {
      id_casa: selectedCasaId,
      fecha_carga: fecha,
      consumo_litros: parseFloat(consumoLitros),
      ret: ret ? parseFloat(ret) : null,
      monto_total: montoTotal,
      estado_pago: false,
      tipo_pago: tipoPago,
      fecha_proxima_carga: fechaProximaCarga || null,
      id_porcentaje: idPorcentajeActual,
    };

    let resultId = null;
    try {
      if (venta && venta.id_carga) {
        const { data, error } = await supabase
          .from("carga_casa")
          .update(ventaData)
          .eq("id_carga", venta.id_carga)
          .select()
          .single();
        if (error) throw error;
        resultId = data.id_carga;
      } else {
        const { data, error } = await supabase
          .from("carga_casa")
          .insert([ventaData])
          .select()
          .single();
        if (error) throw error;
        resultId = data.id_carga;

        if (tipoPago === "credito") {
          const { error: rpcError } = await supabase.rpc(
            "registrar_movimiento_credito",
            {
              p_id_casa: selectedCasaId,
              p_tipo: "CARGO",
              p_monto: montoTotal,
              p_descripcion: `Venta Gas ${consumoLitros} Lts (Nota #${resultId})`,
              p_id_carga: resultId,
              p_id_turno: idPorcentajeActual,
              p_user_id: authUser?.id,
              p_app_users_id: appUser?.id,
            }
          );
          if (rpcError) console.error("Error registrando deuda:", rpcError);
        }
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
      const id = await executeSaveVenta();
      if (id) {
        onVentaGuardada();
        handleClose();
      }
    } catch (error) {
      alert("Error al guardar: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // --- GENERAR TICKET ---
  const handlePrintFactura = async () => {
    setIsSaving(true);
    try {
      // 1. Guardamos la venta primero
      const idCarga = await executeSaveVenta();
      if (!idCarga) {
        setIsSaving(false);
        return;
      }

      // 2. Esperamos renderizado
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (!ticketRef.current) throw new Error("Error renderizando ticket");

      // 3. Generamos imagen
      // NOTA: A veces html2canvas falla con iconos SVG complejos si no se cargan a tiempo.
      // Si los iconos no salen, hay que usar SVGs inline o imágenes estáticas.
      const canvas = await html2canvas(ticketRef.current, {
        scale: 2, // Mayor calidad
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        allowTaint: true, // Permite imágenes externas si CORS falla
      });

      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.9)
      );
      const fileName = `factura_${idCarga}_${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("facturas")
        .upload(fileName, blob, { contentType: "image/jpeg" });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("facturas").getPublicUrl(fileName);

      await supabase.from("factura_casa").insert(
        [{ id_carga: idCarga, url: publicUrl, fecha_factura: new Date().toISOString() }],
        { returning: "minimal" }
      );

      setFacturaUrl(publicUrl);
      setShowModalFactura(true);
      onVentaGuardada();
    } catch (error) {
      console.error(error);
      alert("Error generando factura. Intente de nuevo.");
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
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
          {/* Header Modal */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
                <Icon icon={venta ? "mdi:file-edit" : "mdi:file-plus"} className="text-white w-7 h-7"/>
              </div>
              <h2 className="text-xl font-bold text-white tracking-wide">
                {venta ? "Modificar Venta" : "Registrar Venta"}
              </h2>
            </div>
            <button onClick={handleClose} className="text-white/80 hover:text-white transition-colors">
              <Icon icon="mdi:close" width="28" />
            </button>
          </div>

          {/* Formulario Venta */}
          <div className="p-6 overflow-y-auto space-y-6">
            <form onSubmit={handleSaveButton}>
              {/* BUSCADOR */}
              <div className="relative group z-30">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">
                  Cliente {venta && <span className="text-red-500 text-[10px] ml-2">(Busca de nuevo el cliente)</span>}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Icon icon="mdi:account-search" width="20" />
                  </div>
                  <input
                    ref={searchInputRef}
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
                    className={`block w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:bg-white focus:border-blue-500 outline-none ${venta && !selectedClient ? "ring-2 ring-blue-200 bg-blue-50" : ""}`}
                    autoFocus={!!venta}
                  />
                  {selectedClient && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedClient(null);
                        setSelectedCasaId(null);
                        setSearchTerm("");
                        if (searchInputRef.current) searchInputRef.current.focus();
                      }}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-red-400 hover:text-red-600 cursor-pointer"
                    >
                      <Icon icon="mdi:close-circle" width="20" />
                    </button>
                  )}
                </div>

                {/* Resultados */}
                {searchResults.length > 0 && (
                  <ul className="absolute left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-xl max-h-56 overflow-y-auto z-50">
                    {searchResults.map((client) => (
                      <li
                        key={client.id_casa}
                        onClick={() => handleSelectClient(client)}
                        className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0 flex flex-col"
                      >
                        <span className="font-bold text-gray-800">{client.nombre_cliente}</span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Icon icon="mdi:map-marker" width="12" /> {client.calle} #{client.numero}, {client.colonia}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {searchResults.length === 0 && searchTerm.length > 2 && !isSearching && !selectedClient && (
                    <div className="mt-2 text-sm text-gray-500 flex items-center justify-between bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                      <span>No encontrado.</span>
                      <button type="button" onClick={handleOpenModalNuevoCliente} className="text-blue-600 font-bold hover:underline flex items-center gap-1">
                        <Icon icon="mdi:plus-circle" /> Crear Nuevo Cliente
                      </button>
                    </div>
                )}
              </div>

              {/* INPUTS DE VENTA */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                <InputGroup label="Fecha" icon="mdi:calendar" name="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
                <div className="group">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Precio x Litro</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><Icon icon="mdi:tag-text" width="20" /></div>
                    <input
                      type="text"
                      value={precioVigente !== null ? `$ ${Number(precioVigente).toFixed(2)}` : "$ 0.00"}
                      disabled
                      className="block w-full pl-10 pr-3 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-gray-600 font-medium"
                    />
                  </div>
                </div>
                <InputGroup label="Consumo (Litros)" icon="mdi:gas-station" name="consumo" type="number" placeholder="0.00" value={consumoLitros} onChange={(e) => setConsumoLitros(e.target.value)} />
                <InputGroup label="RET (Opcional)" icon="mdi:percent" name="ret" type="number" placeholder="0" value={ret} onChange={(e) => setRet(e.target.value)} />
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-teal-100 border border-emerald-200 rounded-xl p-5 my-6 flex justify-between items-center shadow-sm">
                <div>
                  <h4 className="text-emerald-800 text-sm font-bold uppercase tracking-wider">Monto Total</h4>
                  <span className="text-emerald-600/70 text-xs">Calculado automáticamente</span>
                </div>
                <div className="text-4xl font-extrabold text-emerald-600">
                  {montoTotal.toLocaleString("es-MX", { style: "currency", currency: "MXN" })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="group">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Método de Pago</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><Icon icon="mdi:credit-card-outline" width="20" /></div>
                    <select
                      value={tipoPago}
                      onChange={(e) => setTipoPago(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:bg-white focus:border-blue-500 outline-none"
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
                  type="number"
                  value={montoPendiente}
                  onChange={(e) => setMontoPendiente(e.target.value)}
                  disabled={!(tipoPago === "credito" || tipoPago === "transferencia")}
                  className={!(tipoPago === "credito" || tipoPago === "transferencia") ? "bg-gray-100 text-gray-400" : ""}
                />
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100">
                <h4 className="text-sm font-bold text-gray-500 uppercase mb-3 flex items-center gap-2"><Icon icon="mdi:calendar-clock" /> Próxima Carga</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <InputGroup label="Fecha Estimada" icon="mdi:calendar-arrow-right" type="date" value={fechaProximaCarga} onChange={(e) => setFechaProximaCarga(e.target.value)} />
                  {fechaProximaCarga && (
                    <InputGroup label="Comentario / Nota" icon="mdi:comment-text-outline" value={comentarioProximaCarga} onChange={(e) => setComentarioProximaCarga(e.target.value)} placeholder="Ej. Llamar antes..." />
                  )}
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button type="button" onClick={handlePrintFactura} disabled={isSaving || !selectedCasaId} className="px-5 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 shadow-sm flex items-center gap-2">
                  <Icon icon="mdi:printer" /> {isSaving ? "Generando..." : "Ticket"}
                </button>
                <button type="submit" disabled={isSaving} className="px-6 py-2.5 rounded-lg text-white font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg flex items-center gap-2">
                  {isSaving ? <><Icon icon="line-md:loading-loop" width="24" /> Guardando...</> : <><Icon icon="mdi:content-save-check" width="20" /> {venta ? "Actualizar" : "Guardar"}</>}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Modales Hijos */}
        <ModalNuevoCliente isOpen={isModalNuevoClienteOpen} onClose={handleCloseModalNuevoCliente} contrato={nuevoContrato} />
        <ModalFactura isOpen={showModalFactura} onClose={() => { setShowModalFactura(false); handleClose(); }} facturaUrl={facturaUrl} clienteTelefono={selectedClient?.telefono || ""} />

        {/* --- TICKET RENDERIZADO PROFESIONAL Y LLAMATIVO --- */}
        <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
          <div ref={ticketRef} style={ticketStyles.ticketContainer}>
            
            {/* 1. ENCABEZADO DEL TICKET */}
            <div style={ticketStyles.ticketHeaderBg}>
              {authUser?.user_metadata?.avatar_url && (
                <img
                  src={authUser.user_metadata.avatar_url}
                  alt="Logo"
                  style={ticketStyles.ticketLogo}
                  crossOrigin="anonymous"
                />
              )}
              <h2 style={ticketStyles.ticketTitle}>{datosUnidad?.empresa || "GAS LP"}</h2>
              <div style={ticketStyles.ticketSubtitle}>Unidad: <strong>{datosUnidad?.num_unidad || "S/N"}</strong></div>
              
              {/* TELÉFONOS LLAMATIVOS */}
              <div style={ticketStyles.ticketPhoneHighlight}>
                 <Icon icon="mdi:phone-in-talk" width="16" style={{marginRight: '4px'}} />
                 <span>{datosUnidad?.telefono_1 || "---"} 
                  <hr />
                 {datosUnidad?.telefono_2 || "---"}</span>
              </div>
              
              <div style={{ ...ticketStyles.ticketSubtitle, marginTop: "4px", fontSize: "11px", display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.8 }}>
                <Icon icon="mdi:calendar-clock" width="12" style={{marginRight: '4px'}} />
                {new Date().toLocaleDateString("es-MX", {
                  year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
                })}
              </div>
            </div>

            {/* 2. CUERPO DEL TICKET */}
            <div style={ticketStyles.ticketBody}>
              
              {/* Sección Cliente */}
              <div style={ticketStyles.ticketSectionTitle}>
                 <Icon icon="mdi:account-details" width="14" style={{marginRight: '4px', verticalAlign: 'text-bottom'}}/>
                 CLIENTE
              </div>
              <div style={ticketStyles.ticketClientBox}>
                <div style={ticketStyles.ticketClientName}>
                  {selectedClient?.nombre_cliente || "Público General"}
                </div>
                <div style={ticketStyles.ticketClientInfo}>
                  <Icon icon="mdi:map-marker-radius" width="12" style={{marginRight: '2px', display: 'inline-block', color: '#6B7280'}} />
                  {selectedClient?.calle} #{selectedClient?.numero}
                  <br/><span style={{marginLeft: '14px'}}>{selectedClient?.colonia}</span>
                </div>
              </div>

              {/* Sección Detalles */}
              <div style={ticketStyles.ticketSectionTitle}>
                 <Icon icon="mdi:gas-station-outline" width="14" style={{marginRight: '4px', verticalAlign: 'text-bottom'}}/>
                 DETALLES DE VENTA
              </div>
              
              <div style={ticketStyles.ticketRow}>
                <span><Icon icon="mdi:tag-text-outline" width="14" style={{verticalAlign: '-2px', marginRight:'4px', color: '#6B7280'}}/>Precio por Litro:</span>
                <strong>$ {Number(precioVigente).toFixed(2)}</strong>
              </div>
              <div style={ticketStyles.ticketRow}>
                <span><Icon icon="mdi:barrel" width="14" style={{verticalAlign: '-2px', marginRight:'4px', color: '#6B7280'}}/>Consumo:</span>
                <strong>{consumoLitros} Litros</strong>
              </div>
              <div style={ticketStyles.ticketRow}>
                <span><Icon icon="mdi:hand-coin-outline" width="14" style={{verticalAlign: '-2px', marginRight:'4px', color: '#6B7280'}}/>Forma de Pago:</span>
                <strong style={{textTransform: 'uppercase'}}>{tipoPago}</strong>
              </div>

              {/* Total */}
              <div style={ticketStyles.ticketRowTotal}>
                <span style={{display:'flex', alignItems:'center'}}><Icon icon="mdi:cash-multiple" width="24" style={{marginRight:'8px', color: '#1F2937'}}/>TOTAL:</span>
                <span>${montoTotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* 3. PIE DE PÁGINA: BANCOS E ICONOS */}
            <div style={ticketStyles.ticketFooter}>
               {listaBancos.length > 0 && (
                   <div style={{marginBottom: '15px'}}>
                       <div style={{fontSize: '10px', fontWeight: 'bold', color: '#9CA3AF', marginBottom: '5px', display: 'flex', alignItems: 'center',}}>
                          <Icon icon="mdi:bank-transfer-in" width="14" style={{marginRight:'4px'}}/>
                          DATOS PARA TRANSFERENCIA
                       </div>
                       {listaBancos.map((banco, i) => (
                           <div key={banco.id || i} style={ticketStyles.ticketBankBox}>
                               <div style={{fontWeight: 'bold', color: '#374151', display: 'flex', alignItems: 'center', textAlign: 'center'}}>
                                  <Icon icon="mdi:bank" width="12" style={{marginRight: '4px', color: '#4F46E5'}}/>
                                  {banco.banco}
                               </div>
                               <div style={{marginLeft: '16px'}}>Cta: {banco.cuenta }</div>
                               <div style={{marginLeft: '16px'}}>CLABE: {banco.clave_int}</div>
                               <div style={{marginLeft: '16px'}}>CLABE: {banco.nom_responsable}</div>
                           </div>
                       ))}
                   </div>
               )}
               
               <div style={{fontSize: '14px', fontWeight: 'bold', color: '#4B5563', marginTop: '10px', display:'flex', alignItems:'center', justifyContent:'center'}}>
                   <Icon icon="mdi:handshake" width="18" style={{marginRight:'6px', color: '#10B981'}} />
                   ¡Gracias por su preferencia!
               </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}

// Componente InputGroup
const InputGroup = ({ label, icon, className = "", ...props }) => (
  <div className="group">
    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">{label}</label>
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
        <Icon icon={icon} width="20" />
      </div>
      <input {...props} className={`block w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:bg-white focus:border-blue-500 outline-none transition-all ${className}`} />
    </div>
  </div>
);

// ESTILOS TICKET ACTUALIZADOS Y MEJORADOS
const ticketStyles = {
  ticketContainer: {
    width: "400px",
    backgroundColor: "#ffffff",
    color: "#1f2937",
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", // Fuente más limpia
    borderRadius: "0px",
    overflow: "hidden",
    border: "1px solid #e5e7eb",
  },
  ticketHeaderBg: {
    backgroundColor: "#1F2937", // Fondo oscuro
    color: "white",
    padding: "25px 20px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    position: "relative",
  },
  ticketLogo: {
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    objectFit: "cover",
    marginBottom: "10px",
    border: "3px solid white",
    backgroundColor: "white",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
  },
  ticketTitle: {
    fontSize: "20px",
    fontWeight: "800",
    textTransform: "uppercase",
    margin: "0 0 5px 0",
    letterSpacing: "1px",
    lineHeight: "1.2"
  },
  ticketSubtitle: { fontSize: "13px", opacity: 0.9, margin: "2px 0" },
  // NUEVO ESTILO PARA TELÉFONOS LLAMATIVOS
  ticketPhoneHighlight: {
    backgroundColor: "rgba(251, 191, 36, 0.15)", // Fondo amarillo translúcido
    color: "#FBBF24", // Texto amarillo/ámbar brillante
    fontWeight: "800",
    fontSize: "15px",
    padding: "6px 14px",
    borderRadius: "20px", // Bordes redondeados tipo insignia
    marginTop: "8px",
    marginBottom: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid rgba(251, 191, 36, 0.4)", // Borde amarillo sutil
    letterSpacing: "0.5px"
  },
  ticketBody: { padding: "25px 20px" },
  ticketSectionTitle: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    marginBottom: "10px",
    borderBottom: "2px solid #F3F4F6",
    paddingBottom: "6px",
    display: "flex",
    alignItems: "center",
    letterSpacing: "0.5px"
  },
  ticketClientBox: {
    marginBottom: "25px",
    paddingLeft: "4px"
  },
  ticketClientName: {
    fontSize: "16px",
    fontWeight: "800",
    marginBottom: "4px",
    color: "#111827"
  },
  ticketClientInfo: { fontSize: "13px", color: "#4B5563", lineHeight: "1.4" },
  ticketRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "8px",
    fontSize: "14px",
    color: "#374151",
    alignItems: "center"
  },
  ticketRowTotal: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "20px",
    paddingTop: "20px",
    borderTop: "3px dashed #E5E7EB",
    fontSize: "24px",
    fontWeight: "900",
    color: "#111827",
    alignItems: "center"
  },
  ticketFooter: {
    backgroundColor: "#F9FAFB",
    padding: "20px",
    borderTop: "1px solid #e5e7eb",
  },
  ticketBankBox: {
    textAlign: "center",
    backgroundColor: "white",
    border: "1px solid #E5E7EB",
    borderRadius: "8px",
    padding: "10px 12px",
    marginBottom: "8px",
    fontSize: "12px",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
  },
};