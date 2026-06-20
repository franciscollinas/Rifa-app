const WEBHOOK_URL = 'https://tu-n8n.com/webhook/rifa-avadia';

async function enviarCompra(datos) {
  const payload = {
    ...datos,
    premio: '2 noches en Casa Hotel Avadia del Mar — La Boquilla, Cartagena',
    hotel_web: 'https://avadiadelmar.com/',
    hotel_telefono: '+57 302 6476894',
    timestamp: new Date().toISOString()
  };

  try {
    console.log('📦 Payload enviado al webhook:', payload);
    await new Promise(res => setTimeout(res, 1200));
    return { ok: true, id_confirmacion: `AVD-${Date.now()}` };

    // Producción:
    // const res = await fetch(WEBHOOK_URL, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(payload)
    // });
    // if (!res.ok) throw new Error(`HTTP ${res.status}`);
    // return await res.json();

  } catch (error) {
    console.error('Error al enviar al webhook:', error);
    return { ok: false, error: error.message };
  }
}
