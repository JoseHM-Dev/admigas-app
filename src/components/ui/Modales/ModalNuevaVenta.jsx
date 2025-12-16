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

// Función auxiliar para formatear fecha a DD/MM/AAAA
const formatDateFriendly = (dateStr) => {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
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
  const { appUser, user: authUser } = useAuth(); // Obtenemos authUser para la metadata de la imagen

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

  const [datosUnidad, setDatosUnidad] = useState(null);
  const [listaBancos, setListaBancos] = useState([]);
  const [tipoPagoResto, setTipoPagoResto] = useState("efectivo");

  // --- EFECTOS ---
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
      setTipoPagoResto(venta.tipo_pago_resto || "efectivo");

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

  useEffect(() => {
    if (montoTotal > 0) {
      if (["credito", "transferencia", "tarjeta"].includes(tipoPago)) {
        setMontoPendiente(montoTotal.toFixed(2));
      } else {
        setMontoPendiente("0");
      }
    } else {
      setMontoPendiente("");
    }
  }, [tipoPago, montoTotal]);

  // --- BUSCADOR CORREGIDO (Ignora acentos) ---
  const searchClients = useCallback(async (term) => {
    // Permitimos buscar con 2 letras si es necesario, o mantenemos 3
    if (term.length < 1) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      // USAMOS LA RPC 'buscar_clientes' QUE IGNORA ACENTOS
      const { data, error } = await supabase.rpc("buscar_clientes", {
        term: term,
      });

      if (error) throw error;
      
      // Limitamos los resultados en el front o en el SQL (el SQL devuelve todo, aquí cortamos a 10)
      setSearchResults(data ? data.slice(0, 10) : []);
    } catch (e) {
      console.error("Error buscando cliente:", e);
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
    setTipoPagoResto("efectivo");
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

    const totalRedondeado = Number(montoTotal.toFixed(2));
    const pendienteRedondeado = montoPendiente
      ? Number(parseFloat(montoPendiente).toFixed(2))
      : 0;

    if (
      (tipoPago === "tarjeta" ||
        tipoPago === "transferencia" ||
        tipoPago === "credito") &&
      pendienteRedondeado > totalRedondeado
    ) {
      alert(
        `El monto en ${tipoPago} ($${pendienteRedondeado}) no puede ser mayor al total de la venta ($${totalRedondeado}).`
      );
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
      tipo_pago_resto: tipoPagoResto,
      monto_pendiente: montoPendiente ? parseFloat(montoPendiente) : 0,
      id_porcentaje: idPorcentajeActual,
      fecha_proxima_carga: fechaProximaCarga || null,
    };

    let resultId = null;
    try {
      if (venta && venta.id_carga) {
        // EDICIÓN
        const { data, error } = await supabase
          .from("carga_casa")
          .update(ventaData)
          .eq("id_carga", venta.id_carga)
          .select()
          .single();
        if (error) throw error;
        resultId = data.id_carga;

        if (tipoPago === "credito" || tipoPago === "transferencia") {
          const { data: movData, error: errorMov } = await supabase
            .from("movimientos_credito")
            .update({
              monto: parseFloat(montoPendiente),
              descripcion: `Venta Gas ${consumoLitros} Lts (Nota #${resultId}) - ${tipoPago.toUpperCase()} (Editado)`,
            })
            .eq("id_carga", resultId)
            .select();

          if (!movData || movData.length === 0) {
            await supabase.rpc("registrar_movimiento_credito", {
              p_id_casa: selectedCasaId,
              p_tipo: "CARGO",
              p_monto: parseFloat(montoPendiente),
              p_descripcion: `Venta Gas ${consumoLitros} Lts (Nota #${resultId}) - ${tipoPago.toUpperCase()} (Corregido)`,
              p_id_carga: resultId,
              p_id_turno: idPorcentajeActual,
              p_user_id: authUser?.id,
              p_app_users_id: appUser?.id,
            });
          }
        }
      } else {
        // NUEVA
        const { data, error } = await supabase
          .from("carga_casa")
          .insert([ventaData])
          .select()
          .single();
        if (error) throw error;
        resultId = data.id_carga;

        if (tipoPago === "credito" || tipoPago === "transferencia") {
          await supabase.rpc("registrar_movimiento_credito", {
            p_id_casa: selectedCasaId,
            p_tipo: "CARGO",
            p_monto: parseFloat(montoPendiente),
            p_descripcion: `Venta Gas ${consumoLitros} Lts (Nota #${resultId}) - ${tipoPago.toUpperCase()}`,
            p_id_carga: resultId,
            p_id_turno: idPorcentajeActual,
            p_user_id: authUser?.id,
            p_app_users_id: appUser?.id,
          });
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

  // --- GENERACIÓN DE IMAGEN / TICKET ---
  const generateCanvas = async () => {
    if (!ticketRef.current) return null;
    try {
      // Configuraciones para asegurar captura completa
      const canvas = await html2canvas(ticketRef.current, {
        scale: 2, // Mayor calidad
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        allowTaint: true,
        width: ticketRef.current.scrollWidth,
        height: ticketRef.current.scrollHeight,
        windowWidth: ticketRef.current.scrollWidth + 100, // Evita recortes
      });
      return canvas;
    } catch (error) {
      console.error("Error generando canvas", error);
      return null;
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

      // Esperar renderizado
      await new Promise((resolve) => setTimeout(resolve, 800));

      const canvas = await generateCanvas();
      if (!canvas) throw new Error("No se pudo generar el ticket");

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

  // NUEVO: DESCARGA DIRECTA
  const handleDownloadDirect = async () => {
    if (!selectedCasaId) {
      alert("Selecciona un cliente y llena los datos primero.");
      return;
    }
    setIsSaving(true);
    try {
      // Esperar un momento para asegurar que el DOM esté listo visualmente
      await new Promise((resolve) => setTimeout(resolve, 500));

      const canvas = await generateCanvas();
      if (canvas) {
        const link = document.createElement("a");
        link.download = `Nota_${
          selectedClient?.nombre_cliente || "Venta"
        }_${Date.now()}.jpg`;
        link.href = canvas.toDataURL("image/jpeg", 0.9);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (e) {
      console.error(e);
      alert("Error al descargar la imagen.");
    } finally {
      setIsSaving(false);
    }
  };

  // Modales Extra
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

  const efectivoRestante = (
    montoTotal - (parseFloat(montoPendiente) || 0)
  ).toFixed(2);

  // LOGICA PARA TELEFONOS EN TICKET
  const getUnitPhones = () => {
    if (!datosUnidad) return "Sin datos";
    const tels = [];
    if (datosUnidad.telefono_1) tels.push(datosUnidad.telefono_1);
    // Asumiendo que podría haber otro campo o split por coma
    return tels.join(" / ");
  };

  // Lógica para obtener la imagen correcta (Prioridad: authUser > appUser > unidad)
  const getProfileImage = () => {
    if (authUser?.user_metadata?.avatar_url)
      return authUser.user_metadata.avatar_url;
    if (appUser?.avatar_url) return appUser.avatar_url;
    if (datosUnidad?.logo_url) return datosUnidad.logo_url;
    return null;
  };
  const userImage = getProfileImage();

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-all duration-300">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 flex justify-between items-center shrink-0">
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
              <div className="bg-linear-to-br from-emerald-50 to-teal-100 border border-emerald-200 rounded-xl p-5 my-6 flex justify-between items-center shadow-sm">
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

              {/* TIPO DE PAGO */}
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
                      tipoPago === "credito"
                        ? "mdi:book-open-page-variant"
                        : "mdi:cash-clock"
                    }
                    type="number"
                    value={montoPendiente}
                    onChange={(e) => setMontoPendiente(e.target.value)}
                    disabled={tipoPago === "efectivo"}
                    className={
                      tipoPago === "efectivo"
                        ? "bg-gray-100 text-gray-400"
                        : "bg-white border-blue-300 text-blue-800 font-bold"
                    }
                  />

                  {tipoPago === "credito" &&
                    montoTotal > 0 &&
                    montoTotal - (parseFloat(montoPendiente) || 0) > 0 && (
                      <div className="mt-2 bg-indigo-50 p-2 rounded-lg border border-indigo-100 animate-in fade-in">
                        <label className="block text-[10px] font-bold text-indigo-800 uppercase mb-1">
                          ¿Cómo paga la diferencia ($
                          {(
                            montoTotal - (parseFloat(montoPendiente) || 0)
                          ).toFixed(2)}
                          )?
                        </label>
                        <select
                          value={tipoPagoResto}
                          onChange={(e) => setTipoPagoResto(e.target.value)}
                          className="block w-full text-sm py-1 px-2 border border-indigo-200 rounded text-indigo-700 font-bold focus:outline-none focus:border-indigo-500"
                        >
                          <option value="efectivo">En Efectivo (Caja)</option>
                          <option value="tarjeta">Con Tarjeta (Banco)</option>
                        </select>
                      </div>
                    )}

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

              {/* BOTONERA */}
              <div className="mt-8 flex justify-end gap-3 items-center flex-wrap">
                {/* Botón Descarga Directa */}
                <button
                  type="button"
                  onClick={handleDownloadDirect}
                  disabled={isSaving}
                  className="px-4 py-2.5 rounded-lg border border-green-300 bg-green-50 text-green-700 font-bold hover:bg-green-100 shadow-sm flex items-center gap-2"
                >
                  <Icon icon="mdi:download" /> Descargar Imagen
                </button>

                {/* Botón Guardar en Nube (Original) */}
                <button
                  type="button"
                  onClick={handlePrintFactura}
                  disabled={isSaving || !selectedCasaId}
                  className="px-5 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 shadow-sm flex items-center gap-2"
                >
                  <Icon icon="mdi:cloud-upload" />{" "}
                  {isSaving ? "Procesando..." : "Guardar Ticket"}
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-lg text-white font-medium bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg flex items-center gap-2"
                >
                  {isSaving
                    ? "Guardando..."
                    : venta
                    ? "Actualizar"
                    : "Guardar Venta"}
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

        {/* ========================================================================================= */}
        {/* DISEÑO DEL TICKET PROFESIONAL / VISTOSO */}
        {/* ========================================================================================= */}
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            zIndex: -50,
            visibility: "visible",
          }}
        >
          <div ref={ticketRef} style={ticketStyles.ticketContainer}>
            {/* ENCABEZADO */}
            <div style={ticketStyles.header}>
              <div style={ticketStyles.logoContainer}>
                {userImage ? (
                  <img
                    src={userImage}
                    alt="Logo"
                    style={{
                      width: "80px",
                      height: "80px",
                      objectFit: "cover",
                      borderRadius: "50%",
                      border: "4px solid rgba(255,255,255,0.2)",
                    }}
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div style={{ fontSize: "50px" }}>⛽</div>
                )}
              </div>

              <h2 style={ticketStyles.companyName}>
                {datosUnidad?.empresa || "NOTA DE REMISIÓN"}
              </h2>

              <div style={ticketStyles.headerInfo}>
                <div style={ticketStyles.headerBadge}>📞 {getUnitPhones()}</div>
                <div style={ticketStyles.headerBadge}>
                  📅 {formatDateFriendly(fecha)}
                </div>
              </div>
            </div>

            <div style={ticketStyles.body}>
              {/* DATOS CLIENTE */}
              <div style={ticketStyles.cardSection}>
                <div style={ticketStyles.sectionTitleRow}>
                  <span style={ticketStyles.iconCircle}>👤</span>
                  <span style={ticketStyles.sectionTitle}>CLIENTE</span>
                </div>
                <div style={ticketStyles.clientName}>
                  {selectedClient?.nombre_cliente || "Público General"}
                </div>
                <div style={ticketStyles.clientAddress}>
                  {selectedClient
                    ? `${selectedClient.calle} #${selectedClient.numero}, ${selectedClient.colonia}`
                    : "---"}
                </div>
              </div>

              {/* DETALLE VENTA */}
              <div
                style={{
                  ...ticketStyles.cardSection,
                  backgroundColor: "#f8fafc",
                  borderColor: "#e2e8f0",
                }}
              >
                <div style={ticketStyles.sectionTitleRow}>
                  <span
                    style={{
                      ...ticketStyles.iconCircle,
                      backgroundColor: "#dbeafe",
                      color: "#1e40af",
                    }}
                  >
                    ⛽
                  </span>
                  <span
                    style={{ ...ticketStyles.sectionTitle, color: "#1e3a8a" }}
                  >
                    DETALLES DE CARGA
                  </span>
                </div>

                <div style={ticketStyles.rowDetail}>
                  <span style={ticketStyles.label}>Litros Suministrados:</span>
                  <span style={ticketStyles.valueBigBlue}>
                    {consumoLitros} L
                  </span>
                </div>
                <div style={ticketStyles.rowDetail}>
                  <span style={ticketStyles.label}>Precio Unitario:</span>
                  <span style={ticketStyles.value}>
                    ${Number(precioVigente).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* TOTAL */}
              <div style={ticketStyles.totalBox}>
                <span
                  style={{
                    fontSize: "12px",
                    opacity: 0.8,
                    letterSpacing: "1px",
                  }}
                >
                  TOTAL A PAGAR
                </span>
                <span
                  style={{
                    fontSize: "32px",
                    fontWeight: "900",
                    marginTop: "5px",
                  }}
                >
                  $
                  {montoTotal.toLocaleString("es-MX", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <span
                  style={{ fontSize: "10px", opacity: 0.9, marginTop: "2px" }}
                >
                  M.N.
                </span>
              </div>

              {/* TIPO PAGO */}
              <div style={ticketStyles.paymentInfo}>
                <span>
                  Método de Pago:{" "}
                  <strong style={{ color: "#0f172a" }}>
                    {tipoPago.toUpperCase()}
                  </strong>
                </span>
                {tipoPago === "credito" && (
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#dc2626",
                      marginTop: "4px",
                      fontWeight: "bold",
                    }}
                  >
                    ⚠️ Saldo Pendiente: ${Number(montoPendiente).toFixed(2)}
                  </div>
                )}
              </div>

              {/* PROXIMA CARGA */}
              {fechaProximaCarga && (
                <div style={ticketStyles.nextServiceBox}>
                  <span
                    style={{
                      fontSize: "10px",
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                      fontWeight: "bold",
                    }}
                  >
                    ⏰ Próxima Carga Sugerida
                  </span>
                  <div
                    style={{
                      fontSize: "18px",
                      fontWeight: "bold",
                      marginTop: "5px",
                      color: "#047857",
                    }}
                  >
                    {formatDateFriendly(fechaProximaCarga)}
                  </div>
                </div>
              )}
            </div>

            {/* PIE DE PAGINA */}
            <div style={ticketStyles.footer}>
              {listaBancos.length > 0 && (
                <div style={ticketStyles.bankSection}>
                  <div
                    style={{
                      fontWeight: "800",
                      marginBottom: "8px",
                      fontSize: "11px",
                      color: "#4b5563",
                      textAlign: "center",
                    }}
                  >
                    — DATOS PARA TRANSFERENCIA —
                  </div>
                  {listaBancos.slice(0, 1).map((banco, idx) => (
                    <div
                      key={idx}
                      style={{
                        fontSize: "11px",
                        lineHeight: "1.6",
                        color: "#374151",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span>🏦 Banco:</span>
                        <strong>{banco.banco}</strong>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span>💳 CLABE:</span>
                        <strong>{banco.clave_int || banco.cuenta}</strong>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span>👤 Beneficiario:</span>
                        <strong>{banco.nom_responsable}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={ticketStyles.thankYou}>
                ¡GRACIAS POR SU PREFERENCIA!
              </div>

              <div
                style={{
                  fontSize: "9px",
                  color: "#9ca3af",
                  marginTop: "12px",
                  fontStyle: "italic",
                }}
              >
                Comprobante generado | {new Date().toLocaleTimeString()}
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

// ESTILOS EN JS PARA EL TICKET "VISTOSO"
const ticketStyles = {
  ticketContainer: {
    width: "480px",
    backgroundColor: "#ffffff",
    fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    color: "#334155",
    boxSizing: "border-box",
    overflow: "hidden",
    border: "1px solid #cbd5e1",
    borderBottom: "6px solid #2563eb", // Borde inferior de color
  },
  header: {
    background: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)", // Degradado azul intenso
    color: "#ffffff",
    padding: "30px 25px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    borderBottomLeftRadius: "20px",
    borderBottomRightRadius: "20px",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
  },
  logoContainer: {
    marginBottom: "15px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    filter: "drop-shadow(0 4px 3px rgba(0,0,0,0.3))",
  },
  companyName: {
    fontSize: "24px",
    fontWeight: "800",
    margin: "0 0 15px 0",
    letterSpacing: "1px",
    textTransform: "uppercase",
    textShadow: "0 2px 2px rgba(0,0,0,0.2)",
  },
  headerInfo: {
    display: "flex",
    gap: "10px",
    fontSize: "12px",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  headerBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: "5px 12px",
    borderRadius: "20px",
    backdropFilter: "blur(4px)",
    fontWeight: "600",
  },
  body: {
    padding: "25px",
  },
  cardSection: {
    marginBottom: "15px",
    border: "1px solid #f1f5f9",
    borderRadius: "12px",
    padding: "15px",
    backgroundColor: "#fff",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
  },
  sectionTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "10px",
    borderBottom: "1px dashed #e2e8f0",
    paddingBottom: "8px",
  },
  iconCircle: {
    width: "24px",
    height: "24px",
    backgroundColor: "#f1f5f9",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
  },
  sectionTitle: {
    fontSize: "11px",
    fontWeight: "800",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  clientName: {
    fontSize: "20px",
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: "4px",
  },
  clientAddress: {
    fontSize: "13px",
    color: "#64748b",
    lineHeight: "1.4",
  },
  rowDetail: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  label: {
    fontSize: "14px",
    color: "#64748b",
    fontWeight: "500",
  },
  value: {
    fontSize: "15px",
    fontWeight: "700",
    color: "#334155",
  },
  valueBigBlue: {
    fontSize: "18px",
    fontWeight: "800",
    color: "#2563eb",
  },
  totalBox: {
    backgroundColor: "#22c55e", // Verde brillante
    color: "#ffffff",
    borderRadius: "12px",
    padding: "15px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    margin: "20px 0",
    boxShadow: "0 4px 6px -1px rgba(34, 197, 94, 0.4)",
  },
  paymentInfo: {
    backgroundColor: "#f8fafc",
    padding: "12px",
    borderRadius: "8px",
    textAlign: "center",
    fontSize: "13px",
    color: "#475569",
    border: "1px solid #e2e8f0",
  },
  nextServiceBox: {
    marginTop: "15px",
    backgroundColor: "#ecfdf5",
    color: "#065f46",
    padding: "12px",
    borderRadius: "8px",
    textAlign: "center",
    border: "1px dashed #10b981",
  },
  footer: {
    backgroundColor: "#f8fafc",
    padding: "25px",
    textAlign: "center",
    borderTop: "1px solid #e2e8f0",
  },
  thankYou: {
    fontSize: "14px",
    fontWeight: "900",
    color: "#334155",
    textTransform: "uppercase",
    letterSpacing: "2px",
    marginTop: "20px",
  },
  bankSection: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    padding: "15px",
    borderRadius: "10px",
    textAlign: "left",
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
  },
};
