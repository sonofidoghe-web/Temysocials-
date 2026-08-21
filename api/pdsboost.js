// api/pdsboost.js

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const apiKey = process.env.PDSBOOST_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: "API key not configured on server",
      });
    }

    const body = req.body || {};
    const { action } = body;

    // Prepare payload for Pdsboost
    const payload = {
      key: apiKey,
      ...body,
    };

    // Remove action from being duplicated if needed
    delete payload.action;
    payload.action = action;

    const response = await fetch("https://pdsboost.com/api/store-v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    return res.status(200).json(data);

  } catch (error) {
    console.error("Pdsboost Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
}
