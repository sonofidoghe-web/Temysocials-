const fetch = require('node-fetch');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { provider, country } = event.queryStringParameters || {};

    if (!provider || !country) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, message: 'provider and country are required' }),
      };
    }

    const response = await fetch(
      `https://mytpsms.com/api/v1/services.php?provider=${provider}&country=${country}`,
      {
        headers: {
          'X-API-KEY': process.env.MYTPSMS_API_KEY,
        },
      }
    );

    const data = await response.json();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, message: error.message }),
    };
  }
};
