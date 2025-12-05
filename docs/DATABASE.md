# 🗄️ Esquema de Base de Datos

Este diagrama representa las relaciones principales del sistema Admi Gas LP, centrado en la gestión de clientes, ventas y control de créditos.

```mermaid
erDiagram
    %% Entidades Principales
    PERSONAL ||--o{ CARGA_CASA : registra
    PERSONAL ||--o{ CARGA_AUTOTANQUE : audita
    
    CONTRATO ||--|| CASA_HABITACION : ampara
    
    CASA_HABITACION ||--o{ CARGA_CASA : solicita
    CASA_HABITACION ||--|| CUENTAS_POR_COBRAR : tiene
    
    EDIFICIO ||--o{ DEPARTAMENTO : contiene
    EDIFICIO ||--o{ CARGA_EDIFICIO : solicita
    
    %% Flujo de Inventario
    PERSONAL ||--o{ PORCENTAJE_DIARIO : inicia_turno
    PORCENTAJE_DIARIO ||--o{ CARGA_CASA : abastece
    
    %% Flujo Financiero
    CUENTAS_POR_COBRAR ||--o{ MOVIMIENTOS_CREDITO : historial
    CARGA_CASA ||--o{ PAGOS : genera
    
    %% Definiciones de tablas clave (simplificadas)
    CASA_HABITACION {
        bigint id_casa PK
        string nombre_cliente
        string calle
        float latitud
        float longitud
        bigint id_contrato FK
    }

    CARGA_CASA {
        bigint id_carga PK
        date fecha_carga
        numeric consumo_litros
        numeric monto_total
        boolean estado_pago
        bigint id_casa FK
        bigint id_personal FK
    }

    CUENTAS_POR_COBRAR {
        bigint id PK
        bigint id_casa FK
        numeric saldo_actual
    }

    MOVIMIENTOS_CREDITO {
        bigint id PK
        string tipo "CARGO o ABONO"
        numeric monto
        bigint id_cuenta FK
    }