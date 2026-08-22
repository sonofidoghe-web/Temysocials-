import axios from "axios";

const USER_ID = process.env.CLUBKONNECT_USER_ID;
const API_KEY = process.env.CLUBKONNECT_API_KEY;
const BASE_URL = "https://www.nellobytesystems.com";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { CableTV, Package, SmartCardNo, PhoneNo, RequestID } = req.body;

    if (!CableTV || !Package || !SmartCardNo || !PhoneNo || !RequestID) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const url =
      `${BASE_URL}/APICableTVV1.asp?UserID=${USER_ID}&APIKey=${API_KEY}` +
      `&CableTV=${encodeURIComponent(CableTV)}` +
      `&Package=${encodeURIComponent(Package)}` +
      `&SmartCardNo=${encodeURIComponent(SmartCardNo)}` +
      `&PhoneNo=${encodeURIComponent(PhoneNo)}` +
      `&RequestID=${encodeURIComponent(RequestID)}`;

    const response = await axios.get(url);
    return res.status(200).json(response.data);
  } catch (error) {
    console.error("Cable purchase error:", error.message);
    return res.status(500).json({
      statuscode: "500",
      status: "FAILED",
      error: error.message,
    });
  }
}
