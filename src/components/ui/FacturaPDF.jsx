import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet, Font } from '@react-pdf/renderer';

Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/helveticaneue/v70/1Ptsg8zYS_SKggPNyC0IT4ttDfA.ttf' },
    { src: 'https://fonts.gstatic.com/s/helveticaneue/v70/1Ptsg8zYS_SKggPNyC0IT4ttDfA.ttf', fontWeight: 'bold' },
  ]
});

const colors = {
  primary: '#6432e4',
  secondary: '#1a365d',
  accent: '#0094A2',
  danger: '#e53e3e',
  gray: '#718096',
  lightGray: '#f7fafc',
  white: '#ffffff',
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 0, // El footer controla el padding inferior
    paddingHorizontal: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#2d3748',
    backgroundColor: '#fff',
    flexDirection: 'column',
  },
  // Header distribuido
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    paddingBottom: 15,
  },
  headerLeft: { flex: 1 },
  headerRight: { flex: 1, alignItems: 'flex-end' }, // Logo a la derecha
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  subHeader: {
    fontSize: 10,
    color: colors.gray,
  },
  logo: {
    width: 70,
    height: 70,
    borderRadius: 35,
    objectFit: 'cover',
  },

  // Sección Cliente - Distribuida
  sectionBox: {
    backgroundColor: colors.lightGray,
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderLeftWidth: 5,
    borderLeftColor: colors.accent,
  },
  clientCol: { width: '70%' },
  deptoCol: { 
    width: '25%', 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  label: { fontSize: 8, color: colors.gray, textTransform: 'uppercase', marginBottom: 2, fontWeight: 'bold' },
  value: { fontSize: 11, color: colors.secondary, marginBottom: 8, fontWeight: 'bold' },
  address: { fontSize: 10, color: '#4a5568' },
  deptoNumber: { fontSize: 32, fontWeight: 'bold', color: colors.primary },

  // Sección Medidores - Expandida
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.secondary,
    marginBottom: 10,
    marginTop: 5,
    textTransform: 'uppercase',
    letterSpacing: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 4,
  },
  meterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 20,
  },
  meterCard: {
    flex: 1, // Ocupa espacio igual
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 8,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.1,
  },
  meterImage: {
    width: '100%',
    height: 120, // Más alta
    objectFit: 'cover',
    borderRadius: 4,
    marginBottom: 8,
    backgroundColor: '#edf2f7',
  },
  meterTextRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },

  // Tablas de Cálculo - Distribuidas
  calcContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 30, // Espacio entre columnas
  },
  calcCol: { flex: 1 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
  },
  totalStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    padding: 10,
    borderRadius: 6,
    marginTop: 10,
  },
  totalText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  totalAmount: { color: 'white', fontWeight: 'bold', fontSize: 16 },

  // Footer Estilizado (Sticky bottom visualmente)
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 90,
    flexDirection: 'row',
  },
  footerLeft: {
    width: '65%',
    backgroundColor: '#f1f5f9',
    padding: 20,
    justifyContent: 'center',
    borderTopRightRadius: 20,
  },
  footerRight: {
    width: '35%',
    backgroundColor: colors.secondary,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'flex-end',
    borderTopLeftRadius: 20,
  },
  footerLabel: { fontSize: 8, color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' },
  footerValue: { fontSize: 10, color: '#334155', marginTop: 2 },
  footerContactTitle: { fontSize: 10, color: '#94a3b8', fontWeight: 'bold' },
  footerContactPhone: { fontSize: 16, color: 'white', fontWeight: 'bold', marginTop: 4 },
});

