import axios from "axios";

const USER_ID = process.env.CLUBKONNECT_USER_ID;
const API_KEY = process.env.CLUBKONNECT_API_KEY;
const BASE_URL = "https://www.nellobytesystems.com";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { BettingCompany, CustomerID, Amount, RequestID } = req.body;

    if (!BettingCompany || !CustomerID || !Amount || !RequestID) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Note: Confirm the exact endpoint name from ClubKonnect docs
    // Common names: APIBettingV1.asp or APIFundBettingV1.asp
    const url =
      `${BASE_URL}/APIBettingV1.asp?UserID=${USER_ID}&APIKey=${API_KEY}` +
      `&BettingCompany=${encodeURIComponent(BettingCompany)}` +
      `&CustomerID=${encodeURIComponent(CustomerID)}` +
      `&Amount=${encodeURIComponent(Amount)}` +
      `&RequestID=${encodeURIComponent(RequestID)}`;

    const response = await axios.get(url);
    return res.status(200).json(response.data);
  } catch (error) {
    console.error("Betting fund error:", error.message);
    return res.status(500).json({
      statuscode: "500",
      status: "FAILED",
      error: error.message,
    });
  }
}
