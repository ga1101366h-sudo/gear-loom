import { NextRequest, NextResponse } from "next/server";
import { createHmac, randomBytes } from "crypto";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";

const X_TOKEN_URL = "https://api.twitter.com/2/oauth2/token";
const X_USER_ME_URL = "https://api.twitter.com/2/users/me?user.fields=name,username,profile_image_url";
const USER_ID_REGEX = /^[a-zA-Z0-9_]{3,30}$/;
const STATE_TTL_MS = 10 * 60 * 1000; // 10分

function base64UrlEncode(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
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

export async function GET(request: NextRequest) {
  const clientId = process.env.X_OAUTH_CLIENT_ID;
  const clientSecret = process.env.X_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.X_OAUTH_REDIRECT_URI;
  const stateSecret = process.env.X_OAUTH_STATE_SECRET;
  const origin = process.env.NEXT_PUBLIC_APP_ORIGIN ?? request.nextUrl.origin;

  if (!clientId || !clientSecret || !redirectUri || !stateSecret) {
    return NextResponse.redirect(new URL("/login?error=x_config", origin));
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/signup/x?error=${encodeURIComponent(error)}`, origin));
  }
  if (!code || !state) {
    return NextResponse.redirect(new URL("/signup/x?error=missing_params", origin));
  }

  const payload = verifyState(state, stateSecret);
  if (!payload || typeof payload.v !== "string") {
    return NextResponse.redirect(new URL("/signup/x?error=invalid_state", origin));
  }
  const ts = typeof payload.t === "number" ? payload.t : 0;
  if (Date.now() - ts > STATE_TTL_MS) {
    return NextResponse.redirect(new URL("/signup/x?error=state_expired", origin));
  }

  const codeVerifier = String(payload.v);
  const nextPath = (typeof payload.n === "string" ? payload.n : "/").trim().slice(0, 300) || "/";
  const isPrefill = payload.a === "prefill";

  if (!isPrefill && (typeof payload.d !== "string" || typeof payload.u !== "string")) {
    return NextResponse.redirect(new URL("/signup/x?error=invalid_state", origin));
  }

  const tokenRes = await fetch(X_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    console.error("[x-callback] token exchange failed", tokenRes.status, errText);
    return NextResponse.redirect(new URL("/signup/x?error=token_failed", origin));
  }

  const tokenJson = (await tokenRes.json()) as { access_token?: string };
  const accessToken = tokenJson.access_token;
  if (!accessToken) {
    return NextResponse.redirect(new URL("/signup/x?error=no_token", origin));
  }

  const userRes = await fetch(X_USER_ME_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!userRes.ok) {
    console.error("[x-callback] users/me failed", userRes.status);
    return NextResponse.redirect(new URL("/signup/x?error=user_failed", origin));
  }

  const userJson = (await userRes.json()) as {
    data?: { id: string; name?: string; username?: string; profile_image_url?: string };
  };
  const xId = userJson.data?.id;
  const xName = userJson.data?.name ?? null;
  const xUsername = userJson.data?.username ?? null;
  const xProfileImage = userJson.data?.profile_image_url ?? null;
  if (!xId) {
    return NextResponse.redirect(new URL("/signup/x?error=no_x_user", origin));
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.redirect(new URL("/signup/x?error=server", origin));
  }

  // プレフィル用: X の情報をセッションに保存し /signup/x?sid= へ
  if (isPrefill) {
    const sid = randomBytes(16).toString("hex");
    const SESSION_TTL_MS = 10 * 60 * 1000; // 10分
    await db.collection("signup_sessions").doc(sid).set({
      x_id: xId,
      access_token: accessToken,
      name: xName,
      username: xUsername,
      profile_image_url: xProfileImage,
      created_at: Date.now(),
      expires_at: Date.now() + SESSION_TTL_MS,
    });
    const signupUrl = new URL("/signup/x", origin);
    signupUrl.searchParams.set("sid", sid);
    signupUrl.searchParams.set("next", nextPath);
    return NextResponse.redirect(signupUrl.toString());
  }

  const displayName = String(payload.d).trim().slice(0, 80);
  const userId = String(payload.u).trim().toLowerCase();
  if (!USER_ID_REGEX.test(userId)) {
    return NextResponse.redirect(new URL("/signup/x?error=invalid_user_id", origin));
  }

  const auth = getAdminAuth();
  if (!auth) {
    return NextResponse.redirect(new URL("/signup/x?error=server", origin));
  }

  const firebaseUid = `x_${xId}`;

  const existingProfile = await db.collection("profiles").where("user_id", "==", userId).limit(1).get();
  if (!existingProfile.empty) {
    return NextResponse.redirect(new URL("/signup/x?error=user_id_taken", origin));
  }

  const now = new Date().toISOString();
  await db.collection("profiles").doc(firebaseUid).set({
    display_name: displayName || xName || null,
    user_id: userId,
    avatar_url: xProfileImage ?? null,
    created_at: now,
    updated_at: now,
  });

  const customToken = await auth.createCustomToken(firebaseUid);

  const completeUrl = new URL("/signup/x/complete", origin);
  completeUrl.searchParams.set("token", customToken);
  completeUrl.searchParams.set("next", nextPath);
  return NextResponse.redirect(completeUrl.toString());
}
