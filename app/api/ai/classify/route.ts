import { NextRequest, NextResponse } from "next/server";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";
const HUGGINGFACE_API_URL =
  "https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-base";

export async function POST(request: NextRequest) {
  try {
    const provider = (process.env.AI_PROVIDER || "mock").toLowerCase();
    const apiKey =
      provider === "deepseek"
        ? process.env.DEEPSEEK_API_KEY
        : provider === "huggingface"
        ? process.env.HUGGINGFACE_API_KEY
        : process.env.OPENAI_API_KEY;

    // Mock provider doesn't need API key
    if (!apiKey && provider !== "mock") {
      return NextResponse.json(
        {
          error:
            provider === "deepseek"
              ? "Missing DEEPSEEK_API_KEY"
              : provider === "huggingface"
              ? "Missing HUGGINGFACE_API_KEY"
              : "Missing OPENAI_API_KEY",
          hint:
            provider === "deepseek"
              ? "Set DEEPSEEK_API_KEY and optionally AI_PROVIDER=deepseek"
              : provider === "huggingface"
              ? "Set HUGGINGFACE_API_KEY (get free token at huggingface.co/settings/tokens)"
              : provider === "mock"
              ? "Set AI_PROVIDER=mock for demo mode (no API key needed)"
              : "Set OPENAI_API_KEY or set AI_PROVIDER=deepseek with DEEPSEEK_API_KEY",
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { image, categories } = body as {
      image?: string;
      categories?: string[];
    };

    if (!image) {
      return NextResponse.json(
        { error: "Missing image data URL" },
        { status: 400 }
      );
    }

    const knownCategories =
      Array.isArray(categories) && categories.length > 0
        ? categories
        : ["Potholes", "Drainage", "Street light", "Garbage"];

    const systemPrompt = `You are an assistant that classifies civic issue images.
Pick the single best matching category from this exact list: ${knownCategories.join(
      ", "
    )}.
If the image shows no civic issue from this list, answer with NONE.
Return a strict JSON object with keys: category (string), confidence (0-1), reason (short string).
The category must be either one of the provided categories, or the string NONE.`;

    let payload: Record<string, unknown>;
    let apiUrl: string;

    if (provider === "mock") {
      // Mock response for demo - no actual API call
      const mockCategories = [
        "Potholes",
        "Drainage",
        "Street light",
        "Garbage",
      ];
      const randomCategory =
        mockCategories[Math.floor(Math.random() * mockCategories.length)];
      const isNone = Math.random() < 0.3; // 30% chance of "none"

      return NextResponse.json({
        category: isNone ? "none" : randomCategory,
        confidence: 0.85,
        reason: isNone
          ? "No civic issue detected in image"
          : `Detected ${randomCategory.toLowerCase()} issue`,
      });
    } else if (provider === "huggingface") {
      // Convert data URL to base64 for Hugging Face
      const base64Data = image.replace(/^data:image\/[a-z]+;base64,/, "");
      payload = { inputs: base64Data };
      apiUrl = HUGGINGFACE_API_URL;
    } else {
      const model =
        provider === "deepseek"
          ? process.env.DEEPSEEK_MODEL || "deepseek-vl2"
          : process.env.OPENAI_VISION_MODEL || "gpt-4o-mini";

      payload = {
        model,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Classify this image into the provided categories.",
              },
              { type: "image_url", image_url: { url: image } },
            ],
          },
        ],
        temperature: 0,
        response_format: { type: "json_object" },
      };

      apiUrl = provider === "deepseek" ? DEEPSEEK_API_URL : OPENAI_API_URL;
    }

    let resp: Response;
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (apiKey) {
        headers.Authorization = `Bearer ${apiKey}`;
      }

      resp = await fetch(apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
    } catch (networkErr) {
      console.error("AI network error:", networkErr);
      return NextResponse.json(
        { error: "AI network error", detail: String(networkErr) },
        { status: 500 }
      );
    }

    if (!resp.ok) {
      const requestId = resp.headers.get("x-request-id") || undefined;
      let detail: unknown;
      try {
        detail = await resp.json();
      } catch {
        try {
          detail = await resp.text();
        } catch {
          detail = undefined;
        }
      }
      console.error("AI API error", {
        status: resp.status,
        statusText: resp.statusText,
        requestId,
        detail,
      });
      return NextResponse.json(
        {
          error: "AI API error",
          status: resp.status,
          statusText: resp.statusText,
          requestId,
          detail,
        },
        { status: resp.status }
      );
    }

    const data = await resp.json();

    let category: string;
    let confidence: number | null = null;
    let reason = "";

    if (provider === "huggingface") {
      // Hugging Face returns different format - extract from generated_text
      const generatedText = data?.[0]?.generated_text || "";

      // Simple keyword matching for our 4 categories
      const text = generatedText.toLowerCase();
      if (text.includes("pothole") || text.includes("hole")) {
        category = "Potholes";
        confidence = 0.8;
        reason = "Detected pothole in image";
      } else if (
        text.includes("drain") ||
        text.includes("sewer") ||
        text.includes("water")
      ) {
        category = "Drainage";
        confidence = 0.8;
        reason = "Detected drainage issue";
      } else if (
        text.includes("light") ||
        text.includes("lamp") ||
        text.includes("streetlight")
      ) {
        category = "Street light";
        confidence = 0.8;
        reason = "Detected street light issue";
      } else if (
        text.includes("garbage") ||
        text.includes("trash") ||
        text.includes("waste") ||
        text.includes("litter")
      ) {
        category = "Garbage";
        confidence = 0.8;
        reason = "Detected garbage/trash issue";
      } else {
        category = "none";
        confidence = 0.7;
        reason = "No civic issue detected in image";
      }
    } else {
      // OpenAI/DeepSeek format
      const content = data?.choices?.[0]?.message?.content;
      let parsed: { category?: string; confidence?: number; reason?: string } =
        {};
      try {
        parsed = JSON.parse(content || "{}");
      } catch {}

      category = (parsed.category || "").toString();
      confidence =
        typeof parsed.confidence === "number" ? parsed.confidence : null;
      reason = parsed.reason || "";

      if (!category) {
        return NextResponse.json(
          { error: "Invalid AI response" },
          { status: 500 }
        );
      }

      if (category.toUpperCase() === "NONE") {
        return NextResponse.json({ category: "none", confidence, reason });
      }

      // Normalize to one of known categories if possible (case-insensitive)
      const normalized = knownCategories.find(
        (c) => c.toLowerCase() === category.toLowerCase()
      );
      category = normalized || category;
    }

    return NextResponse.json({ category, confidence, reason });
  } catch (error) {
    console.error("AI classify error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
