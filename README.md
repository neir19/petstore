# Entrega de Automatización de Pruebas de Rendimiento - K6

Este repositorio contiene la solución técnica, scripts de carga, insumos de datos, validaciones de SLAs y reportes automáticos para la prueba de rendimiento del servicio de autenticación (`/auth/login`) provisto mediante la API pública de **FakestoreAPI**, implementada **exclusivamente con Grafana k6**.

---

## 1. Especificación de Tecnologías y Versiones

| Tecnología / Herramienta | Versión Utilizada | Propósito |
| :--- | :--- | :--- |
| **Grafana k6** | `v2.3.0` (darwin/arm64) | Motor de pruebas de rendimiento, aserciones, métricas y reportes |
| **Node.js** | `v26.7.0` | Servidor mock auxiliar para pruebas locales y reproducibilidad |
| **Sistema Operativo** | macOS Sonoma / Darwin ARM64 | Entorno base de ejecución |

---

## 2. Estructura del Proyecto

```text
entrega/
├── script.js                 # Script principal en k6 con validación de SLAs y métricas
├── mock_server.js            # Servidor mock local en Node.js para reproducibilidad controlada
├── data/
│   ├── users.csv             # Dataset parametrizado con credenciales de prueba
│   └── users_raw.csv         # Dataset original sin normalizar (evidencia de análisis)
├── reports/
│   ├── reporte.html          # Dashboard interactivo HTML autónomo de resultados
│   ├── reporte.json          # Métricas brutas exportadas en JSON por k6
│   └── ejecucion_consola.txt # Log capturado de la ejecución en consola
├── conclusiones.txt          # Informe técnico de hallazgos, SLAs y conclusiones
└── README.md                 # Documentación técnica e instrucciones de reproducción
```

---

## 3. Requerimientos y Criterios de Aceptación (SLAs)

A partir de la petición cURL suministrada en el enunciado:

```bash
curl --location --max-time 60 'https://fakestoreapi.com/auth/login' \
--header 'Content-Type: application/json' \
--data '{
    "username": "user",
    "password": "passwd"
}'
```

Se definieron e implementaron las siguientes validaciones y umbrales (Thresholds) en `script.js`:

1. **Tiempo de respuesta permitido:** Máximo **1.5 segundos** (1500 ms).
   - Configurado en k6: `http_req_duration: ['max<1500', 'p(95)<1500']`
   - Validación funcional por iteración: `check(res, { 'Tiempo de respuesta <= 1500ms': (r) => r.timings.duration <= 1500 })`
2. **Tasa de error aceptable:** Menor al **3%** del total de peticiones (`< 0.03`).
   - Configurado en k6: `http_req_failed: ['rate<0.03']`
   - Validación funcional de autenticación: Verificación de código HTTP 200 y presencia de token JWT en el cuerpo JSON de respuesta.
3. **Timeout de conexión:** 60 segundos (`timeout: '60s'`), en concordancia con el parámetro `--max-time 60` del cURL.

---

## 4. Instrucciones de Reproducción con K6

### 4.1. Prerrequisitos
Verificar la instalación de `k6`:
```bash
k6 version
# Salida esperada: k6 v2.3.0 o superior
```

Si no está instalado en macOS:
```bash
brew install k6
```

### 4.2. Ejecución de la Prueba
Ejecutar la prueba de rendimiento contra el endpoint oficial:
```bash
k6 run script.js
```

Para personalizar los usuarios virtuales (VUs) o la duración de la prueba:
```bash
k6 run --vus 5 --duration 20s script.js
```

### 4.3. Visualización de Reportes
Tras finalizar la ejecución, se generan automáticamente los reportes en la carpeta `reports/`:
* **Reporte HTML Interactivo:**
  ```bash
  open reports/reporte.html
  ```
  Permite visualizar tarjetas KPI, estado de cumplimiento de SLAs, tablas de validaciones (checks), desglose de latencias (min, med, avg, p90, p95, max) y métricas de transferencia.
* **Métricas en JSON:**
  El archivo `reports/reporte.json` almacena la telemetría detallada para integraciones CI/CD.
* **Salida de Consola:**
  En `reports/ejecucion_consola.txt` se encuentra la captura del log de ejecución en consola.

---

## 5. Ejecución Alternativa con Mock Server Local (Opcional)

Debido a que `fakestoreapi.com` es un servicio público gratuito con alta latencia y caídas intermitentes de Cloudflare (error 522), se incluye un servidor mock local en Node.js que simula el endpoint `/auth/login` con latencias de ~100ms y valida las credenciales de `data/users.csv`:

```bash
# Terminal 1: Iniciar servidor mock
node mock_server.js

# Terminal 2: Ejecutar k6 apuntando al servidor mock local
k6 run -e BASE_URL=http://localhost:3000 script.js
```
En este escenario, se valida que el arnés de pruebas de K6 cumple con el 100% de los SLAs (latencia < 1500 ms y tasa de error < 3%).
