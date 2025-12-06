import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import IconNuevaVenta from "../../assets/img/icono nueva venta.png";
import IconNuevoCliente from "../../assets/img/icono nuevo cliente.png";
import IconIrACreditos from "../../assets/img/icono ir a creditos.png";
import IconIrAAdministracion from "../../assets/img/icono ir a administracion.png";

import { BtnImgSpan } from "../ui/BtnImgSpan";
import { supabase } from "../../supabaseClient";
import ModalNuevaVenta from "../ui/Modales/ModalNuevaVenta";
import ModalAgendarCliente from "../ui/Modales/ModalAgendarCliente";
import { ModalNuevoDia } from "../ui/Modales/ModalNuevoDia";
import { ModalFinDia } from "../ui/Modales/ModalFinDia";
import ModalFinDiaCompleto from "../ui/Modales/ModalFinDiaCompleto";
import { Icon } from "@iconify/react";
import { DailySummary } from "../ui/DailySummary";
import { useAuth } from "../../auth/useAuth";
import ModalPersonal from "../ui/Modales/ModalPersonal";
import ModalUnidad from "../ui/Modales/ModalUnidad";
import ModalBanco from "../ui/Modales/ModalBanco";
import ModalTarifa from "../ui/Modales/ModalTarifa";

export const MainDashboard = () => {
  const {
    personal,
    loadingPersonal,
    appUser,
    unidad,
    datosBancarios,
    tarifa,
    fetchUserData,
  } = useAuth();

  const [isModalPersonalOpen, setIsModalPersonalOpen] = useState(false);
  const [isModalUnidadOpen, setIsModalUnidadOpen] = useState(false);
  const [isModalBancoOpen, setIsModalBancoOpen] = useState(false);
  const [isModalTarifaOpen, setIsModalTarifaOpen] = useState(false);
  const [listaDiaria, setListaDiaria] = useState([]);
  const [pagosDiarios, setPagosDiarios] = useState([]);
  const [proximaCargaEdificios, setProximaCargaEdificios] = useState([]);
  const [isModalVentaOpen, setIsModalVentaOpen] = useState(false);
  const [isModalNuevoDiaOpen, setIsModalNuevoDiaOpen] = useState(false);
  const [isModalFinDiaOpen, setIsModalFinDiaOpen] = useState(false);
  const [isModalFinDiaCompletoOpen, setIsModalFinDiaCompletoOpen] =
    useState(false);

  const [estadoDelDia, setEstadoDelDia] = useState("CERRADO"); // CERRADO | INICIADO | TERMINADO
  const [activeTurnoId, setActiveTurnoId] = useState(null);
  const [selectedVenta, setSelectedVenta] = useState(null);
  const navigate = useNavigate();

  const [agenda, setAgenda] = useState([]);
  const [isModalAgendaOpen, setIsModalAgendaOpen] = useState(false);
  const [selectedAgendaItem, setSelectedAgendaItem] = useState(null);
  const [registrador, setRegistrador] = useState(null);

  useEffect(() => {
    if (!loadingPersonal) {
      if (!personal) setIsModalPersonalOpen(true);
      else if (!unidad) setIsModalUnidadOpen(true);
      else if (!datosBancarios) setIsModalBancoOpen(true);
      else if (!tarifa) setIsModalTarifaOpen(true);
    }
  }, [loadingPersonal, personal, unidad, datosBancarios, tarifa]);

  const handlePersonalGuardado = () => {
    setIsModalPersonalOpen(false);
    fetchUserData();
  };
  const handleUnidadGuardada = () => {
    setIsModalUnidadOpen(false);
    fetchUserData();
  };
  const handleBancoGuardado = () => {
    setIsModalBancoOpen(false);
    fetchUserData();
  };
  const handleTarifaGuardada = () => {
    setIsModalTarifaOpen(false);
    fetchUserData();
  };

  const fetchListaDiaria = useCallback(async () => {
    if (!activeTurnoId) {
      setListaDiaria([]);
      return;
    }

    const { data, error } = await supabase
      .from("carga_casa")
      .select(
        `id_carga, consumo_litros, ret, monto_total,tipo_pago_resto, monto_pendiente , tipo_pago, id_porcentaje, casa_habitacion ( calle, numero, colonia )`
      )
      .eq("id_porcentaje", activeTurnoId);

    if (error) console.error("Error fetching lista diaria:", error);
    else if (data) {
      const flattenedData = data.map((item) => ({
        ...item,
        calle: item.casa_habitacion?.calle,
        numero: item.casa_habitacion?.numero,
        colonia: item.casa_habitacion?.colonia,
      }));
      setListaDiaria(flattenedData);
    }
  }, [activeTurnoId]);

  const fetchPagosDiarios = useCallback(async () => {
    if (!activeTurnoId) {
      setPagosDiarios([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("pagos")
        .select(
          `
          id,
          monto_pago,
          tipo_pago,
          fecha_pago,
          carga_casa (
            casa_habitacion ( calle, numero, nombre_cliente)
          )
        `
        )
        // CORRECCIÓN AQUÍ: Usar "id_turno" en lugar de "id_porcentaje"
        .eq("id_turno", activeTurnoId);

      if (error) {
        console.error("Error fetching pagos diarios:", error);
        setPagosDiarios([]);
      } else {
        const pagosFormateados = data.map((p) => ({
          ...p,
          // Si es un abono de crédito, no tiene carga_casa, así que mostramos "Abono a Crédito"
          nombre_cliente:
            p.carga_casa?.casa_habitacion?.nombre_cliente || "Abono a Crédito",
          apellidos_cliente: "",
        }));
        setPagosDiarios(pagosFormateados);
      }
    } catch (err) {
      console.error(err);
    }
  }, [activeTurnoId]);

  const verificarEstadoFinDeDia = useCallback(async () => {
    try {
      const today = new Date().toLocaleDateString("fr-CA", {
        timeZone: "America/Mexico_City",
      });

      // 1. Buscamos si existe algún registro hoy
      const { data: ultimoRegistro, error: porError } = await supabase
        .from("porcentaje_diario")
        .select("*")
        .eq("fecha", today)
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (porError) {
        console.error(porError);
        return;
      }

      // CASO A: No hay registro hoy -> Día totalmente virgen/cerrado
      if (!ultimoRegistro) {
        setEstadoDelDia("CERRADO");
        setActiveTurnoId(null);
        return;
      }

      // CASO B: Sí hay registro. Verificamos si ya se cerró administrativamente (Reporte Diario)
      if (ultimoRegistro.porcentaje_final !== null) {
        // Ya tiene porcentaje final, checamos si ya se hizo el "Fin de Día Completo"
        const { data: ultimoReporte, error: repError } = await supabase
          .from("reporte_diario")
          .select("finalizado")
          .eq("fecha", today)
          .order("id", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (repError) console.error(repError);

        if (ultimoReporte && ultimoReporte.finalizado === true) {
          // --- ESTADO: CERRADO ---
          setEstadoDelDia("CERRADO");
          setActiveTurnoId(null); // Al estar cerrado, limpiamos el ID para que no salgan ventas
        } else {
          // --- ESTADO: TERMINADO (Llegada registrada, falta reporte) ---
          setEstadoDelDia("TERMINADO");
          setRegistrador({ id: ultimoRegistro.registrador_id });
          setActiveTurnoId(ultimoRegistro.id); // Aquí SÍ necesitamos el ID para ver datos
        }
      } else {
        // --- ESTADO: INICIADO (Turno abierto normal) ---
        setEstadoDelDia("INICIADO");
        setRegistrador({ id: ultimoRegistro.registrador_id });
        setActiveTurnoId(ultimoRegistro.id); // Aquí SÍ necesitamos el ID
      }
    } catch (error) {
      console.error("Error validando estado:", error);
    }
  }, []);

  const fetchAgenda = useCallback(async () => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const endOfToday = today.toISOString();

    const { data, error } = await supabase
      .from("agenda")
      .select(
        `id, fecha_proxima_carga, comentario, id_casa, casa_habitacion (nombre_cliente, calle, numero, colonia)`
      )
      .lte("fecha_proxima_carga", endOfToday)
      .order("fecha_proxima_carga", { ascending: true });

    if (error) console.error("Error fetching agenda:", error);
    else setAgenda(data);
  }, []);

  // Función para eliminar pago desde el Dashboard
  const handleDeletePago = async (id_pago) => {
    if (!confirm("⚠️ ¿Estás seguro de eliminar este abono?\n\nAl eliminarlo:\n1. Se borrará del corte del día.\n2. Se le regresará la deuda al cliente (si aplica).")) {
      return;
    }

    try {
      const { error } = await supabase.rpc("eliminar_pago_seguro", { p_id_pago: id_pago });
      if (error) throw error;
      
      alert("Abono eliminado correctamente.");
      fetchPagosDiarios(); // Refrescamos la lista
    } catch (error) {
      console.error(error);
      alert("Error eliminando: " + error.message);
    }
  };

  const refreshData = useCallback(() => {
    verificarEstadoFinDeDia();
    fetchPagosDiarios();
    fetchListaDiaria();
    fetchAgenda();
  }, [
    verificarEstadoFinDeDia,
    fetchPagosDiarios,
    fetchListaDiaria,
    fetchAgenda,
  ]);

  const handleReagendar = (item) => {
    setSelectedAgendaItem(item);
    setIsModalAgendaOpen(true);
  };

  const handleDeleteAgenda = async (id_agenda) => {
    if (
      !confirm(
        "¿Estás seguro de que quieres eliminar esta entrada de la agenda?"
      )
    )
      return;
    const { error } = await supabase
      .from("agenda")
      .delete()
      .eq("id", id_agenda);
    if (error) console.error("Error deleting agenda item:", error);
    else fetchAgenda();
  };

  useEffect(() => {
    const fetchClientes = async () => {
      await supabase.rpc("get_clientes_para_carga");
    };
    const fetchProximaCargaEdificio = async () => {
      const { data, error } = await supabase.rpc("get_prox_carga_edificio");
      if (!error) setProximaCargaEdificios(data);
    };

    fetchClientes();
    refreshData();
    fetchAgenda();
    fetchProximaCargaEdificio();
  }, [fetchAgenda, refreshData]);

  useEffect(() => {
    if (activeTurnoId) {
      fetchListaDiaria();
    } else {
      setListaDiaria([]);
    }
  }, [activeTurnoId, fetchListaDiaria]);

  const handleOpenVentaModal = () => setIsModalVentaOpen(true);
  const handleOpenNuevoDiaModal = () => setIsModalNuevoDiaOpen(true);
  const handleOpenFinDiaModal = () => setIsModalFinDiaOpen(true);
  const handleOpenActividadesModal = () => setIsModalFinDiaCompletoOpen(true);

  const handleModify = (id) => {
    const venta = listaDiaria.find((item) => item.id_carga === id);
    setSelectedVenta(venta);
    setIsModalVentaOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este registro?"))
      return;
    const { error } = await supabase
      .from("carga_casa")
      .delete()
      .eq("id_carga", id);
    if (error) console.log("Hubo un error al eliminar el registro.");
    else fetchListaDiaria();
  };

  // --- LÓGICA DE TRANSICIÓN DE ESTADOS ---
  const handleDiaGuardado = (abrirSiguientePaso = false) => {
    refreshData(); // Esto actualizará el estado a TERMINADO si se guardó la llegada
    if (abrirSiguientePaso) {
      setIsModalFinDiaOpen(false); // Cierra modal 1
      // Pequeño delay para asegurar que el estado se refresque y la UX sea suave
      setTimeout(() => {
        setIsModalFinDiaCompletoOpen(true); // Abre modal 2
      }, 300);
    }
  };

  const handleFinDiaCompletoGuardado = () => {
    setIsModalFinDiaCompletoOpen(false);
    refreshData(); // Esto actualizará el estado a CERRADO
  };

  const fixFecha = (fechaString) => {
    if (!fechaString) return new Date();
    const fecha = new Date(fechaString);
    const userTimezoneOffset = fecha.getTimezoneOffset() * 60000;
    return new Date(fecha.getTime() + userTimezoneOffset);
  };

  const getStatusFecha = (fechaString) => {
    const fechaAgenda = fixFecha(fechaString);
    const hoy = new Date();
    const fechaAgendaDate = new Date(
      fechaAgenda.getFullYear(),
      fechaAgenda.getMonth(),
      fechaAgenda.getDate()
    );
    const hoyDate = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    if (fechaAgendaDate < hoyDate) return "atrasado";
    return "hoy";
  };

  const formatMoney = (amount) =>
    Number(amount).toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
    });
  const getPaymentBadgeStyle = (tipo) => {
    switch (tipo.toLowerCase()) {
      case "efectivo":
        return "bg-green-100 text-green-700 border-green-200";
      case "transferencia":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "tarjeta":
        return "bg-blue-100 text-blue-700 border-blue-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  return (
    <main>
      <section className="hidden  justify-between m-auto p-8 hover:cursor-pointer max-w-[800px] sm:flex md:items-center ">
        <div onClick={() => navigate("/ventas")}>
          <BtnImgSpan text={"Ventas"} imagen={IconNuevaVenta} />
        </div>
        <div onClick={() => navigate("/clientes")}>
          <BtnImgSpan text={"Nuevo Cliente"} imagen={IconNuevoCliente} />
        </div>
        <div onClick={() => navigate("/creditos")}>
          <BtnImgSpan text={"Creditos"} imagen={IconIrACreditos} />
        </div>
        <div onClick={() => navigate("/administracion")}>
          <BtnImgSpan text={"Administracion"} imagen={IconIrAAdministracion} />
        </div>
      </section>

      {/* --- SECCIÓN LISTA DIARIA --- */}
      <section className="m-auto max-w-5xl p-4">
        <h2 className="font-extrabold flex justify-center text-3xl text-transparent bg-clip-text bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] my-3 transition-all duration-200 animate-pulse">
          Lista Diaria de Ventas
        </h2>

        {/* BOTONERA DE ACCIONES DEL DÍA */}
        <div className="flex flex-row items-center justify-center gap-3 mb-8 flex-wrap">
          <button
            onClick={handleOpenNuevoDiaModal}
            // Solo activo si ESTÁ TOTALMENTE CERRADO
            disabled={estadoDelDia !== "CERRADO"}
            className={`flex items-center gap-2 py-2 px-4 rounded-full font-bold shadow-md transition-all ${
              estadoDelDia === "CERRADO"
                ? "bg-green-600 text-white hover:bg-green-700 hover:-translate-y-1"
                : "bg-gray-200 text-gray-400 cursor-not-allowed opacity-50"
            }`}
          >
            <Icon icon="mdi:weather-sunny" width="20" /> Nuevo Día
          </button>

          <button
            onClick={handleOpenFinDiaModal}
            // Solo activo si está INICIADO (turno abierto)
            disabled={estadoDelDia !== "INICIADO"}
            className={`flex items-center gap-2 py-2 px-4 rounded-full font-bold shadow-md transition-all ${
              estadoDelDia === "INICIADO"
                ? "bg-slate-800 text-white hover:bg-slate-700 hover:-translate-y-1"
                : "bg-gray-200 text-gray-400 cursor-not-allowed opacity-50"
            }`}
          >
            <Icon icon="mdi:weather-night" width="20" /> Fin de Día
          </button>

          <button
            onClick={handleOpenActividadesModal}
            // Activo si está TERMINADO (llegada registrada, pero no reporte)
            // Opcional: También podrías permitirlo en INICIADO si quisieras registrar actividades antes de cerrar, pero tu flujo parece secuencial.
            disabled={estadoDelDia !== "TERMINADO"}
            className={`flex items-center gap-2 py-2 px-4 rounded-full font-bold shadow-md transition-all ${
              estadoDelDia === "TERMINADO"
                ? "bg-orange-600 text-white hover:bg-orange-700 hover:-translate-y-1 animate-pulse"
                : "bg-gray-200 text-gray-400 cursor-not-allowed opacity-50"
            }`}
          >
            <Icon icon="mdi:factory" width="20" /> Planta
          </button>

          <button
            onClick={handleOpenVentaModal}
            disabled={estadoDelDia !== "INICIADO"}
            className={`flex items-center gap-2 py-2 px-4 rounded-full font-bold shadow-md transition-all ${
              estadoDelDia === "INICIADO"
                ? "bg-[#6432e4] text-white hover:bg-indigo-600 hover:-translate-y-1"
                : "bg-gray-200 text-gray-400 cursor-not-allowed opacity-50"
            }`}
          >
            <Icon icon="mdi:plus-circle-outline" width="20" /> Nueva Venta
          </button>
        </div>

        {/* --- GRID DE TARJETAS DE VENTA --- */}
        {listaDiaria.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {listaDiaria.map((item, index) => (
              <div
                key={item.id_carga || index}
                className="bg-white rounded-xl shadow-sm hover:shadow-lg border border-gray-100 transition-all duration-200 overflow-hidden group"
              >
                {/* Encabezado: Dirección */}
                <div className="bg-slate-50 p-3 border-b border-gray-100 flex items-start gap-2">
                  <div className="mt-1 text-slate-400">
                    <Icon icon="mdi:map-marker" width="18" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-800 text-sm leading-tight">
                      {item.calle} #{item.numero}
                    </p>
                    <p className="text-xs text-gray-500 uppercase font-medium">
                      {item.colonia}
                    </p>
                  </div>
                </div>

                {/* Cuerpo: Detalles Financieros */}
                <div className="p-4">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">
                        Consumo
                      </p>
                      <div className="flex items-center gap-1 text-gray-700 font-semibold">
                        <Icon
                          icon="mdi:gas-station"
                          className="text-blue-500"
                        />
                        <span>{item.consumo_litros} Lts</span>
                      </div>
                      {Number(item.ret) > 0 && (
                        <div className="flex items-center gap-1 text-red-500 text-xs font-medium mt-1">
                          <Icon icon="mdi:gas-burner" />
                          <span>Ret: {item.ret} Lts</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">
                        Total
                      </p>
                      <p className="text-2xl font-black text-gray-800">
                        {formatMoney(item.monto_total)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <span
                      className={`px-2 py-1 rounded-md text-[10px] uppercase font-bold border ${getPaymentBadgeStyle(
                        item.tipo_pago
                      )}`}
                    >
                      {item.tipo_pago}
                    </span>
                  </div>
                </div>

                {/* Pie: Acciones */}
                <div className="grid grid-cols-2 divide-x divide-gray-100 border-t border-gray-100 bg-gray-50/50">
                  <button
                    onClick={() => handleModify(item.id_carga)}
                    className="py-3 flex items-center justify-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <Icon icon="mdi:pencil-outline" width="18" /> Editar
                  </button>
                  <button
                    onClick={() => handleDelete(item.id_carga)}
                    className="py-3 flex items-center justify-center gap-2 text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Icon icon="mdi:trash-can-outline" width="18" /> Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 px-4 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl">
            {estadoDelDia === "CERRADO" ? (
              <>
                <Icon
                  icon="mdi:store-clock-outline"
                  className="text-gray-300 w-16 h-16 mb-2"
                />
                <p className="text-gray-500 font-medium">
                  El turno está cerrado.
                </p>
                <button
                  onClick={handleOpenNuevoDiaModal}
                  className="mt-4 text-sm text-green-600 font-bold hover:underline"
                >
                  Iniciar Nuevo Día
                </button>
              </>
            ) : (
              <>
                <Icon
                  icon="mdi:clipboard-text-off-outline"
                  className="text-gray-300 w-16 h-16 mb-2"
                />
                <p className="text-gray-500 font-medium">
                  No hay ventas registradas en este turno aún.
                </p>
                <button
                  onClick={handleOpenVentaModal}
                  className="mt-4 text-sm text-indigo-600 font-bold hover:underline"
                >
                  ¡Registra la primera venta!
                </button>
              </>
            )}
          </div>
        )}
      </section>

      <DailySummary listaDiaria={listaDiaria} pagosDiarios={pagosDiarios} onDeletePago={handleDeletePago} />

      {/* ... SECCIÓN AGENDA (Sin cambios significativos, se mantiene igual) ... */}
      <section className="m-auto max-w-5xl p-4 mb-10">
        <h2 className="font-extrabold flex justify-center text-3xl text-transparent bg-clip-text bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] my-3 transition-all duration-200 animate-pulse">
          Agenda de Cargas
        </h2>
        {/* ... Resto del código de agenda ... */}
        <div className="flex justify-center mb-8 gap-4">
          <button
            onClick={() => {
              setSelectedAgendaItem(null);
              setIsModalAgendaOpen(true);
            }}
            className="flex items-center gap-2 py-3 px-6 bg-[#6432e4] text-white rounded-full shadow-lg hover:shadow-xl hover:bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] hover:-translate-y-1 transition-all duration-200 cursor-pointer font-bold"
          >
            <Icon icon="mdi:calendar-plus" width="24" /> Agendar Nuevo Cliente
          </button>
        </div>

        {agenda.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agenda.map((item) => {
              const status = getStatusFecha(item.fecha_proxima_carga);
              const fechaVisual = fixFecha(item.fecha_proxima_carga);
              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl p-5 shadow-md border hover:shadow-xl transition-all duration-300 relative overflow-hidden group
                    ${
                      status === "atrasado"
                        ? "border-l-4 border-l-red-500"
                        : "border-l-4 border-l-green-500"
                    }
                  `}
                >
                  <div
                    className={`absolute top-4 right-4 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider
                      ${
                        status === "atrasado"
                          ? "bg-red-100 text-red-600"
                          : "bg-green-100 text-green-600"
                      }
                  `}
                  >
                    {status === "atrasado" ? "Atrasado" : "Para Hoy"}
                  </div>

                  <div className="flex items-start gap-4 mb-3">
                    <div className="bg-blue-50 p-3 rounded-full text-blue-600">
                      <Icon icon="mdi:user" width="24" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 text-lg leading-tight">
                        {item.casa_habitacion.nombre_cliente}
                      </h3>
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <Icon icon="mdi:map-marker" width="12" />
                        {item.casa_habitacion.colonia}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded-md flex items-start gap-2">
                      <Icon
                        icon="mdi:home-map-marker"
                        className="mt-0.5 text-gray-400 min-w-4"
                      />
                      <span>
                        {item.casa_habitacion.calle} #
                        {item.casa_habitacion.numero}
                      </span>
                    </p>
                    {item.comentario && (
                      <p className="text-sm text-orange-600 bg-orange-50 p-2 rounded-md flex items-start gap-2 italic border border-orange-100">
                        <Icon
                          icon="mdi:comment-text-outline"
                          className="mt-0.5 min-w-4"
                        />
                        <span>"{item.comentario}"</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    <span className="text-xs font-semibold text-gray-500">
                      {fechaVisual.toLocaleDateString("es-MX", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReagendar(item)}
                        className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <Icon icon="mdi:calendar-edit" width="20" />
                      </button>
                      <button
                        onClick={() => handleDeleteAgenda(item.id)}
                        className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        <Icon icon="mdi:trash-can-outline" width="20" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-10 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <Icon
              icon="mdi:calendar-blank-outline"
              width="64"
              className="text-gray-300 mb-4"
            />
            <p className="text-gray-500 font-medium text-center">
              No hay clientes pendientes.
            </p>
          </div>
        )}
      </section>

      {/* SECCION EDIFICIOS (Sin cambios) */}
      <section className="m-auto max-w-4xl p-4">
        {/* ... tabla edificios ... */}
      </section>

      {/* MODALES */}
      <ModalNuevaVenta
        isOpen={isModalVentaOpen}
        onClose={() => setIsModalVentaOpen(false)}
        venta={selectedVenta}
        onVentaGuardada={refreshData}
        tarifa={tarifa} // <--- Esto arreglará el precio en 0
        unidad={unidad} // Necesario para el Ticket
        datosBancarios={datosBancarios} // Necesario para el Ticket
        user={appUser} // Necesario si usas datos del usuario
        idTurnoExterno={activeTurnoId}
      />
      <ModalNuevoDia
        isOpen={isModalNuevoDiaOpen}
        onClose={() => setIsModalNuevoDiaOpen(false)}
        onDiaGuardado={() => handleDiaGuardado(false)} // Nuevo día solo refresca
      />

      {/* AQUÍ EL CAMBIO IMPORTANTE: FinDia controla su cierre y la apertura del siguiente */}
      <ModalFinDia
        isOpen={isModalFinDiaOpen}
        onClose={() => setIsModalFinDiaOpen(false)}
        onDiaFinalizado={(requiereActividades) =>
          handleDiaGuardado(requiereActividades)
        }
        listaDiaria={listaDiaria}
        pagosDiarios={pagosDiarios}
        unidad={unidad}
        idTurno={activeTurnoId} // <--- AGREGADO: Pasamos el ID exacto
      />

      {/* FinDiaCompleto es independiente ahora */}
      <ModalFinDiaCompleto
        isOpen={isModalFinDiaCompletoOpen}
        onClose={() => setIsModalFinDiaCompletoOpen(false)}
        registrador={registrador}
        onDiaFinalizado={handleFinDiaCompletoGuardado}
        listaDiaria={listaDiaria}
        pagosDiarios={pagosDiarios}
        unidad={unidad}
        idTurno={activeTurnoId} // <--- AGREGADO: Pasamos el ID exacto
      />

      <ModalAgendarCliente
        isOpen={isModalAgendaOpen}
        onClose={() => setIsModalAgendaOpen(false)}
        agendaItem={selectedAgendaItem}
        onAgendaGuardada={() => {
          fetchAgenda();
          setSelectedAgendaItem(null);
        }}
      />

      {/* Otros modales de configuración */}
      <ModalPersonal
        isOpen={isModalPersonalOpen}
        onClose={() => setIsModalPersonalOpen(false)}
        onSave={handlePersonalGuardado}
        appUser={appUser}
      />
      <ModalUnidad
        isOpen={isModalUnidadOpen}
        onClose={() => setIsModalUnidadOpen(false)}
        onSave={handleUnidadGuardada}
      />
      <ModalBanco
        isOpen={isModalBancoOpen}
        onClose={() => setIsModalBancoOpen(false)}
        onSave={handleBancoGuardado}
      />
      <ModalTarifa
        isOpen={isModalTarifaOpen}
        onClose={() => setIsModalTarifaOpen(false)}
        onSave={handleTarifaGuardada}
      />
    </main>
  );
};
