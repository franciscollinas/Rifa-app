const TOTAL_NUMEROS = 100;

const estadoNumeros = Array.from({ length: TOTAL_NUMEROS }, (_, i) => ({
  numero: i.toString().padStart(2, '0'),
  estado: 'disponible',
  comprador: null
}));

let numeroSeleccionado = null;

function generarGrilla() {
  const grid = document.getElementById('grid-numeros');
  grid.innerHTML = '';

  let disponibles = 0;

  estadoNumeros.forEach(({ numero, estado }) => {
    const celda = document.createElement('div');
    celda.classList.add('numero-celda', estado);
    celda.textContent = numero;
    celda.dataset.numero = numero;

    if (estado === 'disponible') {
      celda.addEventListener('click', () => seleccionarNumero(numero));
      disponibles++;
    }

    grid.appendChild(celda);
  });

  document.getElementById('disponibles-count').textContent = disponibles;
  renderizarLista();
}

function renderizarLista() {
  const lista = document.getElementById('rifa-lista');
  lista.innerHTML = '';
  estadoNumeros.forEach(({ numero, estado, comprador }) => {
    const item = document.createElement('div');
    item.className = `lista-item ${estado}`;
    item.innerHTML = `
      <span class="lista-numero">${numero}</span>
      <span class="lista-nombre">${comprador?.nombre || '—'}</span>
    `;
    lista.appendChild(item);
  });
}

function seleccionarNumero(numero) {
  if (numeroSeleccionado) {
    const anterior = document.querySelector(`[data-numero="${numeroSeleccionado}"]`);
    if (anterior) {
      anterior.classList.remove('seleccionado');
    }
  }

  if (numeroSeleccionado === numero) {
    numeroSeleccionado = null;
    actualizarBotonCompra();
    return;
  }

  numeroSeleccionado = numero;
  const celda = document.querySelector(`[data-numero="${numero}"]`);
  if (celda) {
    celda.classList.add('seleccionado');
  }
  actualizarBotonCompra();
}

function actualizarBotonCompra() {
  const btn = document.getElementById('btn-comprar');
  const infoSeleccion = document.getElementById('info-seleccion');

  if (numeroSeleccionado) {
    btn.disabled = false;
    btn.textContent = `Comprar número ${numeroSeleccionado}`;
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
  if (celda) {
    celda.classList.add('en-proceso');
  }

  document.body.style.overflow = 'hidden';
}

function cerrarModal() {
  document.getElementById('modal-compra').classList.remove('activo');

  if (numeroSeleccionado) {
    const celda = document.querySelector(`[data-numero="${numeroSeleccionado}"]`);
    if (celda) {
      celda.classList.remove('en-proceso');
    }
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

  btnConfirmar.disabled = true;
  btnConfirmar.textContent = 'Procesando...';

  const datos = {
    numero: numeroSeleccionado,
    nombre: form.nombre.value.trim(),
    telefono: form.telefono.value.trim(),
    correo: form.correo.value.trim()
  };

  if (!datos.nombre || !datos.telefono || !datos.correo) {
    mostrarError('Por favor completa todos los campos.');
    btnConfirmar.disabled = false;
    btnConfirmar.textContent = 'Confirmar compra';
    return;
  }

  const resultado = await enviarCompra(datos);

  if (resultado.ok) {
    const idx = parseInt(numeroSeleccionado, 10);
    estadoNumeros[idx].estado = 'reservado';
    estadoNumeros[idx].comprador = datos;

    generarGrilla();

    cerrarModal();

    mostrarTiquete({
      ...datos,
      numero: numeroSeleccionado,
      id_confirmacion: resultado.id_confirmacion
    });

    numeroSeleccionado = null;
    actualizarBotonCompra();
  } else {
    mostrarError('Hubo un error al procesar tu compra. Intenta de nuevo.');
    btnConfirmar.disabled = false;
    btnConfirmar.textContent = 'Confirmar compra';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  generarGrilla();

  document.getElementById('btn-comprar').addEventListener('click', abrirModal);

  document.getElementById('btn-cancelar-modal').addEventListener('click', cerrarModal);

  document.getElementById('form-compra').addEventListener('submit', manejarEnvio);

  document.getElementById('modal-compra').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-compra')) {
      cerrarModal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') cerrarModal();
  });
});
