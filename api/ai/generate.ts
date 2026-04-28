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
    
    // Normalize model name - ensures it doesn't have double "models/" prefix or other issues
    let modelName = model || "gemini-1.5-flash";
    if (modelName.includes("/")) {
      modelName = modelName.split("/").pop();
    }
    
    console.log("Normalized model name:", modelName);

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Ensure contents is an array of content objects
    let formattedContents = [];
    if (Array.isArray(contents)) {
      formattedContents = contents;
    } else if (typeof contents === 'string') {
      formattedContents = [{ role: 'user', parts: [{ text: contents }] }];
    } else if (contents && contents.parts) {
      formattedContents = [contents];
    } else {
      throw new Error("Invalid contents format. Expected string or array of parts.");
    }

    // Try primary model, fallback if it fails with specific errors
    let result;
    try {
      const generativeModel = genAI.getGenerativeModel({ model: modelName });
      result = await generativeModel.generateContent({
        contents: formattedContents,
        generationConfig: config
      });
    } catch (firstError: any) {
      console.warn(`Primary model ${modelName} failed, trying fallback...`, firstError.message);
      if (modelName !== "gemini-1.5-flash") {
        const fallbackModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        result = await fallbackModel.generateContent({
          contents: formattedContents,
          generationConfig: config
        });
      } else {
        throw firstError;
      }
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
