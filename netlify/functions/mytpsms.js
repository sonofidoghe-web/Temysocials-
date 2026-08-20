// netlify/functions/mytpsms.js

// Pricing rules
function calculateSellingPrice(originalPrice) {
  const price = parseFloat(originalPrice);
  if (isNaN(price)) return 0;

  if (price <= 500) return price * 2;       // ×2
  if (price < 1000) return price * 1.5;     // +50%
  return price * 1.3;                       // +30%
}

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json",
  };

  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    const apiKey = process.env.MYTPSMS_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          success: false, 
          message: "API key not configured on server" 
        }),
      };
    }

    // ====================== GET REQUESTS ======================
    if (event.httpMethod === "GET") {
      const action = event.queryStringParameters?.action;
      const provider = event.queryStringParameters?.provider;
      const country = event.queryStringParameters?.country;
      const order_id = event.queryStringParameters?.order_id;

      // Get Countries
      if (action === "countries") {
        const res = await fetch(
          `https://mytpsms.com/api/v1/countries.php?provider=${provider}`,
          {
            headers: { "X-API-KEY": apiKey },
          }
        );
        const data = await res.json();
        return { statusCode: 200, headers, body: JSON.stringify(data) };
      }

      // Get Services
      if (action === "services") {
        const res = await fetch(
          `https://mytpsms.com/api/v1/services.php?provider=${provider}&country=${country}`,
          {
            headers: { "X-API-KEY": apiKey },
          }
        );
        const data = await res.json();
        return { statusCode: 200, headers, body: JSON.stringify(data) };
      }

      // Check Status
      if (action === "status") {
        const res = await fetch(
          `https://mytpsms.com/api/v1/status.php?order_id=${order_id}`,
          {
            headers: { "X-API-KEY": apiKey },
          }
        );
        const data = await res.json();
        return { statusCode: 200, headers, body: JSON.stringify(data) };
      }

      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, message: "Invalid action" }),
      };
    }

    // ====================== POST (BUY NUMBER) ======================
    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");

      if (body.action !== "buy") {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, message: "Invalid action" }),
        };
      }

      const { provider, country, service, serviceName } = body;

      if (!provider || !country || !service) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            success: false, 
            message: "provider, country and service are required" 
          }),
        };
      }

      // Call MYTPSMS to buy number
      const formData = new URLSearchParams();
      formData.append("provider", provider);
      formData.append("country", country);
      formData.append("service", service);
      if (serviceName) formData.append("service_name", serviceName);

      const res = await fetch("https://mytpsms.com/api/v1/buy.php", {
        method: "POST",
        headers: {
          "X-API-KEY": apiKey,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      const data = await res.json();

      if (!data.success) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify(data),
        };
      }

      // Apply your pricing
      const originalPrice = parseFloat(data.price) || 0;
      const sellingPrice = calculateSellingPrice(originalPrice);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          order_id: data.order_id,
          number: data.number,
          original_price: originalPrice,
          selling_price: sellingPrice,
          price: sellingPrice,
          currency: data.currency || "NGN",
          expires_at: data.expires_at,
          status: data.status,
        }),
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, message: "Method not allowed" }),
    };

  } catch (error) {
    console.error("Function error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        message: error.message || "Internal server error" 
      }),
    };
  }
};
