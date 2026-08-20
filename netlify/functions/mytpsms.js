// netlify/functions/mytpsms.js

const API_BASE = "https://mytpsms.com/api/v1";

const ALLOWED_PROVIDERS = [
  "global",
  "usa",
  "usa2"
];

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json"
};


// ======================================================
// MAIN FUNCTION
// ======================================================

exports.handler = async (event) => {

  // ====================================================
  // CORS
  // ====================================================

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: ""
    };
  }


  // ====================================================
  // API KEY
  // ====================================================

  const API_KEY = process.env.MYTPSMS_API_KEY;

  if (!API_KEY) {
    console.error("MYTPSMS_API_KEY is missing.");

    return jsonResponse(500, {
      success: false,
      error: "MYTPSMS API key is not configured on Netlify."
    });
  }


  try {

    // ==================================================
    // GET
    // ==================================================

    if (event.httpMethod === "GET") {

      const params =
        event.queryStringParameters || {};

      const action =
        String(params.action || "")
          .trim()
          .toLowerCase();


      // ==================================================
      // BALANCE
      // ==================================================

      if (action === "balance") {

        return await proxyGET(
          "/balance.php",
          {},
          API_KEY
        );

      }


      // ==================================================
      // COUNTRIES
      // ==================================================

      if (action === "countries") {

        const provider =
          String(params.provider || "global").trim();


        if (!ALLOWED_PROVIDERS.includes(provider)) {

          return jsonResponse(400, {
            success: false,
            error: "Invalid provider."
          });

        }


        return await proxyGET(
          "/countries.php",
          {
            provider: provider
          },
          API_KEY
        );

      }


      // ==================================================
      // SERVICES
      // ==================================================

      if (action === "services") {

        const provider =
          String(params.provider || "global").trim();

        const country =
          String(params.country || "").trim();


        if (!ALLOWED_PROVIDERS.includes(provider)) {

          return jsonResponse(400, {
            success: false,
            error: "Invalid provider."
          });

        }


        if (!country) {

          return jsonResponse(400, {
            success: false,
            error: "Country is required."
          });

        }


        return await proxyGET(
          "/services.php",
          {
            provider: provider,
            country: country
          },
          API_KEY
        );

      }


      // ==================================================
      // ORDER STATUS
      // ==================================================

      if (action === "status") {

        const orderId =
          String(params.order_id || "").trim();


        if (!orderId) {

          return jsonResponse(400, {
            success: false,
            error: "order_id is required."
          });

        }


        return await proxyGET(
          "/status.php",
          {
            order_id: orderId
          },
          API_KEY
        );

      }


      // ==================================================
      // ORDER HISTORY
      // ==================================================

      if (action === "history") {

        const page =
          String(params.page || "1").trim();


        return await proxyGET(
          "/history.php",
          {
            page: page
          },
          API_KEY
        );

      }


      // ==================================================
      // UNKNOWN GET
      // ==================================================

      return jsonResponse(400, {
        success: false,
        error: "Unknown action."
      });

    }


    // ====================================================
    // POST
    // ====================================================

    if (event.httpMethod === "POST") {

      let body = {};


      try {

        body =
          JSON.parse(event.body || "{}");

      } catch (error) {

        return jsonResponse(400, {
          success: false,
          error: "Invalid JSON request."
        });

      }


      const action =
        String(body.action || "")
          .trim()
          .toLowerCase();


      // ==================================================
      // BUY
      // ==================================================

      if (action === "buy") {

        const provider =
          String(body.provider || "").trim();

        const country =
          String(body.country || "").trim();

        const service =
          String(body.service || "").trim();

        const serviceName =
          String(body.serviceName || "").trim();


        if (!ALLOWED_PROVIDERS.includes(provider)) {

          return jsonResponse(400, {
            success: false,
            error: "Invalid provider."
          });

        }


        if (!country) {

          return jsonResponse(400, {
            success: false,
            error: "Country is required."
          });

        }


        if (!service) {

          return jsonResponse(400, {
            success: false,
            error: "Service is required."
          });

        }


        const purchaseData = {

          provider: provider,

          country: country,

          service: service

        };


        if (serviceName) {

          purchaseData.service_name =
            serviceName;

        }


        return await proxyPOST(
          "/buy.php",
          purchaseData,
          API_KEY
        );

      }


      // ==================================================
      // CANCEL
      // ==================================================

      if (action === "cancel") {

        const orderId =
          String(body.order_id || "").trim();


        if (!orderId) {

          return jsonResponse(400, {
            success: false,
            error: "order_id is required."
          });

        }


        return await proxyPOST(
          "/cancel.php",
          {
            order_id: orderId
          },
          API_KEY
        );

      }


      // ==================================================
      // UNKNOWN POST
      // ==================================================

      return jsonResponse(400, {
        success: false,
        error: "Unknown action."
      });

    }


    // ====================================================
    // METHOD NOT ALLOWED
    // ====================================================

    return jsonResponse(405, {
      success: false,
      error: "Method not allowed."
    });


  } catch (error) {

    console.error(
      "MYTPSMS FUNCTION ERROR:",
      error
    );


    return jsonResponse(500, {
      success: false,
      error:
        error?.message ||
        "Internal server error."
    });

  }

};


