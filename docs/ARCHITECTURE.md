```markdown
# 🏗 Arquitectura del Sistema y Base de Datos

## 📂 Estructura del Proyecto
El proyecto sigue una arquitectura modular basada en características (*Feature-based*) para facilitar la escalabilidad.

```text
src/
├── assets/          # Recursos estáticos (Logos, Vectores)
├── components/      # Bloques de UI reutilizables
│   ├── ui/          # Botones, Inputs, Cards genéricos
│   └── maps/        # Componentes de Leaflet (Marcadores, MapaBase)
├── context/         # Estado Global (AuthContext, TurnoContext)
├── hooks/           # Lógica encapsulada (useLocation, useVentas)
├── pages/           # Vistas principales (Ruteo)
├── services/        # Capa de comunicación con Supabase
└── utils/           # Funciones puras (formatearMoneda, fechas)

💾 Esquema de Base de Datos (Relacional)
El sistema utiliza PostgreSQL hospedado en Supabase. A continuación se describen los módulos de datos principales.

1. Módulo de Clientes (casa_habitacion)
Almacena la información de los puntos de venta.

Relación: Un contrato tiene una casa_habitacion.

Geospatial: Se almacenan latitud y longitud (Float) para integración con mapas.

Validación: El id_contrato es único para evitar duplicidad.

2. Módulo de Ventas (carga_casa / carga_edificio)
Registra cada transacción de gas.

Datos clave: consumo_litros, monto_total, tipo_pago.

Relaciones:

id_personal: Quién realizó la venta.

id_porcentaje: Vincula la venta al inventario del turno actual.

3. Módulo de Inventario (porcentaje_diario y carga_autotanque)
Controla el flujo de gas dentro de la unidad repartidora.

Lógica:

Inventario Final = Inventario Inicial + Recargas (Carburación) - Ventas Totales

Evidencia: Almacena URLs de fotos (url_inicial, url_final) en Supabase Storage para auditoría visual.

4. Módulo Financiero (cuentas_por_cobrar y movimientos_credito)
Sistema contable simplificado para gestión de deuda.

Tabla movimientos_credito: Funciona como un libro mayor (Ledger).

Tipo: CARGO (Aumenta deuda) o ABONO (Disminuye deuda).

Integridad: Se vincula a id_carga para trazabilidad de qué venta generó la deuda.

🔒 Seguridad y Roles
La autenticación se maneja vía app_users vinculado a auth.users de Supabase.

Row Level Security (RLS): Las políticas de acceso aseguran que los choferes solo vean sus rutas y ventas del día.