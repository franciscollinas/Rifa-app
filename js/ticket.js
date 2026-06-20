function mostrarTiquete({ numero, nombre, telefono, correo, id_confirmacion }) {
  const contenedorTiquete = document.getElementById('contenedor-tiquete');
  const tiqueteVisual = document.getElementById('tiquete-visual');
  const tiqueteAcciones = document.getElementById('tiquete-acciones');

  tiqueteVisual.innerHTML = `
    <div class="tiquete-header">
      <img src="https://avadiadelmar.com/wp-content/uploads/2024/11/cropped-LOGO-PNG.png"
           alt="Logo Avadia del Mar" class="tiquete-logo">
      <h2>Tiquete de Participación</h2>
      <p class="tiquete-subtitle">Rifa Oficial — Casa Hotel Avadia del Mar</p>
    </div>
    <div class="tiquete-numero">
      <span class="label">Tu número</span>
      <span class="numero-grande">${numero}</span>
    </div>
    <div class="tiquete-datos">
      <div class="dato"><span class="key">Nombre</span><span class="val">${nombre}</span></div>
      <div class="dato"><span class="key">Teléfono</span><span class="val">${telefono}</span></div>
      <div class="dato"><span class="key">Correo</span><span class="val">${correo}</span></div>
      <div class="dato"><span class="key">ID Confirmación</span><span class="val">${id_confirmacion}</span></div>
    </div>
    <div class="tiquete-premio">
      <h3>🏖️ Premio</h3>
      <p><strong>2 noches con desayuno incluido</strong><br>
      Casa Hotel Avadia del Mar — La Boquilla, Cartagena de Indias<br>
      Para 2 personas · Check-in 3:00 PM · Check-out 12:00 PM</p>
    </div>
    <div class="tiquete-footer">
      <p>📱 La confirmación llegará por WhatsApp al número registrado.</p>
      <p>🌐 <a href="https://avadiadelmar.com/" target="_blank" rel="noopener noreferrer">avadiadelmar.com</a>
         &nbsp;|&nbsp; 📞 +57 302 6476894</p>
      <p class="tiquete-legal">Este tiquete es tu constancia de participación. Consérvalo.</p>
    </div>
  `;

  tiqueteAcciones.innerHTML = `
    <button onclick="descargarTiquete()" class="btn-primario">
      ⬇️ Descargar tiquete (PDF)
    </button>
    <button onclick="compartirWhatsApp('${nombre}','${numero}')" class="btn-whatsapp">
      💬 Compartir por WhatsApp
    </button>
  `;

  contenedorTiquete.style.display = 'block';
  contenedorTiquete.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function descargarTiquete() {
  const { jsPDF } = window.jspdf;
  const elemento = document.getElementById('tiquete-visual');
  const canvas = await html2canvas(elemento, { scale: 2, useCORS: true });
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  const pdfW = pdf.internal.pageSize.getWidth();
  const pdfH = (canvas.height * pdfW) / canvas.width;
  pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
  pdf.save(`tiquete-avadia-${Date.now()}.pdf`);
}

function compartirWhatsApp(nombre, numero) {
  const texto = encodeURIComponent(
    `¡Participé en la rifa del Hotel Avadia del Mar! 🏖️\n` +
    `Mi número es el *${numero}*\n` +
    `Nombre: ${nombre}\n` +
    `Premio: 2 noches con desayuno en La Boquilla, Cartagena 🌊\n` +
    `Más info: https://avadiadelmar.com/`
  );
  window.open(`https://wa.me/?text=${texto}`, '_blank');
}
