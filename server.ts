import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => res.json({ status: "ok" }));

  app.get("/api/ai/diagnostics", async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ status: "Error", message: "GEMINI_API_KEY missing" });
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent("hello");
      res.json({ status: "Active", key_length: apiKey.length, test_ok: true });
    } catch (e: any) {
      res.status(500).json({ status: "Failed", error: e.message });
    }
  });

  app.post("/api/ai/generate", async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "API Key not configured" });
    try {
      const { model, contents, config } = req.body;
      const genAI = new GoogleGenerativeAI(apiKey);
      const modelsToTry = [model, "gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro", "gemini-1.0-pro"];
      let result, lastError;
      for (const m of modelsToTry) {
        if (!m) continue;
        try {
          console.log(`Server attempting Gemini with: ${m}`);
          const generativeModel = genAI.getGenerativeModel({ model: m });
          result = await generativeModel.generateContent({ contents, generationConfig: config });
          if (result) break;
        } catch (err: any) {
          lastError = err;
          console.warn(`Server attempt with ${m} failed:`, err.message);
          if (err.message?.includes("API key not valid") || err.message?.includes("403")) break;
        }
      }
      if (!result) throw lastError || new Error("All models failed");
      const response = await result.response;
      res.json({ text: response.text() });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (process.env.NODE_ENV !== "production") {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
  
  return app;
}

const appPromise = startServer();

export default async (req: any, res: any) => {
  const app = await appPromise;
  app(req, res);
};
