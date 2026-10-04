import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { Rate, Trend, Counter } from 'k6/metrics';

// ============================================================================
// MÉTRICAS PERSONALIZADAS
// ============================================================================
const successfulLogins = new Rate('successful_logins');
const failedLogins = new Rate('failed_logins');
const loginDuration = new Trend('login_duration_trend');
const totalAttempts = new Counter('total_login_attempts');

// ============================================================================
// CARGA Y PARAMETRIZACIÓN DE DATOS
// ============================================================================
// Se carga el dataset de usuarios desde el archivo CSV usando SharedArray
// para optimizar el uso de memoria entre los Virtual Users (VUs).
const usersData = new SharedArray('users', function () {
  const fileContent = open('./data/users.csv');
  const lines = fileContent.trim().split('\n');
  const records = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(',');
    if (parts.length >= 2) {
      records.push({
        user: parts[0].trim(),
        passwd: parts[1].trim(),
      });
    }
  }
  return records;
});

// ============================================================================
// CONFIGURACIÓN DE ESCENARIOS Y UMBRALES (THRESHOLDS)
// ============================================================================
// Requerimientos del ejercicio:
// 1. Tiempo de respuesta máximo permitido: 1.5 segundos (1500 ms).
// 2. Tasa de error aceptable: menor al 3% del total de peticiones (< 0.03).
export const options = {
  scenarios: {
    login_load_test: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '5s', target: 5 },   // Ramp-up inicial
        { duration: '15s', target: 10 }, // Carga sostenida con 10 VUs
        { duration: '5s', target: 0 },   // Ramp-down
      ],
      gracefulRampDown: '5s',
    },
  },
  thresholds: {
    // SLA 1: Tiempo de respuesta máximo <= 1500ms y percentil 95 <= 1500ms
    'http_req_duration': ['max<1500', 'p(95)<1500'],
    // SLA 2: Tasa de error de peticiones menor al 3%
    'http_req_failed': ['rate<0.03'],
    // Tasa de éxito en validaciones funcionales (checks)
    'checks': ['rate>0.97'],
    // Métrica personalizada para la duración de login
    'login_duration_trend': ['p(90)<1500', 'max<1500'],
    // Tasa de fallos personalizada menor a 3%
    'failed_logins': ['rate<0.03'],
  },
};

