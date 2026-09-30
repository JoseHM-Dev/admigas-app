import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import { Icon } from "@iconify/react";

// --- IMPORTS DE MAPA (Leaflet) ---
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Corregir icono default de Leaflet
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const ModalNuevoCliente = ({
  isOpen,
  onClose,
  contrato,
  cliente: clienteToEdit,
}) => {
  const navigate = useNavigate();

  // Coordenadas iniciales por defecto (CDMX)
  const defaultCenter = [19.4326, -99.1332];

  const [cliente, setCliente] = useState({
    nombre_cliente: "",
    apellido_cliente: "",
    telefono: "",
    calle: "",
    numero: "",
    colonia: "",
    delegacion: "",
    cp: "",
    latitud: null,
    longitud: null,
  });

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  // Estado para controlar el mapa
  const [mapPosition, setMapPosition] = useState(defaultCenter);
  const [cargandoDireccion, setCargandoDireccion] = useState(false);
  const [buscandoUbicacion, setBuscandoUbicacion] = useState(false);

  const isEditMode = Boolean(clienteToEdit);
  const idContrato = isEditMode
    ? clienteToEdit?.id_contrato
    : contrato?.id_contrato;

  // --- FUNCIÓN INTELIGENTE DE GEOCODING (CASCADA) ---
  const actualizarDatosConCoordenadas = async (lat, lng) => {
    // 1. Actualización visual inmediata de coordenadas
    setCliente((prev) => ({ ...prev, latitud: lat, longitud: lng }));
    setCargandoDireccion(true);

    // --- NIVEL 1: GOOGLE MAPS (Premium / Limitado por Cuota) ---
    const intentarGoogle = async () => {
      // ⚠️ IMPORTANTE: PEGA TU API KEY AQUÍ ABAJO
      const apiKey = "AIzaSyAxuYTqTIygOIcowL3R2M7BcgW0NDtpmxw"; 
      
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&language=es-419`;

      try {
        const response = await fetch(url);
        const data = await response.json();

        // Si Google devuelve error (ej. OVER_QUERY_LIMIT), lanzamos error para ir al siguiente nivel
        if (data.status !== "OK") {
          throw new Error(`Google Maps Error: ${data.status}`);
        }

        const result = data.results[0]; // El primer resultado es el más preciso
        const comps = result.address_components;

        // Helper para extraer datos de Google
        const getComponent = (type) => 
          comps.find((c) => c.types.includes(type))?.long_name || "";

        return {
          calle: getComponent("route"),
          numero: getComponent("street_number"),
          // En México: sublocality suele ser Colonia
          colonia: getComponent("sublocality") || getComponent("neighborhood") || getComponent("sublocality_level_1") || "",
          delegacion: getComponent("locality") || getComponent("administrative_area_level_2") || "",
          cp: getComponent("postal_code"),
          exito: true
        };
      } catch (err) {
        return { exito: false, error: err.message };
      }
    };

    // --- NIVEL 2: NOMINATIM (Respaldo Alta Precisión) ---
    const intentarNominatim = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=es-MX`;

      try {
        const response = await fetch(url, {
            headers: { "User-Agent": "AdmiGasLP/1.0" },
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error("Nominatim Error");
        const data = await response.json();
        if (data.error) throw new Error("Nominatim Data Error");

        const addr = data.address;
        return {
          calle: addr.road || addr.pedestrian || addr.path || "",
          numero: "", // Nominatim no es fiable con números, mejor dejar vacío
          colonia: addr.neighbourhood || addr.suburb || addr.quarter || addr.hamlet || "",
          delegacion: addr.city_district || addr.county || addr.municipality || addr.city || "",
          cp: addr.postcode || "",
          exito: true
        };
      } catch (err) {
        return { exito: false, error: err.message };
      }
    };

    // --- NIVEL 3: BIGDATACLOUD (Emergencia) ---
    const intentarBigDataCloud = async () => {
      const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=es`;
      try {
        const response = await fetch(url);
        const data = await response.json();
        return {
          calle: data.street || data.route || "",
          numero: "",
          colonia: data.locality || data.suburb || "",
          delegacion: data.city || data.principalSubdivision || "",
          cp: data.postcode || "",
          exito: true
        };
      } catch (err) {
        return { exito: false, error: err.message };
      }
    };

    // --- ORQUESTADOR (Cascada) ---
    try {
      // Intento 1: Google
      let resultado = await intentarGoogle();

      // Intento 2: Nominatim (Si Google falla o se acaba la cuota)
      if (!resultado.exito) {
        console.warn(`⚠️ Google falló (${resultado.error}). Usando Nominatim...`);
        resultado = await intentarNominatim();
      }

      // Intento 3: BigDataCloud (Si todo lo demás falla)
      if (!resultado.exito) {
        console.warn(`⚠️ Nominatim falló (${resultado.error}). Usando BigDataCloud...`);
        resultado = await intentarBigDataCloud();
      }

      // Aplicar datos encontrados
      if (resultado.exito) {
        setCliente((prev) => ({
          ...prev,
          latitud: lat,
          longitud: lng,
          calle: resultado.calle || prev.calle || "",
          // Solo sobrescribimos número si Google lo encontró, si no, mantenemos el previo
          numero: resultado.numero || prev.numero || "", 
          colonia: resultado.colonia || prev.colonia || "",
          delegacion: resultado.delegacion || prev.delegacion || "",
          cp: resultado.cp || prev.cp || "",
        }));
      } else {
        console.error("❌ Todos los servicios de mapas fallaron.");
      }
    } catch (error) {
      console.error("Error crítico en geocoding:", error);
    } finally {
      setCargandoDireccion(false);
    }
  };

  // --- OBTENER UBICACIÓN GPS ---
  const obtenerUbicacionActual = React.useCallback(() => {
    setBuscandoUbicacion(true);

    if (!navigator.geolocation) {
      alert("Tu navegador no soporta geolocalización.");
      setBuscandoUbicacion(false);
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 0,
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setMapPosition([latitude, longitude]);
        
        // Al encontrar GPS, también buscamos la dirección automáticamente
        actualizarDatosConCoordenadas(latitude, longitude); 

        setBuscandoUbicacion(false);
      },
      (err) => {
        setBuscandoUbicacion(false);
        let msg = "Error desconocido de ubicación.";
        switch (err.code) {
          case err.PERMISSION_DENIED:
            msg = "Permiso denegado. Activa la ubicación.";
            break;
          case err.POSITION_UNAVAILABLE:
            msg = "GPS no disponible.";
            break;
          case err.TIMEOUT:
            msg = "El GPS tardó demasiado.";
            break;
          default:
            msg = err.message;
        }
        alert(msg);
        console.warn("Error GPS:", err);
      },
      options
    );
  }, []); // Dependencias vacías para evitar loops, la función interna maneja lo necesario

  // --- EFECTO DE APERTURA ---
  useEffect(() => {
    if (isOpen) {
      if (isEditMode && clienteToEdit) {
        setCliente(clienteToEdit);
        const lat = parseFloat(clienteToEdit.latitud);
        const lng = parseFloat(clienteToEdit.longitud);

        if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
          setMapPosition([lat, lng]);
        }
      } else {
        // Nuevo cliente
        setCliente({
          nombre_cliente: "",
          apellido_cliente: "",
          telefono: "",
          calle: "",
          numero: "",
          colonia: "",
          delegacion: "",
          cp: "",
          latitud: null,
          longitud: null,
        });
        obtenerUbicacionActual();
      }
      setError("");
      setGuardando(false);
    }
  }, [isOpen, clienteToEdit, isEditMode, obtenerUbicacionActual]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCliente((prev) => ({ ...prev, [name]: value }));
  };

  const handleCPChange = (e) => {
    const cpIngresado = e.target.value;
    if (!/^\d*$/.test(cpIngresado)) return;
    setCliente((prev) => ({ ...prev, cp: cpIngresado }));
  };

  // --- COMPONENTE INTERNO DEL MAPA ---
  const MapEventsAndUpdater = ({ position }) => {
    const map = useMap();

    useEffect(() => {
      if (position) {
        map.invalidateSize();
        map.flyTo(position, 16, { duration: 1.5 });
      }
    }, [position, map]);

    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng;
        setMapPosition([lat, lng]);
        actualizarDatosConCoordenadas(lat, lng);
      },
    });

    return position ? <Marker position={position} /> : null;
  };

  // --- GUARDADO ---
  const guardarDatosEnBD = async () => {
    if (isEditMode && !clienteToEdit.id_casa) throw new Error("No ID cliente.");
    if (!isEditMode && !idContrato) throw new Error("No ID contrato.");
    if (!cliente.nombre_cliente) throw new Error("El nombre es obligatorio.");

    const datosAGuardar = {
      ...cliente,
      latitud: cliente.latitud ? parseFloat(cliente.latitud) : null,
      longitud: cliente.longitud ? parseFloat(cliente.longitud) : null,
    };

    if (isEditMode) {
      const { data, error } = await supabase
        .from("casa_habitacion")
        .update(datosAGuardar)
        .eq("id_casa", clienteToEdit.id_casa);
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase
        .from("casa_habitacion")
        .insert([{ id_contrato: idContrato, ...datosAGuardar }]);
      if (error) throw error;
      return data;
    }
  };

  const handleGuardarCliente = async () => {
    setGuardando(true);
    setError("");
    try {
      await guardarDatosEnBD();
      onClose();
    } catch (error) {
      setError(error.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleGuardarEIrAVentas = async () => {
    setGuardando(true);
    setError("");
    try {
      await guardarDatosEnBD();
      navigate("/ventas");
    } catch (error) {
      setError(error.message);
      setGuardando(false);
    }
  };

  const handleCancel = async () => {
    if (!idContrato && !isEditMode) {
      onClose();
      return;
    }
    if (!isEditMode) {
      if (window.confirm("¿Cancelar? Se eliminará el contrato creado.")) {
        try {
          await supabase.from("contrato").delete().eq("id_contrato", idContrato);
        } catch (error) {
          console.error(error);
        } finally {
          onClose();
        }
      }
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 transition-all duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl m-4 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh]">
        {/* Header */}
        <div className="bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
              <Icon
                icon={isEditMode ? "mdi:account-edit" : "mdi:map-marker-account"}
                className="text-white w-7 h-7"
              />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide">
                {isEditMode ? "Modificar Ubicación" : "Nuevo Cliente"}
              </h2>
              <p className="text-xs text-blue-100 opacity-80">
                {isEditMode
                  ? "Actualizar datos y GPS"
                  : "Ubica el domicilio en el mapa"}
              </p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="text-white/80 hover:text-white transition-colors"
          >
            <Icon icon="mdi:close" width="28" />
          </button>
        </div>

        {/* Body Scrollable */}
        <div className="p-6 md:p-8 space-y-6 overflow-y-auto">
          {/* MAPA */}
          <div className="border-2 border-indigo-100 rounded-xl overflow-hidden shadow-sm relative">
            <div className="bg-indigo-50 px-4 py-2 flex justify-between items-center border-b border-indigo-100">
              <span className="text-xs font-bold text-indigo-600 uppercase flex items-center gap-1">
                <Icon icon="mdi:crosshairs-gps" /> Ubicación en Mapa
              </span>
              {cargandoDireccion ? (
                <span className="text-xs text-indigo-400 flex items-center gap-1 animate-pulse">
                  <Icon icon="line-md:loading-loop" /> Obteniendo dirección exacta...
                </span>
              ) : buscandoUbicacion ? (
                <span className="text-xs text-green-600 flex items-center gap-1 animate-pulse">
                  <Icon icon="mdi:satellite-uplink" /> Localizando GPS...
                </span>
              ) : null}
            </div>

            {/* Botón Flotante GPS */}
            <button
              onClick={(e) => {
                e.preventDefault();
                obtenerUbicacionActual();
              }}
              className="absolute bottom-12 right-3 z-400 bg-white text-gray-700 p-2 rounded-lg shadow-lg border border-gray-300 hover:bg-gray-50 active:bg-gray-100 transition-colors"
              title="Centrar en mi ubicación actual"
            >
              <Icon
                icon="mdi:crosshairs-gps"
                width="24"
                className={buscandoUbicacion ? "animate-spin text-blue-500" : ""}
              />
            </button>

            <div className="h-64 w-full relative z-0">
              <MapContainer
                center={mapPosition}
                zoom={15}
                scrollWheelZoom={true}
                style={{ height: "100%", width: "100%" }}
              >
                {/* ESTILO: OpenStreetMap (Gratuito y sin API Key) */}
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapEventsAndUpdater position={mapPosition} />
              </MapContainer>
            </div>

            <div className="bg-gray-50 px-3 py-1 text-[10px] text-gray-400 font-mono text-center border-t border-gray-100">
              Lat: {cliente.latitud?.toFixed(6) || "--"} | Lon:{" "}
              {cliente.longitud?.toFixed(6) || "--"}
            </div>
          </div>

          {/* FORMULARIO DATOS */}
          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase mb-4 flex items-center gap-2 border-b pb-2">
              <Icon icon="mdi:account-details" /> Información Personal
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <InputGroup
                label="Nombre(s)"
                icon="mdi:account"
                name="nombre_cliente"
                value={cliente.nombre_cliente}
                onChange={handleChange}
                placeholder="Ej. María"
              />
              <InputGroup
                label="Apellidos"
                icon="mdi:account-group"
                name="apellido_cliente"
                value={cliente.apellido_cliente}
                onChange={handleChange}
                placeholder="Ej. González"
              />
              <div className="md:col-span-2">
                <InputGroup
                  label="Teléfono"
                  icon="mdi:phone"
                  name="telefono"
                  type="tel"
                  value={cliente.telefono}
                  onChange={handleChange}
                  placeholder="55..."
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
            <h3 className="text-sm font-bold text-gray-500 uppercase mb-4 flex items-center gap-2">
              <Icon icon="mdi:home-map-marker" className="text-indigo-500" />{" "}
              Dirección (Editable)
            </h3>
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 md:col-span-8">
                <InputGroup
                  label="Calle"
                  icon="mdi:road-variant"
                  name="calle"
                  value={cliente.calle}
                  onChange={handleChange}
                  placeholder="Calle Principal"
                />
              </div>
              <div className="col-span-6 md:col-span-4">
                <InputGroup
                  label="Número"
                  icon="mdi:numeric"
                  name="numero"
                  value={cliente.numero}
                  onChange={handleChange}
                  placeholder="Ext/Int"
                />
              </div>
              <div className="col-span-12 md:col-span-8">
                <InputGroup
                  label="Colonia"
                  icon="mdi:home-group"
                  name="colonia"
                  value={cliente.colonia}
                  onChange={handleChange}
                  placeholder="Colonia"
                />
              </div>
              <div className="col-span-6 md:col-span-4">
                <InputGroup
                  label="C.P."
                  icon="mdi:mailbox"
                  name="cp"
                  value={cliente.cp}
                  onChange={handleCPChange}
                  maxLength="5"
                  placeholder="00000"
                />
              </div>
              <div className="col-span-12">
                <InputGroup
                  label="Municipio / Delegación"
                  icon="mdi:map"
                  name="delegacion"
                  value={cliente.delegacion}
                  onChange={handleChange}
                  placeholder="Municipio"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 flex items-center gap-2 animate-pulse">
              <Icon icon="mdi:alert-circle" /> {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex flex-col-reverse sm:flex-row justify-end gap-3 shrink-0">
          <button
            onClick={handleCancel}
            className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-600 font-medium hover:bg-white transition-all"
            disabled={guardando}
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardarCliente}
            disabled={guardando}
            className="px-6 py-2.5 rounded-lg bg-gray-800 text-white font-medium hover:bg-gray-900 shadow-md transition-all flex items-center gap-2"
          >
            {guardando ? (
              <Icon icon="line-md:loading-loop" />
            ) : (
              <Icon icon="mdi:content-save" />
            )}{" "}
            {guardando ? "Guardando..." : "Guardar"}
          </button>
          {!isEditMode && (
            <button
              onClick={handleGuardarEIrAVentas}
              disabled={guardando}
              className="px-6 py-2.5 rounded-lg text-white font-medium bg-linear-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 shadow-lg flex items-center gap-2"
            >
              {guardando ? (
                <Icon icon="line-md:loading-loop" />
              ) : (
                <Icon icon="mdi:cash-register" />
              )}{" "}
              {guardando ? "Procesando..." : "Ir a Ventas →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const InputGroup = ({ label, icon, className = "", ...props }) => (
  <div className="group w-full">
    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">
      {label}
    </label>
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
        <Icon icon={icon} width="20" />
      </div>
      <input
        {...props}
        className={`block w-full pl-10 pr-3 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:bg-white focus:border-blue-500 outline-none transition-all duration-200 sm:text-sm shadow-sm ${className}`}
      />
    </div>
  </div>
);

export default ModalNuevoCliente;