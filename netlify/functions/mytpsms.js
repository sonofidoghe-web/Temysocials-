const API_BASE = "https://mytpsms.com/api/v1";

exports.handler = async (event) => {
  try {
    const method = event.httpMethod;

    let action = event.queryStringParameters?.action || "";

    if (method === "POST") {
      let body = {};

      try {
        body = JSON.parse(event.body || "{}");
      } catch {
        return response(400, {
          success: false,
          error: "Invalid JSON request."
        });
      }

      action = body.action || "";
    }

    if (!action) {
      return response(400, {
        success: false,
        error: "Missing action."
      });
    }

    const apiKey = process.env.MYTPSMS_API_KEY;

    if (!apiKey) {
      console.error("MYTPSMS_API_KEY is missing.");

      return response(500, {
        success: false,
        error: "SMS API is not configured."
      });
    }

    /*
      BALANCE
    */

    if (action === "balance") {
      return await proxyGET("/balance.php");
    }

    /*
      COUNTRIES
    */

    if (action === "countries") {
      const provider =
        event.queryStringParameters?.provider || "";

      if (!provider) {
        return response(400, {
          success: false,
          error: "Provider is required."
        });
      }

      return await proxyGET(
        `/countries.php?provider=${encodeURIComponent(provider)}`
      );
    }

    /*
      SERVICES
    */

    if (action === "services") {
      const provider =
        event.queryStringParameters?.provider || "";

      const country =
        event.queryStringParameters?.country || "";

      if (!provider || !country) {
        return response(400, {
          success: false,
          error: "Provider and country are required."
        });
      }

      return await proxyGET(
        `/services.php?provider=${encodeURIComponent(provider)}&country=${encodeURIComponent(country)}`
      );
    }

    /*
      STATUS
    */

    if (action === "status") {
      const orderId =
        event.queryStringParameters?.order_id || "";

      if (!orderId) {
        return response(400, {
          success: false,
          error: "Order ID is required."
        });
      }

      return await proxyGET(
        `/status.php?order_id=${encodeURIComponent(orderId)}`
      );
    }

    /*
      HISTORY
    */

    if (action === "history") {
      const page =
        event.queryStringParameters?.page || "1";

      return await proxyGET(
        `/history.php?page=${encodeURIComponent(page)}`
      );
    }

    /*
      CANCEL
    */

    if (action === "cancel") {
      if (method !== "POST") {
        return response(405, {
          success: false,
          error: "POST required."
        });
      }

      const body = JSON.parse(event.body || "{}");

      if (!body.order_id) {
        return response(400, {
          success: false,
          error: "Order ID is required."
        });
      }

      return await proxyPOST("/cancel.php", {
        order_id: body.order_id
      });
    }

    /*
      BUY
    */

    if (action === "buy") {
      if (method !== "POST") {
        return response(405, {
          success: false,
          error: "POST required."
        });
      }

      const body = JSON.parse(event.body || "{}");

      if (
        !body.provider ||
        !body.country ||
        !body.service
      ) {
        return response(400, {
          success: false,
          error:
            "Provider, country and service are required."
        });
      }

      /*
        For now this sends the purchase request
        to MYTP SMS.

        Wallet deduction and Firebase order
        recording will be added in the next step.
      */

      return await proxyPOST("/buy.php", {
        provider: body.provider,
        country: body.country,
        service: body.service,
        service_name: body.serviceName || ""
      });
    }

    return response(400, {
      success: false,
      error: "Unknown action."
    });

  } catch (error) {
    console.error("MYTPSMS FUNCTION ERROR:", error);

    return response(500, {
      success: false,
      error: "Internal SMS server error."
    });
  }
};


/*
  GET REQUEST TO MYTPSMS
*/

async function proxyGET(path) {
  const result = await fetch(
    `${API_BASE}${path}`,
    {
      method: "GET",
      headers: {
        "X-API-KEY": process.env.MYTPSMS_API_KEY,
        "Accept": "application/json"
      }
    }
  );

  return returnProviderResponse(result);
}


/*
  POST REQUEST TO MYTPSMS
*/

async function proxyPOST(path, data) {
  const result = await fetch(
    `${API_BASE}${path}`,
    {
      method: "POST",
      headers: {
        "X-API-KEY": process.env.MYTPSMS_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json"
      },
      body: new URLSearchParams(data).toString()
    }
  );

  return returnProviderResponse(result);
}


/*
  RETURN PROVIDER RESPONSE
*/

async function returnProviderResponse(result) {
  const text = await result.text();

  let data;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    return response(result.status, {
      success: false,
      error: "Invalid response from SMS provider."
    });
  }

  return response(result.status, data);
}


/*
  NETLIFY RESPONSE
*/

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    },
    body: JSON.stringify(body)
  };
}
