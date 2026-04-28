import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req: any, res: any) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY is missing." });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // Note: The Node SDK doesn't have a direct listModels method on the genAI instance 
    // that returns full info easily in some versions, but we can try fetching 
    // or just return help info.
    
    return res.json({ 
      message: "Diagnostics info",
      env: {
        HAS_KEY: !!apiKey,
        KEY_LENGTH: apiKey.length,
        NODE_ENV: process.env.NODE_ENV
      },
      suggestion: "If you get 404, try setting model to 'gemini-1.5-flash' or 'gemini-1.5-pro' in your request."
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
