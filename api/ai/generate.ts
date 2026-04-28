import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { model, contents, config } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
    }

    const genAI = new GoogleGenAI({ apiKey });
    const result = await genAI.models.generateContent({
      model: model || "gemini-2.0-flash",
      contents,
      config
    });

    return res.json({ text: result.text || "" });
  } catch (error: any) {
    console.error("AI Proxy Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
