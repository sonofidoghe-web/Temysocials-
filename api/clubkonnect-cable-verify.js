export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const USER_ID = process.env.CLUBKONNECT_USER_ID;
    const API_KEY = process.env.CLUBKONNECT_API_KEY;
    const { CableTV, SmartCardNo } = req.body;

    if (!CableTV || !SmartCardNo) {
      return res.status(400).json({ error: "CableTV and SmartCardNo are required" });
    }

    const url = `https://www.nellobytesystems.com/APIVerifyCableTVV1.asp?UserID=${USER_ID}&APIKey=${API_KEY}&CableTV=${CableTV}&SmartCardNo=${SmartCardNo}`;

    const response = await fetch(url);
    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return res.status(500).json({ customer_name: "INVALID_SMARTCARDNO", raw: text.slice(0, 200) });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ customer_name: "INVALID_SMARTCARDNO", error: error.message });
  }
}
