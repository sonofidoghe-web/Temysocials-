// netlify/functions/mytpsms.js

const API_BASE = "https://mytpsms.com/api/v1";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json"
};


// ==========================================
// MAIN NETLIFY FUNCTION
// ==========================================

exports.handler = async (event) => {

  // Handle browser CORS request
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: ""
    };
  }


  // ==========================================
  // CHECK API KEY
  // ==========================================

  const API_KEY = process.env.MYTPSMS_API_KEY;

  if (!API_KEY) {
    return response(500, {
      error: "MYTPSMS API key is not configured on Netlify."
    });
  }


  try {

    // ==========================================
    // GET REQUESTS
    // ==========================================

    if (event.httpMethod === "GET") {

      const params = event.queryStringParameters || {};

      const action = params.action || "";


      // ----------------------------------------
      // BALANCE
      // ----------------------------------------

      if (action === "balance") {

        return await proxyGET(
          "/balance.php",
          {},
          API_KEY
        );

      }


      // ----------------------------------------
      // COUNTRIES
      // ----------------------------------------

      if (action === "countries") {

        const provider =
          params.provider || "global";


        if (!["global", "usa", "usa2"].includes(provider)) {

          return response(400, {
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


      // ----------------------------------------
      // SERVICES
      // ----------------------------------------

      if (action === "services") {

        const provider =
          params.provider || "global";

        const country =
          params.country || "";


        if (!["global", "usa", "usa2"].includes(provider)) {

          return response(400, {
            error: "Invalid provider."
          });

        }


        if (!country) {

          return response(400, {
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


      // ----------------------------------------
      // ORDER STATUS
      // ----------------------------------------

      if (action === "status") {

        const orderId =
          params.order_id || "";


        if (!orderId) {

          return response(400, {
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


      // ----------------------------------------
      // ORDER HISTORY
      // ----------------------------------------

      if (action === "history") {

        const page =
          params.page || "1";


        return await proxyGET(
          "/history.php",
          {
            page: page
          },
          API_KEY
        );

      }


      return response(400, {
        error: "Unknown action."
      });

    }


    // ==========================================
    // POST REQUESTS
    // ==========================================

    if (event.httpMethod === "POST") {

      let body = {};

      try {

        body =
          JSON.parse(
            event.body || "{}"
          );

      } catch {

        return response(400, {
          error: "Invalid JSON request."
        });

      }


      const action =
        body.action || "";


      // ----------------------------------------
      // BUY NUMBER
      // ----------------------------------------

      if (action === "buy") {

        const provider =
          body.provider || "";

        const country =
          body.country || "";

        const service =
          body.service || "";

        const serviceName =
          body.serviceName || "";


        // Validate provider

        if (
          !["global", "usa", "usa2"].includes(provider)
        ) {

          return response(400, {
            error: "Invalid provider."
          });

        }


        // Validate required fields

        if (!country) {

          return response(400, {
            error: "Country is required."
          });

        }


        if (!service) {

          return response(400, {
            error: "Service is required."
          });

        }


        // --------------------------------------
        // SEND PURCHASE TO MYTPSMS
        // --------------------------------------

        const result =
          await proxyPOST(
            "/buy.php",
            {
              provider: provider,
              country: country,
              service: service,
              ...(serviceName
                ? { service_name: serviceName }
                : {})
            },
            API_KEY
          );


        return result;

      }


      // ----------------------------------------
      // CANCEL ORDER
      // ----------------------------------------

      if (action === "cancel") {

        const orderId =
          body.order_id || "";


        if (!orderId) {

          return response(400, {
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


      return response(400, {
        error: "Unknown action."
      });

    }


    return response(405, {
      error: "Method not allowed."
    });


  } catch (error) {

    console.error(
      "MYTPSMS backend error:",
      error
    );


    return response(500, {
      error:
        error.message ||
        "Server error."
    });

  }

};


// ==========================================
// GET REQUEST TO MYTPSMS
// ==========================================

async function proxyGET(
  endpoint,
  parameters,
  apiKey
) {

  const url =
    new URL(
      API_BASE + endpoint
    );


  Object.entries(parameters).forEach(
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


  const result =
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
    result
  );

}


// ==========================================
// POST REQUEST TO MYTPSMS
// ==========================================

async function proxyPOST(
  endpoint,
  data,
  apiKey
) {

  const result =
    await fetch(
      API_BASE + endpoint,
      {
        method: "POST",

        headers: {
          "X-API-KEY": apiKey,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },

        body: JSON.stringify(data)
      }
    );


  return await formatAPIResponse(
    result
  );

}


// ==========================================
// FORMAT API RESPONSE
// ==========================================

async function formatAPIResponse(
  apiResponse
) {

  let data;


  try {

    data =
      await apiResponse.json();

  } catch {

    const text =
      await apiResponse.text();

    data = {
      error:
        text ||
        "MYTPSMS returned an invalid response."
    };

  }


  // MYTPSMS documentation says
  // errors can return success:false.

  if (
    !apiResponse.ok ||
    data?.success === false
  ) {

    return response(
      apiResponse.status || 400,
      {
        error:
          data?.message ||
          data?.error ||
          "MYTPSMS request failed.",
        ...data
      }
    );

  }


  return response(
    apiResponse.status || 200,
    data
  );

}


// ==========================================
// NETLIFY RESPONSE HELPER
// ==========================================

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
