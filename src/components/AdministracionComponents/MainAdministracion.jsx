import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../supabaseClient";
import { Titulo } from "../ui/Titulo";
import { Link } from "react-router-dom";
import { Icon } from "@iconify/react";
import ModalContrato from "../ui/Modales/ModalContrato";
import ModalNuevoEdificio from "../ui/Modales/ModalNuevoEdificio";
import ModalNuevaCarga from "../ui/Modales/ModalNuevaCarga";
import ModalNuevoDepartamento from "../ui/Modales/ModalNuevoDepartamento";
import ModalNuevaLectura from "../ui/Modales/ModalNuevaLectura";
import { ModalNuevoPagoEdificio } from "../ui/Modales/ModalNuevoPagoEdificio";
import ModalFacturacion from "../ui/Modales/ModalFacturacion";
import ModalGenerarFactura from "../ui/Modales/ModalGenerarFactura";

export const MainAdministracion = () => {
  const [edificios, setEdificios] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [facturas, setFacturas] = useState([]);
  const [cargasEdificio, setCargasEdificio] = useState([]);
  const [cargandoEdificios, setCargandoEdificios] = useState(false);
  const [lecturas, setLecturas] = useState([]);
  const [cargandoDepartamentos, setCargandoDepartamentos] = useState(false);
  const [cargandoFacturas, setCargandoFacturas] = useState(false);
  const [cargandoCargasEdificio, setCargandoCargasEdificio] = useState(false);
  const [cargandoLecturas, setCargandoLecturas] = useState(false);
  const [error, setError] = useState(null);
  const [selectedEdificio, setSelectedEdificio] = useState(null);
  const [selectedDepartamento, setSelectedDepartamento] = useState(null);
  const [selectedFactura, setSelectedFactura] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchTermFacturas, setSearchTermFacturas] = useState("");
  const [deptosConDeuda, setDeptosConDeuda] = useState(new Set());

  // Estados para los modales
  const [isContratoModalOpen, setIsContratoModalOpen] = useState(false);
  const [isEdificioModalOpen, setIsEdificioModalOpen] = useState(false);
  const [isCargaModalOpen, setIsCargaModalOpen] = useState(false);
  const [isDepartamentoModalOpen, setIsDepartamentoModalOpen] = useState(false);
  const [isLecturaModalOpen, setIsLecturaModalOpen] = useState(false);
  const [isPagoModalOpen, setIsPagoModalOpen] = useState(false);
  const [isFacturaModalOpen, setIsFacturaModalOpen] = useState(false);
  const [isGenerarFacturaModalOpen, setIsGenerarFacturaModalOpen] =
    useState(false);
  const [lecturaParaEditar, setLecturaParaEditar] = useState(null);
  const [edificioParaEditar, setEdificioParaEditar] = useState(null);
  const [departamentoParaEditar, setDepartamentoParaEditar] = useState(null);

  const [nuevoContrato, setNuevoContrato] = useState(null);

  const fetchEdificios = useCallback(async () => {
    setCargandoEdificios(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from("edificio")
        .select(
          "id_edificio, responsable_nombre, calle, numero, colonia, delegacion, responsable_telefono, id_contrato, estado"
        )
        .eq("estado", true);

      if (queryError) {
        throw new Error(
          queryError.message || "Error al obtener los edificios."
        );
      }

      setEdificios(data || []);
    } catch (err) {
      setError(err.message);
      setEdificios([]);
    } finally {
      setCargandoEdificios(false);
    }
  }, []);

  useEffect(() => {
    fetchEdificios();
  }, [fetchEdificios]);

  const handleOpenGenerarFacturaModal = (depto) => {
    setSelectedDepartamento(depto);
    setIsGenerarFacturaModalOpen(true);
  };

  const handleFacturaGenerada = () => {
    setIsGenerarFacturaModalOpen(false);
    if (selectedEdificio) {
      fetchFacturas(selectedEdificio.id_edificio);
    }
  };

  const handleCloseGenerarFacturaModal = () => {
    setIsGenerarFacturaModalOpen(false);
  };

  const handleOpenNuevaLecturaModal = () => {
    setLecturaParaEditar(null);
    setIsLecturaModalOpen(true);
  };

  const handleOpenEditarLecturaModal = (lectura) => {
    setLecturaParaEditar(lectura);
    setIsLecturaModalOpen(true);
  };

  const handleLecturaGuardada = () => {
    setIsLecturaModalOpen(false);
    setLecturaParaEditar(null);
    if (selectedDepartamento) {
      fetchLecturas(selectedDepartamento.id_departamento);
    }
  };

  const handleInhabilitarEdificio = async (id_edificio) => {
    if (window.confirm("¿Está seguro de que desea inhabilitar este edificio?")) {
      try {
        const { error } = await supabase
          .from("edificio")
          .update({ estado: false })
          .eq("id_edificio", id_edificio);

        if (error) throw error;

        fetchEdificios();
      } catch (error) {
        alert("Error al inhabilitar el edificio: " + error.message);
      }
    }
  };

  const handleOpenEditarDepartamentoModal = (depto) => {
    setDepartamentoParaEditar(depto);
    setIsDepartamentoModalOpen(true);
  };

  // Handlers para el flujo de nuevo edificio
  const handleOpenContratoModal = () => {
    setIsContratoModalOpen(true);
  };

  const handleContratoSave = (contrato) => {
    setNuevoContrato(contrato);
    setIsContratoModalOpen(false);
    setIsEdificioModalOpen(true);
  };

  const handleOpenEditarEdificioModal = (edificio) => {
    setEdificioParaEditar(edificio);
    setIsEdificioModalOpen(true);
  };

  const handleEdificioGuardado = () => {
    fetchEdificios(); // Refresca la lista de edificios
    setEdificioParaEditar(null);
  };

  // Handlers para el flujo de nueva carga
  const handleOpenCargaModal = () => {
    if (!selectedEdificio) {
      alert("Por favor, seleccione un edificio de la lista.");
      return;
    }
    setIsCargaModalOpen(true);
  };

  const handleCargaGuardada = () => {
    setIsCargaModalOpen(false);
    if (selectedEdificio) {
      fetchFacturas(selectedEdificio.id_edificio);
    }
  };

  // Handlers para el flujo de nuevo departamento
  const handleOpenDepartamentoModal = () => {
    setIsDepartamentoModalOpen(true);
  };

  const handleDepartamentoGuardado = () => {
    setIsDepartamentoModalOpen(false);
    if (selectedEdificio) {
      fetchDepartamentos(selectedEdificio.id_edificio);
    }
    setDepartamentoParaEditar(null);
  };

  const handleOpenPagoModal = () => {
    setIsPagoModalOpen(true);
  };

  const handlePagoGuardado = () => {
    setIsPagoModalOpen(false);
    if (selectedEdificio) {
      fetchFacturas(selectedEdificio.id_edificio);
    }
  };

  const fetchDepartamentos = async (id_edificio) => {
    if (!id_edificio) {
      setDepartamentos([]);
      return;
    }
    setCargandoDepartamentos(true);
    try {
      const { data, error: queryError } = await supabase
        .from("departamento")
        .select(
          "id_departamento, no_depto, titular_depto, telefono_depto, id_edificio, edificio(*)"
        )
        .eq("id_edificio", id_edificio);
      if (queryError) throw new Error(queryError.message);
      setDepartamentos(data || []);
    } catch (err) {
      setError(err.message);
      setDepartamentos([]);
    } finally {
      setCargandoDepartamentos(false);
    }
  };

  const fetchLecturas = async (id_departamento) => {
    if (!id_departamento) {
      setLecturas([]);
      return;
    }
    setCargandoLecturas(true);
    try {
      const { data, error: queryError } = await supabase
        .from("lectura")
        .select("id_lectura, fecha_lectura, valor_lectura")
        .eq("id_departamento", id_departamento)
        .order("fecha_lectura", { ascending: false })
        .limit(6);
      if (queryError) throw new Error(queryError.message);
      setLecturas(data || []);
    } catch (err) {
      setError(err.message);
      setLecturas([]);
    } finally {
      setCargandoLecturas(false);
    }
  };

  const fetchFacturas = async (id_edificio) => {
    if (!id_edificio) {
      setFacturas([]);
      return;
    }
    setCargandoFacturas(true);
    setError(null); // Clear previous errors

    try {
      // Step 1: Get department IDs for the building
      const { data: deptosData, error: deptosError } = await supabase
        .from("departamento")
        .select("id_departamento")
        .eq("id_edificio", id_edificio);

      if (deptosError) {
        throw new Error(
          deptosError.message || "Error al obtener los departamentos."
        );
      }

      const deptoIds = deptosData.map((d) => d.id_departamento);

      if (deptoIds.length === 0) {
        setFacturas([]);
        setDeptosConDeuda(new Set());
        return; // No departments, so no invoices
      }

      // Step 2: Get invoices for those department IDs
      const { data, error: queryError } = await supabase
        .from("factura_departamento")
        .select(
          `
          id_factura, 
          fecha_factura, 
          monto, 
          estado_pago, 
          url,
          departamento_id,
          saldo_por_pagar,
          consumo_lectura,
          departamento ( no_depto )
        `
        )
        .in("departamento_id", deptoIds);

      if (queryError) {
        throw new Error(queryError.message || "Error al obtener las facturas.");
      }

      const facturasData = data || [];
      setFacturas(facturasData);

      const deudores = new Set();
      facturasData.forEach((factura) => {
        if (!factura.estado_pago) {
          deudores.add(factura.departamento_id);
        }
      });
      setDeptosConDeuda(deudores);
    } catch (err) {
      setError(err.message);
      setFacturas([]);
    } finally {
      setCargandoFacturas(false);
    }
  };

  const handleEdificioClick = (edificio) => {
    if (
      selectedEdificio &&
      selectedEdificio.id_edificio === edificio.id_edificio
    ) {
      setSelectedEdificio(null);
      setSelectedDepartamento(null);
      setDepartamentos([]);
      setLecturas([]);
      setDeptosConDeuda(new Set());
    } else {
      setSelectedEdificio(edificio);
      setSelectedDepartamento(null);
      setLecturas([]);
      fetchDepartamentos(edificio.id_edificio);
      fetchFacturas(edificio.id_edificio);
      fetchCargasEdificio(edificio.id_edificio); // Llamada a la nueva función
    }
  };

  const fetchCargasEdificio = async (id_edificio) => {
    if (!id_edificio) {
      setCargasEdificio([]);
      return;
    }
    setCargandoCargasEdificio(true);
    try {
      const { data, error: queryError } = await supabase
        .from("carga_edificio")
        .select("fecha_carga, consumo_litros, monto_total")
        .eq("id_edificio", id_edificio);

      if (queryError) throw new Error(queryError.message);
      setCargasEdificio(data || []);
    } catch (err) {
      setError(err.message);
      setCargasEdificio([]);
    } finally {
      setCargandoCargasEdificio(false);
    }
  };

  const handleDepartamentoClick = (departamento) => {
    if (
      selectedDepartamento &&
      selectedDepartamento.id_departamento === departamento.id_departamento
    ) {
      setSelectedDepartamento(null);
      setLecturas([]);
    } else {
      setSelectedDepartamento(departamento);
      fetchLecturas(departamento.id_departamento);
    }
  };

  const filteredEdificios = edificios.filter(
    (edificio) =>
      (edificio.responsable_nombre?.toLowerCase() || "").includes(
        searchTerm.toLowerCase()
      ) ||
      (edificio.calle?.toLowerCase() || "").includes(
        searchTerm.toLowerCase()
      ) ||
      (edificio.colonia?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  const filteredFacturas = facturas.filter((factura) => {
    if (!searchTermFacturas) return true;
    const fecha = new Date(factura.fecha_factura);
    const mes = fecha
      .toLocaleString("default", { month: "long" })
      .toLowerCase();
    return mes.includes(searchTermFacturas.toLowerCase());
  });

  return (
    <main>
      <Titulo Texto="Administración" />

      <section className="m-auto max-w-7xl p-4">
        <div className="flex flex-col items-center gap-2 bg-white shadow-2xl rounded-4xl p-4 md:flex-row md:justify-between md:items-center transition-all duration-200">
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <input
              type="text"
              placeholder="Buscar por responsable, calle, colonia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="p-2 border bg-[#ad9ade] text-white border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 hover:cursor-pointer hover:bg-white hover:text-black/70 transition-all duration-300 min-w-[400px]"
            />
          </div>
          <div className="flex flex-col-reverse items-center gap-2 md:flex-row">
            <Link
              to="/dashboard"
              className="flex bg-[#6432e4] text-white items-center gap-2 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 hover:bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] hover:text-white hover:-translate-y-0.5 transition-all duration-300 hover:cursor-pointer"
            >
              <Icon icon="line-md:arrow-left-circle-twotone" width="24" />
              Regresar
            </Link>
            <button
              onClick={handleOpenContratoModal}
              className="flex bg-[#6432e4] text-white items-center gap-2 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 hover:bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] hover:text-white hover:-translate-y-0.5 transition-all duration-300 hover:cursor-pointer"
            >
              <Icon icon="solar:buildings-2-bold-duotone" width="24" />
              Agregar Nuevo Edificio
            </button>
            <button
              onClick={handleOpenCargaModal}
              disabled={!selectedEdificio}
              className="flex p-2 bg-[#6432e4] text-white items-center gap-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 hover:bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] hover:text-white hover:-translate-y-0.5 transition-all duration-300 hover:cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <Icon icon="line-md:clipboard-plus-twotone" width="24" />
              Agregar Nueva Carga
            </button>
          </div>
        </div>

        <Titulo Texto="Lista de Edificios" />

        <div className="overflow-x-auto shadow-lg rounded-lg">
          <table className="min-w-full bg-black/10 border border-gray-500 overflow-hidden rounded-lg">
            <thead>
              <tr className="bg-linear-to-r from-blue-400 to-emerald-400 text-white ">
                <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                  ID
                </th>
                <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                  Responsable
                </th>
                <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                  Direccion
                </th>

                <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                  Teléfono
                </th>
                <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody>
              {cargandoEdificios ? (
                <tr>
                  <td
                    colSpan="8"
                    className="py-4 px-4 text-center text-gray-600"
                  >
                    Cargando...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan="8"
                    className="py-4 px-4 text-center text-red-500"
                  >
                    Error: {error}
                  </td>
                </tr>
              ) : filteredEdificios.length > 0 ? (
                filteredEdificios.map((edificio) => (
                  <tr
                    key={edificio.id_edificio}
                    onClick={() => handleEdificioClick(edificio)}
                    className={`hover:bg-blue-50 transition-all duration-150 cursor-pointer ${
                      selectedEdificio?.id_edificio === edificio.id_edificio
                        ? "bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] text-white"
                        : ""
                    }`}
                  >
                    <td className="py-3 px-6 text-left text-sm text-gray-500">
                      {edificio.id_edificio}
                    </td>
                    <td className="py-3 px-6 text-center whitespace-nowrap text-sm text-gray-800">
                      {edificio.responsable_nombre}
                    </td>
                    <td className="py-3 px-6 text-center whitespace-nowrap text-sm text-gray-900">
                      {edificio.calle} #{edificio.numero}, {edificio.colonia},{" "}
                      {edificio.delegacion}
                    </td>

                    <td className="py-3 px-6 text-center whitespace-nowrap text-sm text-gray-700">
                      {edificio.responsable_telefono}
                    </td>
                    <td className="py-2 px-4 text-center">
                      <div className="flex justify-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditarEdificioModal(edificio);
                          }}
                          className=" text-green-600 hover:text-green-900 flex items-center gap-1 hover:cursor-pointer"
                        >
                          <Icon icon="line-md:edit-full-twotone" width="24" />
                          Modificar
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInhabilitarEdificio(edificio.id_edificio);
                          }}
                          className=" text-red-600 hover:text-red-900 flex items-center gap-1 hover:cursor-pointer"
                        >
                          <Icon icon="line-md:person-off-twotone" width="24" />
                          Inhabilitar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="8"
                    className="py-4 px-4 text-center text-gray-500"
                  >
                    No hay edificios registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {selectedEdificio && (
          <section className="mt-8">
            <div className="flex flex-col m-6 items-center gap-2 bg-white shadow-2xl rounded-4xl p-4 md:flex-row md:justify-start md:items-center transition-all duration-300">
              <button
                onClick={handleOpenDepartamentoModal}
                className="flex p-2 border gap-4 m-3 font-bold bg-[#6432e4] text-white  border-black rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 hover:bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] hover:text-white hover:-translate-y-0.5 transition-all duration-150 hover:cursor-pointer"
              >
                <Icon icon="line-md:home-twotone" width="24" />
                Agregar Departamento
              </button>

              <button
                onClick={handleOpenNuevaLecturaModal}
                disabled={!selectedDepartamento}
                className="flex gap-4 p-2 border bg-[#6432e4] text-white  border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 hover:bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] hover:text-white hover:-translate-y-0.5 transition-all duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <Icon icon="line-md:clipboard-check-twotone" width="24" />
                Nueva Lectura
              </button>
            </div>

            <h3 className="font-bold flex justify-center text-2xl text-transparent bg-clip-text bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] my-8 hover:scale-105 transition-all duration-200 animate-pulse">
              Departamentos del Edificio: {selectedEdificio.calle} #
              {selectedEdificio.numero}, {selectedEdificio.colonia}
            </h3>
            <div className="overflow-x-auto shadow-lg rounded-lg">
              <table className="min-w-full bg-black/10 border border-gray-500 overflow-hidden rounded-lg">
                <thead>
                  <tr className="bg-linear-to-r from-blue-400 to-emerald-400 text-white ">
                    <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                      ID
                    </th>
                    <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                      No. Depto
                    </th>
                    <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                      Titular
                    </th>
                    <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                      Teléfono
                    </th>
                    <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cargandoDepartamentos ? (
                    <tr>
                      <td
                        colSpan="5"
                        className="py-4 px-4 text-center text-gray-600"
                      >
                        Cargando...
                      </td>
                    </tr>
                  ) : departamentos.length > 0 ? (
                    departamentos.map((depto) => (
                      <tr
                        key={depto.id_departamento}
                        onClick={() => handleDepartamentoClick(depto)}
                        className={`transition-all duration-300 cursor-pointer 
                          ${
                            selectedDepartamento?.id_departamento ===
                            depto.id_departamento
                              ? "bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] text-white"
                              : deptosConDeuda.has(depto.id_departamento)
                              ? "bg-linear-to-r from-pink-500 via-red-500 to-yellow-500"
                              : ""
                          }
                          hover:bg-blue-50 transition-all duration-150 hover:cursor-pointer
                        `}
                      >
                        <td className="py-3 px-6 text-left text-sm text-gray-500">
                          {depto.id_departamento}
                        </td>
                        <td className="py-3 px-6 text-center whitespace-nowrap text-sm text-gray-800">
                          {depto.no_depto}
                        </td>
                        <td className="py-3 px-6 text-center whitespace-nowrap text-sm text-gray-700">
                          {depto.titular_depto}
                        </td>
                        <td className="py-3 px-6 text-center whitespace-nowrap text-sm text-gray-700">
                          {depto.telefono_depto}
                        </td>
                        <td className="py-2 px-4 text-center">
                          <div className="flex justify-center space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditarDepartamentoModal(depto);
                              }}
                              className="bg-yellow-500 text-white flex items-center gap-2 px-3 py-1 rounded hover:bg-yellow-600 mr-2 hover:cursor-pointer hover:-translate-y-0.5 transition-all duration-150"
                            >
                              <Icon
                                icon="line-md:edit-full-twotone"
                                width="24"
                              />
                              Modificar
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenGenerarFacturaModal(depto);
                              }}
                              className="bg-green-500 text-white flex items-center gap-2 px-3 py-1 rounded hover:bg-green-600 hover:cursor-pointer hover:-translate-y-0.5 transition-all duration-150"
                            >
                              <Icon
                                icon="line-md:document-report-twotone"
                                width="24"
                              />
                              Factura
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="5"
                        className="py-4 px-4 text-center text-gray-500"
                      >
                        No hay departamentos registrados para este edificio.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-8">
              <h3 className="font-bold flex justify-center text-2xl text-transparent bg-clip-text bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] my-8 hover:scale-105 transition-all duration-200 animate-pulse">
                Facturas del Edificio
              </h3>
              <div className="flex flex-col m-8  items-center gap-2 bg-white shadow-2xl rounded-4xl p-4 md:flex-row md:justify-between  md:items-center transition-all duration-200">
                <input
                  type="text"
                  placeholder="Buscar por mes (e.g., 'noviembre')"
                  value={searchTermFacturas}
                  onChange={(e) => setSearchTermFacturas(e.target.value)}
                  className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 hover:bg-[#6432e4] hover:text-white min-w-[400px]"
                />
                <button
                  onClick={handleOpenPagoModal}
                  disabled={!selectedFactura}
                  className="flex gap-4 p-2 border bg-[#6432e4] text-white  border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 hover:bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] hover:text-white hover:-translate-y-0.5 transition-all duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Nuevo Pago
                </button>
              </div>
              <div className="overflow-x-auto shadow-lg rounded-lg">
                <table className="min-w-full bg-black/10 border border-gray-500 overflow-hidden rounded-lg">
                  <thead>
                    <tr className="bg-linear-to-r from-blue-400 to-emerald-400 text-white ">
                      <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                        ID Factura
                      </th>
                      <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                        No. Depto
                      </th>
                      <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                        Monto
                      </th>
                      <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                        Saldo por Pagar
                      </th>
                      <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                        Recibo
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {cargandoFacturas ? (
                      <tr>
                        <td
                          colSpan="7"
                          className="py-4 px-4 text-center text-gray-600"
                        >
                          Cargando...
                        </td>
                      </tr>
                    ) : filteredFacturas.length > 0 ? (
                      filteredFacturas.map((factura) => (
                        <tr
                          key={factura.id_factura}
                          onClick={() => setSelectedFactura(factura)}
                          className={`hover:bg-blue-50 transition-all duration-150 hover:cursor-pointer ${
                            selectedFactura?.id_factura === factura.id_factura
                              ? "bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] text-white"
                              : ""
                          }`}
                        >
                          <td className="py-3 px-6 text-left text-sm ">
                            {factura.id_factura}
                          </td>
                          <td className="py-2 px-4 text-center">
                            {factura.departamento.no_depto}
                          </td>
                          <td className="py-3 px-6 text-center whitespace-nowrap text-sm ">
                            {new Date(
                              factura.fecha_factura
                            ).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-6 text-center whitespace-nowrap text-sm ">
                            $ {factura.monto}
                          </td>
                          <td className="py-3 px-6 text-center whitespace-nowrap text-sm ">
                            $ {factura.saldo_por_pagar}
                          </td>
                          <td className="py-2 px-4 text-center">
                            <span
                              className={`px-2 py-1 rounded-full text-white ${
                                factura.estado_pago
                                  ? "bg-green-500"
                                  : "bg-red-500"
                              }`}
                            >
                              {factura.estado_pago ? "Pagado" : "Pendiente"}
                            </span>
                          </td>
                          <td className="py-2 px-4 text-center">
                            <a
                              href={factura.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className=" bg-linear-to-r from-blue-400 to-emerald-400 text-white px-3 py-1 rounded-3xl hover:cursor-pointer hover:scale-105 transition-all duration-150 inline-flex items-center gap-2"
                            >
                              <Icon
                                icon="line-md:watch-twotone-loop"
                                width="24"
                              />
                              Ver Recibo
                            </a>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan="7"
                          className="py-4 px-4 text-center text-gray-500"
                        >
                          No hay facturas para mostrar.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedDepartamento && (
              <div className="mt-8">
                <h3 className="font-bold flex justify-center text-2xl text-transparent bg-clip-text bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] my-8 hover:scale-105 transition-all duration-200 animate-pulse">
                  Últimas 6 Lecturas del Departamento
                </h3>
                <div className="overflow-x-auto shadow-lg rounded-lg">
                  <table className="min-w-full bg-black/10 border border-gray-500 overflow-hidden rounded-lg">
                    <thead>
                      <tr className="bg-linear-to-r from-blue-400 to-emerald-400 text-white ">
                        <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                          ID Lectura
                        </th>
                        <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                          Fecha
                        </th>
                        <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                          Lectura
                        </th>
                        <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {cargandoLecturas ? (
                        <tr>
                          <td
                            colSpan="4"
                            className="py-4 px-4 text-center text-gray-600"
                          >
                            Cargando...
                          </td>
                        </tr>
                      ) : lecturas.length > 0 ? (
                        lecturas
                          .slice()
                          .sort(
                            (a, b) =>
                              new Date(b.fecha_lectura) -
                              new Date(a.fecha_lectura)
                          )
                          .map((lectura) => {
                            const dateParts = lectura.fecha_lectura.split("-");
                            const year = parseInt(dateParts[0], 10);
                            const month = parseInt(dateParts[1], 10) - 1;
                            const day = parseInt(dateParts[2], 10);
                            const localDate = new Date(year, month, day);

                            return (
                              <tr
                                key={lectura.id_lectura}
                                className="hover:bg-blue-50 transition-all duration-150 hover:cursor-pointer"
                              >
                                <td className="py-3 px-6 text-left text-sm text-gray-500">
                                  {lectura.id_lectura}
                                </td>
                                <td className="py-3 px-6 text-center whitespace-nowrap text-sm text-gray-800">
                                  {localDate.toLocaleDateString("es-MX", {
                                    year: "2-digit",
                                    month: "2-digit",
                                    day: "2-digit",
                                  })}
                                </td>
                                <td className="py-3 px-6 text-center whitespace-nowrap text-sm text-gray-800">
                                  {lectura.valor_lectura}
                                </td>
                                <td className="py-3 px-6 text-center whitespace-nowrap text-sm text-gray-800">
                                  <div className="flex justify-center space-x-2 hover:text-white hover:-translate-y-0.5 transition-all duration-150 hover:cursor-pointer">
                                    <button
                                      onClick={() =>
                                        handleOpenEditarLecturaModal(lectura)
                                      }
                                      className=" text-green-600 hover:text-green-900 flex items-center gap-1 hover:cursor-pointer"
                                    >
                                      <Icon
                                        icon="line-md:edit-full-twotone"
                                        width="24"
                                      />
                                      Modificar
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                      ) : (
                        <tr>
                          <td
                            colSpan="4"
                            className="py-4 px-4 text-center text-gray-500"
                          >
                            No hay lecturas para este departamento.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="mt-8">
              <h3 className="font-bold flex justify-center text-2xl text-transparent bg-clip-text bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] my-8 hover:scale-105 transition-all duration-200 animate-pulse">
                Historial de Cargas del Edificio
              </h3>
              <div className="overflow-x-auto shadow-lg rounded-lg">
                <table className="min-w-full bg-black/10 border border-gray-500 overflow-hidden rounded-lg">
                  <thead>
                    <tr className="bg-linear-to-r from-blue-400 to-emerald-400 text-white ">
                      <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                        Fecha de Carga
                      </th>
                      <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                        Consumo (Litros)
                      </th>
                      <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                        Monto Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {cargandoCargasEdificio ? (
                      <tr>
                        <td
                          colSpan="3"
                          className="py-4 px-4 text-center text-gray-600"
                        >
                          Cargando...
                        </td>
                      </tr>
                    ) : cargasEdificio.length > 0 ? (
                      cargasEdificio.map((carga, index) => (
                        <tr
                          key={`${carga.fecha_carga}-${index}`}
                          className="hover:bg-black/50 hover:text-white transition-all duration-300"
                        >
                          <td className="py-2 px-4 text-center">
                            {new Date(carga.fecha_carga).toLocaleDateString()}
                          </td>
                          <td className="py-2 px-4 text-center">
                            {carga.consumo_litros}
                          </td>
                          <td className="py-2 px-4 text-center">
                            $ {carga.monto_total}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan="3"
                          className="py-4 px-4 text-center text-gray-500"
                        >
                          No hay cargas registradas para este edificio.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </section>

      {/* Renderizado de Modales */}

      {isFacturaModalOpen && (
        <ModalFacturacion
          onClose={() => setIsFacturaModalOpen(false)}
          departamento={selectedDepartamento}
          edificio={selectedEdificio}
          factura={selectedFactura}
          onFacturaGenerada={handleFacturaGenerada}
        />
      )}

      {isGenerarFacturaModalOpen && (
        <ModalGenerarFactura
          departamento={selectedDepartamento}
          onClose={handleCloseGenerarFacturaModal}
          onFacturaGenerada={handleFacturaGenerada}
        />
      )}

      <ModalContrato
        isOpen={isContratoModalOpen}
        onClose={() => setIsContratoModalOpen(false)}
        onSave={handleContratoSave}
      />

      <ModalNuevoEdificio
        isOpen={isEdificioModalOpen}
        onClose={() => {
          setIsEdificioModalOpen(false);
          setEdificioParaEditar(null);
        }}
        contrato={nuevoContrato}
        onEdificioGuardado={handleEdificioGuardado}
        edificio={edificioParaEditar}
      />

      <ModalNuevaCarga
        isOpen={isCargaModalOpen}
        onClose={() => setIsCargaModalOpen(false)}
        edificio={selectedEdificio}
        onCargaGuardada={handleCargaGuardada}
      />

      <ModalNuevoDepartamento
        isOpen={isDepartamentoModalOpen}
        onClose={() => {
          setIsDepartamentoModalOpen(false);
          setDepartamentoParaEditar(null);
        }}
        edificio={selectedEdificio}
        onDepartamentoGuardado={handleDepartamentoGuardado}
        departamento={departamentoParaEditar}
      />

      <ModalNuevaLectura
        isOpen={isLecturaModalOpen}
        onClose={() => setIsLecturaModalOpen(false)}
        departamento={selectedDepartamento}
        lectura={lecturaParaEditar}
        onLecturaGuardada={handleLecturaGuardada}
      />

      <ModalNuevoPagoEdificio
        isOpen={isPagoModalOpen}
        onClose={() => setIsPagoModalOpen(false)}
        factura={selectedFactura}
        onPagoGuardado={handlePagoGuardado}
      />
    </main>
  );
};
