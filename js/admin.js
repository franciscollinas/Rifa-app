const DB = firebase.database();
const AUTH = firebase.auth();
const NUMEROS_REF = DB.ref('rifa/numeros');
const GANADOR_REF = DB.ref('rifa/ganador');

const PRECIO_BOLETA = 20000;
const TOTAL_BOLETAS = 100;
const META_TOTAL = PRECIO_BOLETA * TOTAL_BOLETAS;

let todosLosNumeros = {};
let numerosFiltrados = [];

document.getElementById('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const btn = document.getElementById('btn-login');
  const errorEl = document.getElementById('login-error');

  btn.disabled = true;
  btn.textContent = 'Ingresando...';
  errorEl.classList.remove('visible');

  try {
    await AUTH.signInWithEmailAndPassword(email, password);
  } catch (err) {
    errorEl.textContent = err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password'
      ? 'Correo o contrasena incorrectos.'
      : 'Error de conexion. Verifica Firebase.';
    errorEl.classList.add('visible');
    btn.disabled = false;
    btn.textContent = 'Ingresar al panel';
  }
});

AUTH.onAuthStateChanged(user => {
  if (user) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    document.getElementById('admin-email-display').textContent = user.email;
    const avatar = document.getElementById('admin-avatar');
    if (avatar && user.email) {
      avatar.textContent = iniciales(user.email.split('@')[0].replace(/[._-]/g, ' '));
    }
    iniciarListeners();
  } else {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('dashboard').style.display = 'none';
  }
});

function iniciales(nombre) {
  if (!nombre) return '?';
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

document.getElementById('btn-logout').addEventListener('click', () => {
  AUTH.signOut();
});

function iniciarListeners() {
  NUMEROS_REF.on('value', snapshot => {
    todosLosNumeros = snapshot.val() || {};
    actualizarDashboard();
    renderTabla();
    actualizarSelectGanador();
  });

  GANADOR_REF.on('value', snapshot => {
    const ganador = snapshot.val();
    actualizarCardGanador(ganador);
    actualizarWinnerSection(ganador);
  });
}

function actualizarDashboard() {
  let vendidas = 0;
  let pagadas = 0;
  let pendientes = 0;

  Object.values(todosLosNumeros).forEach(item => {
    if (item.estado === 'reservado') {
      vendidas++;
      pendientes++;
    }
    if (item.estado === 'pagado') {
      vendidas++;
      pagadas++;
    }
  });

  const recaudado = pagadas * PRECIO_BOLETA;
  const pctVendidas = TOTAL_BOLETAS > 0 ? (vendidas / TOTAL_BOLETAS) * 100 : 0;
  const pctRecaudado = META_TOTAL > 0 ? (recaudado / META_TOTAL) * 100 : 0;

  animarNumero('stats-vendidas', vendidas);
  animarNumero('stats-pagadas', pagadas);
  animarNumero('stats-pendientes', pendientes);
  animarNumero('stats-recaudado', recaudado);
  document.getElementById('stats-pct-vendidas').textContent = Math.round(pctVendidas);

  document.getElementById('progress-vendidas').style.width = `${Math.min(pctVendidas, 100)}%`;
  document.getElementById('progress-recaudado').style.width = `${Math.min(pctRecaudado, 100)}%`;
}

function animarNumero(id, valor) {
  const el = document.getElementById(id);
  if (!el) return;
  const formateado = typeof valor === 'number' && id === 'stats-recaudado'
    ? valor.toLocaleString('es-CO')
    : valor;
  el.textContent = formateado;
}

function renderTabla() {
  const tbody = document.getElementById('tabla-cuerpo');
  const vacio = document.getElementById('tabla-vacia');
  const filtro = document.getElementById('filtro-estado').value;
  const busqueda = document.getElementById('buscador').value.toLowerCase().trim();

  tbody.innerHTML = '';

  const entries = Object.entries(todosLosNumeros).filter(([key, item]) => {
    if (filtro !== 'todos' && item.estado !== filtro) return false;
    if (busqueda) {
      const nombre = (item.comprador?.nombre || '').toLowerCase();
      if (!nombre.includes(busqueda) && !key.includes(busqueda)) return false;
    }
    return item.estado !== 'disponible';
  });

  numerosFiltrados = entries;

  if (entries.length === 0) {
    tbody.innerHTML = '';
    vacio.style.display = 'block';
    return;
  }

  vacio.style.display = 'none';

  entries.forEach(([key, item]) => {
    const tr = document.createElement('tr');
    const estadoLabel = item.estado === 'reservado' ? 'Pendiente' : 'Pagado';
    const nombreComprador = item.comprador?.nombre || '—';
    const fecha = item.fecha_compra
      ? new Date(item.fecha_compra).toLocaleDateString('es-CO', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        })
      : '—';

    let acciones = '';
    if (item.estado === 'reservado') {
      acciones = `
        <button class="admin-btn admin-btn-success" onclick="confirmarPago('${key}')">Confirmar pago</button>
        <button class="admin-btn admin-btn-danger" onclick="cancelarNumero('${key}')">Cancelar</button>
      `;
    } else if (item.estado === 'pagado') {
      acciones = `
        <button class="admin-btn admin-btn-danger" onclick="cancelarNumero('${key}')">Cancelar</button>
      `;
    }

    tr.innerHTML = `
      <td><span class="numero-chip">${key}</span></td>
      <td><span class="estado-badge ${item.estado}">${estadoLabel}</span></td>
      <td>
        <div class="comprador-cell">
          <span class="buyer-avatar ${item.estado}">${iniciales(nombreComprador)}</span>
          <span class="buyer-nombre">${nombreComprador}</span>
        </div>
      </td>
      <td>${item.comprador?.telefono || '—'}</td>
      <td>${item.comprador?.correo || '—'}</td>
      <td style="font-size:0.8rem;color:var(--admin-text-sec)">${fecha}</td>
      <td style="display:flex;gap:6px">${acciones}</td>
    `;

    tbody.appendChild(tr);
  });
}

