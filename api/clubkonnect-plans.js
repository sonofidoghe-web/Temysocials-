export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const UserID = process.env.CLUBKONNECT_USER_ID;
  const APIKey = process.env.CLUBKONNECT_API_KEY;

  if (!UserID || !APIKey) {
    return res.status(500).json({ error: "API credentials not configured" });
  }

  try {
    // Fetch all available data plans with current prices
    const url = `https://www.nellobytesystems.com/APIDatabundlePlansV2.asp?UserID=${UserID}&APIKey=${APIKey}`;
    
    const response = await fetch(url);
    const data = await response.json();

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
