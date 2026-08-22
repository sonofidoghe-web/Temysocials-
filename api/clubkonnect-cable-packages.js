export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const USER_ID = process.env.CLUBKONNECT_USER_ID;
    const API_KEY = process.env.CLUBKONNECT_API_KEY;

    if (!USER_ID || !API_KEY) {
      return res.status(500).json({ error: "Missing ClubKonnect credentials in environment variables" });
    }

    const provider = (req.query.provider || "").toLowerCase();
    if (!provider) {
      return res.status(400).json({ error: "Provider is required" });
    }

    const url = `https://www.nellobytesystems.com/APICableTVPackagesV2.asp?UserID=${USER_ID}&APIKey=${API_KEY}`;
    
    const response = await fetch(url);
    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error("ClubKonnect returned non-JSON:", text.slice(0, 300));
      return res.status(500).json({ 
        error: "ClubKonnect returned invalid response",
        raw: text.slice(0, 200)
      });
    }

    let packages = [];
    const key = provider.toUpperCase();

    if (data[key]) packages = data[key];
    else if (data[provider]) packages = data[provider];
    else if (Array.isArray(data)) packages = data;

    const normalized = (packages || [])
      .map(pkg => ({
        code: pkg.PACKAGE_ID || pkg.PACKAGE_CODE || pkg.code || pkg.id || "",
        name: pkg.PACKAGE_NAME || pkg.name || pkg.PACKAGE || "Unknown",
        amount: Number(pkg.PACKAGE_AMOUNT || pkg.amount || pkg.price || 0)
      }))
      .filter(p => p.code && p.amount > 0);

    return res.status(200).json({ packages: normalized });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}
