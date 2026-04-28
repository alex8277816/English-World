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
      "gemini-1.5-flash-8b",
      "gemini-1.5-pro",
      "gemini-pro"
    ];
    const testResults = [];

    for (const modelName of modelsToTest) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const testResult = await model.generateContent("hi");
        const response = await testResult.response;
        testResults.push({ 
          name: modelName, 
          status: "OK", 
          response: response.text().substring(0, 20) 
        });
      } catch (e: any) {
        testResults.push({ 
          name: modelName, 
          status: "Error", 
          message: e.message,
          status_code: e.status || (e.message.includes("404") ? 404 : (e.message.includes("403") ? 403 : "unknown"))
        });
      }
    }

    const isAll404 = testResults.every(r => r.status === "Error" && r.status_code === 404);
    const hasSuccess = testResults.some(r => r.status === "OK");

    return res.json({ 
      status: "Diagnostics Completed",
      timestamp: new Date().toISOString(),
      apiKeyLength: apiKey.length,
      apiKeyPrefix: apiKey.substring(0, 4), 
      hasSuccess,
      results: testResults,
      advice: hasSuccess 
        ? "測試成功！至少有一個型號可以運作。請檢查並使用成功的型號。"
        : (isAll404 
            ? "仍然全部 404。雖然截圖確認您在 AI Studio 申請了 Key，但伺服器仍回報找不到型號。請嘗試：\n1. 在 AI Studio 網頁右側面板切換不同 Model 並輸入 'Hi' 測試對話是否正常。\n2. 在 API Key 清單點擊該 Key 並確認沒有設定任何 'API restrictions'。\n3. 如果網頁版正常但這裡還是 404，可能是 API 版本同步問題，請稍候 5 分鐘再試。"
            : "測試失敗，請檢查 API Key 狀態。")
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
