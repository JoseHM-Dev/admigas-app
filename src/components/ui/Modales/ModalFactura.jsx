import React from "react";
import { Icon } from "@iconify/react";

const ModalFactura = ({ isOpen, onClose, facturaUrl }) => {
  if (!isOpen) return null;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        const response = await fetch(facturaUrl);
        const blob = await response.blob();
        const file = new File([blob], "recibo_venta.png", {
          type: "image/png",
        });

        await navigator.share({
          title: "Recibo de Venta",
          text: "Aquí tienes tu recibo de venta de Gas LP.",
          files: [file],
        });
      } catch (error) {
        console.error("Error compartiendo:", error);
      }
    } else {
      alert("Tu navegador no soporta la función de compartir nativa.");
    }
  };

  // ESTILOS DIRECTOS
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
      maxHeight: "60vh",
      width: "auto",
      objectFit: "contain",
      boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
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
      backgroundColor: "#16A34A",
      color: "white",
      borderRadius: "8px",
      fontWeight: "bold",
      border: "none",
      cursor: "pointer",
    },
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <button onClick={onClose} style={styles.closeButton}>
          <Icon icon="mdi:close-circle" width="30" />
        </button>

        <h2 style={{ textAlign: "center", margin: "10px 0", color: "#333" }}>
          Recibo Generado
        </h2>

        <div style={styles.imageContainer}>
          <img src={facturaUrl} alt="Recibo" style={styles.image} />
        </div>

        <div style={styles.buttonGroup}>
          <a
            href={facturaUrl}
            download="recibo_venta.png"
            style={styles.btnDownload}
          >
            <Icon icon="mdi:download" width="20" /> Descargar Imagen
          </a>

          <button onClick={handleShare} style={styles.btnShare}>
            <Icon icon="mdi:share-variant" width="20" /> Compartir
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalFactura;
