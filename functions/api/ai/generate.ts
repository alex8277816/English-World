import { GoogleGenerativeAI } from "@google/generative-ai";

interface Env {
  GEMINI_API_KEY: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const apiKey = env.GEMINI_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "GEMINI_API_KEY is not configured in Cloudflare" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const { model, contents, config } = await request.json() as any;
    
    let modelName = model || "gemini-1.5-flash";
    const modelsToTry = [
      modelName,
      "gemini-1.5-flash",
      "gemini-1.5-pro",
      "gemini-pro"
    ];

    const genAI = new GoogleGenerativeAI(apiKey);
    let result;
    let lastError;

    for (const m of modelsToTry) {
      if (!m) continue;
      try {
        const generativeModel = genAI.getGenerativeModel({ model: m });
        const generationResult = await generativeModel.generateContent({
          contents: contents || [],
          generationConfig: config
        });
        
        if (generationResult && generationResult.response) {
          result = generationResult;
          break;
        }
      } catch (err: any) {
        lastError = err;
        if (err.message?.includes("API key not valid") || err.message?.includes("403")) break;
      }
    }

    if (!result) throw lastError || new Error("All model attempts failed");

    const response = await result.response;
    const text = response.text();

    return new Response(JSON.stringify({ text }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || "AI error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
