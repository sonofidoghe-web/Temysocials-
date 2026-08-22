import axios from "axios";

const USER_ID = process.env.CLUBKONNECT_USER_ID;
const API_KEY = process.env.CLUBKONNECT_API_KEY;
const BASE_URL = "https://www.nellobytesystems.com";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { CableTV, SmartCardNo } = req.body;

    if (!CableTV || !SmartCardNo) {
      return res.status(400).json({ error: "CableTV and SmartCardNo are required" });
    }

    const url = `${BASE_URL}/APIVerifyCableTVV1.asp?UserID=${USER_ID}&APIKey=${API_KEY}&CableTV=${CableTV}&SmartCardNo=${SmartCardNo}`;

    const response = await axios.get(url);
    return res.status(200).json(response.data);
  } catch (error) {
    console.error("Cable verify error:", error.message);
    return res.status(500).json({
      error: "Verification failed",
      customer_name: "INVALID_SMARTCARDNO",
    });
  }
}
