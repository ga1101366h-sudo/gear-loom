import { NextResponse } from "next/server";

const GEMINI_MODEL = "gemini-2.5-flash-lite";

const PROMPT = `あなたはエフェクターボードの解析AIです。添付された画像の中にあるエフェクター、スイッチャー、ジャンクションボックス、ペダル類をすべて検出し、JSON配列で返してください。各機材の座標は、綺麗な等間隔に丸めず、実際の配置通りのリアルな位置を小数点第3位まで（例: 0.342, 0.891）正確に出力してください。各オブジェクトは以下のプロパティを持つこと：
- \`label\`: 推測される種類（例: "エフェクター", "スイッチャー", "ペダル" など）
- \`x\`: 画像の左上を原点(0.0, 0.0)とした時の、その機材の中心の相対X座標（0.0〜1.0の数値）
- \`y\`: 画像の左上を原点(0.0, 0.0)とした時の、その機材の中心の相対Y座標（0.0〜1.0の数値）`;

export type BoardAnalyzeItem = { label: string; x: number; y: number };

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY is not configured" }, { status: 500 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("image") ?? formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing image file (field: image or file)" }, { status: 400 });
  }

  const mimeType = file.type || "image/jpeg";
  if (!/^image\/(jpeg|png|webp)$/i.test(mimeType)) {
    return NextResponse.json({ error: "Unsupported image type. Use JPEG, PNG, or WebP." }, { status: 400 });
  }

  let base64: string;
  try {
    const buffer = await file.arrayBuffer();
    base64 = Buffer.from(buffer).toString("base64");
  } catch (e) {
    console.error("[board/analyze] Failed to read file:", e);
    return NextResponse.json({ error: "Failed to read image" }, { status: 400 });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { inlineData: { mimeType, data: base64 } },
            { text: PROMPT },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: 4096,
        temperature: 0.2,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("[board/analyze] Gemini error:", res.status, errText);
    let message = errText;
    try {
      const errJson = JSON.parse(errText) as { error?: { message?: string } };
      if (errJson?.error?.message) message = errJson.error.message;
    } catch {
      // use raw errText
    }
    return NextResponse.json({ error: message }, { status: res.status >= 500 ? 502 : 400 });
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) {
    return NextResponse.json({ error: "No content in Gemini response" }, { status: 502 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON from Gemini", raw: text }, { status: 502 });
  }

  const arr = Array.isArray(parsed) ? parsed : (parsed as { items?: unknown })?.items;
  if (!Array.isArray(arr)) {
    return NextResponse.json({ error: "Response is not an array", raw: text }, { status: 502 });
  }

  const items: BoardAnalyzeItem[] = arr
    .filter((item): item is Record<string, unknown> => item != null && typeof item === "object")
    .map((item) => ({
      label: typeof item.label === "string" ? item.label : "未設定の機材",
      x: typeof item.x === "number" ? Math.max(0, Math.min(1, item.x)) : 0.5,
      y: typeof item.y === "number" ? Math.max(0, Math.min(1, item.y)) : 0.5,
    }));

  return NextResponse.json(items);
}
