/**
 * schema.org 構造化データ（JSON-LD）を SSR で出力する共通コンポーネント。
 *
 * App Router の Server Component から `<script type="application/ld+json">` を
 * `dangerouslySetInnerHTML` で描画する。data は事前に組み立てた JSON-LD オブジェクトを渡す。
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify 済みの静的データのみを渡す想定。`<` をエスケープしXSSを防ぐ。
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
