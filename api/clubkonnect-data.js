export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { MobileNetwork, DataPlan, MobileNumber, RequestID } = req.body;

  const UserID = process.env.CLUBKONNECT_USER_ID;
  const APIKey = process.env.CLUBKONNECT_API_KEY;

  if (!UserID || !APIKey) {
    return res.status(500).json({ error: "API credentials not configured" });
  }

  try {
    const url = `https://www.nellobytesystems.com/APIDatabundleV1.asp?UserID=${UserID}&APIKey=${APIKey}&MobileNetwork=${MobileNetwork}&DataPlan=${DataPlan}&MobileNumber=${MobileNumber}&RequestID=${RequestID || Date.now()}`;
    
    const response = await fetch(url);
    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
