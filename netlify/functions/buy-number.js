const fetch = require('node-fetch');

function calculateSellingPrice(originalPrice) {
  const price = parseFloat(originalPrice);
  if (price <= 500) return price * 2;
  if (price < 1000) return price * 1.5;
  return price * 1.3;
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, message: 'Method not allowed' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { provider, country, service, service_name } = body;

    if (!provider || !country || !service) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, message: 'provider, country and service are required' }),
      };
    }

    // Call MYTPSMS to buy the number
    const formData = new URLSearchParams();
    formData.append('provider', provider);
    formData.append('country', country);
    formData.append('service', service);
    if (service_name) formData.append('service_name', service_name);

    const response = await fetch('https://mytpsms.com/api/v1/buy.php', {
      method: 'POST',
      headers: {
        'X-API-KEY': process.env.MYTPSMS_API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const data = await response.json();

    if (!data.success) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify(data),
      };
    }

    // Apply your pricing markup
    const originalPrice = parseFloat(data.price);
    const sellingPrice = calculateSellingPrice(originalPrice);

    // Return cleaned data + your selling price
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        order_id: data.order_id,
        number: data.number,
        original_price: originalPrice,
        selling_price: sellingPrice,          // ← This is what you charge your user
        currency: data.currency || 'NGN',
        expires_at: data.expires_at,
        status: data.status,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, message: error.message }),
    };
  }
};
