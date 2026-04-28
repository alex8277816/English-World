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
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Perform a simple test call
    const result = await model.generateContent("Test connection");
    const response = await result.response;
    const text = response.text();

    return res.json({ 
      status: "Active",
      message: "API Key is working correctly!",
      details: {
        key_length: apiKey.length,
        key_preview: apiKey.substring(0, 4) + "..." + apiKey.substring(apiKey.length - 4),
        test_response: text.substring(0, 50) + "..."
      }
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
