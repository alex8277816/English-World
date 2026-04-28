import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req: any, res: any) {
  // Add CORS headers for general robustness
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

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
    let { model, contents, config } = req.body;
    
    // Normalize model name
    let modelName = model || "gemini-1.5-flash";
    if (modelName.includes("/")) {
      modelName = modelName.split("/").pop();
    }
    
    // List of models to try in order of preference
    const modelsToTry = [
      modelName,
      "gemini-1.5-flash",
      "gemini-1.5-flash-8b",
      "gemini-1.5-flash-latest",
      "gemini-1.5-pro",
      "gemini-pro",
      "gemini-1.0-pro"
    ];

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Ensure contents is an array of content objects
    let formattedContents: any[] = [];
    if (Array.isArray(contents)) {
      formattedContents = contents;
    } else if (typeof contents === 'string') {
      formattedContents = [{ role: 'user', parts: [{ text: contents }] }];
    } else if (contents && contents.parts) {
      formattedContents = [contents];
    } else {
      throw new Error("Invalid contents format. Expected string or array of parts.");
    }
    
    let result;
    let lastError;

    for (const currentModelName of modelsToTry) {
      if (!currentModelName) continue;
      try {
        console.log(`Attempting Gemini API with model: ${currentModelName}`);
        const generativeModel = genAI.getGenerativeModel({ model: currentModelName });
        result = await generativeModel.generateContent({
          contents: formattedContents,
          generationConfig: config
        });
        // If we reach here, it worked
        break; 
      } catch (err: any) {
        lastError = err;
        console.warn(`Attempt with ${currentModelName} failed:`, err.message);
        
        // If the error is an Auth error (403, 401), don't bother trying other models
        if (err.message?.includes("API key not valid") || 
            err.message?.includes("403") || 
            err.message?.includes("API_KEY_INVALID")) {
          break;
        }
      }
    }

    if (!result) {
      throw lastError || new Error("All model attempts failed");
    }

    const response = await result.response;
    const text = response.text();
    
    return res.json({ text });
  } catch (error: any) {
    console.error("AI Proxy Error:", error);
    return res.status(500).json({ 
      error: error.message || "Unknown AI error",
      details: error.toString(),
      suggestion: "If you see a 404 error, please verify that your API Key has access to the model in Google AI Studio."
    });
  }
}
