
import "dotenv/config";

import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

import { generateWebsite } from "./services/gemini.js";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDirectory = path.resolve(__dirname, "../public");

app.use(express.json({ limit: "20kb" }));
app.use(express.static(publicDirectory));

const requiredEnv = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY"
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`${key} is missing in .env`);
  }
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);


console.log("Supabase URL configured:", Boolean(process.env.SUPABASE_URL));
console.log(
  "Service role variable configured:",
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
);
console.log(
  "Key format:",
  process.env.SUPABASE_SERVICE_ROLE_KEY?.startsWith("sb_secret_")
    ? "New secret key"
    : process.env.SUPABASE_SERVICE_ROLE_KEY?.startsWith("eyJ")
      ? "JWT-style key"
      : "Unknown format"
);
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "PromptCraft AI server is running"
  });
});

app.post("/api/generate", async (req, res) => {
  try {
    const prompt =
      typeof req.body.prompt === "string"
        ? req.body.prompt.trim()
        : "";

    if (prompt.length < 10) {
      return res.status(400).json({
        success: false,
        message: "Please enter a prompt with at least 10 characters."
      });
    }

    if (prompt.length > 4000) {
      return res.status(400).json({
        success: false,
        message: "Prompt must not exceed 4000 characters."
      });
    }

    const html = await generateWebsite(prompt);

    const titleMatch = html.match(
      /<title[^>]*>([\s\S]*?)<\/title>/i
    );

    const title = titleMatch
      ? titleMatch[1].replace(/<[^>]*>/g, "").trim().slice(0, 150)
      : "AI Generated Website";

    const { data, error } = await supabase
      .from("projects")
      .insert({
        title: title || "AI Generated Website",
        prompt,
        html_code: html
      })
      .select("id, title, created_at")
      .single();

   
if (error) {
  console.error("Supabase save error:", error);

  return res.status(500).json({
    success: false,
    message: "Website generated, but saving to the database failed.",
    error: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint
  });
}

    return res.json({
      success: true,
      message: "Website generated and saved successfully.",
      project: data,
      html
    });
  } catch (error) {
    console.error("Generation error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to generate the website. Please try again."
    });
  }
});

app.get("/api/projects", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("projects")
      .select("id, title, prompt, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    return res.json({
      success: true,
      projects: data
    });
  } catch (error) {
    console.error("Projects error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not load saved projects."
    });
  }
});

app.get("/api/projects/:id", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", req.params.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Project not found."
      });
    }

    return res.json({
      success: true,
      project: data
    });
  } catch (error) {
    console.error("Project detail error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not load this project."
    });
  }
});



// app.listen(PORT, () => {
//   console.log(`PromptCraft AI running at http://localhost:${PORT}`);
// });

export default app;

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`PromptCraft AI running at http://localhost:${PORT}`);
  });
}