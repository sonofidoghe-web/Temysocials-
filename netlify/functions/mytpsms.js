// netlify/functions/mytpsms.js

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  // Browser preflight request
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers,
      body: ""
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        error: "Method Not Allowed"
      })
    };
  }

  try {
    const API_KEY = process.env.MYTPSMS_API_KEY;

    if (!API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "MYTPSMS_API_KEY is not configured in Netlify."
        })
      };
    }

    const body = JSON.parse(event.body || "{}");

    /*
      IMPORTANT:
      The exact MYTP SMS API endpoints/parameters must match
      the API documentation shown in your MYTP SMS account.
    */

    const action = body.action;

    let endpoint = "";
    let requestMethod = "GET";

    if (action === "balance") {
      endpoint = "/balance";
    }

    else if (action === "countries") {
      endpoint = "/countries";
    }

    else if (action === "services") {
      endpoint = "/services";
    }

    else if (action === "buy") {
      endpoint = "/buy";
      requestMethod = "POST";
    }

    else if (action === "status") {
      endpoint = "/status";
    }

    else if (action === "cancel") {
      endpoint = "/cancel";
      requestMethod = "POST";
    }

    else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Invalid action."
        })
      };
    }

    const API_URL = `https://mytpsms.com/api${endpoint}`;

    const payload = {
      ...body,
      api_key: API_KEY
    };

    delete payload.action;

    let response;

    if (requestMethod === "POST") {
      response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      });
    } else {
      const query = new URLSearchParams(payload);

      response = await fetch(`${API_URL}?${query.toString()}`, {
        method: "GET",
        headers: {
          "Accept": "application/json"
        }
      });
    }

    const responseText = await response.text();

    let data;

    try {
      data = JSON.parse(responseText);
    } catch {
      data = {
        raw: responseText
      };
    }

    return {
      statusCode: response.status,
      headers,
      body: JSON.stringify(data)
    };

  } catch (error) {
    console.error("MYTP SMS error:", error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "MYTP SMS connection failed.",
        details: error.message
      })
    };
  }
};
