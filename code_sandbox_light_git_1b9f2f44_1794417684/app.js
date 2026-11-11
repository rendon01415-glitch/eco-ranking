/* ================================================================
   EcoRanking App — Lógica principal
   ================================================================ */

const API = {
  get: async (table, params = '') => {
    const r = await fetch(`tables/${table}?limit=200${params}`);
    return r.json();
  },
  post: async (table, body) => {
    const r = await fetch(`tables/${table}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return r.json();
  },
  patch: async (table, id, body) => {
    const r = await fetch(`tables/${table}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return r.json();
  }
};

/* ── Estado global ── */
let STATE = {
  user: null,
  usuarios: [],
  salones: [],
  puntos: [],
  activeTab: ''
};

/* ================================================================
   UTILIDADES
   ================================================================ */
function fmtPts(n) { return n > 0 ? `+${n}` : `${n}`; }
function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtTime(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}
function initials(name) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}
function avatarClass(rol) {
  return rol === 'administrador' ? 'avatar-admin'
       : rol === 'director'      ? 'avatar-director'
       :                           'avatar-student';
}
function rolLabel(rol) {
  return rol === 'administrador' ? 'Administrador'
       : rol === 'director'      ? 'Director de Grupo'
       :                           'Estudiante';
}

/* ── Toast ── */
function toast(msg, type = 'success') {
  const icons = { success: '✅', error: '❌', warning: '⚠️' };
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type]}</span><span>${msg}</span>`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

/* ── Calcular puntos por estudiante ── */
function ptsEstudiante(estId) {
  return STATE.puntos
    .filter(p => p.estudiante_id === estId)
    .reduce((s, p) => s + (p.puntos || 0), 0);
}

/* ── Calcular puntos por salón (recalculado desde eventos) ── */
function ptsSalon(salonId) {
  return STATE.puntos
    .filter(p => p.salon_id === salonId)
    .reduce((s, p) => s + (p.puntos || 0), 0);
}

/* ── Eventos de un salón ── */
function eventosSalon(salonId) {
  return STATE.puntos
    .filter(p => p.salon_id === salonId)
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}

/* ── Eventos de un estudiante ── */
function eventosEstudiante(estId) {
  return STATE.puntos
    .filter(p => p.estudiante_id === estId)
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}

/* ── Ranking de salones por categoría ── */
function rankingCategoria(cat) {
  return STATE.salones
    .filter(s => s.categoria === cat && s.activo !== false)
    .map(s => ({ ...s, pts_live: ptsSalon(s.id) }))
    .sort((a, b) => b.pts_live - a.pts_live);
}

/* ── Tipo de evento icon ── */
function eventoIcon(tipo) {
  return tipo === 'reciclaje'    ? '♻️'
       : tipo === 'penalizacion' ? '⛔'
       :                          '⭐';
}
function eventoDot(tipo) {
  return tipo === 'reciclaje'    ? 'dot-recycle'
       : tipo === 'penalizacion' ? 'dot-penalty'
       :                          'dot-bonus';
}
function eventoBadge(tipo) {
  return tipo === 'reciclaje'    ? 'badge-green'
       : tipo === 'penalizacion' ? 'badge-red'
       :                          'badge-amber';
}
function eventoLabel(tipo) {
  return tipo === 'reciclaje' ? 'Reciclaje' : tipo === 'penalizacion' ? 'Penalización' : 'Bonificación';
}

/* ================================================================
   LOGIN
   ================================================================ */
async function initLogin() {
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim().toLowerCase();
    const pass  = document.getElementById('password').value;
    const errEl = document.getElementById('login-error');

    errEl.style.display = 'none';
    const btn = e.target.querySelector('button[type=submit]');
    btn.textContent = 'Verificando…';
    btn.disabled = true;

    try {
      const data = await API.get('usuarios');
      STATE.usuarios = data.data || [];
      const match = STATE.usuarios.find(u =>
        u.email && u.email.toLowerCase() === email && u.password === pass && u.activo !== false
      );

      if (!match) {
        errEl.textContent = 'Email o contraseña incorrectos. Intenta de nuevo.';
        errEl.style.display = 'block';
        btn.textContent = 'Iniciar Sesión';
        btn.disabled = false;
        return;
      }

      STATE.user = match;
      await loadAppData();
      enterApp();

    } catch {
      errEl.textContent = 'Error de conexión. Recarga la página.';
      errEl.style.display = 'block';
      btn.textContent = 'Iniciar Sesión';
      btn.disabled = false;
    }
  });
}

function fillDemo(email, pass) {
  document.getElementById('email').value = email;
  document.getElementById('password').value = pass;
}

/* ================================================================
   CARGA DE DATOS
   ================================================================ */
async function loadAppData() {
  const [sData, pData] = await Promise.all([
    API.get('salones'),
    API.get('puntos')
  ]);
  STATE.salones = sData.data || [];
  STATE.puntos  = pData.data || [];
}

/* ================================================================
   ENTRAR A LA APP
   ================================================================ */
function enterApp() {
  document.getElementById('login-page').style.display = 'none';
  const app = document.getElementById('app-page');
  app.classList.add('visible');

  const u = STATE.user;

  // Avatar y nombre en navbar
  document.getElementById('nav-avatar').className = `user-avatar ${avatarClass(u.rol)}`;
  document.getElementById('nav-avatar').textContent = initials(u.nombre);
  document.getElementById('nav-name').textContent = u.nombre.split(' ')[0] + ' ' + (u.nombre.split(' ')[1] || '');
  document.getElementById('nav-role').textContent = rolLabel(u.rol);

  // Mostrar tabs según rol
  setupNavTabs();

  // Renderizar primera sección
  const firstTab = document.querySelector('.nav-tab');
  if (firstTab) firstTab.click();
}

function setupNavTabs() {
  const tabsEl = document.getElementById('nav-tabs');
  tabsEl.innerHTML = '';

  const tabs = getTabsForRole(STATE.user.rol);
  tabs.forEach(t => {
    const btn = document.createElement('button');
    btn.className = 'nav-tab';
    btn.dataset.section = t.id;
    btn.innerHTML = `${t.icon} ${t.label}`;
    btn.addEventListener('click', () => switchTab(t.id, btn));
    tabsEl.appendChild(btn);
  });
}

function getTabsForRole(rol) {
  if (rol === 'administrador') return [
    { id: 'admin-dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'admin-ranking',   icon: '🏆', label: 'Rankings' },
    { id: 'admin-salones',   icon: '🏫', label: 'Salones' },
    { id: 'admin-puntos',    icon: '⚡', label: 'Gestionar Puntos' },
    { id: 'admin-historial', icon: '📋', label: 'Historial' },
    { id: 'admin-usuarios',  icon: '👥', label: 'Usuarios' }
  ];
  if (rol === 'director') return [
    { id: 'dir-salon',    icon: '🏫', label: 'Mi Salón' },
    { id: 'dir-ranking',  icon: '🏆', label: 'Ranking General' },
    { id: 'dir-historial',icon: '📋', label: 'Historial' }
  ];
  // estudiante
  return [
    { id: 'est-dashboard', icon: '🌿', label: 'Mis Puntos' },
    { id: 'est-ranking',   icon: '🏆', label: 'Ranking' },
    { id: 'est-historial', icon: '📋', label: 'Mi Historial' }
  ];
}

function switchTab(sectionId, btn) {
  document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  const sec = document.getElementById(sectionId);
  if (sec) {
    sec.classList.add('active');
    renderSection(sectionId);
  }
  STATE.activeTab = sectionId;
}

/* ================================================================
   RENDER DISPATCH
   ================================================================ */
function renderSection(id) {
  const renders = {
    'est-dashboard' : renderEstDashboard,
    'est-ranking'   : renderEstRanking,
    'est-historial' : renderEstHistorial,
    'dir-salon'     : renderDirSalon,
    'dir-ranking'   : renderDirRanking,
    'dir-historial' : renderDirHistorial,
    'admin-dashboard': renderAdminDashboard,
    'admin-ranking'  : renderAdminRanking,
    'admin-salones'  : renderAdminSalones,
    'admin-puntos'   : renderAdminPuntos,
    'admin-historial': renderAdminHistorial,
    'admin-usuarios' : renderAdminUsuarios
  };
  if (renders[id]) renders[id]();
}

/* ================================================================
   VISTAS ESTUDIANTE
   ================================================================ */
function renderEstDashboard() {
  const u = STATE.user;
  const total = ptsEstudiante(u.id);
  const eventos = eventosEstudiante(u.id);
  const reciclajes  = eventos.filter(e => e.tipo === 'reciclaje').length;
  const penaliz     = eventos.filter(e => e.tipo === 'penalizacion').length;

  // Posición en salón
  const salonId = STATE.salones.find(s => s.nombre === u.salon)?.id;
  const compañeros = STATE.usuarios.filter(ux => ux.salon === u.salon && ux.rol === 'estudiante' && ux.id !== u.id);
  const todosEst = [...compañeros, u].map(ex => ({
    id: ex.id, nombre: ex.nombre,
    pts: ptsEstudiante(ex.id)
  })).sort((a, b) => b.pts - a.pts);
  const posicion = todosEst.findIndex(e => e.id === u.id) + 1;

  const sec = document.getElementById('est-dashboard');
  sec.innerHTML = `
    <div class="student-hero">
      <p style="color:rgba(255,255,255,.75);font-size:.88rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Bienvenido/a</p>
      <h2>${u.nombre}</h2>
      <div style="display:flex;align-items:baseline;gap:8px;margin:12px 0 4px;">
        <div class="hero-pts" id="hero-pts-anim">0 <span>pts</span></div>
      </div>
      <p class="hero-sub">Salón <strong>${u.salon}</strong> · Grado ${u.grado} · Categoría ${u.categoria === 'A' ? '🌱 A (1°-5°)' : '🎓 B (6°-11°)'}</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card stat-green">
        <div class="stat-icon">♻️</div>
        <div class="stat-value">${reciclajes}</div>
        <div class="stat-label">Reciclajes</div>
        <div class="stat-sub">Depósitos válidos</div>
      </div>
      <div class="stat-card stat-amber">
        <div class="stat-icon">🏅</div>
        <div class="stat-value">#${posicion}</div>
        <div class="stat-label">Posición en salón</div>
        <div class="stat-sub">Entre ${todosEst.length} estudiantes</div>
      </div>
      <div class="stat-card stat-blue">
        <div class="stat-icon">⭐</div>
        <div class="stat-value">${total}</div>
        <div class="stat-label">Puntos totales</div>
        <div class="stat-sub">Este periodo</div>
      </div>
      <div class="stat-card stat-red">
        <div class="stat-icon">⛔</div>
        <div class="stat-value">${penaliz}</div>
        <div class="stat-label">Penalizaciones</div>
        <div class="stat-sub">Registradas</div>
      </div>
    </div>

    <div class="grid-2" style="gap:20px;margin-top:20px;">
      <div class="card">
        <div class="card-header"><h3>🏅 Tu posición en el salón ${u.salon}</h3></div>
        <div class="card-body">
          <div class="ranking-list">${todosEst.slice(0,6).map((e, i) => `
            <div class="ranking-item ${e.id === u.id ? 'mine' : ''} ${i < 3 ? 'rank-'+(i+1) : ''}">
              <div class="rank-position ${['pos-1','pos-2','pos-3'][i] || 'pos-n'}">${i < 3 ? ['🥇','🥈','🥉'][i] : i+1}</div>
              <div class="rank-info">
                <div class="rank-name">${e.nombre} ${e.id === u.id ? '<span class="badge badge-green" style="font-size:.68rem;">Tú</span>' : ''}</div>
              </div>
              <div class="rank-points">
                <div class="rank-pts-value">${e.pts}</div>
                <div class="rank-pts-label">pts</div>
              </div>
            </div>`).join('')}
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h3>📋 Últimos eventos</h3></div>
        <div class="card-body" style="padding-top:8px;">
          ${eventos.length === 0 ? `<div class="empty-state"><div class="empty-icon">♻️</div><p>Aún no tienes eventos registrados</p></div>` :
            eventos.slice(0,5).map(e => `
            <div class="event-item">
              <div class="event-dot ${eventoDot(e.tipo)}">${eventoIcon(e.tipo)}</div>
              <div class="event-info">
                <div class="event-title">${e.descripcion || e.material || eventoLabel(e.tipo)}</div>
                <div class="event-meta">${fmtDate(e.fecha)} · ${fmtTime(e.fecha)}</div>
              </div>
              <div class="event-pts ${e.puntos >= 0 ? 'pts-pos' : 'pts-neg'}">${fmtPts(e.puntos)}</div>
            </div>`).join('')}
        </div>
      </div>
    </div>
  `;

  // Animación de puntos
  animateNumber('hero-pts-anim', 0, total, ' <span>pts</span>');
}

function animateNumber(elId, from, to, suffix = '') {
  const el = document.getElementById(elId);
  if (!el) return;
  const dur = 700, fps = 30;
  const steps = dur / (1000 / fps);
  const inc = (to - from) / steps;
  let cur = from;
  const int = setInterval(() => {
    cur += inc;
    if ((inc >= 0 && cur >= to) || (inc < 0 && cur <= to)) {
      el.innerHTML = to + suffix;
      clearInterval(int);
    } else {
      el.innerHTML = Math.round(cur) + suffix;
    }
  }, 1000 / fps);
}

function renderEstRanking() {
  const u = STATE.user;
  const mySalon = STATE.salones.find(s => s.nombre === u.salon);
  const ranking = rankingCategoria(u.categoria);
  const maxPts = ranking[0]?.pts_live || 1;

  document.getElementById('est-ranking').innerHTML = `
    <div class="page-header">
      <h2>🏆 Ranking – Categoría ${u.categoria === 'A' ? '🌱 A (Grados 1° a 5°)' : '🎓 B (Grados 6° a 11°)'}</h2>
      <p>Posición de tu salón frente a los demás en tu categoría</p>
    </div>

    <div class="card">
      <div class="card-header">
        <h3>Clasificación de Salones</h3>
        ${mySalon ? `<span class="badge badge-green">Tu salón: <strong>${u.salon}</strong> · ${ptsSalon(mySalon.id)} pts</span>` : ''}
      </div>
      <div class="card-body">
        <div class="ranking-list">
          ${ranking.map((s, i) => `
            <div class="ranking-item ${s.nombre === u.salon ? 'mine' : ''} ${i < 3 ? 'rank-'+(i+1) : ''}">
              <div class="rank-position ${['pos-1','pos-2','pos-3'][i] || 'pos-n'}">${i < 3 ? ['🥇','🥈','🥉'][i] : i+1}</div>
              <div class="rank-info">
                <div class="rank-name">
                  Salón ${s.nombre}
                  ${s.nombre === u.salon ? '<span class="badge badge-green" style="font-size:.68rem;margin-left:6px;">Tu salón</span>' : ''}
                </div>
                <div class="rank-sub">Grado ${s.grado} · ${s.total_eventos || 0} depósitos</div>
              </div>
              <div style="flex:1;max-width:160px;">
                <div class="rank-bar-wrap"><div class="rank-bar" style="width:${Math.round((s.pts_live/maxPts)*100)}%"></div></div>
              </div>
              <div class="rank-points">
                <div class="rank-pts-value">${s.pts_live}</div>
                <div class="rank-pts-label">pts</div>
              </div>
            </div>`).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderEstHistorial() {
  const u = STATE.user;
  const eventos = eventosEstudiante(u.id);

  document.getElementById('est-historial').innerHTML = `
    <div class="page-header">
      <h2>📋 Mi Historial de Reciclaje</h2>
      <p>Todos tus eventos registrados en el sistema EcoRanking</p>
    </div>

    <div class="card">
      <div class="card-header">
        <h3>📌 Mis Eventos (${eventos.length})</h3>
        <span class="badge badge-green">${ptsEstudiante(u.id)} pts totales</span>
      </div>
      <div style="overflow-x:auto;">
        <table class="eco-table">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Material / Descripción</th>
              <th>Fecha</th>
              <th>Hora</th>
              <th class="text-right">Puntos</th>
            </tr>
          </thead>
          <tbody>
            ${eventos.length === 0 ? `<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--gray-400);">Sin eventos registrados</td></tr>` :
              eventos.map(e => `
              <tr>
                <td><span class="badge ${eventoBadge(e.tipo)}">${eventoIcon(e.tipo)} ${eventoLabel(e.tipo)}</span></td>
                <td>${e.descripcion || e.material || '—'}</td>
                <td>${fmtDate(e.fecha)}</td>
                <td>${fmtTime(e.fecha)}</td>
                <td class="text-right fw-8 ${e.puntos >= 0 ? 'pts-pos' : 'pts-neg'}">${fmtPts(e.puntos)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/* ================================================================
   VISTAS DIRECTOR DE GRUPO
   ================================================================ */
function getMiSalon() {
  const u = STATE.user;
  return STATE.salones.find(s => s.nombre === u.salon);
}

function getEstudiantesSalon(salonNombre) {
  return STATE.usuarios.filter(u => u.salon === salonNombre && u.rol === 'estudiante');
}

function renderDirSalon() {
  const u = STATE.user;
  const salon = getMiSalon();
  if (!salon) {
    document.getElementById('dir-salon').innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>No se encontró tu salón asignado</p></div>`;
    return;
  }

  const estudiantes = getEstudiantesSalon(salon.nombre)
    .map(e => ({ ...e, pts: ptsEstudiante(e.id) }))
    .sort((a, b) => b.pts - a.pts);

  const totalSalon = ptsSalon(salon.id);
  const totalEventos = eventosSalon(salon.id).length;
  const maxPts = estudiantes[0]?.pts || 1;

  document.getElementById('dir-salon').innerHTML = `
    <div class="page-header">
      <h2>🏫 Salón ${salon.nombre} — Grado ${salon.grado}</h2>
      <p>Vista completa de tu salón: puntos por estudiante y estadísticas del grupo</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card stat-green">
        <div class="stat-icon">⭐</div>
        <div class="stat-value">${totalSalon}</div>
        <div class="stat-label">Puntos del salón</div>
        <div class="stat-sub">Total acumulado</div>
      </div>
      <div class="stat-card stat-blue">
        <div class="stat-icon">🎒</div>
        <div class="stat-value">${estudiantes.length}</div>
        <div class="stat-label">Estudiantes</div>
        <div class="stat-sub">En el salón</div>
      </div>
      <div class="stat-card stat-amber">
        <div class="stat-icon">♻️</div>
        <div class="stat-value">${totalEventos}</div>
        <div class="stat-label">Total depósitos</div>
        <div class="stat-sub">Registrados</div>
      </div>
      <div class="stat-card stat-green">
        <div class="stat-icon">🏅</div>
        <div class="stat-value">${Math.round(totalSalon / (estudiantes.length || 1))}</div>
        <div class="stat-label">Promedio/estudiante</div>
        <div class="stat-sub">Puntos por persona</div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3>🏆 Ranking del Salón ${salon.nombre}</h3>
        <span class="badge badge-teal">Categoría ${salon.categoria}</span>
      </div>
      <div style="overflow-x:auto;">
        <table class="eco-table">
          <thead>
            <tr>
              <th>Pos.</th>
              <th>Estudiante</th>
              <th>Reciclajes</th>
              <th>Penaliz.</th>
              <th>Progreso</th>
              <th class="text-right">Puntos</th>
            </tr>
          </thead>
          <tbody>
            ${estudiantes.length === 0
              ? `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--gray-400);">Sin estudiantes registrados</td></tr>`
              : estudiantes.map((e, i) => {
                const evts = eventosEstudiante(e.id);
                const rec  = evts.filter(x => x.tipo === 'reciclaje').length;
                const pen  = evts.filter(x => x.tipo === 'penalizacion').length;
                const pct  = Math.round((e.pts / maxPts) * 100);
                return `<tr>
                  <td><div class="rank-position ${['pos-1','pos-2','pos-3'][i] || 'pos-n'}" style="width:28px;height:28px;font-size:.82rem;">${i < 3 ? ['🥇','🥈','🥉'][i] : i+1}</div></td>
                  <td>
                    <div style="display:flex;align-items:center;gap:10px;">
                      <div class="user-avatar avatar-student" style="width:30px;height:30px;font-size:.75rem;flex-shrink:0;">${initials(e.nombre)}</div>
                      <div class="fw-7">${e.nombre}</div>
                    </div>
                  </td>
                  <td><span class="badge badge-green">${rec}</span></td>
                  <td><span class="badge badge-red">${pen}</span></td>
                  <td><div class="rank-bar-wrap" style="width:100px;"><div class="rank-bar" style="width:${pct}%"></div></div></td>
                  <td class="text-right fw-8" style="color:var(--green-700)">${e.pts}</td>
                </tr>`;
              }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderDirRanking() {
  const u = STATE.user;
  const rankA = rankingCategoria('A');
  const rankB = rankingCategoria('B');
  const maxA  = rankA[0]?.pts_live || 1;
  const maxB  = rankB[0]?.pts_live || 1;

  function buildRankHTML(ranking, max, myS) {
    return ranking.map((s, i) => `
      <div class="ranking-item ${s.nombre === myS ? 'mine' : ''} ${i < 3 ? 'rank-'+(i+1) : ''}">
        <div class="rank-position ${['pos-1','pos-2','pos-3'][i] || 'pos-n'}">${i < 3 ? ['🥇','🥈','🥉'][i] : i+1}</div>
        <div class="rank-info">
          <div class="rank-name">Salón ${s.nombre} ${s.nombre === myS ? '<span class="badge badge-green" style="font-size:.68rem;margin-left:4px;">Tu salón</span>' : ''}</div>
          <div class="rank-sub">Grado ${s.grado} · ${s.total_eventos || 0} depósitos</div>
        </div>
        <div style="flex:1;max-width:140px;">
          <div class="rank-bar-wrap"><div class="rank-bar" style="width:${Math.round((s.pts_live/max)*100)}%"></div></div>
        </div>
        <div class="rank-points">
          <div class="rank-pts-value">${s.pts_live}</div>
          <div class="rank-pts-label">pts</div>
        </div>
      </div>`).join('');
  }

  document.getElementById('dir-ranking').innerHTML = `
    <div class="page-header">
      <h2>🏆 Ranking General de Todos los Salones</h2>
      <p>Clasificación por categoría en el periodo activo</p>
    </div>

    <div class="grid-2" style="gap:20px;">
      <div class="card">
        <div class="card-header"><h3>🌱 Categoría A — Grados 1° a 5°</h3></div>
        <div class="card-body">
          <div class="ranking-list">${buildRankHTML(rankA, maxA, u.salon)}</div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>🎓 Categoría B — Grados 6° a 11°</h3></div>
        <div class="card-body">
          <div class="ranking-list">${buildRankHTML(rankB, maxB, u.salon)}</div>
        </div>
      </div>
    </div>
  `;
}

function renderDirHistorial() {
  const salon = getMiSalon();
  if (!salon) return;
  const eventos = eventosSalon(salon.id);

  document.getElementById('dir-historial').innerHTML = `
    <div class="page-header">
      <h2>📋 Historial del Salón ${salon.nombre}</h2>
      <p>Todos los eventos de reciclaje, bonificaciones y penalizaciones del salón</p>
    </div>

    <div class="card">
      <div class="card-header">
        <h3>Eventos registrados (${eventos.length})</h3>
        <span class="badge badge-green">${ptsSalon(salon.id)} pts totales</span>
      </div>
      <div style="overflow-x:auto;">
        <table class="eco-table">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Estudiante</th>
              <th>Material / Descripción</th>
              <th>Fecha</th>
              <th class="text-right">Puntos</th>
            </tr>
          </thead>
          <tbody>
            ${eventos.length === 0
              ? `<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--gray-400);">Sin eventos</td></tr>`
              : eventos.map(e => `
                <tr>
                  <td><span class="badge ${eventoBadge(e.tipo)}">${eventoIcon(e.tipo)} ${eventoLabel(e.tipo)}</span></td>
                  <td>${e.estudiante_nombre || '—'}</td>
                  <td>${e.descripcion || e.material || '—'}</td>
                  <td>${fmtDate(e.fecha)} ${fmtTime(e.fecha)}</td>
                  <td class="text-right fw-8 ${e.puntos >= 0 ? 'pts-pos' : 'pts-neg'}">${fmtPts(e.puntos)}</td>
                </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/* ================================================================
   VISTAS ADMINISTRADOR
   ================================================================ */
function renderAdminDashboard() {
  const totalPuntos = STATE.puntos.reduce((s, p) => s + (p.puntos > 0 ? p.puntos : 0), 0);
  const totalEventos = STATE.puntos.length;
  const totalSalones = STATE.salones.length;
  const totalUsuarios = STATE.usuarios.length;
  const penalizaciones = STATE.puntos.filter(p => p.tipo === 'penalizacion').length;
  const bonificaciones = STATE.puntos.filter(p => p.tipo === 'bonificacion').length;

  const rankA = rankingCategoria('A');
  const rankB = rankingCategoria('B');

  document.getElementById('admin-dashboard').innerHTML = `
    <div class="page-header">
      <h2>📊 Panel de Administración — EcoRanking</h2>
      <p>Vista general del programa de reciclaje escolar</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card stat-green">
        <div class="stat-icon">⭐</div>
        <div class="stat-value">${totalPuntos}</div>
        <div class="stat-label">Puntos otorgados</div>
        <div class="stat-sub">Total en el periodo</div>
      </div>
      <div class="stat-card stat-blue">
        <div class="stat-icon">♻️</div>
        <div class="stat-value">${totalEventos}</div>
        <div class="stat-label">Eventos registrados</div>
        <div class="stat-sub">Reciclajes + ajustes</div>
      </div>
      <div class="stat-card stat-amber">
        <div class="stat-icon">🏫</div>
        <div class="stat-value">${totalSalones}</div>
        <div class="stat-label">Salones activos</div>
        <div class="stat-sub">Participando</div>
      </div>
      <div class="stat-card stat-red">
        <div class="stat-icon">⛔</div>
        <div class="stat-value">${penalizaciones}</div>
        <div class="stat-label">Penalizaciones</div>
        <div class="stat-sub">${bonificaciones} bonificaciones</div>
      </div>
    </div>

    <div class="grid-2" style="gap:20px;">
      <div class="card">
        <div class="card-header"><h3>🌱 Top 3 — Categoría A (1°-5°)</h3></div>
        <div class="card-body">
          <div class="ranking-list">
            ${rankA.slice(0,3).map((s, i) => `
              <div class="ranking-item rank-${i+1}">
                <div class="rank-position ${['pos-1','pos-2','pos-3'][i]}">${['🥇','🥈','🥉'][i]}</div>
                <div class="rank-info"><div class="rank-name">Salón ${s.nombre}</div><div class="rank-sub">Grado ${s.grado}</div></div>
                <div class="rank-points"><div class="rank-pts-value">${s.pts_live}</div><div class="rank-pts-label">pts</div></div>
              </div>`).join('')}
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>🎓 Top 3 — Categoría B (6°-11°)</h3></div>
        <div class="card-body">
          <div class="ranking-list">
            ${rankB.slice(0,3).map((s, i) => `
              <div class="ranking-item rank-${i+1}">
                <div class="rank-position ${['pos-1','pos-2','pos-3'][i]}">${['🥇','🥈','🥉'][i]}</div>
                <div class="rank-info"><div class="rank-name">Salón ${s.nombre}</div><div class="rank-sub">Grado ${s.grado}</div></div>
                <div class="rank-points"><div class="rank-pts-value">${s.pts_live}</div><div class="rank-pts-label">pts</div></div>
              </div>`).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderAdminRanking() {
  const rankA = rankingCategoria('A');
  const rankB = rankingCategoria('B');
  const maxA  = rankA[0]?.pts_live || 1;
  const maxB  = rankB[0]?.pts_live || 1;

  function buildTable(ranking, max) {
    return `<div class="ranking-list">
      ${ranking.map((s, i) => `
        <div class="ranking-item ${i < 3 ? 'rank-'+(i+1) : ''}">
          <div class="rank-position ${['pos-1','pos-2','pos-3'][i] || 'pos-n'}">${i < 3 ? ['🥇','🥈','🥉'][i] : i+1}</div>
          <div class="rank-info">
            <div class="rank-name">Salón ${s.nombre}</div>
            <div class="rank-sub">Grado ${s.grado} · Dir: ${s.director_nombre || '—'} · ${eventosSalon(s.id).length} eventos</div>
          </div>
          <div style="flex:1;max-width:160px;">
            <div class="rank-bar-wrap"><div class="rank-bar" style="width:${Math.round((s.pts_live/max)*100)}%"></div></div>
          </div>
          <div class="rank-points">
            <div class="rank-pts-value">${s.pts_live}</div>
            <div class="rank-pts-label">pts</div>
          </div>
        </div>`).join('')}
    </div>`;
  }

  document.getElementById('admin-ranking').innerHTML = `
    <div class="page-header">
      <h2>🏆 Rankings Completos</h2>
      <p>Clasificación de todos los salones del colegio por categoría</p>
    </div>
    <div class="grid-2" style="gap:20px;">
      <div class="card">
        <div class="card-header"><h3>🌱 Categoría A — Grados 1° a 5°</h3><span class="badge badge-blue">${rankA.length} salones</span></div>
        <div class="card-body">${buildTable(rankA, maxA)}</div>
      </div>
      <div class="card">
        <div class="card-header"><h3>🎓 Categoría B — Grados 6° a 11°</h3><span class="badge badge-teal">${rankB.length} salones</span></div>
        <div class="card-body">${buildTable(rankB, maxB)}</div>
      </div>
    </div>
  `;
}

function renderAdminSalones() {
  const salones = [...STATE.salones].sort((a, b) => a.grado - b.grado || a.nombre.localeCompare(b.nombre));

  document.getElementById('admin-salones').innerHTML = `
    <div class="page-header">
      <h2>🏫 Gestión de Salones</h2>
      <p>Estado y puntuación de todos los salones del colegio</p>
    </div>
    <div class="card">
      <div class="card-header"><h3>Todos los salones (${salones.length})</h3></div>
      <div style="overflow-x:auto;">
        <table class="eco-table">
          <thead>
            <tr>
              <th>Salón</th>
              <th>Grado</th>
              <th>Categoría</th>
              <th>Director</th>
              <th>Eventos</th>
              <th class="text-right">Puntos</th>
            </tr>
          </thead>
          <tbody>
            ${salones.map(s => {
              const pts = ptsSalon(s.id);
              const evts = eventosSalon(s.id).length;
              return `<tr>
                <td class="fw-7">Salón ${s.nombre}</td>
                <td>Grado ${s.grado}</td>
                <td><span class="badge ${s.categoria === 'A' ? 'badge-blue cat-a' : 'badge-teal cat-b'}">Cat. ${s.categoria}</span></td>
                <td>${s.director_nombre || '—'}</td>
                <td>${evts}</td>
                <td class="text-right fw-8" style="color:var(--green-700)">${pts}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/* ── Admin: Gestionar Puntos (penalizaciones / bonificaciones) ── */
function renderAdminPuntos() {
  const salones = STATE.salones.filter(s => s.activo !== false);
  const estPorSalon = {};
  salones.forEach(s => {
    estPorSalon[s.id] = STATE.usuarios.filter(u => u.salon === s.nombre && u.rol === 'estudiante');
  });

  document.getElementById('admin-puntos').innerHTML = `
    <div class="page-header">
      <h2>⚡ Gestión de Puntos</h2>
      <p>Aplica penalizaciones o bonificaciones a estudiantes o salones completos</p>
    </div>

    <div class="grid-2" style="gap:20px;align-items:start;">
      <!-- Formulario nuevo ajuste -->
      <div class="card">
        <div class="card-header"><h3>➕ Aplicar Ajuste de Puntos</h3></div>
        <div class="card-body">
          <div class="form-group">
            <label>Tipo de ajuste</label>
            <select id="adj-tipo" onchange="onAdjTipoChange()">
              <option value="penalizacion">⛔ Penalización (quitar puntos)</option>
              <option value="bonificacion">⭐ Bonificación (agregar puntos)</option>
            </select>
          </div>
          <div class="form-group">
            <label>Salón</label>
            <select id="adj-salon" onchange="onAdjSalonChange()">
              <option value="">— Seleccionar salón —</option>
              ${salones.map(s => `<option value="${s.id}">${s.nombre} (Grado ${s.grado})</option>`).join('')}
            </select>
          </div>
          <div class="form-group" id="adj-est-group" style="display:none;">
            <label>Estudiante <span class="text-muted">(opcional — dejar en blanco para aplicar al salón)</span></label>
            <select id="adj-estudiante">
              <option value="">— Todo el salón —</option>
            </select>
          </div>
          <div class="form-group">
            <label>Puntos a aplicar</label>
            <input type="number" id="adj-puntos" min="1" max="500" placeholder="Ej: 10" value="10" />
            <div class="input-hint" id="adj-puntos-hint" style="color:var(--red-500);">Se restarán del total del salón / estudiante</div>
          </div>
          <div class="form-group">
            <label>Motivo / Descripción</label>
            <textarea id="adj-motivo" rows="3" placeholder="Describe el motivo de la penalización o bonificación…"></textarea>
          </div>
          <button class="btn btn-primary" onclick="aplicarAjuste()">Aplicar Ajuste</button>
        </div>
      </div>

      <!-- Últimos ajustes aplicados -->
      <div class="card">
        <div class="card-header"><h3>📋 Ajustes Recientes</h3></div>
        <div class="card-body" id="ajustes-recientes" style="padding-top:8px;">
          ${buildAjustesRecientes()}
        </div>
      </div>
    </div>
  `;
}

function buildAjustesRecientes() {
  const ajustes = STATE.puntos
    .filter(p => p.tipo === 'penalizacion' || p.tipo === 'bonificacion')
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    .slice(0, 10);

  if (ajustes.length === 0) return `<div class="empty-state"><div class="empty-icon">📝</div><p>Sin ajustes aplicados aún</p></div>`;

  return ajustes.map(e => `
    <div class="event-item">
      <div class="event-dot ${eventoDot(e.tipo)}">${eventoIcon(e.tipo)}</div>
      <div class="event-info">
        <div class="event-title">${e.descripcion || '—'}</div>
        <div class="event-meta">
          ${e.estudiante_nombre ? `👤 ${e.estudiante_nombre} · ` : ''}
          🏫 Salón ${e.salon_nombre} · ${fmtDate(e.fecha)}
        </div>
      </div>
      <div class="event-pts ${e.puntos >= 0 ? 'pts-pos' : 'pts-neg'} fw-8">${fmtPts(e.puntos)}</div>
    </div>`).join('');
}

function onAdjTipoChange() {
  const tipo  = document.getElementById('adj-tipo').value;
  const hint  = document.getElementById('adj-puntos-hint');
  const input = document.getElementById('adj-puntos');
  if (tipo === 'penalizacion') {
    hint.style.color = 'var(--red-500)';
    hint.textContent = 'Se restarán del total del salón / estudiante';
    input.style.borderColor = 'var(--red-400)';
  } else {
    hint.style.color = 'var(--green-600)';
    hint.textContent = 'Se sumarán al total del salón / estudiante';
    input.style.borderColor = 'var(--green-400)';
  }
}

function onAdjSalonChange() {
  const salonId = document.getElementById('adj-salon').value;
  const grupo   = document.getElementById('adj-est-group');
  const sel     = document.getElementById('adj-estudiante');

  if (!salonId) { grupo.style.display = 'none'; return; }

  const salon = STATE.salones.find(s => s.id === salonId);
  const ests  = salon ? STATE.usuarios.filter(u => u.salon === salon.nombre && u.rol === 'estudiante') : [];

  sel.innerHTML = '<option value="">— Todo el salón —</option>' +
    ests.map(e => `<option value="${e.id}">${e.nombre}</option>`).join('');
  grupo.style.display = 'block';
}

async function aplicarAjuste() {
  const tipo     = document.getElementById('adj-tipo').value;
  const salonId  = document.getElementById('adj-salon').value;
  const estId    = document.getElementById('adj-estudiante').value;
  const ptsRaw   = parseInt(document.getElementById('adj-puntos').value) || 0;
  const motivo   = document.getElementById('adj-motivo').value.trim();

  if (!salonId) { toast('Selecciona un salón', 'error'); return; }
  if (ptsRaw <= 0) { toast('Ingresa una cantidad de puntos válida', 'error'); return; }
  if (!motivo) { toast('Ingresa el motivo del ajuste', 'error'); return; }

  const salon = STATE.salones.find(s => s.id === salonId);
  const est   = estId ? STATE.usuarios.find(u => u.id === estId) : null;
  const ptsFinal = tipo === 'penalizacion' ? -ptsRaw : ptsRaw;

  const nuevoEvento = {
    id: 'adj-' + Date.now(),
    tipo,
    salon_id: salonId,
    salon_nombre: salon.nombre,
    grado: salon.grado,
    estudiante_id: est ? est.id : '',
    estudiante_nombre: est ? est.nombre : `Salón ${salon.nombre} (colectivo)`,
    material: '-',
    puntos: ptsFinal,
    descripcion: motivo,
    registrado_por: STATE.user.id,
    fecha: new Date().toISOString()
  };

  try {
    await API.post('puntos', nuevoEvento);
    STATE.puntos.push(nuevoEvento);

    toast(
      tipo === 'penalizacion'
        ? `⛔ Penalización de ${ptsRaw} pts aplicada a ${est ? est.nombre : 'Salón ' + salon.nombre}`
        : `⭐ Bonificación de ${ptsRaw} pts aplicada a ${est ? est.nombre : 'Salón ' + salon.nombre}`,
      tipo === 'penalizacion' ? 'warning' : 'success'
    );

    // Limpiar form
    document.getElementById('adj-salon').value = '';
    document.getElementById('adj-estudiante').value = '';
    document.getElementById('adj-puntos').value = '10';
    document.getElementById('adj-motivo').value = '';
    document.getElementById('adj-est-group').style.display = 'none';

    // Re-render
    renderAdminPuntos();
    if (STATE.activeTab === 'admin-dashboard') renderAdminDashboard();
    if (STATE.activeTab === 'admin-ranking') renderAdminRanking();

  } catch {
    toast('Error al guardar el ajuste', 'error');
  }
}

function renderAdminHistorial() {
  const todos = [...STATE.puntos].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  document.getElementById('admin-historial').innerHTML = `
    <div class="page-header">
      <h2>📋 Historial Completo del Sistema</h2>
      <p>Todos los eventos de reciclaje, bonificaciones y penalizaciones registrados</p>
    </div>

    <div class="card">
      <div class="card-header">
        <h3>Total de eventos: ${todos.length}</h3>
        <div style="display:flex;gap:8px;">
          <span class="badge badge-green">♻️ ${todos.filter(e=>e.tipo==='reciclaje').length} reciclajes</span>
          <span class="badge badge-red">⛔ ${todos.filter(e=>e.tipo==='penalizacion').length} penalizaciones</span>
          <span class="badge badge-amber">⭐ ${todos.filter(e=>e.tipo==='bonificacion').length} bonificaciones</span>
        </div>
      </div>
      <div style="overflow-x:auto;">
        <table class="eco-table">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Salón</th>
              <th>Estudiante</th>
              <th>Descripción</th>
              <th>Fecha</th>
              <th>Por</th>
              <th class="text-right">Puntos</th>
            </tr>
          </thead>
          <tbody>
            ${todos.length === 0
              ? `<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--gray-400);">Sin registros</td></tr>`
              : todos.map(e => `
              <tr>
                <td><span class="badge ${eventoBadge(e.tipo)}">${eventoIcon(e.tipo)} ${eventoLabel(e.tipo)}</span></td>
                <td class="fw-7">Salón ${e.salon_nombre || '—'}</td>
                <td>${e.estudiante_nombre || '—'}</td>
                <td style="max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${e.descripcion || e.material || '—'}</td>
                <td>${fmtDate(e.fecha)} ${fmtTime(e.fecha)}</td>
                <td style="font-size:.8rem;color:var(--gray-400);">${e.registrado_por === 'admin-001' ? '🛡️ Admin' : e.registrado_por === 'Sistema IoT' ? '🤖 IoT' : e.registrado_por}</td>
                <td class="text-right fw-8 ${e.puntos >= 0 ? 'pts-pos' : 'pts-neg'}">${fmtPts(e.puntos)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderAdminUsuarios() {
  const users = [...STATE.usuarios].sort((a, b) => {
    const order = { administrador: 0, director: 1, estudiante: 2 };
    return order[a.rol] - order[b.rol] || a.nombre.localeCompare(b.nombre);
  });

  document.getElementById('admin-usuarios').innerHTML = `
    <div class="page-header">
      <h2>👥 Gestión de Usuarios</h2>
      <p>Todos los usuarios registrados en el sistema</p>
    </div>

    <div class="card">
      <div class="card-header">
        <h3>Usuarios (${users.length})</h3>
        <div style="display:flex;gap:8px;">
          <span class="badge badge-red">🛡️ ${users.filter(u=>u.rol==='administrador').length} admin</span>
          <span class="badge badge-blue">📚 ${users.filter(u=>u.rol==='director').length} directores</span>
          <span class="badge badge-green">🎒 ${users.filter(u=>u.rol==='estudiante').length} estudiantes</span>
        </div>
      </div>
      <div style="overflow-x:auto;">
        <table class="eco-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Rol</th>
              <th>Email</th>
              <th>Salón</th>
              <th>Grado</th>
              <th>Cat.</th>
              <th class="text-right">Puntos</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(u => `
              <tr>
                <td>
                  <div style="display:flex;align-items:center;gap:10px;">
                    <div class="user-avatar ${avatarClass(u.rol)}" style="width:30px;height:30px;font-size:.75rem;flex-shrink:0;">${initials(u.nombre)}</div>
                    <span class="fw-7">${u.nombre}</span>
                  </div>
                </td>
                <td>
                  <span class="badge ${u.rol==='administrador' ? 'badge-red' : u.rol==='director' ? 'badge-blue' : 'badge-green'}">
                    ${u.rol==='administrador' ? '🛡️ Admin' : u.rol==='director' ? '📚 Director' : '🎒 Estudiante'}
                  </span>
                </td>
                <td style="font-size:.85rem;color:var(--gray-500);">${u.email}</td>
                <td>${u.salon || '—'}</td>
                <td>${u.grado || '—'}</td>
                <td>${u.categoria ? `<span class="badge ${u.categoria==='A'?'cat-a badge-blue':'cat-b badge-teal'}">Cat.${u.categoria}</span>` : '—'}</td>
                <td class="text-right fw-8" style="color:var(--green-700)">${u.rol==='estudiante' ? ptsEstudiante(u.id) : u.rol==='director' ? '—' : '—'}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/* ================================================================
   LOGOUT
   ================================================================ */
function logout() {
  STATE.user = null;
  STATE.puntos = [];
  STATE.salones = [];
  document.getElementById('app-page').classList.remove('visible');
  document.getElementById('login-page').style.display = 'flex';
  document.getElementById('email').value = '';
  document.getElementById('password').value = '';
  document.getElementById('login-error').style.display = 'none';
}

/* ================================================================
   INIT
   ================================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initLogin();
  document.getElementById('btn-logout').addEventListener('click', logout);
});
