export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const USER_ID = process.env.CLUBKONNECT_USER_ID;
    const API_KEY = process.env.CLUBKONNECT_API_KEY;
    const { BettingCompany, CustomerID, Amount, RequestID } = req.body;

    if (!BettingCompany || !CustomerID || !Amount || !RequestID) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Try the most common endpoint name
    const url = `https://www.nellobytesystems.com/APIBettingV1.asp?UserID=${USER_ID}&APIKey=${API_KEY}` +
      `&BettingCompany=${encodeURIComponent(BettingCompany)}` +
      `&CustomerID=${encodeURIComponent(CustomerID)}` +
      `&Amount=${encodeURIComponent(Amount)}` +
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
