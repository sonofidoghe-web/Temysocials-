// netlify/functions/mytpsms.js

const API_BASE = "https://mytpsms.com/api/v1";

const ALLOWED_PROVIDERS = new Set([
  "global",
  "usa",
  "usa2"
]);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json"
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: ""
    };
  }

  const API_KEY = process.env.MYTPSMS_API_KEY;

  if (!API_KEY) {
    return response(500, {
      success: false,
      error: "MYTPSMS_API_KEY is missing in Netlify environment variables."
    });
  }

  try {
    if (event.httpMethod === "GET") {
      return await handleGET(event, API_KEY);
    }

    if (event.httpMethod === "POST") {
      return await handlePOST(event, API_KEY);
    }

    return response(405, {
      success: false,
      error: "Method not allowed."
    });

  } catch (error) {
    console.error("MYTPSMS FUNCTION ERROR:", error);

    return response(500, {
      success: false,
      error: error?.message || "Internal server error."
    });
  }
};


// ======================================================
// GET
// ======================================================

async function handleGET(event, API_KEY) {

  const params = event.queryStringParameters || {};

  const action = String(
    params.action || ""
  ).trim().toLowerCase();


  // ----------------------------------------------------
  // BALANCE
  // ----------------------------------------------------

  if (action === "balance") {
    return await myTPSMSGet(
      "/balance.php",
      {},
      API_KEY
    );
  }


  // ----------------------------------------------------
  // COUNTRIES
  // ----------------------------------------------------

  if (action === "countries") {

    const provider = String(
      params.provider || "global"
    ).trim().toLowerCase();

    if (!ALLOWED_PROVIDERS.has(provider)) {
      return response(400, {
        success: false,
        error: "Invalid provider."
      });
    }

    return await myTPSMSGet(
      "/countries.php",
      {
        provider
      },
      API_KEY
    );
  }


  // ----------------------------------------------------
  // SERVICES
  // ----------------------------------------------------

  if (action === "services") {

    const provider = String(
      params.provider || "global"
    ).trim().toLowerCase();

    const country = String(
      params.country || ""
    ).trim();

    if (!ALLOWED_PROVIDERS.has(provider)) {
      return response(400, {
        success: false,
        error: "Invalid provider."
      });
    }

    if (!country) {
      return response(400, {
        success: false,
        error: "Country is required."
      });
    }

    return await myTPSMSGet(
      "/services.php",
      {
        provider,
        country
      },
      API_KEY
    );
  }


  // ----------------------------------------------------
  // STATUS
  // ----------------------------------------------------

  if (action === "status") {

    const orderId = String(
      params.order_id ||
      params.orderId ||
      params.id ||
      ""
    ).trim();

    if (!orderId) {
      return response(400, {
        success: false,
        error: "order_id is required."
      });
    }

    return await myTPSMSGet(
      "/status.php",
      {
        order_id: orderId
      },
      API_KEY
    );
  }


  // ----------------------------------------------------
  // HISTORY
  // ----------------------------------------------------

  if (action === "history") {

    const page = String(
      params.page || "1"
    ).trim();

    return await myTPSMSGet(
      "/history.php",
      {
        page
      },
      API_KEY
    );
  }


  return response(400, {
    success: false,
    error: "Unknown action."
  });
}


// ======================================================
// POST
// ======================================================

async function handlePOST(event, API_KEY) {

  let body;

  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return response(400, {
      success: false,
      error: "Invalid JSON request."
    });
  }

  const action = String(
    body.action || ""
  ).trim().toLowerCase();


  // ----------------------------------------------------
  // BUY
  // ----------------------------------------------------

  if (action === "buy") {

    const provider = String(
      body.provider || ""
    ).trim().toLowerCase();

    const country = String(
      body.country || ""
    ).trim();

    const service = String(
      body.service ||
      body.service_id ||
      body.serviceId ||
      ""
    ).trim();

    if (!ALLOWED_PROVIDERS.has(provider)) {
      return response(400, {
        success: false,
        error: "Invalid provider."
      });
    }

    if (!country) {
      return response(400, {
        success: false,
        error: "Country is required."
      });
    }

    if (!service) {
      return response(400, {
        success: false,
        error: "Service is required."
      });
    }


    const payload = {
      provider,
      country,
      service
    };


    if (body.serviceName) {
      payload.service_name =
        String(body.serviceName).trim();
    }


    return await myTPSMSPost(
      "/buy.php",
      payload,
      API_KEY
    );
  }


  // ----------------------------------------------------
  // CANCEL
  // ----------------------------------------------------

  if (action === "cancel") {

    const orderId = String(
      body.order_id ||
      body.orderId ||
      body.id ||
      ""
    ).trim();

    if (!orderId) {
      return response(400, {
        success: false,
        error: "order_id is required."
      });
    }

    return await myTPSMSPost(
      "/cancel.php",
      {
        order_id: orderId
      },
      API_KEY
    );
  }


  return response(400, {
    success: false,
    error: "Unknown action."
  });
}


