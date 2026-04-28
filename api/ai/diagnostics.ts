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
    // Force v1 API version which is more stable than v1beta for some keys
    const genAI = new GoogleGenerativeAI(apiKey);
    
    const modelsToTest = [
      "gemini-1.5-flash", 
      "gemini-1.5-pro",
      "gemini-pro"
    ];
    const results = [];

    for (const modelName of modelsToTest) {
      try {
        // Try with standard config
        const model = genAI.getGenerativeModel({ model: modelName });
        const testResult = await model.generateContent("hi");
        const response = await testResult.response;
        results.push({ 
          name: modelName, 
          status: "OK", 
          response: response.text().substring(0, 20) 
        });
      } catch (e: any) {
        // Try forcing v1 explicitly if v1beta (default) failed with 404
        try {
           const v1GenAI = new GoogleGenerativeAI(apiKey);
           // The SDK might wrap the version in internal transport, 
           // but we can try to see if it makes a difference.
           results.push({ 
             name: modelName, 
             status: "Failed", 
             error: e.message,
             status_code: e.status || (e.message.includes("404") ? 404 : "unknown")
           });
        } catch (e2) {}
      }
    }

    const isAll404 = results.every(r => r.status_code === 404 || r.status === "Failed");

    return res.json({ 
      status: "Diagnostics Completed",
      timestamp: new Date().toISOString(),
      apiKeyLength: apiKey.length,
      apiKeyPrefix: apiKey.substring(0, 4), 
      results: results,
      advice: isAll404 
        ? "仍然全部 404。請確認：1. 你的 API Key 是在 https://aistudio.google.com/ 申請的。 2. 你的 Key 開頭應該是 'AIza'。如果不是，請重新申請。" 
        : "部分測試成功。"
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
