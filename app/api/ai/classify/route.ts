import { NextRequest, NextResponse } from "next/server";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";
const HUGGINGFACE_API_URL =
  "https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-base";
const GOOGLE_VISION_API_URL =
  "https://vision.googleapis.com/v1/images:annotate";
const REPLICATE_API_URL = "https://api.replicate.com/v1/predictions";

export async function POST(request: NextRequest) {
  try {
    const provider = (process.env.AI_PROVIDER || "mock").toLowerCase();
    const apiKey =
      provider === "deepseek"
        ? process.env.DEEPSEEK_API_KEY
        : provider === "huggingface"
        ? process.env.HUGGINGFACE_API_KEY
        : provider === "google"
        ? process.env.GOOGLE_VISION_API_KEY
        : provider === "replicate"
        ? process.env.REPLICATE_API_TOKEN
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
              : provider === "google"
              ? "Missing GOOGLE_VISION_API_KEY"
              : provider === "replicate"
              ? "Missing REPLICATE_API_TOKEN"
              : "Missing OPENAI_API_KEY",
          hint:
            provider === "deepseek"
              ? "Set DEEPSEEK_API_KEY and optionally AI_PROVIDER=deepseek"
              : provider === "huggingface"
              ? "Set HUGGINGFACE_API_KEY (get free token at huggingface.co/settings/tokens)"
              : provider === "google"
              ? "Set GOOGLE_VISION_API_KEY (get free key at console.cloud.google.com)"
              : provider === "replicate"
              ? "Set REPLICATE_API_TOKEN (get free token at replicate.com/account/api-tokens)"
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

    if (provider === "google") {
      // Google Vision API - free tier available
      const base64Data = image.replace(/^data:image\/[a-z]+;base64,/, "");

      const payload = {
        requests: [
          {
            image: {
              content: base64Data,
            },
            features: [
              {
                type: "LABEL_DETECTION",
                maxResults: 10,
              },
              {
                type: "TEXT_DETECTION",
                maxResults: 5,
              },
            ],
          },
        ],
      };

      const resp = await fetch(`${GOOGLE_VISION_API_URL}?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const errorData = await resp.json();
        return NextResponse.json(
          { error: "Google Vision API error", detail: errorData },
          { status: resp.status }
        );
      }

      const data = await resp.json();
      const labels = data.responses?.[0]?.labelAnnotations || [];
      const texts = data.responses?.[0]?.textAnnotations || [];

      // Analyze labels and text for civic issues
      const allText = [
        ...labels.map((l: { description: string }) => l.description),
        ...texts.map((t: { description: string }) => t.description),
      ]
        .join(" ")
        .toLowerCase();

      let category = "none";
      let confidence = 0.5;
      let reason = "No civic issue detected";

      // Check for potholes
      if (
        allText.includes("pothole") ||
        allText.includes("hole") ||
        (allText.includes("road") && allText.includes("damage"))
      ) {
        category = "Potholes";
        confidence = 0.8;
        reason = "Detected pothole or road damage";
      }
      // Check for drainage
      else if (
        allText.includes("drain") ||
        allText.includes("sewer") ||
        allText.includes("water") ||
        allText.includes("flood")
      ) {
        category = "Drainage";
        confidence = 0.8;
        reason = "Detected drainage or water issue";
      }
      // Check for street lights
      else if (
        allText.includes("light") ||
        allText.includes("lamp") ||
        allText.includes("streetlight") ||
        allText.includes("pole")
      ) {
        category = "Street light";
        confidence = 0.8;
        reason = "Detected street light or pole";
      }
      // Check for garbage
      else if (
        allText.includes("garbage") ||
        allText.includes("trash") ||
        allText.includes("waste") ||
        allText.includes("litter") ||
        allText.includes("bin")
      ) {
        category = "Garbage";
        confidence = 0.8;
        reason = "Detected garbage or waste";
      }

      return NextResponse.json({ category, confidence, reason });
    } else if (provider === "replicate") {
      // Replicate API - has free tier
      const base64Data = image.replace(/^data:image\/[a-z]+;base64,/, "");

      const payload = {
        version: "2bdc38ef697fad142b9735c2e407bce4514ca2a4",
        input: {
          image: `data:image/jpeg;base64,${base64Data}`,
        },
      };

      const resp = await fetch(REPLICATE_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const errorData = await resp.json();
        return NextResponse.json(
          { error: "Replicate API error", detail: errorData },
          { status: resp.status }
        );
      }

      const data = await resp.json();
      const predictionId = data.id;

      // Poll for result (Replicate is async)
      let attempts = 0;
      const maxAttempts = 30;

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second

        const statusResp = await fetch(`${REPLICATE_API_URL}/${predictionId}`, {
          headers: {
            Authorization: `Token ${apiKey}`,
          },
        });

        const statusData = await statusResp.json();

        if (statusData.status === "succeeded") {
          const description = statusData.output || "";
          const text = description.toLowerCase();

          let category = "none";
          let confidence = 0.5;
          let reason = "No civic issue detected";

          // Check for potholes
          if (
            text.includes("pothole") ||
            text.includes("hole") ||
            (text.includes("road") && text.includes("damage"))
          ) {
            category = "Potholes";
            confidence = 0.8;
            reason = "Detected pothole or road damage";
          }
          // Check for drainage
          else if (
            text.includes("drain") ||
            text.includes("sewer") ||
            text.includes("water") ||
            text.includes("flood")
          ) {
            category = "Drainage";
            confidence = 0.8;
            reason = "Detected drainage or water issue";
          }
          // Check for street lights
          else if (
            text.includes("light") ||
            text.includes("lamp") ||
            text.includes("streetlight") ||
            text.includes("pole")
          ) {
            category = "Street light";
            confidence = 0.8;
            reason = "Detected street light or pole";
          }
          // Check for garbage
          else if (
            text.includes("garbage") ||
            text.includes("trash") ||
            text.includes("waste") ||
            text.includes("litter") ||
            text.includes("bin")
          ) {
            category = "Garbage";
            confidence = 0.8;
            reason = "Detected garbage or waste";
          }

          return NextResponse.json({ category, confidence, reason });
        } else if (statusData.status === "failed") {
          return NextResponse.json(
            { error: "Replicate prediction failed", detail: statusData.error },
            { status: 500 }
          );
        }

        attempts++;
      }

      return NextResponse.json(
        { error: "Replicate prediction timeout" },
        { status: 500 }
      );
    } else if (provider === "mock") {
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
