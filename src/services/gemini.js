
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is missing in .env");
}

const ai = new GoogleGenAI({ apiKey });

const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";

export async function generateWebsite(userPrompt) {
  const response = await ai.models.generateContent({
    model,
    contents: `
Create a complete, professional, responsive website.

USER REQUIREMENTS:
${userPrompt}

RULES:
- Return one complete HTML document.
- Start with <!DOCTYPE html> and include <html>, <head>, and <body>.
- Put all CSS inside a <style> tag.
- Put JavaScript inside a <script> tag.
- Use HTML, CSS, and vanilla JavaScript only.
- Make the design modern, attractive, and mobile responsive.
- Include working UI interactions where appropriate.
- Do not use Markdown code fences.
- Do not explain the code.
- Do not omit any part of the HTML.
- Return only the HTML document.
`,
    config: {
      temperature: 0.4,
      maxOutputTokens: 20000,
    },
  });

  let html = response.text?.trim() || "";

  // Remove Markdown code fences if Gemini includes them.
  html = html
    .replace(/^```(?:html)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // Extract the HTML document if extra text appears around it.
  const htmlStart = html.search(/<!doctype\s+html|<html[\s>]/i);

  if (htmlStart > 0) {
    html = html.slice(htmlStart).trim();
  }

  // Check whether Gemini generated a complete document.
  const hasHtmlStart = /<html[\s>]/i.test(html);
  const hasHtmlEnd = /<\/html\s*>/i.test(html);


if (!html || !hasHtmlStart || !hasHtmlEnd) {
  console.error("Gemini response preview:", html.slice(0, 1000));
  console.error("Gemini response length:", html.length);
  console.error(
    "Gemini finish reason:",
    response.candidates?.[0]?.finishReason
  );
  console.error(
    "Gemini candidate count:",
    response.candidates?.length ?? 0
  );

  throw new Error(
    `Gemini returned incomplete HTML. Finish reason: ${
      response.candidates?.[0]?.finishReason ?? "UNKNOWN"
    }`
  );
}

  return html;
}