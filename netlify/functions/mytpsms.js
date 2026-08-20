// netlify/functions/mytpsms.js

const API_BASE = "https://myapps.com/api/v1/";

const ALLOWED_PROVIDERS = new Set([
  "global",
  "usa",
  "usa2",
  "us2"
]);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json"
};


// ======================================================
// MAIN HANDLER
// ======================================================

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

    console.error("MYAPPS FUNCTION ERROR:", error);

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


  // ====================================================
  // BALANCE
  // ====================================================

  if (action === "balance") {

    return await myAppsGET(
      "balance.php",
      {},
      API_KEY
    );

  }


  // ====================================================
  // COUNTRIES
  // ====================================================

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

    return await myAppsGET(
      "countries.php",
      {
        provider
      },
      API_KEY
    );

  }


  // ====================================================
  // SERVICES
  // ====================================================

  if (action === "services") {

    const provider = String(
      params.provider || "global"
    ).trim().toLowerCase();

    const country = String(
      params.country || ""
    ).trim().toUpperCase();

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

    const result = await myAppsGETRaw(
      "services.php",
      {
        provider,
        country
      },
      API_KEY
    );

    return response(
      result.statusCode,
      normalizeServicesResponse(result.data)
    );

  }


  // ====================================================
  // STATUS
  // ====================================================

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

    return await myAppsGET(
      "status.php",
      {
        order_id: orderId
      },
      API_KEY
    );

  }


  // ====================================================
  // HISTORY
  // ====================================================

  if (action === "history") {

    const page = String(
      params.page || "1"
    ).trim();

    return await myAppsGET(
      "history.php",
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

  let body = {};

  try {

    body = JSON.parse(
      event.body || "{}"
    );

  } catch {

    return response(400, {
      success: false,
      error: "Invalid JSON request."
    });

  }

  const action = String(
    body.action || ""
  ).trim().toLowerCase();


  // ====================================================
  // BUY
  // ====================================================

  if (action === "buy") {

    const provider = String(
      body.provider || ""
    ).trim().toLowerCase();

    const country = String(
      body.country || ""
    ).trim().toUpperCase();

    const service = String(
      body.service ||
      body.service_id ||
      body.serviceId ||
      ""
    ).trim();

    const serviceName = String(
      body.serviceName ||
      body.service_name ||
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


    if (serviceName) {
      payload.service_name = serviceName;
    }


    return await myAppsPOST(
      "buy.php",
      payload,
      API_KEY
    );

  }


  // ====================================================
  // CANCEL
  // ====================================================

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


    return await myAppsPOST(
      "cancel.php",
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
// MYAPPS GET
// ======================================================

async function myAppsGET(
  endpoint,
  params,
  API_KEY
) {

  const result = await myAppsGETRaw(
    endpoint,
    params,
    API_KEY
  );

  return response(
    result.statusCode,
    result.data
  );

}


// ======================================================
// MYAPPS GET RAW
// ======================================================

async function myAppsGETRaw(
  endpoint,
  params,
  API_KEY
) {

  const url = new URL(
    API_BASE + endpoint
  );


  for (
    const [key, value]
    of Object.entries(params)
  ) {

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
    "MYAPPS GET:",
    endpoint,
    params
  );


  const upstream = await fetch(
    url.toString(),
    {
      method: "GET",

      headers: {
        "API-KEY": API_KEY,
        "Accept": "application/json"
      }
    }
  );


  return await parseUpstreamRaw(
    upstream
  );

}


// ======================================================
// MYAPPS POST
// ======================================================

async function myAppsPOST(
  endpoint,
  payload,
  API_KEY
) {

  console.log(
    "MYAPPS POST:",
    endpoint,
    payload
  );


  const form = new URLSearchParams();


  for (
    const [key, value]
    of Object.entries(payload)
  ) {

    if (
      value !== undefined &&
      value !== null &&
      String(value) !== ""
    ) {

      form.append(
        key,
        String(value)
      );

    }

  }


  const upstream = await fetch(
    API_BASE + endpoint,
    {
      method: "POST",

      headers: {
        "API-KEY": API_KEY,
        "Accept": "application/json",
        "Content-Type":
          "application/x-www-form-urlencoded"
      },

      body: form.toString()
    }
  );


  const result =
    await parseUpstreamRaw(
      upstream
    );


  return response(
    result.statusCode,
    result.data
  );

}


// ======================================================
// PARSE RAW RESPONSE
// ======================================================

async function parseUpstreamRaw(
  upstream
) {

  const statusCode =
    upstream.status;


  let text = "";


  try {

    text = await upstream.text();

  } catch {

    return {
      statusCode: 502,

      data: {
        success: false,
        error:
          "Could not read MYAPPS response."
      }
    };

  }


  console.log(
    "MYAPPS STATUS:",
    statusCode
  );


  console.log(
    "MYAPPS RESPONSE:",
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


  if (!data) {

    if (!upstream.ok) {

      return {
        statusCode,

        data: {
          success: false,

          error:
            text ||
            `MYAPPS returned HTTP ${statusCode}.`,

          upstream_status:
            statusCode
        }
      };

    }


    return {
      statusCode: 502,

      data: {
        success: false,

        error:
          text ||
          "MYAPPS returned an invalid response.",

        upstream_status:
          statusCode
      }
    };

  }


  const apiFailed =
    !upstream.ok ||
    data.success === false ||
    data.status === false ||
    String(
      data.status || ""
    ).toLowerCase() === "error";


  if (apiFailed) {

    return {
      statusCode:
        upstream.ok
          ? 400
          : statusCode,

      data: {
        ...data,

        success: false,

        error:
          data.error ||
          data.message ||
          data.msg ||
          data.detail ||
          `MYAPPS request failed (${statusCode}).`,

        upstream_status:
          statusCode
      }
    };

  }


  return {
    statusCode:
      statusCode >= 200 &&
      statusCode < 300
        ? statusCode
        : 200,

    data: normalizeResponse(data)
  };

}


// ======================================================
// NORMALIZE SERVICES
// ======================================================

function normalizeServicesResponse(
  data
) {

  const services =
    extractServices(data);


  const normalized =
    services
      .map(normalizeService)
      .filter(Boolean);


  return {
    success: true,

    services: normalized,

    count:
      normalized.length
  };

}


// ======================================================
// EXTRACT SERVICES
// ======================================================

function extractServices(
  data
) {

  if (Array.isArray(data)) {
    return data;
  }


  if (
    Array.isArray(data?.services)
  ) {

    return data.services;

  }


  if (
    Array.isArray(data?.items)
  ) {

    return data.items;

  }


  if (
    Array.isArray(data?.results)
  ) {

    return data.results;

  }


  if (
    Array.isArray(data?.data)
  ) {

    return data.data;

  }


  if (
    Array.isArray(data?.result)
  ) {

    return data.result;

  }


  if (
    Array.isArray(data?.result?.data)
  ) {

    return data.result.data;

  }


  return [];

}


// ======================================================
// NORMALIZE ONE SERVICE
// ======================================================

function normalizeService(
  service
) {

  if (
    service === null ||
    service === undefined
  ) {

    return null;

  }


  if (
    typeof service === "string" ||
    typeof service === "number"
  ) {

    return {
      id: String(service),
      code: String(service),
      name: String(service),
      price: 0
    };

  }


  const code =
    firstValue(
      service,
      [
        "code",
        "service_id",
        "serviceId",
        "service",
        "id",
        "value",
        "service_code"
      ]
    );


  const name =
    firstValue(
      service,
      [
        "name",
        "service_name",
        "serviceName",
        "title",
        "label",
        "service",
        "description"
      ]
    );


  const rawPrice =
    findPriceValue(
      service
    );


  const price =
    parsePrice(
      rawPrice
    );


  return {
    ...service,

    id:
      code || name || "",

    code:
      code || name || "",

    name:
      name || code || "Service",

    price,

    provider_price:
      price
  };

}


// ======================================================
// FIND PRICE
// ======================================================

function findPriceValue(
  service
) {

  const directFields = [

    "price",
    "cost",
    "amount",
    "rate",
    "selling_price",
    "sellingPrice",
    "price_ngn",
    "priceNGN",
    "ngn",
    "unit_price",
    "unitPrice",
    "activation_price",
    "activationPrice",
    "service_price",
    "servicePrice"

  ];


  for (
    const field
    of directFields
  ) {

    if (
      service[field] !== undefined &&
      service[field] !== null &&
      service[field] !== ""
    ) {

      return service[field];

    }

  }


  // Check common nested objects.

  const nestedObjects = [

    service.data,
    service.result,
    service.service,
    service.details,
    service.pricing,
    service.price_data,
    service.priceData

  ];


  for (
    const object
    of nestedObjects
  ) {

    if (
      object &&
      typeof object === "object" &&
      !Array.isArray(object)
    ) {

      const value =
        findPriceValue(
          object
        );


      if (
        value !== null &&
        value !== undefined &&
        value !== ""
      ) {

        return value;

      }

    }

  }


  return null;

}


// ======================================================
// PARSE PRICE
// ======================================================

function parsePrice(
  value
) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {

    return 0;

  }


  if (
    typeof value === "number"
  ) {

    return Number.isFinite(value)
      ? value
      : 0;

  }


  const cleaned =
    String(value)
      .replace(/₦/g, "")
      .replace(/NGN/gi, "")
      .replace(/,/g, "")
      .trim();


  const number =
    Number(cleaned);


  return Number.isFinite(number)
    ? number
    : 0;

}


// ======================================================
// FIRST VALUE
// ======================================================

function firstValue(
  object,
  keys
) {

  for (
    const key
    of keys
  ) {

    if (
      object?.[key] !== undefined &&
      object?.[key] !== null &&
      String(object[key]).trim() !== ""
    ) {

      return String(
        object[key]
      ).trim();

    }

  }


  return "";

}


// ======================================================
// NORMALIZE RESPONSE
// ======================================================

function normalizeResponse(
  data
) {

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

    headers:
      CORS_HEADERS,

    body:
      JSON.stringify(body)

  };

}
