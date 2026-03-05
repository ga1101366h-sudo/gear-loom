import { NextResponse } from "next/server";

const SYSTEM_PROMPT = `あなたは楽器・機材レビュー記事の編集アシスタントです。
ユーザーが書いた本文を、誤字脱字の修正や読みやすさを整えた補正案を返してください。
内容の意図や事実は変えず、文体を統一し、日本語として自然な表現に整えてください。

【改行】
段落の区切りや、2〜3文ごとなど、読みやすい位置で改行を入れてください。長い段落が続かないようにし、適度に空行（改行2つ）で段落を分けてください。

補正案のみを返し、説明や前置きは不要です。`;

/** 無料枠に余裕のある Flash を優先（3.1-pro は Quota exceeded になりやすいため使用しない） */
const GEMINI_MODELS = ["gemini-3.1-flash", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"] as const;

/** Gemini API で補正案を取得（利用可能なモデルを順に試す） */
async function improveWithGemini(apiKey: string, text: string): Promise<string | null> {
  let lastError: Error | null = null;

  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text }] }],
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          generationConfig: {
            maxOutputTokens: 2000,
            temperature: 0.3,
          },
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("[ai/improve-body] Gemini error:", res.status, model, errText);
        let message = errText;
        try {
          const errJson = JSON.parse(errText) as { error?: { message?: string } };
          if (errJson?.error?.message) message = errJson.error.message;
        } catch {
          // use raw errText
        }
        const isModelNotFound =
          res.status === 404 ||
          message.includes("is not found") ||
          message.includes("not supported for generateContent");
        if (isModelNotFound && model !== GEMINI_MODELS[GEMINI_MODELS.length - 1]) {
          lastError = new Error(message);
          continue;
        }
        throw new Error(message);
      }

      const data = (await res.json()) as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
        }>;
        promptFeedback?: { blockReason?: string };
      };

      const suggested = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (suggested) return suggested;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const msg = lastError.message;
      const isModelNotFound =
        msg.includes("is not found") || msg.includes("not supported for generateContent");
      if (!isModelNotFound || model === GEMINI_MODELS[GEMINI_MODELS.length - 1]) {
        throw lastError;
      }
    }
  }

  if (lastError) throw lastError;
  return null;
}

/** OpenAI API で補正案を取得 */
async function improveWithOpenAI(apiKey: string, text: string): Promise<string | null> {
  const modelsToTry = ["gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo"] as const;

  for (const model of modelsToTry) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text },
        ],
        max_tokens: 2000,
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      let msg = "";
      try {
        const errJson = JSON.parse(errText) as { error?: { message?: string } };
        msg = errJson?.error?.message ?? "";
      } catch {
        msg = errText;
      }
      const isModelError =
        res.status === 404 ||
        (msg.toLowerCase().includes("model") && msg.toLowerCase().includes("not found"));
      if (isModelError && model !== modelsToTry[modelsToTry.length - 1]) {
        continue;
      }
      throw new Error(msg || "OpenAI API error");
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const suggested = data.choices?.[0]?.message?.content?.trim();
    if (suggested) return suggested;
  }
  return null;
}

/** キーが設定されていれば AI 補正が利用可能 */
export async function GET() {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  return NextResponse.json({ available: !!(geminiKey || openaiKey) });
}

export async function POST(request: Request) {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();

  if (!geminiKey && !openaiKey) {
    return NextResponse.json(
      {
        error:
          "AI補正機能は設定されていません。ローカルでは .env.local に、本番では Vercel の環境変数に GEMINI_API_KEY または OPENAI_API_KEY のいずれかを追加し、サーバーを再起動してください。",
      },
      { status: 503 }
    );
  }

  let body: { text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエスト body が不正です" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json(
      { error: "本文が空です。補正したいテキストを入力してください。" },
      { status: 400 }
    );
  }

  if (text.length > 8000) {
    return NextResponse.json(
      { error: "本文が長すぎます（8000文字以内でお願いします）" },
      { status: 400 }
    );
  }

  try {
    // Gemini を優先（無料枠が使いやすいため）
    if (geminiKey) {
      try {
        const suggested = await improveWithGemini(geminiKey, text);
        if (suggested) {
          return NextResponse.json({ suggested });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[ai/improve-body] Gemini failed:", message);
        // Gemini 失敗時は OpenAI にフォールバック（OpenAI キーがあれば）
        if (!openaiKey) {
          try {
            const errJson = JSON.parse(message) as { error?: { message?: string } };
            return NextResponse.json(
              { error: errJson?.error?.message ?? message },
              { status: 502 }
            );
          } catch {
            return NextResponse.json({ error: message }, { status: 502 });
          }
        }
      }
    }

    // OpenAI（Gemini が未設定または失敗時）
    if (openaiKey) {
      const suggested = await improveWithOpenAI(openaiKey, text);
      if (suggested) {
        return NextResponse.json({ suggested });
      }
      return NextResponse.json(
        { error: "AIから補正案を取得できませんでした" },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: "AIの補正処理に失敗しました。" },
      { status: 502 }
    );
  } catch (err) {
    console.error("[ai/improve-body]", err);
    const message = err instanceof Error ? err.message : "AIの補正処理中にエラーが発生しました。";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