const FacturaPDF = ({ 
  departamento, edificio, lecturaAnterior, lecturaActual, tarifa, banco, unidad, calculos, logoUrl 
}) => {
  const currency = (amount) => `$${Number(amount).toFixed(2)}`;
  const dateStr = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>FACTURA DE GAS</Text>
            <Text style={styles.subHeader}>Contrato: {edificio.id_contrato}</Text>
            <Text style={styles.subHeader}>Emisión: {dateStr}</Text>
          </View>
          <View style={styles.headerRight}>
            {logoUrl && <Image src={logoUrl} style={styles.logo} />}
          </View>
        </View>

        {/* DATOS CLIENTE */}
        <View style={styles.sectionBox}>
          <View style={styles.clientCol}>
            <Text style={styles.label}>Titular del Servicio</Text>
            <Text style={styles.value}>{departamento.titular_depto}</Text>
            <Text style={styles.label}>Dirección de Suministro</Text>
            <Text style={styles.address}>
              {edificio.calle} #{edificio.numero}, {edificio.colonia}. {edificio.delegacion} CP: {edificio.cp || 'N/A'}
            </Text>
          </View>
          <View style={styles.deptoCol}>
            <Text style={styles.label}>DEPTO</Text>
            <Text style={styles.deptoNumber}>{departamento.no_depto}</Text>
          </View>
        </View>

        {/* MEDIDORES */}
        <Text style={styles.sectionTitle}>Lecturas del Medidor</Text>
        <View style={styles.meterContainer}>
          <View style={styles.meterCard}>
            <Text style={[styles.label, { textAlign: 'center' }]}>Lectura Anterior</Text>
            {lecturaAnterior?.url ? (
               <Image src={lecturaAnterior.url} style={styles.meterImage} />
            ) : <View style={[styles.meterImage, {backgroundColor:'#eee'}]} />}
            <View style={styles.meterTextRow}>
              <Text style={{fontSize:9}}>{new Date(lecturaAnterior.fecha_lectura).toLocaleDateString()}</Text>
              <Text style={{fontWeight:'bold'}}>{lecturaAnterior.valor_lectura} m³</Text>
            </View>
          </View>

          <View style={styles.meterCard}>
            <Text style={[styles.label, { textAlign: 'center', color: colors.primary }]}>Lectura Actual</Text>
            {lecturaActual?.url ? (
               <Image src={lecturaActual.url} style={styles.meterImage} />
            ) : <View style={[styles.meterImage, {backgroundColor:'#eee'}]} />}
            <View style={styles.meterTextRow}>
               <Text style={{fontSize:9}}>{new Date(lecturaActual.fecha_lectura).toLocaleDateString()}</Text>
               <Text style={{fontWeight:'bold', color: colors.primary}}>{lecturaActual.valor_lectura} m³</Text>
            </View>
          </View>
        </View>

        {/* CÁLCULOS */}
        <View style={styles.calcContainer}>
          {/* Columna Izquierda: Consumo */}
          <View style={styles.calcCol}>
            <Text style={styles.sectionTitle}>Detalles de Consumo</Text>
            <View style={styles.row}>
               <Text>Lectura Final:</Text><Text>{lecturaActual.valor_lectura}</Text>
            </View>
            <View style={styles.row}>
               <Text>Lectura Inicial:</Text><Text>{lecturaAnterior.valor_lectura}</Text>
            </View>
            <View style={styles.row}>
               <Text style={{fontWeight:'bold', color:colors.primary}}>Consumo Periodo:</Text>
               <Text style={{fontWeight:'bold', color:colors.primary}}>{calculos.consumo_lectura.toFixed(2)} m³</Text>
            </View>
            <View style={styles.row}>
               <Text>Factor Conversión:</Text><Text>{tarifa.factor}</Text>
            </View>
            <View style={styles.row}>
               <Text>Precio Unitario:</Text><Text>{currency(tarifa.precio_m3)}</Text>
            </View>
            <View style={[styles.row, {borderBottomWidth:0, marginTop:5}]}>
               <Text style={{fontWeight:'bold'}}>Importe Gas:</Text>
               <Text style={{fontWeight:'bold'}}>{currency(calculos.importeGas)}</Text>
            </View>
          </View>

          {/* Columna Derecha: Resumen Financiero */}
          <View style={styles.calcCol}>
            <Text style={styles.sectionTitle}>Resumen de Cuenta</Text>
            <View style={styles.row}>
               <Text>Importe Consumo Gas:</Text><Text>{currency(calculos.importeGas)}</Text>
            </View>
            {(calculos.administracion > 0 || calculos.servicios > 0) && (
              <>
                 <View style={styles.row}>
                    <Text>Gastos Administración:</Text><Text>{currency(calculos.administracion)}</Text>
                 </View>
                 <View style={styles.row}>
                    <Text>Otros Servicios:</Text><Text>{currency(calculos.servicios)}</Text>
                 </View>
              </>
            )}
            
            {/* Aquí 'monto' según tu lógica es el total del mes (gas + servicios) */}
            
            {calculos.deuda > 0 && (
               <View style={styles.row}>
                  <Text style={{color: colors.danger}}>Adeudo Anterior:</Text>
                  <Text style={{color: colors.danger}}>{currency(calculos.deuda)}</Text>
               </View>
            )}

            <View style={styles.totalStrip}>
               <Text style={styles.totalText}>TOTAL A PAGAR</Text>
               <Text style={styles.totalAmount}>{currency(calculos.totalPagar)}</Text>
            </View>
          </View>
        </View>

        {/* FOOTER ESTILIZADO */}
        <View style={styles.footerContainer}>
           <View style={styles.footerLeft}>
              <Text style={styles.footerLabel}>DATOS PARA TRANSFERENCIA BANCARIA</Text>
              {banco ? (
                <View style={{marginTop: 5}}>
                  <Text style={[styles.footerValue, {fontWeight:'bold'}]}>{banco.nom_banco}</Text>
                  <Text style={styles.footerValue}>Beneficiario: {banco.nom_responsable}</Text>
                  <Text style={styles.footerValue}>CLABE: {banco.clave_int} | Cuenta: {banco.cuenta}</Text>
                </View>
              ) : <Text style={styles.footerValue}>Sin cuenta asignada</Text>}
           </View>
           <View style={styles.footerRight}>
              <Text style={styles.footerContactTitle}>DUDAS Y ACLARACIONES</Text>
              <Text style={styles.footerContactPhone}>{unidad ? unidad.telefono_1 : 'N/A'}</Text>
           </View>
        </View>

      </Page>
    </Document>
  );
};

export default FacturaPDF;