document.getElementById('filtro-estado').addEventListener('change', renderTabla);
document.getElementById('buscador').addEventListener('input', renderTabla);

async function confirmarPago(numero) {
  if (!confirm(`Confirmar pago de la boleta N° ${numero}?`)) return;

  try {
    await DB.ref(`rifa/numeros/${numero}`).update({
      estado: 'pagado',
      fecha_pago: firebase.database.ServerValue.TIMESTAMP
    });
  } catch (err) {
    alert('Error al confirmar pago: ' + err.message);
  }
}

async function cancelarNumero(numero) {
  const item = todosLosNumeros[numero];
  const nombre = item?.comprador?.nombre || 'Desconocido';
  if (!confirm(`Cancelar la boleta N° ${numero} de ${nombre}? Se liberara el numero.`)) return;

  try {
    await DB.ref(`rifa/numeros/${numero}`).set({
      estado: 'disponible',
      comprador: null,
      fecha_compra: null,
      fecha_pago: null
    });
  } catch (err) {
    alert('Error al cancelar: ' + err.message);
  }
}

function actualizarCardGanador(ganador) {
  const numEl = document.getElementById('stats-ganador-numero');
  const nomEl = document.getElementById('stats-ganador-nombre');
  if (ganador && ganador.numero) {
    numEl.textContent = `N° ${ganador.numero}`;
    nomEl.textContent = ganador.nombre || '';
  } else {
    numEl.textContent = '—';
    nomEl.textContent = 'Sin definir';
  }
}

function actualizarWinnerSection(ganador) {
  const section = document.getElementById('winner-actual');
  if (ganador && ganador.numero) {
    section.style.display = 'flex';
    document.getElementById('winner-actual-numero').textContent = `N° ${ganador.numero}`;
    document.getElementById('winner-actual-nombre').textContent = ganador.nombre || '';
    const fecha = ganador.fecha
      ? new Date(ganador.fecha).toLocaleDateString('es-CO', {
          day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
        })
      : '';
    document.getElementById('winner-actual-fecha').textContent = fecha ? `· ${fecha}` : '';
  } else {
    section.style.display = 'none';
  }
}

function actualizarSelectGanador() {
  const select = document.getElementById('select-ganador-manual');
  const currentVal = select.value;
  select.innerHTML = '<option value="">— Seleccionar —</option>';

  Object.entries(todosLosNumeros).forEach(([key, item]) => {
    if (item.estado === 'pagado') {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = `N° ${key} — ${item.comprador?.nombre || 'Sin nombre'}`;
      select.appendChild(opt);
    }
  });

  if (currentVal) select.value = currentVal;
}

async function sortearGanador() {
  const pagados = Object.entries(todosLosNumeros).filter(([, item]) => item.estado === 'pagado');
  if (pagados.length === 0) {
    alert('No hay boletas pagadas para sortear.');
    return;
  }

  const [numero, item] = pagados[Math.floor(Math.random() * pagados.length)];

  try {
    await GANADOR_REF.set({
      numero,
      nombre: item.comprador?.nombre || 'Desconocido',
      fecha: firebase.database.ServerValue.TIMESTAMP,
      metodo: 'aleatorio'
    });
  } catch (err) {
    alert('Error al guardar ganador: ' + err.message);
  }
}

async function asignarGanadorManual() {
  const select = document.getElementById('select-ganador-manual');
  const numero = select.value;
  if (!numero) {
    alert('Selecciona un numero de la lista.');
    return;
  }

  const item = todosLosNumeros[numero];
  if (!item || item.estado !== 'pagado') {
    alert('Este numero no esta pagado.');
    return;
  }

  if (!confirm(`Asignar como ganador a N° ${numero} (${item.comprador?.nombre})?`)) return;

  try {
    await GANADOR_REF.set({
      numero,
      nombre: item.comprador?.nombre || 'Desconocido',
      fecha: firebase.database.ServerValue.TIMESTAMP,
      metodo: 'manual'
    });
  } catch (err) {
    alert('Error al guardar ganador: ' + err.message);
  }
}

async function resetearGanador() {
  if (!confirm('Resetear el ganador actual? Esto no afecta las boletas vendidas.')) return;

  try {
    await GANADOR_REF.set(null);
  } catch (err) {
    alert('Error al resetear ganador: ' + err.message);
  }
}
