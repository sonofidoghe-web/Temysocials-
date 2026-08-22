export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const USER_ID = process.env.CLUBKONNECT_USER_ID;
    const API_KEY = process.env.CLUBKONNECT_API_KEY;
    const { CableTV, Package, SmartCardNo, PhoneNo, RequestID } = req.body;

    if (!CableTV || !Package || !SmartCardNo || !PhoneNo || !RequestID) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const url = `https://www.nellobytesystems.com/APICableTVV1.asp?UserID=${USER_ID}&APIKey=${API_KEY}` +
      `&CableTV=${encodeURIComponent(CableTV)}` +
      `&Package=${encodeURIComponent(Package)}` +
      `&SmartCardNo=${encodeURIComponent(SmartCardNo)}` +
      `&PhoneNo=${encodeURIComponent(PhoneNo)}` +
      `&RequestID=${encodeURIComponent(RequestID)}`;

    const response = await fetch(url);
    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return res.status(500).json({ statuscode: "500", status: "FAILED", raw: text.slice(0, 200) });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ statuscode: "500", status: "FAILED", error: error.message });
  }
}
