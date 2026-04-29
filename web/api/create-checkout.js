// SawI - Crea una sesion de Stripe Checkout para los servicios.
// El frontend pasa { product: 'mixing'|'full'|'beat'|'beat-exclusive', email?, nombre? }
// Devolvemos la URL de Stripe Checkout para redirigir.
//
// Variables de entorno necesarias en Vercel:
//   STRIPE_SECRET_KEY        -> sk_live_... (o sk_test_... mientras pruebas)
//   STRIPE_PRICE_MIXING      -> price_xxx del producto Mixing+Mastering
//   STRIPE_PRICE_FULL        -> price_xxx del producto Full Produccion
//   STRIPE_PRICE_BEAT        -> price_xxx del Custom Beat sin licencia exclusiva
//   STRIPE_PRICE_BEAT_EXCL   -> price_xxx del Custom Beat con licencia exclusiva
//   PUBLIC_BASE_URL          -> https://sawiprods.com (para success/cancel)

const PRODUCT_MAP = {
  'mixing':         { env: 'STRIPE_PRICE_MIXING',     name: 'Mixing + Mastering' },
  'full':           { env: 'STRIPE_PRICE_FULL',       name: 'Full Produccion' },
  'beat':           { env: 'STRIPE_PRICE_BEAT',       name: 'Custom Beat (sin licencia exclusiva)' },
  'beat-exclusive': { env: 'STRIPE_PRICE_BEAT_EXCL',  name: 'Custom Beat (con licencia exclusiva)' },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const SECRET = process.env.STRIPE_SECRET_KEY;
  const BASE = (process.env.PUBLIC_BASE_URL || 'https://sawiprods.com').replace(/\/$/, '');

  if (!SECRET) {
    return res.status(503).json({
      ok: false,
      configured: false,
      error: 'La tienda online estara disponible muy pronto. Mientras tanto puedes contactarme directamente y reservamos tu sesion.',
    });
  }

  // Parse body
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const product = (body.product || '').trim();
  const email = (body.email || '').trim().toLowerCase();
  const nombre = (body.nombre || '').trim();

  const meta = PRODUCT_MAP[product];
  if (!meta) return res.status(400).json({ ok: false, error: 'Producto no valido.' });

  const priceId = process.env[meta.env];
  if (!priceId) {
    return res.status(503).json({
      ok: false,
      configured: false,
      error: `El producto "${meta.name}" se podra comprar en breve. Si tienes prisa, escribeme.`,
    });
  }

  // Validar email si se proporciona (opcional, Stripe lo pide despues si no lo damos)
  let okEmail = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!okEmail) return res.status(400).json({ ok: false, error: 'Email no valido.' });

  // Crear sesion de Stripe Checkout via Stripe REST API (sin SDK para mantenerlo ligero)
  // https://stripe.com/docs/api/checkout/sessions/create
  const params = new URLSearchParams();
  params.append('mode', 'payment');
  params.append('line_items[0][price]', priceId);
  params.append('line_items[0][quantity]', '1');
  params.append('success_url', `${BASE}/?compra=ok&product=${encodeURIComponent(product)}&session_id={CHECKOUT_SESSION_ID}`);
  params.append('cancel_url', `${BASE}/?compra=cancelado`);
  params.append('billing_address_collection', 'auto');
  params.append('allow_promotion_codes', 'true'); // Permite cupones de descuento
  params.append('automatic_tax[enabled]', 'false'); // Pon true si activas Stripe Tax
  if (email) params.append('customer_email', email);
  // Metadatos para el webhook
  params.append('metadata[product]', product);
  params.append('metadata[product_name]', meta.name);
  if (nombre) params.append('metadata[nombre]', nombre);
  // Locale
  params.append('locale', 'es');

  try {
    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SECRET}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    const data = await r.json();
    if (!r.ok) {
      console.error('Stripe error:', data);
      return res.status(502).json({ ok: false, error: data.error?.message || 'Error de Stripe.' });
    }
    return res.status(200).json({ ok: true, url: data.url, id: data.id });
  } catch (err) {
    console.error('Stripe network error:', err);
    return res.status(500).json({ ok: false, error: 'Error de red al crear la sesion de pago.' });
  }
}
