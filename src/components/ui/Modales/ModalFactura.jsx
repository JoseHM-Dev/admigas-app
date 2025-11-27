import React, { useState } from "react";
import { Icon } from "@iconify/react";

// Agregamos la prop 'clienteTelefono'
const ModalFactura = ({ isOpen, onClose, facturaUrl, clienteTelefono }) => {
  const [isSharing, setIsSharing] = useState(false);

  if (!isOpen) return null;

  const handleShare = async () => {
    setIsSharing(true);

    // 1. Preparar el número de teléfono (Lógica de limpieza)
    let telefono = "";
    if (clienteTelefono) {
      // Quitamos todo lo que no sea número
      telefono = clienteTelefono.toString().replace(/\D/g, "");
      // Si es un número de México (10 dígitos) y no trae lada, le ponemos 52
      if (telefono.length === 10) {
        telefono = `${telefono}`;
      }
    }

    try {
      // --- PASO 1: DESCARGAR LA IMAGEN ---
      const response = await fetch(facturaUrl);
      const blob = await response.blob();
      const file = new File([blob], "recibo_venta.png", {
        type: "image/png",
      });

      // --- PASO 2: INTENTO DE COMPARTIR NATIVO (Imagen) ---
      // Verificamos si el navegador soporta compartir archivos (Chrome Android / Safari iOS)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: "Recibo de Venta",
          text: "Gracias por su compra. Aquí tiene su recibo.",
          files: [file],
        });
        console.log("Compartido nativamente con éxito");
      } else {
        // Si no soporta archivos, lanzamos un error forzado para ir al catch
        // Esto pasará en PC de escritorio o en la APK si no tiene permisos
        throw new Error("Sharing files not supported");
      }

    } catch (error) {
      // --- PASO 3: FALLBACK A WHATSAPP (Link) ---
      console.log("Modo nativo falló, usando WhatsApp Link:", error);

      const mensaje = `Hola, gracias por su compra.\nPuede ver y descargar su ticket aquí: ${facturaUrl}`;
      
      // Si tenemos teléfono del cliente, armamos el link directo a su chat
      // Si NO tenemos teléfono, abrimos WhatsApp genérico para que elija el contacto
      const whatsappUrl = telefono 
        ? `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`
        : `https://wa.me/?text=${encodeURIComponent(mensaje)}`;

      // Abrimos en una nueva pestaña (o la app externa)
      window.open(whatsappUrl, "_blank");
    } finally {
      setIsSharing(false);
    }
  };

  // ESTILOS (Sin cambios mayores, solo ajustes visuales)
  const styles = {
    overlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.7)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1000,
      backdropFilter: "blur(4px)",
    },
    modal: {
      backgroundColor: "#fff",
      padding: "20px",
      borderRadius: "15px",
      width: "90%",
      maxWidth: "400px",
      position: "relative",
      boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
      display: "flex",
      flexDirection: "column",
      gap: "15px",
    },
    closeButton: {
      position: "absolute",
      top: "10px",
      right: "10px",
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "#666",
    },
    imageContainer: {
      backgroundColor: "#f3f4f6",
      borderRadius: "8px",
      padding: "10px",
      border: "1px solid #ddd",
      display: "flex",
      justifyContent: "center",
      overflow: "hidden",
    },
    image: {
      maxHeight: "50vh",
      width: "auto",
      objectFit: "contain",
      boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
    },
    infoText: {
      fontSize: "12px",
      color: "#666",
      textAlign: "center",
      fontStyle: "italic",
    },
    buttonGroup: {
      display: "flex",
      flexDirection: "column",
      gap: "10px",
    },
    btnDownload: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      width: "100%",
      padding: "12px",
      backgroundColor: "#2563EB",
      color: "white",
      borderRadius: "8px",
      textDecoration: "none",
      fontWeight: "bold",
      border: "none",
      cursor: "pointer",
    },
    btnShare: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      width: "100%",
      padding: "12px",
      backgroundColor: "#16A34A", // Verde WhatsApp
      color: "white",
      borderRadius: "8px",
      fontWeight: "bold",
      border: "none",
      cursor: "pointer",
      opacity: isSharing ? 0.7 : 1,
    },
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <button onClick={onClose} style={styles.closeButton}>
          <Icon icon="mdi:close-circle" width="30" />
        </button>

        <h2 style={{ textAlign: "center", margin: "10px 0", color: "#333" }}>
          Ticket Listo
        </h2>

        <div style={styles.imageContainer}>
          <img src={facturaUrl} alt="Recibo" style={styles.image} />
        </div>

        {clienteTelefono ? (
            <p style={styles.infoText}>
                Cliente asociado: {clienteTelefono}
            </p>
        ) : (
            <p style={styles.infoText}>
                Sin teléfono registrado. Se pedirá contacto al compartir.
            </p>
        )}

        <div style={styles.buttonGroup}>
          <a
            href={facturaUrl}
            download="recibo_venta.png"
            style={styles.btnDownload}
          >
            <Icon icon="mdi:download" width="20" /> Descargar Imagen
          </a>

          <button 
            onClick={handleShare} 
            style={styles.btnShare}
            disabled={isSharing}
          >
            {isSharing ? (
                <>Enviando...</>
            ) : (
                <>
                    <Icon icon="mdi:whatsapp" width="20" /> 
                    Enviar al Cliente
                </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalFactura;