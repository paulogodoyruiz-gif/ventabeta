// Vercel Serverless Function to generate a Mercado Pago Checkout Preference
export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { items, payer, accessToken } = req.body;

    // Use environment variable MP_ACCESS_TOKEN or fallback to provided token in body
    const token = process.env.MP_ACCESS_TOKEN || accessToken;

    if (!token) {
        return res.status(400).json({ error: 'Falta el Access Token de Mercado Pago.' });
    }

    const preferenceData = {
        items: items.map(item => ({
            title: `${item.producto} (${item.metros}m)`,
            quantity: 1,
            currency_id: 'CLP',
            unit_price: Math.round(Number(item.subtotal))
        })),
        payer: {
            name: payer.nombre || 'Cliente Textiles',
            email: payer.email || 'cliente@email.com'
        },
        back_urls: {
            success: 'https://ventabeta.vercel.app/?status=success',
            failure: 'https://ventabeta.vercel.app/?status=failure',
            pending: 'https://ventabeta.vercel.app/?status=pending'
        },
        auto_return: 'approved'
    };

    try {
        const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(preferenceData)
        });

        const data = await response.json();

        if (response.ok && data.init_point) {
            return res.status(200).json({
                init_point: data.init_point,
                sandbox_init_point: data.sandbox_init_point,
                id: data.id
            });
        } else {
            return res.status(400).json({
                error: 'Error de Mercado Pago',
                details: data
            });
        }
    } catch (err) {
        return res.status(500).json({ error: 'Error de servidor: ' + err.message });
    }
}
