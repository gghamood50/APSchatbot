//
// File: functions/index.js
// Description: Secure backend Cloud Function (using standard onRequest).
//

// IMPORTANT: We are now using onRequest instead of onCall
import { onRequest } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { GoogleGenerativeAI } from "@google/generative-ai";

initializeApp();

// This is now a standard, secure HTTP function.
export const askGemini = onRequest({ secrets: ["GEMINI_API_KEY"] }, async (req, res) => {
  // Set CORS headers for preflight and actual requests.
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle preflight OPTIONS request.
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  // For onRequest, we manually check that it's a POST request.
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  // The payload from curl is in req.body.
  // We still expect it to be wrapped in a "data" object to match the onCall format.
  const { history, prompt } = req.body.data;

  if (typeof prompt !== "string" || prompt.trim().length === 0) {
    res.status(400).json({
      error: { message: "The function must be called with a non-empty 'prompt' string." },
    });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY secret not set in the environment.");
    res.status(500).json({
      error: { message: "The server is missing its API configuration." },
    });
    return;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const chat = model.startChat({ history: history || [] });
    const result = await chat.sendMessage(prompt);
    const response = await result.response;
    const text = response.text();

    console.log("Received response from Gemini:", text);

    // Manually send back a successful JSON response.
    // The "result" wrapper is expected by the curl command.
    res.status(200).json({ result: { text: text } });

  } catch (error) {
    console.error("Error calling Google Generative AI:", error);
    // Manually send back an error response.
    res.status(500).json({
      error: { message: "An error occurred while communicating with the AI." },
    });
  }
});
