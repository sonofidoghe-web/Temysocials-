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
    const order_id = event.queryStringParameters?.order_id;

    if (!order_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, message: 'order_id is required' }),
      };
    }

    const response = await fetch(
      `https://mytpsms.com/api/v1/status.php?order_id=${order_id}`,
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
