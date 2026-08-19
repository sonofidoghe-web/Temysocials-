// netlify/functions/mytpsms.js

const API_BASE = "https://mytpsms.com/api/v1";

const ALLOWED_PROVIDERS = ["global", "usa", "usa2"];

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization",
  "Access-Control-Allow-Methods":
    "GET, POST, OPTIONS",
  "Content-Type":
    "application/json"
};


// ======================================================
// MAIN NETLIFY FUNCTION
// ======================================================

exports.handler = async (event) => {

  // ----------------------------------------------------
  // CORS PREFLIGHT
  // ----------------------------------------------------

  if (event.httpMethod === "OPTIONS") {

    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: ""
    };

  }


  // ----------------------------------------------------
  // GET API KEY FROM NETLIFY ENVIRONMENT VARIABLES
  // ----------------------------------------------------

  const API_KEY =
    process.env.MYTPSMS_API_KEY;


  if (!API_KEY) {

    console.error(
      "MYTPSMS_API_KEY is missing."
    );

    return jsonResponse(
      500,
      {
        error:
          "MYTPSMS API key is not configured on Netlify."
      }
    );

  }


  try {

    // ==================================================
    // GET REQUESTS
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
      // GET ?action=balance
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
      // GET ?action=countries&provider=global
      // ==================================================

      if (action === "countries") {

        const provider =
          String(
            params.provider || "global"
          ).trim();


        if (!ALLOWED_PROVIDERS.includes(provider)) {

          return jsonResponse(
            400,
            {
              error:
                "Invalid provider."
            }
          );

        }


        return await proxyGET(
          "/countries.php",
          {
            provider
          },
          API_KEY
        );

      }


      // ==================================================
      // SERVICES
      // GET ?action=services&provider=global&country=...
      // ==================================================

      if (action === "services") {

        const provider =
          String(
            params.provider || "global"
          ).trim();

        const country =
          String(
            params.country || ""
          ).trim();


        if (!ALLOWED_PROVIDERS.includes(provider)) {

          return jsonResponse(
            400,
            {
              error:
                "Invalid provider."
            }
          );

        }


        if (!country) {

          return jsonResponse(
            400,
            {
              error:
                "Country is required."
            }
          );

        }


        return await proxyGET(
          "/services.php",
          {
            provider,
            country
          },
          API_KEY
        );

      }


      // ==================================================
      // ORDER STATUS
      // GET ?action=status&order_id=...
      // ==================================================

      if (action === "status") {

        const orderId =
          String(
            params.order_id || ""
          ).trim();


        if (!orderId) {

          return jsonResponse(
            400,
            {
              error:
                "order_id is required."
            }
          );

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
      // GET ?action=history&page=1
      // ==================================================

      if (action === "history") {

        const page =
          String(
            params.page || "1"
          ).trim();


        return await proxyGET(
          "/history.php",
          {
            page
          },
          API_KEY
        );

      }


      // ==================================================
      // UNKNOWN GET ACTION
      // ==================================================

      return jsonResponse(
        400,
        {
          error:
            "Unknown action."
        }
      );

    }


    // ==================================================
    // POST REQUESTS
    // ==================================================

    if (event.httpMethod === "POST") {

      let body = {};


      // ------------------------------------------------
      // PARSE JSON
      // ------------------------------------------------

      try {

        body =
          JSON.parse(
            event.body || "{}"
          );

      } catch (error) {

        return jsonResponse(
          400,
          {
            error:
              "Invalid JSON request."
          }
        );

      }


      const action =
        String(
          body.action || ""
        ).trim().toLowerCase();


      // ==================================================
      // BUY NUMBER
      // ==================================================

      if (action === "buy") {

        const provider =
          String(
            body.provider || ""
          ).trim();

        const country =
          String(
            body.country || ""
          ).trim();

        const service =
          String(
            body.service || ""
          ).trim();

        const serviceName =
          String(
            body.serviceName || ""
          ).trim();


        // ------------------------------------------------
        // PROVIDER VALIDATION
        // ------------------------------------------------

        if (
          !ALLOWED_PROVIDERS.includes(
            provider
          )
        ) {

          return jsonResponse(
            400,
            {
              error:
                "Invalid provider."
            }
          );

        }


        // ------------------------------------------------
        // COUNTRY VALIDATION
        // ------------------------------------------------

        if (!country) {

          return jsonResponse(
            400,
            {
              error:
                "Country is required."
            }
          );

        }


        // ------------------------------------------------
        // SERVICE VALIDATION
        // ------------------------------------------------

        if (!service) {

          return jsonResponse(
            400,
            {
              error:
                "Service is required."
            }
          );

        }


        // ------------------------------------------------
        // SEND PURCHASE TO MYTP SMS
        //
        // MYTP SMS DOCUMENTATION:
        //
        // provider
        // country
        // service
        // service_name (optional)
        // ------------------------------------------------

        const purchaseData = {

          provider:
            provider,

          country:
            country,

          service:
            service

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
      // CANCEL ORDER
      // ==================================================

      if (action === "cancel") {

        const orderId =
          String(
            body.order_id || ""
          ).trim();


        if (!orderId) {

          return jsonResponse(
            400,
            {
              error:
                "order_id is required."
            }
          );

        }


        return await proxyPOST(
          "/cancel.php",
          {
            order_id:
              orderId
          },
          API_KEY
        );

      }


      // ==================================================
      // UNKNOWN POST ACTION
      // ==================================================

      return jsonResponse(
        400,
        {
          error:
            "Unknown action."
        }
      );

    }


    // ==================================================
    // METHOD NOT ALLOWED
    // ==================================================

    return jsonResponse(
      405,
      {
        error:
          "Method not allowed."
      }
    );


  } catch (error) {

    console.error(
      "MYTPSMS Netlify Function Error:",
      error
    );


    return jsonResponse(
      500,
      {
        error:
          error?.message ||
          "Internal server error."
      }
    );

  }

};


// ======================================================
// GET REQUEST TO MYTP SMS
// ======================================================

async function proxyGET(
  endpoint,
  parameters,
  apiKey
) {

  const url =
    new URL(
      API_BASE + endpoint
    );


  Object.entries(
    parameters || {}
  ).forEach(
    ([key, value]) => {

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

    }
  );


  console.log(
    "MYTPSMS GET:",
    endpoint
  );


  const apiResponse =
    await fetch(
      url.toString(),
      {
        method: "GET",

        headers: {
          "X-API-KEY":
            apiKey,

          "Accept":
            "application/json"
        }
      }
    );


  return await formatAPIResponse(
    apiResponse
  );

}


// ======================================================
// POST REQUEST TO MYTP SMS
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


  const apiResponse =
    await fetch(
      API_BASE + endpoint,
      {
        method: "POST",

        headers: {
          "X-API-KEY":
            apiKey,

          "Content-Type":
            "application/json",

          "Accept":
            "application/json"
        },

        body:
          JSON.stringify(data)
      }
    );


  return await formatAPIResponse(
    apiResponse
  );

}


// ======================================================
// FORMAT MYTP SMS RESPONSE
// ======================================================

async function formatAPIResponse(
  apiResponse
) {

  const status =
    apiResponse.status || 500;


  let rawText = "";


  try {

    rawText =
      await apiResponse.text();

  } catch (error) {

    console.error(
      "Unable to read MYTPSMS response:",
      error
    );

    return jsonResponse(
      502,
      {
        error:
          "Unable to read MYTPSMS response."
      }
    );

  }


  // ----------------------------------------------------
  // TRY TO PARSE JSON
  // ----------------------------------------------------

  let data = null;


  if (rawText) {

    try {

      data =
        JSON.parse(rawText);

    } catch {

      data = null;

    }

  }


  // ----------------------------------------------------
  // INVALID / NON-JSON RESPONSE
  // ----------------------------------------------------

  if (!data) {

    if (!apiResponse.ok) {

      return jsonResponse(
        status,
        {
          error:
            rawText ||
            "MYTPSMS request failed."
        }
      );

    }


    return jsonResponse(
      502,
      {
        error:
          rawText ||
          "MYTPSMS returned an invalid response."
      }
    );

  }


  // ----------------------------------------------------
  // MYTP SMS DOCUMENTATION:
  //
  // API errors can return:
  //
  // success: false
  // ----------------------------------------------------

  if (
    !apiResponse.ok ||
    data.success === false
  ) {

    const errorMessage =
      data.message ||
      data.error ||
      "MYTPSMS request failed.";


    return jsonResponse(
      apiResponse.ok
        ? 400
        : status,
      {
        ...data,

        error:
          errorMessage
      }
    );

  }


  // ----------------------------------------------------
  // SUCCESS
  // ----------------------------------------------------

  return jsonResponse(
    status >= 200 && status < 300
      ? status
      : 200,
    data
  );

}


// ======================================================
// NETLIFY JSON RESPONSE
// ======================================================

function jsonResponse(
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
