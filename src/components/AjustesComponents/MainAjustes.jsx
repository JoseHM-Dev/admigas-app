import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { useAuth } from "../../auth/useAuth";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Icon } from "@iconify/react";
import { Link } from "react-router-dom";
import ModalPersonal from "../ui/Modales/ModalPersonal"; // Importar modal
import ModalUnidad from "../ui/Modales/ModalUnidad";
import ModalBanco from "../ui/Modales/ModalBanco";

export const MainAjustes = () => {
  const { user, personal } = useAuth();
  const [profileImage, setProfileImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [currentTarifas, setCurrentTarifas] = useState({
    precio_litro: "",
    precio_m3: "",
  });
  const [newFechaVigente, setNewFechaVigente] = useState(new Date());
  const [newPrecioLitro, setNewPrecioLitro] = useState("");
  const [newPrecioM3, setNewPrecioM3] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  // Estados para la sección de Personal
  const [showPersonal, setShowPersonal] = useState(false);
  const [personalList, setPersonalList] = useState([]);
  const [loadingPersonal, setLoadingPersonal] = useState(false);
  const [isPersonalModalOpen, setIsPersonalModalOpen] = useState(false);
  const [editingPersonal, setEditingPersonal] = useState(null);

  //estados para la sección de Unidad
  const [showUnidades, setShowUnidades] = useState(false);
  const [unidadesList, setUnidadesList] = useState([]);
  const [loadingUnidades, setLoadingUnidades] = useState(false);
  

  const [isUnidadesModalOpen, setIsUnidadesModalOpen] = useState(false);
  const [editingUnidad, setEditingUnidad] = useState(null);

    //estados para la sección de baco
  const [showBanco, setShowBanco] = useState(false);
  const [loadingBanco, setLoadingBanco] = useState(false);
  const [bancoList, setBancoList] = useState([]);
  const [isBancoModalOpen, setIsBancoModalOpen] = useState(false);
  const [editingBanco, setEditingBanco] = useState(null);

  //funciones para personal

  const fetchPersonal = async () => {
    setLoadingPersonal(true);
    const { data, error } = await supabase
      .from("personal")
      .select("*")
      .order("nombre", { ascending: true });

    if (error) {
      console.error("Error fetching personal:", error);
      alert("Error al cargar el personal.");
    } else {
      setPersonalList(data);
    }
    setLoadingPersonal(false);
  };

  const handleTogglePersonal = () => {
    const willShow = !showPersonal;
    setShowPersonal(willShow);
    if (willShow) {
      fetchPersonal();
      setShowUnidades(false);
      setShowBanco(false);
    }
  };

  const handleDeletePersonal = async (id) => {
    if (
      window.confirm("¿Estás seguro de que quieres eliminar a esta persona?")
    ) {
      const { error } = await supabase.from("personal").delete().eq("id", id);

      if (error) {
        console.error("Error deleting personal:", error);
        alert("Error al eliminar.");
      } else {
        fetchPersonal(); // Recargar la lista
      }
    }
  };

  const handleOpenPersonalModal = (personal = null) => {
    setEditingPersonal(personal);
    setIsPersonalModalOpen(true);
  };

  const handleClosePersonalModal = () => {
    setEditingPersonal(null);
    setIsPersonalModalOpen(false);
  };

  const handleSavePersonal = () => {
    fetchPersonal(); // Recargar la lista cuando se guarda desde el modal
  };

  //funciones para unidad
  const fetchUnidad = async () => {
    setLoadingUnidades(true);
    const { data, error } = await supabase
      .from("unidad")
      .select("*")
      .order("num_unidad", { ascending: true });

    if (error) {
      console.error("Error fetching unidades:", error);
      alert("Error al cargar las unidades.");
    } else {
      setUnidadesList(data);
    }
    setLoadingUnidades(false);
  };

  const handleToggleUnidad = () => {
    const willShow = !showUnidades;
    setShowUnidades(willShow);
    if (willShow) {
      fetchUnidad();
      setShowPersonal(false);
      setShowBanco(false);
    }
  };

  const handleOpenUnidadModal = (unidad = null) => {
    setEditingUnidad(unidad);
    setIsUnidadesModalOpen(true);
  };

  const handleCloseUnidadModal = () => {
    setEditingUnidad(null);
    setIsUnidadesModalOpen(false);
  };

  const handleSaveUnidad = () => {
    fetchUnidad(); // Recargar la lista cuando se guarda desde el modal
  };

  const fetchBanco = async () => {
    setLoadingBanco(true);
    const { data, error } = await supabase
      .from("datos_bancarios")
      .select("*")
      .order("id");

    if (error) {
      console.error("Error fetching datos bancarios:", error);
      alert("Error al cargar los datos bancarios.");
    } else {
      setBancoList(data);
    }
    setLoadingBanco(false);
  };

  const handleToggleBanco = () => {
    const willShow = !showBanco;
    setShowBanco(willShow);
    if (willShow) {
      fetchBanco();
      fetchPersonal(false);
      setShowUnidades(false)
    }
  };

  const handleDeleteBanco = async (id) => {
    if (
      window.confirm("¿Estás seguro de que quieres eliminar estos datos?")
    ) {
      const { error } = await supabase.from("datos_bancarios").delete().eq("id", id);

      if (error) {
        console.error("Error deleting datos bancarios:", error);
        alert("Error al eliminar.");
      } else {
        fetchBanco(); // Recargar la lista
      }
    }
  };

  const handleOpenBancoModal = (datos_bancarios = null) => {
    setEditingBanco(datos_bancarios);
    setIsBancoModalOpen(true);
  };

  const handleCloseBancoModal = () => {
    setEditingBanco(null);
    setIsBancoModalOpen(false);
  };

  const handleSaveBanco = () => {
    fetchBanco(); // Recargar la lista cuando se guarda desde el modal
  };


  useEffect(() => {
    const fetchLatestTarifas = async () => {
      const { data, error } = await supabase
        .from("tarifa")
        .select("precio_litro, precio_m3")
        .order("fecha_vigente", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error("Error fetching tarifas:", error);
      } else if (data) {
        setCurrentTarifas(data);
      }
    };

    fetchLatestTarifas();
  }, []);

  useEffect(() => {
    // Limpiar la URL de previsualización cuando el componente se desmonta
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setHasChanges(true);
    }
  };

  const handleUpdateProfileImage = async () => {
    if (!profileImage) return;

    const fileName = `${user.id}/${profileImage.name}`;
    const { error: uploadError } = await supabase.storage
      .from("avatar")
      .upload(fileName, profileImage, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.error("Error uploading image:", uploadError);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatar").getPublicUrl(fileName);

    const { error: updateUserError } = await supabase.auth.updateUser({
      data: { avatar_url: publicUrl },
    });

    if (updateUserError) {
      console.error("Error updating user metadata:", updateUserError);
    }
  };

  const handleUpdateTarifas = async () => {
    if (!newFechaVigente || !newPrecioLitro || !newPrecioM3) return;

    const { error } = await supabase.from("tarifa").insert([
      {
        fecha_vigente: newFechaVigente,
        precio_litro: newPrecioLitro,
        precio_m3: newPrecioM3,
        personal_id: personal.id,
      },
    ]);

    if (error) {
      console.error("Error updating tarifas:", error);
    }
  };

  const handleSaveChanges = async () => {
    if (profileImage) {
      await handleUpdateProfileImage();
    }
    if (newFechaVigente && newPrecioLitro && newPrecioM3) {
      await handleUpdateTarifas();
    }
    setHasChanges(false);
    alert("Ajustes guardados correctamente");
  };

  return (
    <div className="flex flex-col items-center p-4 shadow-4xl">
      <div className="mb-10 -mt-10 flex items-center flex-col gap-4">
        <h1 className="text-2xl bg-linear-to-r from-pink-500 via-red-500 to-pink-500 rounded-2xl text-center p-2 text-transparent bg-clip-text font-bold mt-8 transition-all duration-500">
          Página de Ajustes
        </h1>
        <Link
          to="/dashboard"
          className="flex bg-[#6432e4] text-white items-center gap-2 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 hover:bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] hover:text-white hover:-translate-y-0.5 transition-all duration-300 hover:cursor-pointer"
        >
          <Icon icon="line-md:arrow-left-circle-twotone" width="24" />
          Regresar
        </Link>
      </div>

      <section className="flex flex-col items-center gap-8 justify-between bg-black/30 rounded-3xl w-full max-w-4xl shadow-lg p-8">
        <div className="flex flex-col items-center">
          <div className="w-64 h-64 mb-4 border-8 border-[#272525] rounded-full flex items-center bg-white justify-center animate-[float_3s_infinite] transition-all duration-500 shadow-lg">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-full rounded-full object-cover"
              />
            ) : user?.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt="User Avatar"
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-gray-500">500x500px</span>
            )}
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            id="file-input"
          />
          <button
            onClick={() => document.getElementById("file-input").click()}
            className="flex gap-2 mb-4 px-4 py-2 bg-linear-to-r from-blue-400 to-emerald-400 text-white rounded-lg hover:-translate-y-1 hover:cursor-pointer transition-all duration-300 shadow-lg"
          >
            <Icon icon="line-md:cloud-alt-upload-twotone-loop" width="24" />
            Subir Imagen
          </button>
          <div className="flex gap-4">
            <div className="flex items-center">
              {/* Botón para mostrar/ocultar personal */}
              <button
                onClick={handleTogglePersonal}
                className="flex p-2 border gap-4 m-3 font-bold bg-[#6432e4] text-white border-black rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 hover:bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] hover:text-white hover:-translate-y-0.5 transition-all duration-150 hover:cursor-pointer"
              >
                <Icon icon="line-md:account-alert-loop" width="24" />
                Personal
              </button>
            </div>
            {/* Botón para mostrar/ocultar unidades */}
            <div className="flex items-center">
              <button
                onClick={handleToggleUnidad}
                className="flex p-2 border gap-4 font-bold bg-[#6432e4] text-white border-black rounded-sm focus:ring-blue-500 focus:border-blue-500 hover:bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] hover:text-white hover:-translate-y-0.5 transition-all duration-150 hover:cursor-pointer"
              >
                <Icon icon="hugeicons:tanker-truck" width="24" />
                Unidad
              </button>
            </div>
            {/* Botón para mostrar/editar datos bancarios */}
            <div className="flex items-center">
              <button
                onClick={handleToggleBanco}
                className="flex p-2 border gap-4 font-bold bg-[#6432e4] text-white border-black rounded-sm focus:ring-blue-500 focus:border-blue-500 hover:bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] hover:text-white hover:-translate-y-0.5 transition-all duration-150 hover:cursor-pointer"
              >
                <Icon icon="duo-icons:bank" width="24" />
                Datos Bancarios
              </button>
            </div>
          </div>
        </div>

        

        {/* Tabla de Personal */}
        {showPersonal && (
          <div className="w-full max-w-4xl mt-4">
            <div className="overflow-x-auto shadow-lg rounded-lg">
              <table className="min-w-full bg-black/10 border border-gray-500 overflow-hidden rounded-lg">
                <thead>
                  <tr className="bg-linear-to-r from-blue-400 to-emerald-400 text-white">
                    <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                      Apellidos
                    </th>
                    <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                      Teléfono
                    </th>
                    <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                      Roll
                    </th>
                    <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loadingPersonal ? (
                    <tr>
                      <td
                        colSpan="5"
                        className="py-4 px-4 text-center text-white"
                      >
                        Cargando...
                      </td>
                    </tr>
                  ) : personalList.length > 0 ? (
                    personalList.map((p) => (
                      <tr
                        key={p.id}
                        className="hover:bg-blue-900/50 transition-all duration-150 text-white"
                      >
                        <td className="py-3 px-6 text-center whitespace-nowrap text-sm">
                          {p.nombre}
                        </td>
                        <td className="py-3 px-6 text-center whitespace-nowrap text-sm">
                          {p.apellidos}
                        </td>
                        <td className="py-3 px-6 text-center whitespace-nowrap text-sm">
                          {p.telefono}
                        </td>
                        <td className="py-3 px-6 text-center whitespace-nowrap text-sm">
                          {p.roll}
                        </td>
                        <td className="py-3 px-6 text-center whitespace-nowrap text-sm font-medium">
                          <div className="flex justify-center space-x-4">
                            <button
                              onClick={() => handleOpenPersonalModal(p)}
                              className="text-yellow-400 hover:text-yellow-600 flex items-center gap-1"
                            >
                              <Icon icon="line-md:edit-twotone" width="20" />{" "}
                              Editar
                            </button>
                            <button
                              onClick={() => handleDeletePersonal(p.id)}
                              className="text-red-500 hover:text-red-700 flex items-center gap-1"
                            >
                              <Icon
                                icon="line-md:close-circle-twotone"
                                width="20"
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
                        colSpan="5"
                        className="py-4 px-4 text-center text-gray-400"
                      >
                        No hay personal registrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-center mt-4">
              <button
                onClick={() => handleOpenPersonalModal()}
                className="flex p-2 border gap-4 m-3 font-bold bg-[#6432e4] text-white border-black rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 hover:bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] hover:text-white hover:-translate-y-0.5 transition-all duration-150 hover:cursor-pointer"
              >
                <Icon icon="line-md:plus-circle-twotone" width="24" />
                Agregar Personal
              </button>
            </div>
          </div>
        )}

        {/* Tabla de BANCO */}
        {showBanco && (
          <div className="w-full max-w-4xl mt-4">
            <div className="overflow-x-auto shadow-lg rounded-lg">
              <table className="min-w-full bg-black/10 border border-gray-500 overflow-hidden rounded-lg">
                <thead>
                  <tr className="bg-linear-to-r from-blue-400 to-emerald-400 text-white">
                    <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                      Apodo
                    </th>
                    <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                      Banco
                    </th>
                    <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                      Cuenta
                    </th>
                    <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                      Clave
                    </th>
                    <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loadingBanco ? (
                    <tr>
                      <td
                        colSpan="5"
                        className="py-4 px-4 text-center text-white"
                      >
                        Cargando...
                      </td>
                    </tr>
                  ) : bancoList.length > 0 ? (
                    bancoList.map((p) => (
                      <tr
                        key={p.id}
                        className="hover:bg-blue-900/50 transition-all duration-150 text-white"
                      >
                        <td className="py-3 px-6 text-center whitespace-nowrap text-sm">
                          {p.apodo}
                        </td>
                        <td className="py-3 px-6 text-center whitespace-nowrap text-sm">
                          {p.nom_banco}
                        </td>
                        <td className="py-3 px-6 text-center whitespace-nowrap text-sm">
                          {p.cuenta}
                        </td>
                        <td className="py-3 px-6 text-center whitespace-nowrap text-sm">
                          {p.clave_int}
                        </td>
                        <td className="py-3 px-6 text-center whitespace-nowrap text-sm font-medium">
                          <div className="flex justify-center space-x-4">
                            <button
                              onClick={() => handleOpenBancoModal(p)}
                              className="text-yellow-400 hover:text-yellow-600 flex items-center gap-1"
                            >
                              <Icon icon="line-md:edit-twotone" width="20" />{" "}
                              Editar
                            </button>
                            <button
                              onClick={() => handleDeleteBanco(p.id)}
                              className="text-red-500 hover:text-red-700 flex items-center gap-1"
                            >
                              <Icon
                                icon="line-md:close-circle-twotone"
                                width="20"
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
                        colSpan="5"
                        className="py-4 px-4 text-center text-gray-400"
                      >
                        No hay personal registrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-center mt-4">
              <button
                onClick={() => handleOpenBancoModal()}
                className="flex p-2 border gap-4 m-3 font-bold bg-[#6432e4] text-white border-black rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 hover:bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] hover:text-white hover:-translate-y-0.5 transition-all duration-150 hover:cursor-pointer"
              >
                <Icon icon="line-md:plus-circle-twotone" width="24" />
                Agregar Banco
              </button>
            </div>
          </div>
        )}

        {/* Tabla de Unidades */}
        {showUnidades && (
          <div className="w-full max-w-4xl mt-4">
            <div className="overflow-x-auto shadow-lg rounded-lg">
              <table className="min-w-full bg-black/10 border-gray-500 overflow-hidden rounded-lg ">
                <thead>
                  <tr className="bg-linear-to-r from-blue-400 to-emerald-400 text-white">
                    <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                      Empresa
                    </th>
                    <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                      Unidad
                    </th>
                    <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                      Permiso de Reparto
                    </th>
                    <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loadingUnidades ? (
                    <tr>
                      <td
                        colSpan="4"
                        className="py-4 px4 text-center text-white"
                      >
                        Cargando...
                      </td>
                    </tr>
                  ) : unidadesList.length > 0 ? (
                    unidadesList.map((u) => (
                      <tr
                        key={u.id}
                        className="hover:bg-blue-900/50 transition-all duration-150 text-white"
                      >
                        <td className="py-3 px-6 text-center whitespace-nowrap text-sm">
                          {u.empresa}
                        </td>
                        <td className="py-3 px-6 text-center whitespace-nowrap text-sm">
                          {u.num_unidad}
                        </td>
                        <td className="py-3 px-6 text-center whitespace-nowrap text-sm">
                          {u.permiso_reparto || ""}
                        </td>
                        <td className="py-3 px-6 text-center whitespace-nowrap text-sm font-medium">
                          <div className="flex justify-center space-x-4">
                            <button
                              onClick={() => handleOpenUnidadModal(u)}
                              className="text-yellow-400 hover:text-yellow-600 flex items-center gap-1"
                            >
                              <Icon icon="line-md:edit-twotone" width="20" />{" "}
                              Editar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="4"
                        className="py-4 px-4 text-center text-gray-400"
                      >
                        No hay unidades registradas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {!loadingUnidades && unidadesList.length === 0 && (
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => handleOpenUnidadModal()}
                  className="flex p-2 border gap-4 m-3 font-bold bg-[#6432e4] text-white border-black rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 hover:bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] hover:text-white hover:-translate-y-0.5 transition-all duration-150 hover:cursor-pointer"
                >
                  <Icon icon="line-md:plus-circle-twotone" width="24" />
                  Agregar Unidad
                </button>
              </div>
            )}
          </div>
        )}

        <div className="p-2 mb-6 flex flex-col items-center w-full">
          <h2 className="text-2xl text-transparent bg-clip-text bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] font-bold mb-4">
            Modificar Tarifas
          </h2>
          <div className="mb-4 text-white bg-linear-to-r from-blue-400 to-emerald-400 p-4 rounded-lg shadow-md">
            <p className="flex gap-2 items-center">
              Precio por Litro Actual:{" "}
              <strong className="text-2xl text-transparent bg-clip-text bg-linear-to-r from-pink-500 via-red-500 to-pink-500">
                ${currentTarifas.precio_litro}
              </strong>
            </p>
            <p className="flex gap-2 items-center">
              Precio por m³ Actual:{" "}
              <strong className="text-2xl text-transparent bg-clip-text bg-linear-to-r from-pink-500 via-red-500 to-pink-500">
                ${currentTarifas.precio_m3}
              </strong>
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <DatePicker
              selected={newFechaVigente}
              onChange={(date) => {
                setNewFechaVigente(date);
                setHasChanges(true);
              }}
              className="p-2 rounded bg-gray-400 text-white text-center hover:cursor-pointer hover:-translate-y-1 transition-all duration-300 shadow-lg"
            />
            <input
              type="number"
              placeholder="Nuevo Precio por Litro"
              value={newPrecioLitro}
              onChange={(e) => {
                setNewPrecioLitro(e.target.value);
                setHasChanges(true);
              }}
              className="p-2 rounded bg-gray-400 text-white text-center"
            />
            <input
              type="number"
              placeholder="Nuevo Precio por m³"
              value={newPrecioM3}
              onChange={(e) => {
                setNewPrecioM3(e.target.value);
                setHasChanges(true);
              }}
              className="p-2 rounded bg-gray-400 text-white text-center"
            />
          </div>
        </div>
      </section>

      <div className="flex p-2 gap-4 mt-8">
        <button
          onClick={handleSaveChanges}
          disabled={!hasChanges}
          className="flex p-2 bg-[#6432e4] text-white items-center gap-2 border border-gray-300 rounded-md shadow-lg focus:ring-blue-500 focus:border-blue-500 hover:bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] hover:text-white hover:-translate-y-0.5 transition-all duration-300 hover:cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <Icon
            icon="line-md:circle-to-confirm-circle-twotone-transition"
            width="24"
          />
          Guardar Ajustes
        </button>
      </div>

      <ModalPersonal
        isOpen={isPersonalModalOpen}
        onClose={handleClosePersonalModal}
        personalData={editingPersonal}
        onSave={handleSavePersonal}
      />

      <ModalUnidad
        isOpen={isUnidadesModalOpen}
        onClose={handleCloseUnidadModal}
        unidadData={editingUnidad}
        onSave={handleSaveUnidad}
      />

      <ModalBanco
        isOpen={isBancoModalOpen}
        onClose={handleCloseBancoModal}
        bancoData={editingBanco}
        onSave={handleSaveBanco}
        />
    </div>
  );
};
