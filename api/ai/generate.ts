import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req: any, res: any) {
  console.log("AI Request received:", req.method, req.url);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is missing in Vercel environment variables.");
    return res.status(500).json({ error: "GEMINI_API_KEY is missing. Please add it to Vercel Project Settings > Environment Variables." });
  }

  try {
    const { model, contents, config } = req.body;
    const modelName = model || "gemini-1.5-flash";
    console.log("Model requested:", modelName);

    const genAI = new GoogleGenerativeAI(apiKey);
    const generativeModel = genAI.getGenerativeModel({ model: modelName });

    const result = await generativeModel.generateContent({
      contents,
      generationConfig: config
    });

    const response = await result.response;
    const text = response.text();
    
    console.log("AI Response generated successfully (length):", text.length);
    return res.json({ text });
  } catch (error: any) {
    console.error("AI Proxy Error details:", error);
    return res.status(500).json({ 
      error: error.message,
      details: error.toString()
    });
  }
}
