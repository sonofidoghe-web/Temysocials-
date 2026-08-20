export default async (req) => {
  try {
    const url = new URL(req.url);

    const action = url.searchParams.get("action");

    const allowedActions = {
      balance: "balance.php",
      countries: "countries.php",
      services: "services.php",
      buy: "buy.php",
      status: "status.php",
      cancel: "cancel.php",
      history: "history.php"
    };

    if (!allowedActions[action]) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid action"
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    const params = new URLSearchParams();

    for (const [key, value] of url.searchParams.entries()) {
      if (key !== "action") {
        params.append(key, value);
      }
    }

    if (req.method === "POST") {
      try {
        const body = await req.json();

        for (const [key, value] of Object.entries(body)) {
          params.append(key, value);
        }
      } catch {}
    }

    const apiUrl =
      `https://mytsms.com/api/v1/${allowedActions[action]}?${params.toString()}`;

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "X-API-KEY": Netlify.env.get("MYTSMS_API_KEY")
      }
    });

    const data = await response.text();

    return new Response(data, {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
};
