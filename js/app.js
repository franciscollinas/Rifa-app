const DB = firebase.database();
const NUMEROS_REF = DB.ref('rifa/numeros');
const GANADOR_REF = DB.ref('rifa/ganador');
const CONFIG_REF = DB.ref('rifa/config');

const PRECIO_BOLETA = 20000;
const TOTAL_NUMEROS = 100;

let numeroSeleccionado = null;

function inicializarBase() {
  NUMEROS_REF.once('value').then(snapshot => {
    if (!snapshot.exists()) {
      const initial = {};
      for (let i = 0; i < TOTAL_NUMEROS; i++) {
        const key = i.toString().padStart(2, '0');
        initial[key] = {
          estado: 'disponible',
          comprador: null,
          fecha_compra: null,
          fecha_pago: null
        };
      }
      NUMEROS_REF.set(initial);

      CONFIG_REF.set({
        precio_boleta: PRECIO_BOLETA,
        total_boletas: TOTAL_NUMEROS,
        beneficiario: 'Hotel Avadia del Mar'
      });
    }
  });
}

NUMEROS_REF.on('value', snapshot => {
  const data = snapshot.val();
  if (data) {
    generarGrilla(data);
    renderizarLista(data);
  }
});

GANADOR_REF.on('value', snapshot => {
  const ganador = snapshot.val();
  const seccion = document.getElementById('seccion-ganador');
  if (seccion) {
    if (ganador && ganador.numero) {
      seccion.style.display = 'block';
      document.getElementById('ganador-numero').textContent = `N° ${ganador.numero}`;
      document.getElementById('ganador-nombre').textContent = ganador.nombre || '';
    } else {
      seccion.style.display = 'none';
    }
  }
});

function generarGrilla(data) {
  const grid = document.getElementById('grid-numeros');
  grid.innerHTML = '';

  let disponibles = 0;

  for (let i = 0; i < TOTAL_NUMEROS; i++) {
    const key = i.toString().padStart(2, '0');
    const item = data[key] || { estado: 'disponible' };
    const estado = item.estado;

    const celda = document.createElement('div');
    celda.classList.add('numero-celda', estado);
    celda.textContent = key;
    celda.dataset.numero = key;

    if (estado === 'disponible') {
      celda.addEventListener('click', () => seleccionarNumero(key));
      disponibles++;
    }

    grid.appendChild(celda);
  }

  const countEl = document.getElementById('disponibles-count');
  if (countEl) countEl.textContent = disponibles;
  actualizarBotonCompra();
}

function renderizarLista(data) {
  const lista = document.getElementById('rifa-lista');
  if (!lista) return;
  lista.innerHTML = '';
  for (let i = 0; i < TOTAL_NUMEROS; i++) {
    const key = i.toString().padStart(2, '0');
    const item = data[key] || { estado: 'disponible', comprador: null };
    const div = document.createElement('div');
    div.className = `lista-item ${item.estado}`;
    div.innerHTML = `
      <span class="lista-numero">${key}</span>
      <span class="lista-nombre">${item.comprador?.nombre || '—'}</span>
    `;
    lista.appendChild(div);
  }
}

function seleccionarNumero(numero) {
  if (numeroSeleccionado) {
    const anterior = document.querySelector(`[data-numero="${numeroSeleccionado}"]`);
    if (anterior) anterior.classList.remove('seleccionado');
  }

  if (numeroSeleccionado === numero) {
    numeroSeleccionado = null;
    actualizarBotonCompra();
    return;
  }

  numeroSeleccionado = numero;
  const celda = document.querySelector(`[data-numero="${numero}"]`);
  if (celda) celda.classList.add('seleccionado');
  actualizarBotonCompra();
}

function actualizarBotonCompra() {
  const btn = document.getElementById('btn-comprar');
  const infoSeleccion = document.getElementById('info-seleccion');
  if (!btn || !infoSeleccion) return;

  if (numeroSeleccionado) {
    btn.disabled = false;
    btn.textContent = `Apartar número ${numeroSeleccionado}`;
    infoSeleccion.textContent = `Número seleccionado: ${numeroSeleccionado}`;
  } else {
    btn.disabled = true;
    btn.textContent = 'Selecciona un número primero';
    infoSeleccion.textContent = 'Ningún número seleccionado';
  }
}

function abrirModal() {
  if (!numeroSeleccionado) return;
  document.getElementById('modal-numero-display').textContent = numeroSeleccionado;
  document.getElementById('modal-compra').classList.add('activo');
  const celda = document.querySelector(`[data-numero="${numeroSeleccionado}"]`);
  if (celda) celda.classList.add('en-proceso');
  document.body.style.overflow = 'hidden';
}

function cerrarModal() {
  document.getElementById('modal-compra').classList.remove('activo');
  if (numeroSeleccionado) {
    const celda = document.querySelector(`[data-numero="${numeroSeleccionado}"]`);
    if (celda) celda.classList.remove('en-proceso');
  }
  document.getElementById('form-compra').reset();
  const errorEl = document.getElementById('modal-error');
  errorEl.classList.remove('visible');
  errorEl.textContent = '';
  document.body.style.overflow = '';
}

function mostrarError(mensaje) {
  const errorEl = document.getElementById('modal-error');
  errorEl.textContent = mensaje;
  errorEl.classList.add('visible');
}

async function manejarEnvio(event) {
  event.preventDefault();
  const form = event.target;
  const btnConfirmar = document.getElementById('btn-confirmar');

  const datos = {
    nombre: form.nombre.value.trim(),
    telefono: form.telefono.value.trim(),
    correo: form.correo.value.trim()
  };

  if (!datos.nombre || !datos.telefono || !datos.correo) {
    mostrarError('Por favor completa todos los campos.');
    return;
  }

  btnConfirmar.disabled = true;
  btnConfirmar.textContent = 'Procesando...';

  const numero = numeroSeleccionado;
  const numRef = DB.ref(`rifa/numeros/${numero}`);

  try {
    const result = await numRef.transaction(current => {
      if (!current || current.estado !== 'disponible') {
        return;
      }
      return {
        estado: 'reservado',
        comprador: {
          nombre: datos.nombre,
          telefono: datos.telefono,
          correo: datos.correo
        },
        fecha_compra: firebase.database.ServerValue.TIMESTAMP,
        fecha_pago: null
      };
    });

    if (!result.committed) {
      mostrarError('Este número ya fue tomado. Selecciona otro.');
      btnConfirmar.disabled = false;
      btnConfirmar.textContent = 'Apartar número';
      return;
    }

    cerrarModal();
    numeroSeleccionado = null;
    actualizarBotonCompra();

    mostrarTiquete({
      numero,
      nombre: datos.nombre,
      telefono: datos.telefono,
      correo: datos.correo,
      id_confirmacion: `AVD-${Date.now()}`
    });

  } catch (error) {
    console.error('Error al reservar:', error);
    mostrarError('Error de conexión. Intenta de nuevo.');
    btnConfirmar.disabled = false;
    btnConfirmar.textContent = 'Apartar número';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  inicializarBase();

  document.getElementById('btn-comprar').addEventListener('click', abrirModal);
  document.getElementById('btn-cancelar-modal').addEventListener('click', cerrarModal);
  document.getElementById('form-compra').addEventListener('submit', manejarEnvio);

  document.getElementById('modal-compra').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-compra')) cerrarModal();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') cerrarModal();
  });
});
