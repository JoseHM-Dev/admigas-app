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

  // montoPendiente guardará la parte "NO EFECTIVO" (lo que va a banco, deuda o transferencia)
  const [montoPendiente, setMontoPendiente] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [fechaProximaCarga, setFechaProximaCarga] = useState("");
  const [comentarioProximaCarga, setComentarioProximaCarga] = useState("");

  const [isModalNuevoClienteOpen, setIsModalNuevoClienteOpen] = useState(false);
  const [nuevoContrato, setNuevoContrato] = useState(null);

  const [facturaUrl, setFacturaUrl] = useState(null);
  const [showModalFactura, setShowModalFactura] = useState(false);

  const [datosUnidad, setDatosUnidad] = useState(null);
  const [listaBancos, setListaBancos] = useState([]);

  // --- EFECTOS (Carga de datos y cálculos) ---
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
        if (data) setIdPorcentajeActual(data.id);
      } catch (error) {
        console.error("Error turno:", error);
      }
    };
    if (isOpen) fetchCurrentTurno();
  }, [isOpen, venta, idTurnoExterno]);

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
        if (searchInputRef.current) searchInputRef.current.focus();
      }, 100);
    } else {
      resetForm();
    }
  }, [venta]);

  useEffect(() => {
    if (isOpen) {
      if (tarifa && tarifa.precio_litro)
        setPrecioVigente(parseFloat(tarifa.precio_litro));
      else setPrecioVigente(0);
      if (unidad) setDatosUnidad(unidad);
      if (bancoContexto) {
        if (Array.isArray(bancoContexto)) setListaBancos(bancoContexto);
        else setListaBancos([bancoContexto]);
      } else setListaBancos([]);
    }
  }, [isOpen, tarifa, unidad, bancoContexto]);

  useEffect(() => {
    const litros = parseFloat(consumoLitros);
    const total =
      !isNaN(litros) && precioVigente > 0 ? litros * precioVigente : 0;
    setMontoTotal(total);
  }, [consumoLitros, precioVigente]);

  // --- AUTO-LLENADO DE MONTOS ---
  useEffect(() => {
    if (montoTotal > 0) {
      // Si es Credito, Transferencia o Tarjeta, sugerimos el total por defecto
      if (["credito", "transferencia", "tarjeta"].includes(tipoPago)) {
        setMontoPendiente(montoTotal.toFixed(2));
      } else {
        setMontoPendiente("0");
      }
    } else {
      setMontoPendiente("");
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

  // --- GUARDAR (VERSIÓN DEFINITIVA: CREA DEUDA SI NO EXISTE AL EDITAR) ---
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

    // --- CORRECCIÓN DE VALIDACIÓN (REDONDEO) ---
    const totalRedondeado = Number(montoTotal.toFixed(2));
    const pendienteRedondeado = montoPendiente ? Number(parseFloat(montoPendiente).toFixed(2)) : 0;

    // Validación para Tarjeta y Transferencia mixta
    if ((tipoPago === 'tarjeta' || tipoPago === 'transferencia') && pendienteRedondeado > totalRedondeado) {
        alert(`El monto en ${tipoPago} ($${pendienteRedondeado}) no puede ser mayor al total de la venta ($${totalRedondeado}).`);
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
      // monto_pendiente guarda lo que NO es efectivo
      monto_pendiente: montoPendiente ? parseFloat(montoPendiente) : 0,
      id_porcentaje: idPorcentajeActual,
      fecha_proxima_carga: fechaProximaCarga || null,
    };

    let resultId = null;
    try {
      // ==============================
      // CASO 1: EDICIÓN (MODIFICAR)
      // ==============================
      if (venta && venta.id_carga) {
        // 1. Actualizar tabla principal (carga_casa)
        const { data, error } = await supabase
          .from("carga_casa")
          .update(ventaData)
          .eq("id_carga", venta.id_carga)
          .select()
          .single();
        if (error) throw error;
        resultId = data.id_carga;

        // 2. ACTUALIZAR O CREAR LA DEUDA / TRANSFERENCIA
        if (tipoPago === "credito" || tipoPago === "transferencia") {
             // A) Intentamos actualizar el movimiento existente
             const { data: movData, error: errorMov } = await supabase
               .from("movimientos_credito")
               .update({
                   monto: parseFloat(montoPendiente),
                   descripcion: `Venta Gas ${consumoLitros} Lts (Nota #${resultId}) - ${tipoPago.toUpperCase()} (Editado)`
               })
               .eq("id_carga", resultId)
               .select(); // IMPORTANTE: .select() nos dice si encontró algo
             
             if (errorMov) console.error("Error actualizando movimiento:", errorMov);

             // B) SI NO ENCONTRÓ NADA (movData vacío), significa que es venta vieja o era efectivo
             // ENTONCES LA CREAMOS DE CERO:
             if (!movData || movData.length === 0) {
                  const { error: rpcError } = await supabase.rpc(
                    "registrar_movimiento_credito",
                    {
                      p_id_casa: selectedCasaId,
                      p_tipo: "CARGO",
                      p_monto: parseFloat(montoPendiente), 
                      p_descripcion: `Venta Gas ${consumoLitros} Lts (Nota #${resultId}) - ${tipoPago.toUpperCase()} (Corregido)`,
                      p_id_carga: resultId,
                      p_id_turno: idPorcentajeActual,
                      p_user_id: authUser?.id,
                      p_app_users_id: appUser?.id,
                    }
                  );
                  if (rpcError) console.error("Error creando deuda en edición:", rpcError);
             }
        }
        
      } else {
        // ==============================
        // CASO 2: NUEVA VENTA (INSERTAR)
        // ==============================
        const { data, error } = await supabase.from("carga_casa").insert([ventaData]).select().single();
        if (error) throw error;
        resultId = data.id_carga;

        // REGISTRO EN CREDITOS (CUENTAS POR COBRAR) - NUEVO
        if (tipoPago === "credito" || tipoPago === "transferencia") {
          const { error: rpcError } = await supabase.rpc(
            "registrar_movimiento_credito",
            {
              p_id_casa: selectedCasaId,
              p_tipo: "CARGO",
              p_monto: parseFloat(montoPendiente), 
              p_descripcion: `Venta Gas ${consumoLitros} Lts (Nota #${resultId}) - ${tipoPago.toUpperCase()}`,
              p_id_carga: resultId,
              p_id_turno: idPorcentajeActual,
              p_user_id: authUser?.id,
              p_app_users_id: appUser?.id,
            }
          );
          if (rpcError) console.error("Error registrando deuda nueva:", rpcError);
        }
      }

      // Agenda
      if (fechaProximaCarga) {
        await supabase.from("agenda").upsert(
          [{ id_casa: selectedCasaId, fecha_proxima_carga: fechaProximaCarga, comentario: comentarioProximaCarga }],
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

  const handlePrintFactura = async () => {
    setIsSaving(true);
    try {
      const idCarga = await executeSaveVenta();
      if (!idCarga) {
        setIsSaving(false);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (!ticketRef.current) throw new Error("Error renderizando ticket");
      const canvas = await html2canvas(ticketRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        allowTaint: true,
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
      await supabase
        .from("factura_casa")
        .insert(
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

  // Modales Extra
  const handleOpenModalNuevoCliente = async () => {
    /* logica nuevo cliente */ try {
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

  // CALCULO VISUAL DE EFECTIVO RESTANTE
  const efectivoRestante = (
    montoTotal - (parseFloat(montoPendiente) || 0)
  ).toFixed(2);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-all duration-300">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
                <Icon
                  icon={venta ? "mdi:file-edit" : "mdi:file-plus"}
                  className="text-white w-7 h-7"
                />
              </div>
              <h2 className="text-xl font-bold text-white tracking-wide">
                {venta ? "Modificar Venta" : "Registrar Venta"}
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
              {/* BUSCADOR */}
              <div className="relative group z-30">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">
                  Cliente{" "}
                  {venta && (
                    <span className="text-red-500 text-[10px] ml-2">
                      (Busca de nuevo el cliente)
                    </span>
                  )}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Icon icon="mdi:account-search" width="20" />
                  </div>
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      if (selectedClient) {
                        setSelectedClient(null);
                        setSelectedCasaId(null);
                      }
                    }}
                    className={`block w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:bg-white focus:border-blue-500 outline-none ${
                      venta && !selectedClient
                        ? "ring-2 ring-blue-200 bg-blue-50"
                        : ""
                    }`}
                    autoFocus={!!venta}
                  />
                  {selectedClient && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedClient(null);
                        setSelectedCasaId(null);
                        setSearchTerm("");
                        if (searchInputRef.current)
                          searchInputRef.current.focus();
                      }}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-red-400 hover:text-red-600 cursor-pointer"
                    >
                      <Icon icon="mdi:close-circle" width="20" />
                    </button>
                  )}
                </div>
                {searchResults.length > 0 && (
                  <ul className="absolute left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-xl max-h-56 overflow-y-auto z-50">
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
                          {client.calle} #{client.numero}
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

              {/* INPUTS BASICOS */}
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
                        precioVigente !== null
                          ? `$ ${Number(precioVigente).toFixed(2)}`
                          : "$ 0.00"
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

              {/* TOTAL */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-100 border border-emerald-200 rounded-xl p-5 my-6 flex justify-between items-center shadow-sm">
                <div>
                  <h4 className="text-emerald-800 text-sm font-bold uppercase tracking-wider">
                    Monto Total Venta
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

              {/* --- LOGICA DE PAGO MIXTA (TARJETA Y TRANSFERENCIA) --- */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="group">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">
                    Método de Pago
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <Icon icon="mdi:credit-card-outline" width="20" />
                    </div>
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

                {/* Input Dinámico */}
                <div className="relative">
                  <InputGroup
                    // ETIQUETAS DINAMICAS SEGUN EL TIPO
                    label={
                      tipoPago === "tarjeta"
                        ? "Monto a Cobrar en Tarjeta"
                        : tipoPago === "transferencia"
                        ? "Monto de Transferencia"
                        : tipoPago === "credito"
                        ? "Monto a Crédito (Deuda)"
                        : "Monto Pendiente"
                    }
                    icon={
                      tipoPago === "tarjeta"
                        ? "mdi:credit-card-check"
                        : tipoPago === "transferencia"
                        ? "mdi:bank-transfer-in"
                        : "mdi:cash-clock"
                    }
                    type="number"
                    value={montoPendiente}
                    onChange={(e) => setMontoPendiente(e.target.value)}
                    // Habilitado para Credito, Tarjeta y Transferencia
                    disabled={tipoPago === "efectivo"}
                    className={
                      tipoPago === "efectivo"
                        ? "bg-gray-100 text-gray-400"
                        : "bg-white border-blue-300 text-blue-800 font-bold"
                    }
                  />

                  {/* FEEDBACK VISUAL PARA PAGOS MIXTOS (TARJETA O TRANSFERENCIA) */}
                  {(tipoPago === "tarjeta" || tipoPago === "transferencia") &&
                    montoTotal > 0 && (
                      <div className="absolute -bottom-6 right-0 text-[10px] font-bold text-gray-500">
                        Resto en Efectivo:{" "}
                        <span className="text-green-600">
                          ${Number(efectivoRestante).toLocaleString("es-MX")}
                        </span>
                      </div>
                    )}
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <InputGroup
                    label="Próxima Carga"
                    icon="mdi:calendar-arrow-right"
                    type="date"
                    value={fechaProximaCarga}
                    onChange={(e) => setFechaProximaCarga(e.target.value)}
                  />
                  {fechaProximaCarga && (
                    <InputGroup
                      label="Nota"
                      icon="mdi:comment-text-outline"
                      value={comentarioProximaCarga}
                      onChange={(e) =>
                        setComentarioProximaCarga(e.target.value)
                      }
                    />
                  )}
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handlePrintFactura}
                  disabled={isSaving || !selectedCasaId}
                  className="px-5 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 shadow-sm flex items-center gap-2"
                >
                  <Icon icon="mdi:printer" />{" "}
                  {isSaving ? "Generando..." : "Ticket"}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-lg text-white font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg flex items-center gap-2"
                >
                  {isSaving ? "Guardando..." : venta ? "Actualizar" : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
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
        {/* Ticket oculto (igual que antes) */}
        <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
          <div ref={ticketRef} style={ticketStyles.ticketContainer}>
            <div style={ticketStyles.ticketHeaderBg}>
              <h2 style={ticketStyles.ticketTitle}>
                {datosUnidad?.empresa || "GAS LP"}
              </h2>
            </div>
            <div style={ticketStyles.ticketBody}>
              <div style={ticketStyles.ticketRow}>
                <span>Forma de Pago:</span>
                <strong>
                  {tipoPago}{" "}
                  {(tipoPago === "tarjeta" || tipoPago === "transferencia") &&
                  efectivoRestante > 0
                    ? "(MIXTO)"
                    : ""}
                </strong>
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
        className={`block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:bg-white focus:border-blue-500 outline-none transition-all ${className}`}
      />
    </div>
  </div>
);

const ticketStyles = {
  ticketContainer: {
    width: "400px",
    backgroundColor: "#ffffff",
    color: "#1f2937",
    border: "1px solid #e5e7eb",
  },
  ticketHeaderBg: {
    backgroundColor: "#1F2937",
    color: "white",
    padding: "20px",
    textAlign: "center",
  },
  ticketTitle: { fontSize: "20px", fontWeight: "800" },
  ticketBody: { padding: "20px" },
  ticketRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "8px",
  },
  ticketRowTotal: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "20px",
    fontSize: "24px",
    fontWeight: "900",
  },
};
