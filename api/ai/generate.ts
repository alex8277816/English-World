import { GoogleGenerativeAI } from "@google/generative-ai";

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

    const genAI = new GoogleGenerativeAI(apiKey);
    const generativeModel = genAI.getGenerativeModel({ model: model || "gemini-2.0-flash" });

    const result = await generativeModel.generateContent({
      contents,
      generationConfig: config
    });

    const response = await result.response;
    return res.json({ text: response.text() });
  } catch (error: any) {
    console.error("AI Proxy Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