// ======================================================
// MYTPSMS GET
// ======================================================

async function myTPSMSGet(
  endpoint,
  params,
  API_KEY
) {

  const url = new URL(
    API_BASE + endpoint
  );

  for (const [key, value] of Object.entries(params)) {

    if (
      value !== undefined &&
      value !== null &&
      String(value) !== ""
    ) {
      url.searchParams.set(
        key,
        String(value)
      );
    }
  }


  console.log(
    "MYTPSMS GET:",
    url.pathname,
    Object.fromEntries(url.searchParams)
  );


  const result = await fetch(
    url.toString(),
    {
      method: "GET",
      headers: {
        "X-API-KEY": API_KEY,
        "Accept": "application/json"
      }
    }
  );


  return parseUpstreamResponse(
    result
  );
}


// ======================================================
// MYTPSMS POST
// ======================================================

async function myTPSMSPost(
  endpoint,
  payload,
  API_KEY
) {

  console.log(
    "MYTPSMS POST:",
    endpoint
  );


  const result = await fetch(
    API_BASE + endpoint,
    {
      method: "POST",

      headers: {
        "X-API-KEY": API_KEY,
        "Accept": "application/json",
        "Content-Type": "application/json"
      },

      body: JSON.stringify(payload)
    }
  );


  return parseUpstreamResponse(
    result
  );
}


// ======================================================
// UPSTREAM RESPONSE
// ======================================================

async function parseUpstreamResponse(
  upstream
) {

  const statusCode =
    upstream.status;


  let text = "";

  try {
    text = await upstream.text();
  } catch {
    return response(502, {
      success: false,
      error: "Could not read MyTPSMS response."
    });
  }


  console.log(
    "MYTPSMS STATUS:",
    statusCode
  );

  console.log(
    "MYTPSMS RESPONSE:",
    text
  );


  let data = null;

  try {
    data = text
      ? JSON.parse(text)
      : null;
  } catch {
    data = null;
  }


  // ----------------------------------------------------
  // NON JSON RESPONSE
  // ----------------------------------------------------

  if (!data) {

    if (!upstream.ok) {

      return response(
        statusCode,
        {
          success: false,

          error:
            text ||
            `MyTPSMS returned HTTP ${statusCode}.`,

          upstream_status:
            statusCode
        }
      );

    }


    return response(502, {
      success: false,

      error:
        text ||
        "MyTPSMS returned an invalid response.",

      upstream_status:
        statusCode
    });
  }


  // ----------------------------------------------------
  // API REPORTED ERROR
  // ----------------------------------------------------

  const apiFailed =
    !upstream.ok ||
    data.success === false ||
    data.status === false ||
    String(data.status || "")
      .toLowerCase() === "error";


  if (apiFailed) {

    return response(
      upstream.ok ? 400 : statusCode,
      {
        ...data,

        success: false,

        error:
          data.error ||
          data.message ||
          data.msg ||
          data.detail ||
          `MyTPSMS request failed (${statusCode}).`,

        upstream_status:
          statusCode
      }
    );
  }


  // ----------------------------------------------------
  // SUCCESS
  // ----------------------------------------------------

  return response(
    statusCode >= 200 &&
    statusCode < 300
      ? statusCode
      : 200,

    normalizeResponse(data)
  );
}


// ======================================================
// NORMALIZE RESPONSE
// ======================================================

function normalizeResponse(data) {

  // Keep the original API response intact.
  // The frontend can therefore handle different
  // response structures without losing information.

  if (
    data &&
    typeof data === "object"
  ) {

    return {
      ...data,

      success:
        data.success !== undefined
          ? data.success
          : true
    };
  }

  return {
    success: true,
    data
  };
}


// ======================================================
// RESPONSE
// ======================================================

function response(
  statusCode,
  body
) {

  return {
    statusCode,

    headers: CORS_HEADERS,

    body: JSON.stringify(body)
  };
}
