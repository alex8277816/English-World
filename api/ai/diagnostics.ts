import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req: any, res: any) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ 
      status: "Error", 
      message: "GEMINI_API_KEY is missing in your Vercel Project Settings." 
    });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Attempting to list models is often restricted by API key permissions in AI Studio
    // so we'll try a few common model names and see which one responds.
    const modelsToTest = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro", "gemini-1.0-pro"];
    const results = [];

    for (const modelName of modelsToTest) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const testResult = await model.generateContent("ping");
        const response = await testResult.response;
        results.push({ name: modelName, status: "OK", response: response.text().substring(0, 20) });
      } catch (e: any) {
        results.push({ name: modelName, status: "Error", message: e.message });
      }
    }

    return res.json({ 
      status: "Diagnostics Completed",
      apiKeyLength: apiKey.length,
      results: results
    });
  } catch (error: any) {
    console.error("Diagnostics error:", error);
    return res.status(500).json({ 
      status: "Failed", 
      message: error.message || "Unknown error connecting to Gemini API",
      suggestion: "Check if your API Key is correctly set in Vercel Environment Variables and that it has access to 'gemini-1.5-flash'."
    });
  }
}
