import { GoogleGenerativeAI } from "@google/generative-ai";

interface Env {
  GEMINI_API_KEY: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;
  const apiKey = env.GEMINI_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ 
      status: "Error", 
      message: "GEMINI_API_KEY is missing in Cloudflare environment variables." 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelsToTest = [
      "gemini-1.5-flash",
      "gemini-1.5-pro",
      "gemini-pro"
    ];
    
    const results = [];
    for (const modelName of modelsToTest) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const testResult = await model.generateContent("hi");
        const response = await testResult.response;
        results.push({ name: modelName, status: "OK", response: response.text().substring(0, 10) });
      } catch (e: any) {
        results.push({ name: modelName, status: "Error", message: e.message });
      }
    }

    return new Response(JSON.stringify({
      status: "Diagnostics Completed (Cloudflare Edition)",
      timestamp: new Date().toISOString(),
      apiKeyLength: apiKey.length,
      apiKeyPrefix: apiKey.substring(0, 4),
      results
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
