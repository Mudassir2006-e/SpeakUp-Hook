import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const INTEGRATIONS_FILE = path.join(process.cwd(), "src", "config", "integrations-config.json");

// In-memory token bucket rate limiter (e.g. 15 requests per minute per IP)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 15;

  const current = rateLimitMap.get(ip);
  if (!current || now > current.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (current.count >= maxRequests) {
    return false;
  }

  current.count += 1;
  return true;
}

function getStoredIntegration(): any {
  try {
    if (!fs.existsSync(INTEGRATIONS_FILE)) return null;
    const raw = fs.readFileSync(INTEGRATIONS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a minute before sending more messages." },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.message || typeof body.message !== "string") {
      return NextResponse.json({ error: "Invalid message payload." }, { status: 400 });
    }

    const userMessage = body.message.trim();
    if (!userMessage) {
      return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });
    }

    if (userMessage.length > 1000) {
      return NextResponse.json(
        { error: "Message is too long. Please keep under 1000 characters." },
        { status: 400 }
      );
    }

    const config = getStoredIntegration();
    if (!config || !config.ai?.enabled) {
      return NextResponse.json(
        {
          error: "The AI learning assistant is currently offline or not enabled by the administrator.",
          disabled: true,
        },
        { status: 503 }
      );
    }

    const provider = config.ai.activeProvider || "openai";
    const systemPrompt =
      config.ai.systemPrompt ||
      "You are SpeakUp's official language learning assistant. Help students politely and concisely with their language learning questions.";

    // 1. OpenAI Path
    if (provider === "openai") {
      const apiKey = config.ai.openai?.apiKey || process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { error: "AI provider configuration error: API key not set.", disabled: true },
          { status: 503 }
        );
      }

      const model = config.ai.openai?.model || "gpt-4o-mini";
      const temperature = config.ai.openai?.temperature ?? 0.7;

      const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model,
          temperature,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
        }),
      });

      if (!aiRes.ok) {
        const errJson = await aiRes.json().catch(() => ({}));
        console.error("OpenAI API call failed:", errJson);
        return NextResponse.json(
          { error: "The AI provider encountered an issue processing your query." },
          { status: 502 }
        );
      }

      const aiData = await aiRes.json();
      const reply = aiData.choices?.[0]?.message?.content || "I apologize, but I could not generate a response.";

      return NextResponse.json({ reply, provider: "openai", model });
    }

    // 2. Google Gemini Path
    if (provider === "gemini") {
      const apiKey = config.ai.gemini?.apiKey || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { error: "AI provider configuration error: API key not set.", disabled: true },
          { status: 503 }
        );
      }

      const model = config.ai.gemini?.model || "gemini-1.5-flash";

      const aiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  { text: `${systemPrompt}\n\nStudent question: ${userMessage}` },
                ],
              },
            ],
          }),
        }
      );

      if (!aiRes.ok) {
        const errJson = await aiRes.json().catch(() => ({}));
        console.error("Gemini API call failed:", errJson);
        return NextResponse.json(
          { error: "The AI provider encountered an issue processing your query." },
          { status: 502 }
        );
      }

      const aiData = await aiRes.json();
      const reply =
        aiData.candidates?.[0]?.content?.parts?.[0]?.text ||
        "I apologize, but I could not generate a response.";

      return NextResponse.json({ reply, provider: "gemini", model });
    }

    return NextResponse.json({ error: "Unsupported provider." }, { status: 400 });
  } catch (err) {
    console.error("Chat API route error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function GET() {
  try {
    const config = getStoredIntegration();
    const isConfigured = Boolean(
      config?.ai?.enabled &&
        ((config.ai.activeProvider === "openai" && (config.ai.openai?.apiKey || process.env.OPENAI_API_KEY)) ||
          (config.ai.activeProvider === "gemini" && (config.ai.gemini?.apiKey || process.env.GEMINI_API_KEY)))
    );

    return NextResponse.json({
      enabled: isConfigured,
      provider: isConfigured ? config?.ai?.activeProvider : null,
      status: isConfigured ? "online" : "disabled",
    });
  } catch {
    return NextResponse.json({ enabled: false, status: "disabled" });
  }
}