// ============================================================================
// EJECUCIÓN PRINCIPAL DEL TEST
// ============================================================================
export default function () {
  // Selección de usuario de forma round-robin combinando VU e iteración
  const userIndex = (__VU * 100 + __ITER) % usersData.length;
  const currentUser = usersData[userIndex];

  const baseUrl = __ENV.BASE_URL || 'https://fakestoreapi.com';
  const url = `${baseUrl}/auth/login`;
  const payload = JSON.stringify({
    username: currentUser.user,
    password: currentUser.passwd,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: '60s', // max-time 60 segundos según requerimiento cURL
    tags: { name: 'POST_auth_login' },
  };

  totalAttempts.add(1);

  // Ejecución de la petición HTTP POST
  const res = http.post(url, payload, params);

  // Registro en métricas personalizadas
  loginDuration.add(res.timings.duration);

  // Validaciones del ejercicio (Checks)
  let hasValidToken = false;
  try {
    const body = JSON.parse(res.body);
    hasValidToken = body && typeof body.token === 'string' && body.token.length > 0;
  } catch (e) {
    hasValidToken = false;
  }

  const passedChecks = check(res, {
    'Código de respuesta es 200': (r) => r.status === 200,
    'Tiempo de respuesta <= 1500ms': (r) => r.timings.duration <= 1500,
    'Respuesta contiene token válido': () => hasValidToken,
  });

  const isSuccess = res.status === 200 && res.timings.duration <= 1500 && hasValidToken;
  successfulLogins.add(isSuccess);
  failedLogins.add(!isSuccess);

  // Pausa (pacing / think time) entre iteraciones
  sleep(1);
}

// ============================================================================
// GENERACIÓN DE REPORTES AUTÓNOMOS (HTML, JSON y CONSOLA)
// ============================================================================
export function handleSummary(data) {
  return {
    'reports/reporte.html': generateHtmlReport(data),
    'reports/reporte.json': JSON.stringify(data, null, 2),
    stdout: generateConsoleSummary(data),
  };
}

// Generador de resumen para consola
function generateConsoleSummary(data) {
  const reqs = data.metrics.http_reqs ? data.metrics.http_reqs.values.count : 0;
  const failedReqs = data.metrics.http_req_failed ? (data.metrics.http_req_failed.values.rate * 100).toFixed(2) : 0;
  const avgDuration = data.metrics.http_req_duration ? data.metrics.http_req_duration.values.avg.toFixed(2) : 0;
  const maxDuration = data.metrics.http_req_duration ? data.metrics.http_req_duration.values.max.toFixed(2) : 0;
  const p95Duration = data.metrics.http_req_duration ? (data.metrics.http_req_duration.values['p(95)'] || 0).toFixed(2) : 0;

  return `
================================================================================
                    RESUMEN DE EJECUCIÓN - PRUEBA DE RENDIMIENTO
================================================================================
  Total de peticiones HTTP: ${reqs}
  Tasa de error HTTP:       ${failedReqs}% (Límite permitido: < 3.00%)
  Tiempo promedio:          ${avgDuration} ms
  Tiempo percentil 95:      ${p95Duration} ms (Límite permitido: <= 1500 ms)
  Tiempo máximo registrado: ${maxDuration} ms (Límite permitido: <= 1500 ms)
--------------------------------------------------------------------------------
  Reporte HTML generado en:  reports/reporte.html
  Reporte JSON generado en:  reports/reporte.json
================================================================================\n`;
}

// Generador autónomo de reporte HTML interactivo con estilos modernos
function generateHtmlReport(data) {
  const m = data.metrics;
  const totalReqs = m.http_reqs ? m.http_reqs.values.count : 0;
  const reqRate = m.http_reqs ? m.http_reqs.values.rate.toFixed(2) : 0;
  
  const failRate = m.http_req_failed ? (m.http_req_failed.values.rate * 100).toFixed(2) : '0.00';
  const failPasses = m.http_req_failed ? m.http_req_failed.values.passes : 0;
  const failFails = m.http_req_failed ? m.http_req_failed.values.fails : 0;

  const durationAvg = m.http_req_duration ? m.http_req_duration.values.avg.toFixed(2) : '0.00';
  const durationMin = m.http_req_duration ? m.http_req_duration.values.min.toFixed(2) : '0.00';
  const durationMed = m.http_req_duration ? m.http_req_duration.values.med.toFixed(2) : '0.00';
  const durationMax = m.http_req_duration ? m.http_req_duration.values.max.toFixed(2) : '0.00';
  const durationP90 = m.http_req_duration && m.http_req_duration.values['p(90)'] ? m.http_req_duration.values['p(90)'].toFixed(2) : '0.00';
  const durationP95 = m.http_req_duration && m.http_req_duration.values['p(95)'] ? m.http_req_duration.values['p(95)'].toFixed(2) : '0.00';

  const checksRate = m.checks ? (m.checks.values.rate * 100).toFixed(2) : '100.00';
  const checksPasses = m.checks ? m.checks.values.passes : 0;
  const checksFails = m.checks ? m.checks.values.fails : 0;

  // Evaluación general de thresholds
  let allThresholdsPassed = true;
  const thresholdRows = [];
  
  if (data.thresholds) {
    for (const [key, thresh] of Object.entries(data.thresholds)) {
      const ok = thresh.ok;
      if (!ok) allThresholdsPassed = false;
      thresholdRows.push(`
        <tr>
          <td style="font-weight: 600; font-family: monospace;">${escapeHtml(key)}</td>
          <td><span class="badge ${ok ? 'badge-success' : 'badge-danger'}">${ok ? 'PASSED' : 'FAILED'}</span></td>
        </tr>
      `);
    }
  }

  // Desglose de checks
  const checkRows = [];
  if (data.root_group && data.root_group.checks) {
    for (const chk of data.root_group.checks) {
      const rate = ((chk.passes / (chk.passes + chk.fails || 1)) * 100).toFixed(1);
      const isOk = chk.fails === 0;
      checkRows.push(`
        <tr>
          <td>${escapeHtml(chk.name)}</td>
          <td style="text-align: right; color: #16a34a; font-weight: 600;">${chk.passes}</td>
          <td style="text-align: right; color: ${chk.fails > 0 ? '#dc2626' : '#6b7280'}; font-weight: 600;">${chk.fails}</td>
          <td style="text-align: right;">${rate}%</td>
          <td style="text-align: center;"><span class="badge ${isOk ? 'badge-success' : 'badge-danger'}">${isOk ? '100%' : 'FALLÓ'}</span></td>
        </tr>
      `);
    }
  }

  const generatedDate = new Date().toLocaleString();

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reporte de Rendimiento - K6 Login Test</title>
  <style>
    :root {
      --primary: #4f46e5;
      --primary-light: #eef2ff;
      --success: #16a34a;
      --success-bg: #dcfce7;
      --danger: #dc2626;
      --danger-bg: #fee2e2;
      --warning: #d97706;
      --warning-bg: #fef3c7;
      --text: #1f2937;
      --text-muted: #6b7280;
      --bg: #f9fafb;
      --card-bg: #ffffff;
      --border: #e5e7eb;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.5;
      padding: 2rem 1rem;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    header {
      background: var(--card-bg);
      border-radius: 12px;
      padding: 1.75rem 2rem;
      border: 1px solid var(--border);
      margin-bottom: 2rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }
    h1 { font-size: 1.5rem; font-weight: 700; color: #111827; }
    .subtitle { font-size: 0.875rem; color: var(--text-muted); margin-top: 0.25rem; }
    .badge {
      display: inline-block;
      padding: 0.35rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.8125rem;
      font-weight: 700;
      letter-spacing: 0.05em;
    }
    .badge-success { background: var(--success-bg); color: var(--success); }
    .badge-danger { background: var(--danger-bg); color: var(--danger); }
    .badge-warning { background: var(--warning-bg); color: var(--warning); }
    
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.25rem;
      margin-bottom: 2rem;
    }
    .card {
      background: var(--card-bg);
      padding: 1.5rem;
      border-radius: 12px;
      border: 1px solid var(--border);
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .card-title {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      font-weight: 600;
      margin-bottom: 0.5rem;
    }
    .card-value {
      font-size: 1.875rem;
      font-weight: 700;
      color: #111827;
    }
    .card-sub {
      font-size: 0.8125rem;
      color: var(--text-muted);
      margin-top: 0.25rem;
    }
    .section-title {
      font-size: 1.125rem;
      font-weight: 700;
      margin-bottom: 1rem;
      color: #111827;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }
    th, td {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border);
      text-align: left;
    }
    th {
      background: #f8fafc;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      font-size: 0.75rem;
      letter-spacing: 0.05em;
    }
    tr:last-child td { border-bottom: none; }
    .two-cols {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    @media (max-width: 768px) {
      .two-cols { grid-template-columns: 1fr; }
    }
    .info-list { list-style: none; }
    .info-list li {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0;
      border-bottom: 1px dashed var(--border);
      font-size: 0.875rem;
    }
    .info-list li:last-child { border-bottom: none; }
    .info-label { color: var(--text-muted); }
    .info-value { font-weight: 600; font-family: monospace; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <h1>Reporte de Pruebas de Rendimiento - K6</h1>
        <div class="subtitle">API: <code>https://fakestoreapi.com/auth/login</code> | Ejecutado: ${generatedDate}</div>
      </div>
      <div>
        <span class="badge ${allThresholdsPassed ? 'badge-success' : 'badge-danger'}" style="font-size: 1rem; padding: 0.5rem 1.25rem;">
          ${allThresholdsPassed ? 'ESTADO: CUMPLE SLAs' : 'ESTADO: SLA NO SUPERADO'}
        </span>
      </div>
    </header>

    <div class="grid">
      <div class="card">
        <div class="card-title">Total Peticiones</div>
        <div class="card-value">${totalReqs}</div>
        <div class="card-sub">${reqRate} peticiones / seg</div>
      </div>
      <div class="card">
        <div class="card-title">Tasa de Error (SLA &lt; 3%)</div>
        <div class="card-value" style="color: ${parseFloat(failRate) < 3 ? 'var(--success)' : 'var(--danger)'};">
          ${failRate}%
        </div>
        <div class="card-sub">${failPasses} fallidas / ${totalReqs} totales</div>
      </div>
      <div class="card">
        <div class="card-title">Tiempo P95 (SLA &le; 1.5s)</div>
        <div class="card-value" style="color: ${parseFloat(durationP95) <= 1500 ? 'var(--success)' : 'var(--danger)'};">
          ${durationP95} ms
        </div>
        <div class="card-sub">Límite SLA: 1500 ms</div>
      </div>
      <div class="card">
        <div class="card-title">Tiempo Máximo</div>
        <div class="card-value" style="color: ${parseFloat(durationMax) <= 1500 ? 'var(--success)' : 'var(--danger)'};">
          ${durationMax} ms
        </div>
        <div class="card-sub">Promedio: ${durationAvg} ms</div>
      </div>
    </div>

    <div class="two-cols">
      <div class="card">
        <div class="section-title">Validaciones Funcionales (Checks)</div>
        <table>
          <thead>
            <tr>
              <th>Validación</th>
              <th style="text-align: right;">Éxitos</th>
              <th style="text-align: right;">Fallos</th>
              <th style="text-align: right;">Efectividad</th>
              <th style="text-align: center;">Estado</th>
            </tr>
          </thead>
          <tbody>
            ${checkRows.join('')}
          </tbody>
        </table>
      </div>

      <div class="card">
        <div class="section-title">Evaluación de Criterios (Thresholds)</div>
        <table>
          <thead>
            <tr>
              <th>Criterio / Métrica</th>
              <th>Resultado</th>
            </tr>
          </thead>
          <tbody>
            ${thresholdRows.join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="two-cols">
      <div class="card">
        <div class="section-title">Desglose Estadístico de Latencias</div>
        <ul class="info-list">
          <li><span class="info-label">Tiempo Mínimo:</span><span class="info-value">${durationMin} ms</span></li>
          <li><span class="info-label">Tiempo Mediana (p50):</span><span class="info-value">${durationMed} ms</span></li>
          <li><span class="info-label">Tiempo Promedio:</span><span class="info-value">${durationAvg} ms</span></li>
          <li><span class="info-label">Percentil 90 (p90):</span><span class="info-value">${durationP90} ms</span></li>
          <li><span class="info-label">Percentil 95 (p95):</span><span class="info-value">${durationP95} ms</span></li>
          <li><span class="info-label">Tiempo Máximo:</span><span class="info-value">${durationMax} ms</span></li>
        </ul>
      </div>

      <div class="card">
        <div class="section-title">Detalles de la Configuración</div>
        <ul class="info-list">
          <li><span class="info-label">Herramienta:</span><span class="info-value">Grafana k6 v2.3.0</span></li>
          <li><span class="info-label">Método y Endpoint:</span><span class="info-value">POST /auth/login</span></li>
          <li><span class="info-label">Timeout configurado:</span><span class="info-value">60 segundos</span></li>
          <li><span class="info-label">Archivo de datos:</span><span class="info-value">data/users.csv (5 usuarios)</span></li>
          <li><span class="info-label">Tasa de éxito global:</span><span class="info-value">${checksRate}%</span></li>
        </ul>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
