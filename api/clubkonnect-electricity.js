export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { 
    ElectricCompany,   // e.g. EKEDC, IKEDC, AEDC, IBEDC, etc.
    MeterNo, 
    MeterType,         // "prepaid" or "postpaid"
    Amount, 
    RequestID 
  } = req.body;

  const UserID = process.env.CLUBKONNECT_USER_ID;
  const APIKey = process.env.CLUBKONNECT_API_KEY;

  if (!UserID || !APIKey) {
    return res.status(500).json({ error: "API credentials not configured" });
  }

  if (!ElectricCompany || !MeterNo || !MeterType || !Amount) {
    return res.status(400).json({ 
      error: "ElectricCompany, MeterNo, MeterType and Amount are required" 
    });
  }

  try {
    // Main purchase endpoint
    const url = `https://www.nellobytesystems.com/APIElectricityV1.asp?UserID=${UserID}&APIKey=${APIKey}&ElectricCompany=${ElectricCompany}&MeterNo=${MeterNo}&MeterType=${MeterType}&Amount=${Amount}&RequestID=${RequestID || Date.now()}`;

    const response = await fetch(url);
    const data = await response.json();

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
