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

  // ESTADOS DEL DÍA:
  // "CERRADO": Todo finalizado (o nunca iniciado). Botón "Nuevo Día" activo.
  // "INICIADO": Nuevo día guardado, campos iniciales llenos, final null. Botón "Fin Día" activo.
  // "TERMINADO": Fin día guardado (campos llenos en porcentaje_diario), pero falta reporte_diario. Botón "Actividades Planta" activo.
  const [estadoDelDia, setEstadoDelDia] = useState("CERRADO");
  const [activeTurnoId, setActiveTurnoId] = useState(null);
  const [selectedVenta, setSelectedVenta] = useState(null);
  const navigate = useNavigate();

  // ESTADOS PARA AGENDA Y SU MODAL
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
        `id_carga, consumo_litros, ret, monto_total, tipo_pago, id_porcentaje, casa_habitacion ( calle, numero, colonia )`
      )
      .eq("id_porcentaje", activeTurnoId); // FILTRO CLAVE: Solo ventas de este turno

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
  }, [activeTurnoId]); // Se re-ejecuta cuando cambia el ID del turno

  const fetchPagosDiarios = useCallback(async () => {
    // Si no hay turno activo, no mostramos pagos (igual que la lista diaria)
    if (!activeTurnoId) {
      setPagosDiarios([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("pagos")
        .select(`
          id,
          monto_pago,
          tipo_pago,
          fecha_pago,
          carga_casa (
            casa_habitacion ( calle, numero)
          )
        `)
        .eq("id_porcentaje", activeTurnoId); // FILTRO CLAVE: Solo pagos de este turno

      if (error) {
        console.error("Error fetching pagos diarios:", error);
        setPagosDiarios([]);
      } else {
        // Aplanamos un poco la estructura para facilitar el uso en DailySummary
        const pagosFormateados = data.map(p => ({
          ...p,
          nombre_cliente: p.carga_casa?.casa_habitacion?.nombre_cliente || "Cliente",
          apellidos_cliente: p.carga_casa?.casa_habitacion?.apellidos || ""
        }));
        setPagosDiarios(pagosFormateados);
      }
    } catch (err) {
      console.error(err);
    }
  }, [activeTurnoId]); // Dependencia: ID del turno

  // ----------------------------------------------------
  // FUNCIÓN: Verificar estado del Fin de Día (LÓGICA NUEVA)
  // ----------------------------------------------------
  const verificarEstadoFinDeDia = useCallback(async () => {
    try {
      // 1. Buscamos el ÚLTIMO registro de porcentaje
      const { data: ultimoRegistro, error: porError } = await supabase
        .from("porcentaje_diario")
        .select("*")
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (porError) {
        console.error(porError);
        return;
      }

      // Si no existe historial, todo nuevo
      if (!ultimoRegistro) {
        setEstadoDelDia("CERRADO");
        setActiveTurnoId(null);
        return;
      }

      // IMPORTANTE: Establecemos el ID del turno actual para filtrar las ventas
      // Independientemente de si está cerrado o abierto, queremos ver las ventas asociadas a este último registro hasta que se cree uno nuevo.
      setActiveTurnoId(ultimoRegistro.id);

      // 2. Lógica de estados en cadena
      if (ultimoRegistro.porcentaje_final === null) {
        // A) Día abierto, ventas en curso
        setEstadoDelDia("INICIADO");
        setRegistrador({ id: ultimoRegistro.registrador_id });
      } else {
        // B) Ventas cerradas, verificamos reporte final
        const { data: ultimoReporte, error: repError } = await supabase
          .from("reporte_diario")
          .select("finalizado")
          .order("id", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (repError) console.error(repError);

        if (ultimoReporte && ultimoReporte.finalizado === true) {
          setEstadoDelDia("CERRADO");
        } else {
          setEstadoDelDia("TERMINADO");
          setRegistrador({ id: ultimoRegistro.registrador_id });
        }
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

  // Lógica para abrir el modal correcto según el estado intermedio
  // Handler exclusivo para cerrar ventas (Paso 1 del cierre)
  const handleOpenFinDiaModal = () => setIsModalFinDiaOpen(true);

  // Handler exclusivo para actividades en planta (Paso 2 del cierre)
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

  const handleDiaGuardado = () => {
    refreshData();
    console.log("Acción de día registrada con éxito.");
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

      <section className="m-auto max-w-4xl p-4">
        <h2 className="font-extrabold flex justify-center text-3xl text-transparent bg-clip-text bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] my-3  transition-all duration-200 animate-pulse">
          Lista Diaria
        </h2>

        {/* CONTENEDOR DE BOTONES CON LÓGICA ESTRICTA */}
        <div className="flex flex-row items-center justify-center gap-4 mb-6 flex-wrap">
          {/* 1. BOTÓN NUEVO DÍA 
              Estado activo: Solo cuando todo el ciclo anterior terminó (CERRADO). */}
          <button
            onClick={handleOpenNuevoDiaModal}
            disabled={estadoDelDia !== "CERRADO"}
            className={`flex p-2 border gap-4 font-bold ${
              estadoDelDia === "CERRADO"
                ? "bg-green-600 text-white hover:bg-green-700 hover:cursor-pointer hover:-translate-y-0.5"
                : "bg-gray-300 text-gray-400 cursor-not-allowed border-gray-300"
            } border-black rounded-md shadow-sm transition-all duration-150`}
          >
            <Icon
              icon="line-md:moon-alt-to-sunny-outline-loop-transition"
              width="24"
            />
            Nuevo Día
          </button>

          {/* 2. BOTÓN FIN DE DÍA 
              Estado activo: Solo cuando el día está corriendo (INICIADO). 
              Se desactiva si ya se cerró (TERMINADO) o si no ha empezado (CERRADO). */}
          <button
            onClick={handleOpenFinDiaModal}
            disabled={estadoDelDia !== "INICIADO"}
            className={`flex p-2 border gap-4 font-bold ${
              estadoDelDia === "INICIADO"
                ? "bg-[#1e293b] text-white hover:bg-slate-700 hover:cursor-pointer hover:-translate-y-0.5"
                : "bg-gray-300 text-gray-400 cursor-not-allowed border-gray-300"
            } border-black rounded-md shadow-sm transition-all duration-150`}
          >
            <Icon icon="line-md:moon-twotone-loop" width="24" />
            Fin de Día
          </button>

          {/* 3. BOTÓN ACTIVIDADES EN PLANTA (NUEVO)
              Estado activo: Solo cuando se dio Fin de Día pero falta el reporte final (TERMINADO). */}
          <button
            onClick={handleOpenActividadesModal}
            disabled={estadoDelDia !== "TERMINADO"}
            className={`flex p-2 border gap-4 font-bold ${
              estadoDelDia === "TERMINADO"
                ? "bg-orange-600 text-white hover:bg-orange-700 hover:cursor-pointer hover:-translate-y-0.5 animate-pulse" // Animación para resaltar que es el siguiente paso
                : "bg-gray-300 text-gray-400 cursor-not-allowed border-gray-300"
            } border-black rounded-md shadow-sm transition-all duration-150`}
          >
            <Icon icon="mdi:factory" width="24" />
            Actividades Planta
          </button>

          {/* 4. BOTÓN NUEVA VENTA 
              Estado activo: Solo cuando el día está corriendo (INICIADO). */}
          <button
            onClick={handleOpenVentaModal}
            disabled={estadoDelDia !== "INICIADO"}
            className={`flex p-2 border gap-4 font-bold ${
              estadoDelDia === "INICIADO"
                ? "bg-[#6432e4] text-white hover:bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] hover:cursor-pointer hover:-translate-y-0.5"
                : "bg-gray-300 text-gray-400 cursor-not-allowed border-gray-300"
            } border-black rounded-md shadow-sm transition-all duration-150`}
          >
            <Icon icon="line-md:clipboard-plus-twotone" width="24" />
            Nueva Venta
          </button>
        </div>

        <div className="overflow-x-auto shadow-lg rounded-lg">
          <table className="min-w-full bg-black/10 border border-gray-500 overflow-hidden rounded-lg">
            <thead>
              <tr className="bg-linear-to-r from-blue-400 to-emerald-400 text-white ">
                <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                  Direccion
                </th>
                <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                  Consumo (Litros)
                </th>
                <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                  Ret
                </th>
                <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                  Monto Total
                </th>
                <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                  Tipo De Pago
                </th>
                <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {listaDiaria.length > 0 ? (
                listaDiaria.map((item, index) => (
                  <tr
                    key={item.id_carga || index}
                    className="hover:bg-blue-50 transition-all duration-150 "
                  >
                    <td className="py-3 px-6 text-left text-sm text-gray-500">
                      {item.calle} #{item.numero}, {item.colonia}
                    </td>
                    <td className="py-3 px-6 text-center whitespace-nowrap text-sm text-gray-700">
                      {item.consumo_litros} lts
                    </td>
                    <td className="py-3 px-6 text-center whitespace-nowrap text-sm text-gray-700">
                      {item.ret} lts
                    </td>
                    <td className="py-3 px-6 text-center whitespace-nowrap text-sm text-gray-700">
                      $ {item.monto_total}
                    </td>
                    <td className="py-3 px-6 text-center whitespace-nowrap text-sm text-gray-700">
                      {item.tipo_pago}
                    </td>
                    <td className="py-3 px-6 text-center whitespace-nowrap text-sm font-medium">
                      <div className="flex justify-center space-x-2">
                        <button
                          onClick={() => handleModify(item.id_carga)}
                          className=" text-green-600 hover:text-green-900 flex items-center gap-1 hover:cursor-pointer"
                        >
                          <Icon icon="line-md:edit-full-twotone" width="24" />{" "}
                          Modificar
                        </button>
                        <button
                          onClick={() => handleDelete(item.id_carga)}
                          className=" text-red-600 hover:text-red-900 flex items-center gap-1 hover:cursor-pointer"
                        >
                          <Icon
                            icon="line-md:close-circle-twotone"
                            width="24"
                          />{" "}
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="7"
                    className="py-4 px-4 text-center text-gray-500"
                  >
                    No hay datos en la lista diaria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <DailySummary listaDiaria={listaDiaria} pagosDiarios={pagosDiarios} />

      <ModalNuevaVenta
        isOpen={isModalVentaOpen}
        onClose={() => setIsModalVentaOpen(false)}
        venta={selectedVenta}
        onVentaGuardada={refreshData}
      />
      <ModalNuevoDia
        isOpen={isModalNuevoDiaOpen}
        onClose={() => setIsModalNuevoDiaOpen(false)}
        onDiaGuardado={handleDiaGuardado}
      />
      <ModalFinDia
        isOpen={isModalFinDiaOpen}
        onClose={() => setIsModalFinDiaOpen(false)}
        onDiaFinalizado={handleDiaGuardado}
        listaDiaria={listaDiaria}
        pagosDiarios={pagosDiarios}
        unidad={unidad}
      />
      <ModalFinDiaCompleto
        isOpen={isModalFinDiaCompletoOpen}
        onClose={() => setIsModalFinDiaCompletoOpen(false)}
        registrador={registrador}
        onDiaFinalizado={handleDiaGuardado}
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
      <ModalPersonal
        isOpen={isModalPersonalOpen}
        onClose={() => setIsModalPersonalOpen(false)}
        onSave={handlePersonalGuardado}
        appUser={appUser}
      />

      <section className="m-auto max-w-4xl p-4">
        <h2 className="font-extrabold flex justify-center text-3xl text-transparent bg-clip-text bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] my-3  transition-all duration-200 animate-pulse">
          Agenda
        </h2>
        <div className="flex justify-center mb-6 gap-4">
          <button
            onClick={() => {
              setSelectedAgendaItem(null);
              setIsModalAgendaOpen(true);
            }}
            className="flex items-center gap-2 py-2 px-4 bg-[#6432e4] text-white border-black rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 hover:bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] hover:text-white hover:-translate-y-0.5 transition-all duration-150 hover:cursor-pointer"
          >
            <Icon icon="mdi:calendar-plus" width="24" /> Agendar Nuevo Cliente
          </button>
        </div>
        <div className="overflow-x-auto shadow-lg rounded-lg">
          <table className="min-w-full bg-black/10 border border-gray-500 overflow-hidden rounded-lg">
            <thead>
              <tr className="bg-linear-to-r from-blue-400 to-emerald-400 text-white ">
                <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                  Cliente
                </th>
                <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                  Ubicación
                </th>
                <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                  Fecha Programada
                </th>
                <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                  Comentario
                </th>
                <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {agenda.length > 0 ? (
                agenda.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-blue-50 transition-all duration-150 "
                  >
                    <td className="py-3 px-6 text-center whitespace-nowrap font-medium text-gray-900">
                      {item.casa_habitacion.nombre_cliente}
                    </td>
                    <td className="py-3 px-6 text-left text-sm text-gray-500">
                      {item.casa_habitacion.calle} #
                      {item.casa_habitacion.numero},{" "}
                      {item.casa_habitacion.colonia}
                    </td>
                    <td className="py-3 px-6 text-center whitespace-nowrap text-sm text-gray-700">
                      {item.fecha_proxima_carga}
                    </td>
                    <td className="py-3 px-6 text-left text-sm text-gray-700">
                      {item.comentario || "Sin comentario"}
                    </td>
                    <td className="py-3 px-6 text-center whitespace-nowrap text-sm font-medium">
                      <div className="flex justify-center space-x-2">
                        <button
                          onClick={() => handleReagendar(item)}
                          className="text-green-600 hover:text-green-900 flex items-center gap-1 hover:cursor-pointer"
                        >
                          <Icon icon="mdi:calendar-edit" width="20" /> Reagendar
                        </button>
                        <button
                          onClick={() => handleDeleteAgenda(item.id)}
                          className="text-red-600 hover:text-red-900 flex items-center gap-1 hover:cursor-pointer"
                        >
                          <Icon
                            icon="line-md:close-circle-twotone"
                            width="24"
                          />{" "}
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="py-4 text-center text-gray-500">
                    No hay clientes pendientes de agendar para hoy o fechas
                    anteriores.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="m-auto max-w-4xl p-4">
        <h2 className="font-extrabold flex justify-center text-3xl text-transparent bg-clip-text bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] my-3  transition-all duration-200 animate-pulse">
          Agenda Edificios
        </h2>
        <div className="overflow-x-auto shadow-lg rounded-lg">
          <table className="min-w-full bg-black/10 border border-gray-500 overflow-hidden rounded-lg">
            <thead>
              <tr className="bg-linear-to-r from-blue-400 to-emerald-400 text-white ">
                <th className="py-2 px-4 border-b">Calle</th>
                <th className="py-2 px-4 border-b">Número</th>
                <th className="py-2 px-4 border-b">Colonia</th>
                <th className="py-2 px-4 border-b">Responsable</th>
              </tr>
            </thead>
            <tbody>
              {proximaCargaEdificios.length > 0 ? (
                proximaCargaEdificios.map((edificio, index) => (
                  <tr
                    key={edificio.id_edificio || index}
                    className="hover:bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] hover:text-white transition-all duration-300 hover:cursor-pointer"
                  >
                    <td className="py-2 px-4 border-b text-center">
                      {edificio.calle}
                    </td>
                    <td className="py-2 px-4 border-b text-center">
                      {edificio.numero}
                    </td>
                    <td className="py-2 px-4 border-b text-center">
                      {edificio.colonia}
                    </td>
                    <td className="py-2 px-4 border-b text-center">
                      {edificio.responsable_nombre}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="4"
                    className="py-4 px-4 text-center text-gray-500"
                  >
                    No hay cargas programadas para edificios.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

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
      <ModalFinDiaCompleto
        isOpen={isModalFinDiaCompletoOpen}
        onClose={() => setIsModalFinDiaCompletoOpen(false)}
        registrador={registrador}
        onDiaFinalizado={handleDiaGuardado}
        // --- PROPIEDADES NUEVAS PARA EL REPORTE ---
        listaDiaria={listaDiaria}
        pagosDiarios={pagosDiarios}
        unidad={unidad} // Pasamos la info de la unidad desde el contexto del dashboard
      />
    </main>
  );
};
