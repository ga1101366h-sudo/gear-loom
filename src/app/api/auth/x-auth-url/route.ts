import { NextResponse } from "next/server";
import { createHash, createHmac, randomBytes } from "crypto";
import { getAdminFirestore } from "@/lib/firebase/admin";

const USER_ID_REGEX = /^[a-zA-Z0-9_]{3,30}$/;
const X_AUTH_URL = "https://x.com/i/oauth2/authorize";
const SCOPE = "users.read tweet.read";

function base64UrlEncode(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function buildState(payload: Record<string, unknown>, secret: string): string {
  const payloadB64 = base64UrlEncode(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = createHmac("sha256", secret).update(payloadB64).digest();
  return `${payloadB64}.${base64UrlEncode(sig)}`;
}

function verifyState(state: string, secret: string): Record<string, unknown> | null {
  const dot = state.indexOf(".");
  if (dot === -1) return null;
  const payloadB64 = state.slice(0, dot);
  const sigB64 = state.slice(dot + 1);
  const sig = createHmac("sha256", secret).update(payloadB64).digest();
  if (base64UrlEncode(sig) !== sigB64) return null;
  try {
    const raw = Buffer.from(payloadB64.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const clientId = process.env.X_OAUTH_CLIENT_ID;
  const redirectUri = process.env.X_OAUTH_REDIRECT_URI;
  const stateSecret = process.env.X_OAUTH_STATE_SECRET;
  if (!clientId || !redirectUri || !stateSecret) {
    return NextResponse.json(
      { error: "X OAuth が設定されていません。" },
      { status: 503 }
    );
  }

  let body: { displayName?: string; userId?: string; next?: string; prefill?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "不正なリクエストです。" }, { status: 400 });
  }

  const nextPath = String(body.next ?? "/").trim().slice(0, 300);
  const isPrefill = body.prefill === true;

  if (isPrefill) {
    // X の情報取得のみ（フォーム事前入力用）。userId は未入力で OK
    const codeVerifier = randomBytes(32).toString("base64url").slice(0, 43);
    const codeChallenge = base64UrlEncode(createHash("sha256").update(codeVerifier).digest());
    const payload = {
      a: "prefill",
      n: nextPath || "/",
      v: codeVerifier,
      t: Date.now(),
    };
    const state = buildState(payload, stateSecret);
    const params = new URLSearchParams({
      response_type: "code",
      client_id: process.env.X_OAUTH_CLIENT_ID!,
      redirect_uri: process.env.X_OAUTH_REDIRECT_URI!,
      scope: SCOPE,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });
    const url = `${X_AUTH_URL}?${params.toString()}`;
    return NextResponse.json({ url });
  }

  const displayName = String(body.displayName ?? "").trim().slice(0, 80);
  const userId = String(body.userId ?? "").trim().toLowerCase();

  if (!USER_ID_REGEX.test(userId)) {
    return NextResponse.json(
      { error: "ユーザーIDは3〜30文字の半角英数字・アンダースコアのみ使用できます。" },
      { status: 400 }
    );
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }
  const existing = await db.collection("profiles").where("user_id", "==", userId).limit(1).get();
  if (!existing.empty) {
    return NextResponse.json(
      { error: "このユーザーIDはすでに使われています。" },
      { status: 400 }
    );
  }

  const codeVerifier = randomBytes(32).toString("base64url").slice(0, 43);
  const codeChallenge = base64UrlEncode(createHash("sha256").update(codeVerifier).digest());

  const payload = {
    d: displayName,
    u: userId,
    n: nextPath || "/",
    v: codeVerifier,
    t: Date.now(),
  };
  const state = buildState(payload, stateSecret);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: SCOPE,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  const url = `${X_AUTH_URL}?${params.toString()}`;
  return NextResponse.json({ url });
}
