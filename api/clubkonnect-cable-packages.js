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

    const provider = (req.query.provider || "").toLowerCase(); // dstv, gotv, startimes

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
      return res.status(500).json({ error: "Invalid response from ClubKonnect", raw: text.slice(0, 300) });
    }

    // Correct structure: data.TV_ID.DStv[0].PRODUCT
    const providerKeyMap = {
      dstv: "DStv",
      gotv: "GOtv",
      startimes: "Startimes",
      startime: "Startimes"
    };

    const key = providerKeyMap[provider] || provider;
    let packages = [];

    if (data?.TV_ID?.[key] && Array.isArray(data.TV_ID[key])) {
      const products = data.TV_ID[key][0]?.PRODUCT || [];
      packages = products;
    }

    // Normalize for the frontend
    const normalized = packages
      .map((pkg) => ({
        code: pkg.PACKAGE_ID || "",
        name: pkg.PACKAGE_NAME || "Unknown Package",
        amount: Number(pkg.PACKAGE_AMOUNT || 0)
      }))
      .filter((p) => p.code && p.amount > 0);

    return res.status(200).json({ packages: normalized });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}
