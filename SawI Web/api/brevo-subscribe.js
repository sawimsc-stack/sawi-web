// SawI - Endpoint serverless que conecta los formularios de la web con Brevo.
// La API key vive solo aquí, en variables de entorno de Vercel. Nunca llega al navegador.
//
// Variables de entorno necesarias en Vercel:
//   BREVO_API_KEY  -> tu clave xkeysib-...
//   BREVO_LIST_ID  -> id numerico de la lista "SawI Web" (ej: 3)

export default async function handler(req, res) {
  // CORS sencillo (la web y la api van en el mismo dominio en Vercel, pero por si acaso)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const API_KEY = process.env.BREVO_API_KEY;
  const LIST_ID = parseInt(process.env.BREVO_LIST_ID || '0', 10);

  if (!API_KEY || !LIST_ID) {
    return res.status(500).json({
      ok: false,
      error: 'Servidor sin configurar: faltan BREVO_API_KEY o BREVO_LIST_ID en Vercel.'
    });
  }

  // Parseo del body — funciona con string o con objeto
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const email = (body.email || '').trim().toLowerCase();
  const nombre = (body.nombre || '').trim();
  const origen = (body.origen || 'web').trim();        // 'ebook' | 'newsletter' | 'cualificacion'
  const ebook = (body.ebook || '').trim();              // nombre del ebook si aplica
  const cualificado = body.cualificado === true;        // solo para cualificacion
  const detalles = body.detalles || null;               // objeto con respuestas del formulario de cualificacion

  // Validacion email basica
  const okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!okEmail) return res.status(400).json({ ok: false, error: 'Email no valido.' });

  // Atributos personalizados que se guardan en el contacto en Brevo.
  // Para que aparezcan bonitos en Brevo, crea estos atributos primero en
  // Contactos -> Configuracion -> Atributos de contacto:
  //   NOMBRE  (text)
  //   ORIGEN  (text)
  //   EBOOK   (text)
  //   CUALIFICADO (boolean)
  //   GENERO  (text)
  //   SERVICIO (text)
  //   PROYECTO (text)
  //   INVERSION (text)
  const attributes = {
    NOMBRE: nombre || undefined,
    ORIGEN: origen,
    EBOOK: ebook || undefined,
    CUALIFICADO: origen === 'cualificacion' ? cualificado : undefined,
    GENERO: detalles?.genero || undefined,
    SERVICIO: detalles?.servicio || undefined,
    PROYECTO: detalles?.proyecto || undefined,
    INVERSION: detalles?.inversion || undefined,
  };

  // Limpia undefined para que Brevo no los reciba como null
  Object.keys(attributes).forEach(k => attributes[k] === undefined && delete attributes[k]);

  try {
    const response = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': API_KEY,
      },
      body: JSON.stringify({
        email,
        attributes,
        listIds: [LIST_ID],
        updateEnabled: true,   // si el contacto ya existe, actualiza sus atributos
      }),
    });

    // Brevo devuelve 201 cuando crea el contacto, 204 cuando lo actualiza
    if (response.status === 201 || response.status === 204) {
      return res.status(200).json({ ok: true, nombre });
    }

    // Si Brevo devuelve error, lo pasamos en formato controlado
    const errBody = await response.json().catch(() => ({}));
    console.error('Brevo error:', response.status, errBody);
    return res.status(502).json({
      ok: false,
      error: errBody.message || 'No hemos podido registrarte. Intentalo de nuevo en un momento.',
    });
  } catch (err) {
    console.error('Network/Brevo exception:', err);
    return res.status(500).json({ ok: false, error: 'Error de red al contactar con Brevo.' });
  }
}
