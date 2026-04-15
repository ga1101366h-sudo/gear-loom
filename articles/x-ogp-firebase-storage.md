---
title: "XのOGP画像がFirebase Storageだと出たり出なかったりする問題を解決した話"
emoji: "🐦"
type: "tech"
topics: ["nextjs", "firebase", "ogp", "typescript"]
published: true
---

個人開発サービス「[Gear-Loom](https://www.gear-loom.com)」でXのシェアボタンを実装したところ、**OGP画像が出たり出なかったりする**という問題にハマりました。

同じ記事のURLでも、シェアするタイミングによって画像ありのカードになったり、テキストだけになったり。

原因を調べたところ、**XのクローラーがFirebase Storageの画像URLを取得できないことがある**という問題でした。

## 何が起きていたのか

Gear-LoomではFirebase Storageに画像をアップロードしており、レビュー記事のOGP画像として以下のようなURLを指定していました。

```
https://firebasestorage.googleapis.com/v0/b/[bucket]/o/[path]?alt=media&token=xxxxx
```

このURLをNext.jsのメタデータに設定してシェアしても、Xのカードクローラーが画像を取得できないことがありました。

原因としては：

- `?alt=media&token=xxxxx` のようなクエリパラメータ付きURLをXのクローラーが正しく処理できないケースがある
- Firebase StorageのCORSポリシーがXのクローラーのUser-Agentと相性が悪い場合がある
- クローラーのタイムアウトで失敗してそのまま画像なしがキャッシュされる

一度「画像なし」でキャッシュされると、Xは暫くそのキャッシュを使い続けます。同じURLでも再クロールのタイミング次第で表示が変わるので、「出たり出なかったり」という現象になっていました。

## 解決策①：og-proxyでFirebase Storageを同一オリジン経由に

XのクローラーはFirebase Storageが苦手でも、**同一オリジンのAPIエンドポイントから返す画像は確実に取得できます**。

そこで `/api/og-proxy` というエンドポイントを作り、Firebase StorageのURLをサーバーサイドでプロキシして返すようにしました。

```ts
// src/app/api/og-proxy/route.ts

/** SSRF対策: Firebase Storageのホストのみ許可 */
const ALLOWED_HOSTS = new Set(["firebasestorage.googleapis.com"]);

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url");
  // バリデーション省略...

  // Firebase StorageのURLをサーバーサイドでフェッチして返す
  const upstream = await fetch(target.toString(), {
    headers: { "User-Agent": "Gear-Loom-OG-Proxy/1.0" },
  });

  const buf = await upstream.arrayBuffer();
  return new NextResponse(buf, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
```

OGP画像URLの変換は専用ユーティリティにまとめました。

```ts
// src/lib/og-proxy.ts

const FIREBASE_STORAGE_HOST = "firebasestorage.googleapis.com";

/** Firebase StorageのURLのときだけプロキシURLに変換 */
export function toOgProxyImageUrl(siteOrigin: string, imageUrl: string): string {
  const origin = siteOrigin.replace(/\/$/, "");
  if (!isFirebaseStorageHttpsUrl(imageUrl)) return imageUrl; // Firebase以外はそのまま
  return `${origin}/api/og-proxy?url=${encodeURIComponent(imageUrl)}`;
}
```

これでOGPの `<meta>` タグに設定する画像URLが `https://www.gear-loom.com/api/og-proxy?url=...` になります。Xのクローラーから見ると同一ドメインのAPIを叩いているだけなので、安定して画像を取得できるようになりました。

:::message
**SSRF対策は必須です**。`url` パラメータに任意のURLを指定されると内部ネットワークへのアクセスに悪用されます。ホワイトリストで許可ホストを限定しましょう。
:::

## 解決策②：Next.jsの動的OGP画像でさらに安定化

og-proxyで改善しましたが、Firebase Storage画像がない記事（テキストのみのレビュー）でもOGPカードをリッチに見せたかったので、Next.js 14以降の **`opengraph-image.tsx`** を追加しました。

これはNext.jsが用意した動的OGP画像生成の仕組みで、`/reviews/[id]/opengraph-image.tsx` に配置すると `/reviews/[id]/opengraph-image` というエンドポイントが自動生成されます。サーバーサイドで画像を合成してPNGとして返すため、**Xのクローラーとの相性が最も安定します**。

```tsx
// src/app/reviews/[id]/opengraph-image.tsx

import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 675 }; // X推奨サイズ
export const contentType = "image/png";

export default async function OpenGraphImage({ params }) {
  const { id } = await params;
  const review = await getReviewByIdFromFirestore(id);
  const imageUrl = getReviewPrimaryImageUrl(review);

  // 外部画像はData URLに変換（Satorが直接リモート画像を描画できない場合がある）
  const imageDataUrl = imageUrl ? await fetchImageAsDataUrl(imageUrl) : null;

  return new ImageResponse(
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* 背景画像（レビュー画像 or デフォルトグラデーション） */}
      <img src={imageDataUrl ?? DEFAULT_BG_DATA_URL} style={{ objectFit: "cover" }} />
      {/* グラデーションオーバーレイ + テキスト */}
      <div style={{ position: "absolute", bottom: 40, color: "#f1f5f9", fontSize: 40 }}>
        {review.title}
      </div>
    </div>,
    { ...size }
  );
}
```

### キャッシュバスティング

レビュー内容が更新されたとき、Xのキャッシュに古いOGP画像が残り続けることを防ぐため、URLにバージョンパラメータを付けています。

```ts
const ogVersion = encodeURIComponent(review.updated_at || review.created_at || "");
const ogImageUrl = `${origin}/reviews/${id}/opengraph-image?cv=1&v=${ogVersion}`;
```

`updated_at` の値が変わるたびにURLが変わるので、Xが新しい画像を再クロールしてくれます。

## 最終的な構成

```
レビューページ (reviews/[id]/page.tsx)
  ↓
OGP画像URL決定ロジック
  ├── 画像あり → /api/og-proxy?url=（Firebase Storage URL）
  └── → /reviews/[id]/opengraph-image?cv=1&v=（更新日時）
              ↓
       Next.js ImageResponse でPNG生成
       （内部でFirebase Storage画像をDataURLに変換）
```

## まとめ

XのOGP画像が不安定だった原因と対処をまとめると：

- **原因**：XのクローラーがFirebase Storageの直リンクを確実に取得できない
- **対策①**：`/api/og-proxy` で同一オリジン経由にプロキシ（SSRF対策必須）
- **対策②**：Next.jsの `opengraph-image.tsx` で動的OGP画像を生成
- **おまけ**：更新日時ベースのURLでキャッシュバスティング

Firebase Storageを使っているNext.jsプロジェクトでXシェアの画像が不安定な場合はぜひ試してみてください。

---

個人開発サービス「Gear-Loom」はこちら → https://www.gear-loom.com
