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
    
    // 1. Attempt to list models to see what this key can actually see
    let availableModels: any[] = [];
    try {
      // Note: listModels is part of the genAI instance
      const modelList = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Placeholder to get access to the client
      // The current SDK might require using the discovery or just trying names.
      // Let's try to get model info for a known model to verify access.
    } catch (e) {}

    const modelsToTest = [
      "gemini-1.5-flash", 
      "gemini-1.5-flash-8b",
      "gemini-1.5-pro", 
      "gemini-2.0-flash-exp",
      "gemini-pro", 
      "gemini-1.0-pro"
    ];
    const results = [];

    for (const modelName of modelsToTest) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const testResult = await model.generateContent("hi");
        const response = await testResult.response;
        const text = response.text();
        results.push({ 
          name: modelName, 
          status: "OK", 
          response: text.substring(0, 20) 
        });
      } catch (e: any) {
        results.push({ 
          name: modelName, 
          status: "Error", 
          message: e.message,
          // Extract status code if available
          status_code: e.status || (e.message.includes("404") ? 404 : (e.message.includes("403") ? 403 : "unknown"))
        });
      }
    }

    return res.json({ 
      status: "Diagnostics Completed",
      timestamp: new Date().toISOString(),
      apiKeyLength: apiKey.length,
      apiKeyPrefix: apiKey.substring(0, 4), // Should be 'AIza'
      nodeEnv: process.env.NODE_ENV,
      results: results,
      advice: results.every(r => r.status === "Error") 
        ? "All models returned error. Please verify this is a 'Google AI Studio' key starting with 'AIza'. If it's from Google Cloud Vertex AI, it won't work with this SDK." 
        : "Some models working."
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
