export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const USER_ID = process.env.CLUBKONNECT_USER_ID;
    const API_KEY = process.env.CLUBKONNECT_API_KEY;

    const provider = (req.query.provider || "").toLowerCase();

    const url = `https://www.nellobytesystems.com/APICableTVPackagesV2.asp?UserID=${USER_ID}&APIKey=${API_KEY}`;

    const response = await fetch(url);
    const text = await response.text();

    // Return the raw response so we can see the structure
    return res.status(200).json({
      provider,
      raw: text.slice(0, 2000),   // first 2000 characters
      parsed: (() => {
        try { return JSON.parse(text); } 
        catch(e) { return "NOT VALID JSON"; }
      })()
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
