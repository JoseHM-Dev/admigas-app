# 🔥 Admi Gas LP - Sistema de Gestión Logística y POS

![React](https://img.shields.io/badge/React-18-blue?logo=react)
![Vite](https://img.shields.io/badge/Vite-5.0-purple?logo=vite)
![Supabase](https://img.shields.io/badge/Backend-Supabase-green?logo=supabase)
![TailwindCSS](https://img.shields.io/badge/Style-Tailwind-38bdf8?logo=tailwindcss)
![Licencia](https://img.shields.io/badge/Licencia-Privada-red)

## 📖 Descripción del Proyecto
**Admi Gas LP** es una plataforma web progresiva (PWA) diseñada para optimizar la logística, venta y administración de gas LP. El sistema digitaliza el flujo completo de trabajo: desde la geolocalización de clientes residenciales y edificios, hasta el control de inventario en autotanques y facturación.

El objetivo principal es eliminar el uso de papel en rutas, reducir fugas de inventario y agilizar la toma de decisiones con datos en tiempo real.

## 🚀 Funcionalidades Clave

### 📍 Logística y Rutas
* **Geolocalización de Clientes:** Registro preciso de domicilios (`lat`, `long`) usando **Leaflet Maps**.
* **Gestión de Edificios y Deptos:** Módulo especializado para clientes condominales con múltiples tomas de lectura.

### 💰 Punto de Venta (POS)
* **Ventas en Ruta:** Registro de cargas (`carga_casa`, `carga_edificio`) con cálculo automático de totales.
* **Control de Créditos:** Sistema de cuentas por cobrar con historial de movimientos (`cargos` y `abonos`).
* **Tarifas Dinámicas:** Gestión de precios por litro/m3 vigentes por fecha.

### 📊 Inventario y Control
* **Auditoría de Autotanques:** Registro de porcentaje inicial y final (`porcentaje_diario`) con evidencia fotográfica.
* **Cortes de Caja:** Reporte diario de ventas (Efectivo, Transferencia, Crédito).

## 🛠 Stack Tecnológico

| Área | Tecnología | Propósito |
| :--- | :--- | :--- |
| **Frontend** | React 18 + Vite | Interfaz de usuario reactiva y rápida. |
| **Estilos** | Tailwind CSS | Diseño responsivo y moderno. |
| **Backend** | Supabase (PostgreSQL) | Base de datos relacional, Auth y Almacenamiento. |
| **Mapas** | React Leaflet + OSM | Visualización de rutas y domicilios. |
| **Reportes** | jsPDF + AutoTable | Generación de notas y reportes en PDF. |
| **UI Components** | Headless UI / SweetAlert2 | Modales accesibles y notificaciones. |

## 🔧 Instalación y Despliegue Local

1.  **Clonar el repositorio**
    ```bash
    git clone <url-del-repo>
    cd admi-gas-lp
    ```

2.  **Instalar dependencias**
    ```bash
    npm install
    ```

3.  **Configurar Variables de Entorno**
    Crea un archivo `.env` en la raíz con tus credenciales de Supabase:
    ```env
    VITE_SUPABASE_URL=[https://tu-proyecto.supabase.co](https://tu-proyecto.supabase.co)
    VITE_SUPABASE_ANON_KEY=tu-anon-key
    ```

4.  **Ejecutar servidor de desarrollo**
    ```bash
    npm run dev
    ```

## 📸 Flujo de Trabajo (Diagrama)

```mermaid
graph TD
    A[Inicio de Turno] -->|Registro % Inicial| B(Autotanque Activo)
    B --> C{Tipo de Cliente}
    C -->|Casa Habitación| D[Buscar/Crear Cliente en Mapa]
    C -->|Edificio| E[Seleccionar Depto]
    D --> F[Registrar Carga (Litros)]
    E --> F
    F --> G{Método Pago}
    G -->|Contado| H[Cierre Venta]
    G -->|Crédito| I[Cuentas por Cobrar]
    H --> J[Generar Nota PDF]
    I --> J


## 📚 Documentación Adicional

Para más detalles sobre el funcionamiento interno del sistema, consulta:

* [🏗 Arquitectura del Sistema](docs/ARCHITECTURE.md) - Estructura de carpetas y flujo de datos.
* [🗄 Esquema de Base de Datos](docs/DATABASE.md) - Diagrama Entidad-Relación y diccionario de datos.

👤 Autor
José Alfredo Hernández Macedas

Ingeniero en Sistemas Computacionales (UCAD)

Especialista en Desarrollo Web y UX/UI