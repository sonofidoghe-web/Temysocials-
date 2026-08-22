export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const USER_ID = process.env.CLUBKONNECT_USER_ID;
    const API_KEY = process.env.CLUBKONNECT_API_KEY;

    if (!USER_ID || !API_KEY) {
      return res.status(500).json({ error: "Missing ClubKonnect credentials" });
    }

    const provider = (req.query.provider || "").toLowerCase();

    if (!provider) {
      return res.status(400).json({ error: "Provider is required" });
    }

    const url = `https://www.nellobytesystems.com/APICableTVPackagesV2.asp?UserID=${USER_ID}&APIKey=${API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    let packages = [];

    const providerKey = provider.toUpperCase();
    if (data[providerKey]) {
      packages = data[providerKey];
    } else if (data[provider]) {
      packages = data[provider];
    } else if (Array.isArray(data)) {
      packages = data.filter(
        (p) => (p.CableTV || p.CABLETV || "").toLowerCase() === provider
      );
    }

    const normalized = packages
      .map((pkg) => ({
        code: pkg.PACKAGE_ID || pkg.PACKAGE_CODE || pkg.code || pkg.id,
        name: pkg.PACKAGE_NAME || pkg.name || pkg.PACKAGE,
        amount: Number(pkg.PACKAGE_AMOUNT || pkg.amount || pkg.price || 0),
      }))
      .filter((p) => p.code && p.amount > 0);

    return res.status(200).json({ packages: normalized });
  } catch (error) {
    console.error("Cable packages error:", error);
    return res.status(500).json({ 
      error: "Failed to load packages",
      details: error.message 
    });
  }
}
