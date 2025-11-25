import React, { useState, useEffect, forwardRef } from "react";
import { supabase } from "../../supabaseClient";
import { Icon } from "@iconify/react";
// Si tienes el fondo, úsalo, si no, el diseño tiene fondo blanco limpio
import fondoFactura from "../../assets/Factura/fondo_de_factura.png"; 

const Factura = forwardRef(({ facturaData, departamento, selectedTarifa, selectedCuenta, configuracionImagen }, ref) => {
    
    // --- LÓGICA DE DATOS (Intacta) ---
    const [infoLecturas, setInfoLecturas] = useState({
        penultima: { fecha: null, imagen: null, lectura: null },
        ultima: { fecha: null, imagen: null, lectura: null },
    });
    const [factorConversion, setFactorConversion] = useState(null);
    const [saldoAnterior, setSaldoAnterior] = useState(0);
    const [telefonoContacto, setTelefonoContacto] = useState(null);
    const [logoUrl, setLogoUrl] = useState(null);

    useEffect(() => {
        const fetchDatos = async () => {
            if (!departamento?.id_departamento) return;
            try {
                // Lecturas
                const { data, error } = await supabase
                    .from("lectura")
                    .select("fecha_lectura, url, valor_lectura")
                    .eq("id_departamento", departamento.id_departamento)
                    .order("fecha_lectura", { ascending: false })
                    .limit(2);

                if (!error && data) {
                    if (data.length >= 2) {
                        setInfoLecturas({
                            ultima: { fecha: data[0].fecha_lectura, imagen: data[0].url, lectura: data[0].valor_lectura },
                            penultima: { fecha: data[1].fecha_lectura, imagen: data[1].url, lectura: data[1].valor_lectura },
                        });
                    } else if (data.length === 1) {
                        setInfoLecturas({
                            ultima: { fecha: data[0].fecha_lectura, imagen: data[0].url, lectura: data[0].valor_lectura },
                            penultima: { fecha: null, imagen: null, lectura: null },
                        });
                    }
                }
                // Telefono
                const { data: dataUnidad } = await supabase.from("unidad").select("telefono_1").limit(1).single();
                if (dataUnidad) setTelefonoContacto(dataUnidad.telefono_1);
                // Factor
                if (selectedTarifa?.id_tarifa) {
                    const { data: dataTarifa } = await supabase.from("tarifa").select("factor").eq("id_tarifa", selectedTarifa.id_tarifa).single();
                    if (dataTarifa) setFactorConversion(dataTarifa.factor);
                }
                // Logo
                const { data: { user } } = await supabase.auth.getUser();
                if (user?.user_metadata?.avatar_url) setLogoUrl(user.user_metadata.avatar_url);
                // Deuda
                const { data: dataDeuda } = await supabase
                    .from("factura_departamento")
                    .select("saldo_por_pagar")
                    .eq("departamento_id", departamento.id_departamento)
                    .eq("estado_pago", false);
                if (dataDeuda) {
                    setSaldoAnterior(dataDeuda.reduce((acc, curr) => acc + (curr.saldo_por_pagar || 0), 0));
                }
            } catch (err) { console.error(err); }
        };
        fetchDatos();
    }, [departamento, selectedTarifa]);

    if (!facturaData || !departamento || !selectedTarifa) return <p>Cargando...</p>;

    const totalFactura = (facturaData.monto || 0) + (facturaData.administracion || 0) + (facturaData.servicios || 0) + saldoAnterior;

    // --- ESTILOS NATIVOS (FLEXBOX ROBUSTO) ---
    const styles = {
        container: {
            width: "800px",
            minHeight: "1100px", // Tamaño A4 aprox
            backgroundColor: "#fff",
            fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
            color: "#333",
            position: "relative",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column", // FLUJO VERTICAL: Lo más importante
        },
        backgroundImage: {
            position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
            objectFit: "cover", zIndex: 0, opacity: 0.4
        },
        mainContent: {
            zIndex: 10,
            flex: 1, // Ocupa el espacio disponible empujando el footer
            padding: "40px 50px",
            display: "flex",
            flexDirection: "column",
            gap: "25px", // Espacio automático entre secciones
        },
        
        // 1. HEADER
        header: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "3px solid #644FD0",
            paddingBottom: "15px"
        },
        headerLeft: { display: "flex", flexDirection: "column" },
        title: { fontSize: "42px", fontWeight: "900", color: "#644FD0", margin: 0, letterSpacing: "2px", lineHeight: 1 },
        subTitle: { fontSize: "14px", color: "#666", marginTop: "5px", fontWeight: "600" },
        logoBox: { width: "100px", height: "100px", borderRadius: "50%", overflow: "hidden", border: "3px solid #EE5F63" },
        
        // 2. INFO BAR
        infoBar: {
            display: "flex",
            justifyContent: "space-between",
            backgroundColor: "#f9f9f9",
            padding: "15px",
            borderRadius: "8px",
            borderLeft: "5px solid #EE5F63"
        },
        infoItem: { fontSize: "14px", color: "#555" },
        infoValue: { fontWeight: "bold", color: "#333", marginLeft: "5px" },

        // 3. CLIENTE SECTION
        sectionTitle: { 
            fontSize: "18px", fontWeight: "800", color: "#0094A2", 
            borderBottom: "1px solid #ccc", paddingBottom: "5px", marginBottom: "10px",
            textTransform: "uppercase" 
        },
        clientRow: { display: "flex", justifyContent: "space-between", alignItems: "stretch", gap: "20px" },
        clientCard: { 
            flex: 2, 
            border: "1px solid #ddd", borderRadius: "10px", padding: "15px",
            backgroundColor: "rgba(255,255,255,0.9)", boxShadow: "0 2px 5px rgba(0,0,0,0.05)"
        },
        deptoCard: {
            flex: 1,
            backgroundColor: "#644FD0", color: "white",
            borderRadius: "10px", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 8px rgba(100, 79, 208, 0.3)"
        },
        
        // 4. LECTURAS
        readingsContainer: { display: "flex", justifyContent: "space-between", gap: "20px" },
        readingBox: {
            flex: 1, border: "1px solid #eee", borderRadius: "8px", padding: "10px",
            textAlign: "center", backgroundColor: "#fff"
        },
        readingImg: { 
            width: "100%", height: "140px", objectFit: "cover", borderRadius: "6px", 
            marginTop: "8px", border: "1px solid #ddd" 
        },

        // 5. DATOS Y TOTALES (GRID SIMULADO CON FLEX)
        detailsContainer: { display: "flex", gap: "30px" },
        detailCol: { flex: 1 },
        
        // Estilo de Tablas Nativas
        table: { width: "100%", borderCollapse: "collapse", fontSize: "13px" },
        th: { textAlign: "left", padding: "8px", borderBottom: "2px solid #0094A2", color: "#0094A2" },
        td: { padding: "8px", borderBottom: "1px solid #eee", color: "#444" },
        tdRight: { textAlign: "right", padding: "8px", borderBottom: "1px solid #eee", color: "#444", fontWeight: "bold" },

        // Gran Total
        totalStrip: {
            backgroundColor: "#0094A2",
            color: "white",
            padding: "15px 30px",
            borderRadius: "50px", // Pill shape
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "20px",
            boxShadow: "0 4px 10px rgba(0, 148, 162, 0.3)"
        },

        // 6. FOOTER
        footer: {
            backgroundColor: "#333",
            color: "#fff",
            padding: "30px 50px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "12px",
            zIndex: 10,
            marginTop: "auto" // Empuja el footer al final
        }
    };

    return (
        <div ref={ref} style={styles.container}>
            {/* Fondo decorativo */}
            <img src={fondoFactura} alt="" style={styles.backgroundImage} />

            <div style={styles.mainContent}>
                
                {/* 1. HEADER */}
                <header style={styles.header}>
                    <div style={styles.headerLeft}>
                        <h1 style={styles.title}>FACTURA</h1>
                        <div style={styles.subTitle}>Admi Gas LP - Servicio Profesional</div>
                    </div>
                    {logoUrl && configuracionImagen?.mostrar && (
                        <div style={styles.logoBox}>
                            <img src={logoUrl} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} crossOrigin="anonymous" />
                        </div>
                    )}
                </header>

                {/* 2. INFO BARRA */}
                <div style={styles.infoBar}>
                    <span style={styles.infoItem}>Contrato:<span style={{...styles.infoValue, color: "#EE5F63"}}>#{departamento.edificio.id_contrato}</span></span>
                    <span style={styles.infoItem}>Fecha:<span style={styles.infoValue}>{new Date(facturaData.fecha_factura).toLocaleDateString()}</span></span>
                    <span style={styles.infoItem}>Folio:<span style={styles.infoValue}>{facturaData.id_factura ? facturaData.id_factura.toString().slice(0,8).toUpperCase() : "PRE"}</span></span>
                </div>

                {/* 3. CLIENTE Y DEPTO */}
                <div>
                    <div style={styles.sectionTitle}>Datos del Cliente</div>
                    <div style={styles.clientRow}>
                        <div style={styles.clientCard}>
                            <div style={{fontSize:"16px", fontWeight:"bold", color:"#333", marginBottom:"5px"}}>{departamento.titular_depto}</div>
                            <div style={{fontSize:"13px", color:"#666", lineHeight:"1.4"}}>
                                {departamento.edificio.calle} #{departamento.edificio.numero}<br/>
                                {departamento.edificio.colonia}, {departamento.edificio.delegacion}<br/>
                                C.P. {departamento.edificio.cp}
                            </div>
                        </div>
                        <div style={styles.deptoCard}>
                            <span style={{fontSize:"12px", textTransform:"uppercase", opacity: 0.8}}>Departamento</span>
                            <span style={{fontSize:"42px", fontWeight:"bold"}}>{departamento.no_depto}</span>
                        </div>
                    </div>
                </div>

                {/* 4. MEDIDOR */}
                <div>
                    <div style={styles.sectionTitle}>Evidencia de Medidor</div>
                    <div style={styles.readingsContainer}>
                        <div style={styles.readingBox}>
                            <div style={{fontWeight:"bold", color: "#644FD0"}}>Lectura Anterior</div>
                            <div style={{fontSize:"12px", color:"#888", marginBottom:"5px"}}>
                                {infoLecturas.penultima.fecha ? new Date(infoLecturas.penultima.fecha).toLocaleDateString() : "-"}
                            </div>
                            {infoLecturas.penultima.imagen ? (
                                <img src={infoLecturas.penultima.imagen} alt="Ant" style={styles.readingImg} crossOrigin="anonymous" />
                            ) : <div style={{...styles.readingImg, display:'flex', alignItems:'center', justifyContent:'center', background:'#f0f0f0', color:'#aaa'}}>Sin Foto</div>}
                        </div>
                        <div style={styles.readingBox}>
                            <div style={{fontWeight:"bold", color: "#0094A2"}}>Lectura Actual</div>
                            <div style={{fontSize:"12px", color:"#888", marginBottom:"5px"}}>
                                {infoLecturas.ultima.fecha ? new Date(infoLecturas.ultima.fecha).toLocaleDateString() : "-"}
                            </div>
                            {infoLecturas.ultima.imagen ? (
                                <img src={infoLecturas.ultima.imagen} alt="Act" style={styles.readingImg} crossOrigin="anonymous" />
                            ) : <div style={{...styles.readingImg, display:'flex', alignItems:'center', justifyContent:'center', background:'#f0f0f0', color:'#aaa'}}>Sin Foto</div>}
                        </div>
                    </div>
                </div>

                {/* 5. DETALLES FINANCIEROS */}
                <div style={styles.detailsContainer}>
                    {/* Tabla Consumo */}
                    <div style={styles.detailCol}>
                        <div style={styles.sectionTitle}>Consumo</div>
                        <table style={styles.table}>
                            <tbody>
                                <tr><td style={styles.td}>Lectura Anterior</td><td style={styles.tdRight}>{infoLecturas.penultima.lectura || 0}</td></tr>
                                <tr><td style={styles.td}>Lectura Actual</td><td style={styles.tdRight}>{infoLecturas.ultima.lectura || 0}</td></tr>
                                <tr><td style={styles.td}><strong>Consumo M³</strong></td><td style={styles.tdRight}><strong>{facturaData.consumo_lectura.toFixed(2)}</strong></td></tr>
                                <tr><td style={styles.td}>Factor Conversión</td><td style={styles.tdRight}>{factorConversion || 0}</td></tr>
                                <tr><td style={styles.td}>Precio Unitario</td><td style={styles.tdRight}>${selectedTarifa.precio_m3}</td></tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Tabla Desglose */}
                    <div style={styles.detailCol}>
                        <div style={styles.sectionTitle}>Resumen</div>
                        <table style={styles.table}>
                            <tbody>
                                <tr><td style={styles.td}>Importe Gas</td><td style={styles.tdRight}>${facturaData.monto.toFixed(2)}</td></tr>
                                {saldoAnterior > 0 && (
                                    <tr><td style={{...styles.td, color:"#EE5F63"}}>Adeudo Anterior</td><td style={{...styles.tdRight, color:"#EE5F63"}}>${saldoAnterior.toFixed(2)}</td></tr>
                                )}
                                {facturaData.administracion > 0 && (
                                    <tr><td style={styles.td}>Administración</td><td style={styles.tdRight}>${facturaData.administracion}</td></tr>
                                )}
                                {facturaData.servicios > 0 && (
                                    <tr><td style={styles.td}>Otros Servicios</td><td style={styles.tdRight}>${facturaData.servicios}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* GRAN TOTAL */}
                <div style={styles.totalStrip}>
                    <span style={{fontSize: "18px", textTransform: "uppercase", letterSpacing: "1px"}}>Total a Pagar</span>
                    <span style={{fontSize: "32px", fontWeight: "900"}}>${totalFactura.toFixed(2)}</span>
                </div>

            </div>

            {/* 6. FOOTER */}
            <footer style={styles.footer}>
                <div>
                    <div style={{fontWeight:"bold", marginBottom:"5px", color:"#EE5F63", textTransform:"uppercase"}}>Datos Bancarios</div>
                    {selectedCuenta ? (
                        <div style={{lineHeight:"1.5", color: "#ccc"}}>
                            Banco: <span style={{color:"#fff", fontWeight:"bold"}}>{selectedCuenta.nom_banco}</span><br/>
                            Titular: {selectedCuenta.nom_responsable}<br/>
                            Cuenta: {selectedCuenta.cuenta}<br/>
                            CLABE: {selectedCuenta.clave_int}
                        </div>
                    ) : "Sin cuenta asignada"}
                </div>
                <div style={{textAlign:"right"}}>
                    <div style={{fontWeight:"bold", marginBottom:"5px", color:"#0094A2", textTransform:"uppercase"}}>Atención a Clientes</div>
                    <div style={{display:"flex", alignItems:"center", gap:"10px", justifyContent:"flex-end"}}>
                        <Icon icon="logos:whatsapp-icon" width="24" />
                        <span style={{fontSize:"16px", fontWeight:"bold"}}>{telefonoContacto || "55-0000-0000"}</span>
                    </div>
                    <div style={{marginTop:"5px", color:"#888"}}>Dudas o aclaraciones</div>
                </div>
            </footer>
        </div>
    );
});

export default Factura;