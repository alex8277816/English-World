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
    const results = [];
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // 1. Try to list models (this helps identify restricted keys)
    let modelList: any = { status: "Not Attempted" };
    try {
      // The SDK doesn't always expose listModels clearly in the default class,
      // but we can try to fetch the list via the base URL if needed.
      // For now, let's try to see if we can get property info for the model.
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      modelList = { status: "Initialized", modelName: "gemini-1.5-flash" };
    } catch (e: any) {
      modelList = { status: "Error", message: e.message };
    }

    const modelsToTest = [
      "gemini-1.5-flash", 
      "gemini-1.5-flash-latest",
      "gemini-1.5-pro",
      "gemini-2.0-flash-exp",
      "gemini-pro"
    ];
    const results = [];
    const genAI = new GoogleGenerativeAI(apiKey);

    for (const modelName of modelsToTest) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const testResult = await model.generateContent("hi");
        const response = await testResult.response;
        results.push({ 
          name: modelName, 
          status: "OK", 
          response: response.text().substring(0, 20) 
        });
      } catch (e: any) {
        results.push({ 
          name: modelName, 
          status: "Error", 
          message: e.message,
          status_code: e.status || (e.message.includes("404") ? 404 : (e.message.includes("403") ? 403 : "unknown"))
        });
      }
    }

    const isAll404 = results.every(r => r.status === "Error" && r.status_code === 404);
    const hasSuccess = results.some(r => r.status === "OK");

    return res.json({ 
      status: "Diagnostics Completed",
      timestamp: new Date().toISOString(),
      apiKeyLength: apiKey.length,
      apiKeyPrefix: apiKey.substring(0, 4), 
      hasSuccess,
      results: results,
      advice: hasSuccess 
        ? "測試成功！至少有一個型號可以運作。請確保 App 設定中使用的是成功的型號。"
        : (isAll404 
            ? "仍然全部 404。這非常有可能是以下原因：\n1. 你的 Key 是在 Google Cloud Console (Vertex AI) 申請的，而不是在 Google AI Studio (https://aistudio.google.com/)。請確認是在 AI Studio 點擊 'Get API Key' 建立的。\n2. 你的專案可能沒有啟用 'Generative Language API'。\n3. 請嘗試在 AI Studio 介面左側選擇一個型號並點擊 'Run' 測試是否能正常對話。"
            : "測試失敗，請檢查網路或 API Key 權限。")
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