// ======================================================
// GET MYTP SMS
// ======================================================

async function proxyGET(
  endpoint,
  parameters,
  apiKey
) {

  const url =
    new URL(API_BASE + endpoint);


  Object.entries(parameters || {})
    .forEach(([key, value]) => {

      if (
        value !== undefined &&
        value !== null &&
        value !== ""
      ) {

        url.searchParams.set(
          key,
          String(value)
        );

      }

    });


  console.log(
    "MYTPSMS GET:",
    url.toString().replace(
      /([?&])api_key=[^&]*/i,
      "$1api_key=HIDDEN"
    )
  );


  const response =
    await fetch(
      url.toString(),
      {
        method: "GET",

        headers: {
          "X-API-KEY": apiKey,
          "Accept": "application/json"
        }
      }
    );


  return await formatAPIResponse(
    response
  );

}


// ======================================================
// POST MYTP SMS
// ======================================================

async function proxyPOST(
  endpoint,
  data,
  apiKey
) {

  console.log(
    "MYTPSMS POST:",
    endpoint
  );


  const response =
    await fetch(
      API_BASE + endpoint,
      {
        method: "POST",

        headers: {
          "X-API-KEY": apiKey,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },

        body:
          JSON.stringify(data)
      }
    );


  return await formatAPIResponse(
    response
  );

}


// ======================================================
// FORMAT RESPONSE
// ======================================================

async function formatAPIResponse(
  response
) {

  const status =
    response.status || 500;


  let rawText = "";


  try {

    rawText =
      await response.text();

  } catch (error) {

    console.error(
      "MYTPSMS response read error:",
      error
    );


    return jsonResponse(502, {
      success: false,
      error:
        "Unable to read MYTPSMS response."
    });

  }


  let data = null;


  if (rawText) {

    try {

      data =
        JSON.parse(rawText);

    } catch (error) {

      data = null;

    }

  }


  // ====================================================
  // NON JSON
  // ====================================================

  if (!data) {

    if (!response.ok) {

      return jsonResponse(status, {
        success: false,
        error:
          rawText ||
          "MYTPSMS request failed."
      });

    }


    return jsonResponse(502, {
      success: false,
      error:
        rawText ||
        "MYTPSMS returned an invalid response."
    });

  }


  // ====================================================
  // API ERROR
  // ====================================================

  if (
    !response.ok ||
    data.success === false
  ) {

    return jsonResponse(
      response.ok ? 400 : status,
      {
        ...data,

        success:
          data.success === false
            ? false
            : data.success,

        error:
          data.message ||
          data.error ||
          "MYTPSMS request failed."
      }
    );

  }


  // ====================================================
  // SUCCESS
  //
  // IMPORTANT:
  // We return the original MYTPSMS response
  // without changing countries/services/balance.
  // ====================================================

  return jsonResponse(
    status >= 200 && status < 300
      ? status
      : 200,
    data
  );

}


// ======================================================
// JSON RESPONSE
// ======================================================

function jsonResponse(
  statusCode,
  body
) {

  return {

    statusCode,

    headers: CORS_HEADERS,

    body:
      JSON.stringify(body)

  };

}
