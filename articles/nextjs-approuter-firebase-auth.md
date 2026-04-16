---
title: "Next.js App Router + Firebase Auth の実装パターンまとめ — サーバー・クライアント両対応"
emoji: "🔐"
type: "tech"
topics: ["nextjs", "firebase", "typescript", "react"]
published: true
---

個人開発の「[Gear-Loom](https://www.gear-loom.com)」でNext.js App Router + Firebase Authを実装しました。

App RouterはServer ComponentとClient Componentが混在するため、「Firebase AuthはどこでどうやってもセーフにSDKを呼び出すか」という問題に何度もハマりました。この記事では実際に動いているパターンをまとめます。

## 構成の全体像

Firebase AuthはSDKの性質上、**クライアント側とサーバー側で完全に別のアプローチ**が必要です。

```
【クライアント側】
Firebase Auth SDK（firebase/auth）
  └─ onAuthStateChanged でuserを監視
  └─ AuthContext → useAuth() で全Clientコンポーネントに配布

【サーバー側（API Route / Server Action）】
Firebase Admin SDK（firebase-admin）
  └─ verifyIdToken() でIDトークンを検証
  └─ クライアントが Bearer <idToken> をヘッダーに付けて送る
```

## ポイント①：Firebase Client SDKはサーバーで動かない

Firebase Client SDKは `window` オブジェクトに依存しており、**サーバーサイド（Server Component / API Route）では動きません**。

うっかり `import { getAuth } from "firebase/auth"` してサーバーで呼ぶとエラーになります。

そこで、Firebase関連のクライアント初期化を**`typeof window === "undefined"` でガードした関数**にまとめました。

```ts
// src/lib/firebase/client.ts

function getApp(): FirebaseApp | null {
  // サーバーサイドでは null を返す
  if (typeof window === "undefined") return null;
  try {
    const apps = getApps();
    if (apps.length > 0) return apps[0];
    if (!firebaseConfig.apiKey) return null;
    return initializeApp(firebaseConfig);
  } catch {
    return null;
  }
}

export function getFirebaseAuth(): Auth | null {
  const app = getApp();
  return app ? getAuth(app) : null;
}
```

`getFirebaseAuth()` がサーバーで呼ばれても `null` が返るだけでクラッシュしません。呼び出し側で `null` チェックするだけでOKです。

## ポイント②：AuthContextでuserを全体に配る

`"use client"` のContextでFirebase Authの状態を管理し、アプリ全体に配布します。

```tsx
// src/contexts/AuthContext.tsx
"use client";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const auth = getFirebaseAuth();

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    // ローカルストレージにセッションを永続化
    setPersistence(auth, browserLocalPersistence).then(() => {
      const unsubscribe = onAuthStateChanged(auth, (u) => {
        setUser(u ?? null);
        setLoading(false);
      });
      return () => unsubscribe();
    });
  }, [auth]);

  // ...省略
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
```

`loading` フラグが重要です。`onAuthStateChanged` は非同期で初回コールバックが来るため、**`loading: true` の間は認証状態が未確定**です。ここを考慮しないとログイン済みユーザーが一瞬ログアウト状態に見えるチラつきが起きます。

```tsx
// src/app/layout.tsx（Root Layout）
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {/* Client ComponentのProviderはServer ComponentのLayoutでも配置できる */}
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

:::message
`AuthProvider` は `"use client"` ですが、Root LayoutはServer Componentのままで大丈夫です。Server ComponentはClient Componentをchildrenとしてレンダリングできるためです。
:::

## ポイント③：認証が必要なページのガード

`useAuth()` で `user` と `loading` を受け取り、クライアントサイドでリダイレクトします。

```tsx
"use client";

export default function MyPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?next=/mypage`);
    }
  }, [user, loading, router]);

  // loading中はスケルトンを表示（チラつき防止）
  if (loading) return <LoadingSkeleton />;
  if (!user) return null;

  return <MyPageContent user={user} />;
}
```

`next` パラメータにリダイレクト元のパスを入れておくと、ログイン後に元のページへ戻れます。

## ポイント④：API RouteではAdmin SDKでトークン検証

クライアントからAPIを叩くときは、**Firebase AuthのIDトークンをAuthorizationヘッダーに付けて送ります**。

```ts
// クライアント側：IDトークンを取得してヘッダーに付ける
const token = await user.getIdToken();
const res = await fetch("/api/gears/upload", {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: formData,
});
```

API Route側では**Firebase Admin SDKの `verifyIdToken()`** でトークンを検証します。

```ts
// src/app/api/admin/verify-admin.ts

export async function verifyAdminFromRequest(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const auth = getAdminAuth(); // firebase-admin の Auth
  try {
    const decoded = await auth.verifyIdToken(token);
    return { uid: decoded.uid }; // 検証成功 → UIDを返す
  } catch {
    return NextResponse.json({ error: "認証に失敗しました" }, { status: 401 });
  }
}
```

Server Actionでも同様に `getAdminAuth()` でトークンを検証してから処理します。

## ハマりポイント：Admin SDKの秘密鍵の改行問題

Firebase Admin SDKの秘密鍵（FIREBASE_ADMIN_PRIVATE_KEY）は複数行にわたるPEM形式です。`.env` ファイルに書くとき、改行が `\n` という文字列として保存されてしまい、**SDKが認証できない**という問題が起きます。

```ts
// 環境変数の \n を実際の改行に変換する
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
```

Vercelの場合はダッシュボードの Environment Variables に直接貼り付けると改行がそのまま保持されます。ローカルの `.env.local` では上記の変換が必要です。

また、`projectId` は `credential.cert()` と `initializeApp()` の**両方に明示的に渡す**必要があります。どちらか一方だけだと `verifyIdToken` の `aud`（audience）検証が失敗することがあります。

```ts
admin.initializeApp({
  credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  projectId, // ← ここにも渡す
});
```

## まとめ

App Router + Firebase Authのポイントをまとめると：

- Firebase Client SDKは**`typeof window` ガード**でサーバークラッシュを防ぐ
- `AuthProvider`（Client Component）をRoot Layoutからラップしてuserをアプリ全体に配布
- `loading` フラグで初期化中のチラつきを防ぐ
- API Route / Server Actionでは**Admin SDK + `verifyIdToken`** でトークン検証
- 秘密鍵の `\n` 問題と `projectId` の二重指定に注意

クライアントとサーバーで役割を明確に分けることで、App RouterのServer Component主体の設計と共存できます。

---

個人開発サービス「Gear-Loom」はこちら → https://www.gear-loom.com
