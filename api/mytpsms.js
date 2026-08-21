// api/mytpsms.js

function calculateSellingPrice(originalPrice) {
  const price = parseFloat(originalPrice);
  if (isNaN(price)) return 0;

  if (price <= 500) return price * 2;       // ×2
  if (price < 1000) return price * 1.5;     // +50%
  return price * 1.3;                       // +30%
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const apiKey = process.env.MYTPSMS_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: "API key not configured",
      });
    }

    // ====================== GET ======================
    if (req.method === "GET") {
      const { action, provider, country, service, order_id } = req.query;

      // Get Countries
      if (action === "countries") {
        const response = await fetch(
          `https://mytpsms.com/api/v1/countries.php?provider=${provider}`,
          { headers: { "X-API-KEY": apiKey } }
        );
        const data = await response.json();
        return res.status(200).json(data);
      }

      // Get Services
      if (action === "services") {
        const response = await fetch(
          `https://mytpsms.com/api/v1/services.php?provider=${provider}&country=${country}`,
          { headers: { "X-API-KEY": apiKey } }
        );
        const data = await response.json();
        return res.status(200).json(data);
      }

      // Get Price (NEW)
      if (action === "price") {
        const response = await fetch(
          `https://mytpsms.com/api/v1/price.php?provider=${provider}&country=${country}&service=${service}`,
          { headers: { "X-API-KEY": apiKey } }
        );
        const data = await response.json();

        if (data.success === false) {
          return res.status(400).json(data);
        }

        const originalPrice = parseFloat(data.price) || 0;
        const sellingPrice = calculateSellingPrice(originalPrice);

        return res.status(200).json({
          success: true,
          original_price: originalPrice,
          selling_price: sellingPrice,
          price: sellingPrice,
          currency: data.currency || "NGN",
          formatted: data.formatted || null,
          stock: data.stock,
          in_stock: data.in_stock,
          pools: data.pools || [],
          balance: data.balance,
          sufficient: data.sufficient,
        });
      }

      // Check Status
      if (action === "status") {
        const response = await fetch(
          `https://mytpsms.com/api/v1/status.php?order_id=${order_id}`,
          { headers: { "X-API-KEY": apiKey } }
        );
        const data = await response.json();
        return res.status(200).json(data);
      }

      return res.status(400).json({
        success: false,
        message: "Invalid action",
      });
    }

    // ====================== POST (BUY) ======================
    if (req.method === "POST") {
      const body = req.body || {};

      if (body.action !== "buy") {
        return res.status(400).json({
          success: false,
          message: "Invalid action",
        });
      }

      const { provider, country, service, serviceName } = body;

      if (!provider || !country || !service) {
        return res.status(400).json({
          success: false,
          message: "provider, country and service are required",
        });
      }

      const formData = new URLSearchParams();
      formData.append("provider", provider);
      formData.append("country", country);
      formData.append("service", service);
      if (serviceName) formData.append("service_name", serviceName);

      const response = await fetch("https://mytpsms.com/api/v1/buy.php", {
        method: "POST",
        headers: {
          "X-API-KEY": apiKey,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      const data = await response.json();

      if (!data.success) {
        return res.status(400).json(data);
      }

      const originalPrice = parseFloat(data.price) || 0;
      const sellingPrice = calculateSellingPrice(originalPrice);

      return res.status(200).json({
        success: true,
        order_id: data.order_id,
        number: data.number,
        original_price: originalPrice,
        selling_price: sellingPrice,
        price: sellingPrice,
        currency: data.currency || "NGN",
        expires_at: data.expires_at,
        status: data.status,
      });
    }

    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });

  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
}
