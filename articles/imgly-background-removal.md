---
title: "外部APIなし・サーバーなし — ブラウザだけでエフェクター画像の背景をAI透過した話"
emoji: "✂️"
type: "tech"
topics: ["nextjs", "typescript", "wasm", "react"]
published: false
---

個人開発の楽器・機材レビューサイト「[Gear-Loom](https://www.gear-loom.com)」には、エフェクターボードエディタという機能があります。ユーザーが自分の機材をボード上に並べて配線できる機能です。

このエディタで「自分の機材写真を透過してボードに貼り付けたい」という需要があり、AI背景透過機能を実装しました。

最初は「外部APIを呼ぶ系かな」と思っていたんですが、**ブラウザだけで完結するWASMベースのライブラリ**を見つけたのでそちらを採用しました。

## 使ったライブラリ：@imgly/background-removal

```bash
npm install @imgly/background-removal
```

[IMG.LY](https://img.ly) が提供している背景除去ライブラリです。**機械学習モデルをWASMでブラウザ上で直接実行**するため、外部APIへの通信は発生しません。

ユーザーのデータがサーバーに送られないのはプライバシー面でも安心ですし、APIコストもゼロです。

## セットアップのポイント：モデルファイルの配置

このライブラリの最大のハマりポイントは、**推論に使うモデルファイルを自分でホストする必要がある**点です。

WASMや重みファイルが `node_modules` の中にあるだけでは動きません。`public/` 以下のどこかに配置して、ブラウザからアクセスできるようにする必要があります。

さらにモデルの重みデータは `node_modules` に含まれておらず、別途CDNからダウンロードする必要があります。毎回手動でやるのは面倒なので、**`npm install` 時に自動でセットアップするpostinstallスクリプト**を書きました。

```js
// scripts/copy-imgly-assets.js
const src = path.join(__dirname, '../node_modules/@imgly/background-removal/dist');
const dest = path.join(__dirname, '../public/static/imgly');
const dataBaseUrl = `https://staticimgly.com/@imgly/background-removal-data/${version}/dist`;

async function main() {
  // node_modules から JS/WASM ファイルを public/ にコピー
  fs.cpSync(src, dest, { recursive: true });

  // モデルの重みチャンクを CDN から取得（存在しない分だけ）
  const resources = JSON.parse(await fetchUrl(`${dataBaseUrl}/resources.json`));
  for (const name of getChunkNames(resources)) {
    if (fs.existsSync(path.join(dest, name))) continue; // 既にあればスキップ
    const buf = await fetchUrl(`${dataBaseUrl}/${name}`);
    fs.writeFileSync(path.join(dest, name), buf);
  }
}
```

```json
// package.json
{
  "scripts": {
    "postinstall": "node scripts/copy-imgly-assets.js"
  }
}
```

これで `npm install` するたびに `public/static/imgly/` にモデルファイルが揃います。

:::message
モデルファイルは合計で数十MBあります。`public/static/imgly/` は `.gitignore` に入れることを推奨します。CIやVercelデプロイ時も `npm install` が走るのでpostinstallで自動取得されます。
:::

## 実装：ドロップで画像を受け取り、透過して表示

```tsx
import { removeBackground, type Config } from "@imgly/background-removal";

const onDrop = useCallback((acceptedFiles: File[]) => {
  const file = acceptedFiles[0];

  const config: Config = {
    // モデルファイルのホスト先を指定（ここが必須！）
    publicPath: `${window.location.origin}/static/imgly/`,
  };

  removeBackground(file, config)
    .then((blob: Blob) => {
      const processedUrl = URL.createObjectURL(blob);
      setUploaded({ processedUrl });
      setProcessedImageBlob(blob);
    })
    .finally(() => setIsProcessing(false));
}, []);
```

`publicPath` を正しく設定しないと**モデルファイルが見つからずエラーになります**。ここだけ注意すればあとは `removeBackground(file, config)` を呼ぶだけで透過済みのBlobが返ってきます。

処理中は「AIで背景を透過中...」とスピナーを出しておくと体験が良くなります。初回はWASMモデルのロードで数秒かかることがあるためです（2回目以降はキャッシュが効いて速い）。

## 透過後はWebPに圧縮してから保存

背景透過済み画像をそのままFirebase Storageに保存するとファイルサイズが大きくなります。そこで **OffscreenCanvas を使ってWebP圧縮**してから保存するようにしました。

```ts
const MAX_IMAGE_SIZE = 400; // 最大辺400px
const WEBP_QUALITY = 0.8;

async function compressToWebp(blob: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, MAX_IMAGE_SIZE / Math.max(bitmap.width, bitmap.height));
  const cw = Math.round(bitmap.width * scale);
  const ch = Math.round(bitmap.height * scale);

  const canvas = new OffscreenCanvas(cw, ch);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height, 0, 0, cw, ch);
  bitmap.close();

  return canvas.convertToBlob({ type: "image/webp", quality: WEBP_QUALITY });
}
```

`OffscreenCanvas` はメインスレッドをブロックしないキャンバス操作ができるAPIです。UIが固まらず快適に処理できます。

## ハマったポイント：blob URLを使い回すと画像が真っ黒になる

`URL.createObjectURL()` で生成したblob URLは**使い終わったら必ず `URL.revokeObjectURL()` で解放**しないとメモリリークします。

また、保存成功コールバックにblob URLを渡してしまうと、コンポーネントがアンマウントされてblob URLが無効になったタイミングで画像が真っ黒になるバグが起きました。

```tsx
// ❌ NG: blob URLをコールバックに渡すと後でURLが無効になる
onSuccess?.({ imageUrl: processedUrl }); // processedUrlはblob URL

// ✅ OK: APIレスポンスのURLをそのまま使う
const gear = await res.json(); // Firebase StorageのURLが入っている
onSuccess?.(gear, { isUpdate: true }); // blob URLは一切渡さない
```

`URL.revokeObjectURL()` の呼び出しは `useEffect` のクリーンアップ関数でまとめて行うようにしました。

```tsx
const prevUrlsRef = useRef<{ original?: string; processed?: string }>({});

useEffect(() => {
  return () => {
    // アンマウント時にblob URLを解放
    if (prevUrlsRef.current.original) URL.revokeObjectURL(prevUrlsRef.current.original);
    if (prevUrlsRef.current.processed) URL.revokeObjectURL(prevUrlsRef.current.processed);
  };
}, []);
```

## まとめ

`@imgly/background-removal` を使えば外部APIもサーバーも不要で、ブラウザだけでAI背景透過が実装できます。

実装のポイントをまとめると：

- **`publicPath` の設定が必須**：モデルファイルをpublicに置き、パスを指定する
- **postinstallスクリプト**でモデルファイルの配置を自動化する
- 透過後は `OffscreenCanvas` + WebP変換でファイルサイズを削減
- `URL.createObjectURL` の解放を忘れずに
- 保存コールバックにblob URLを渡さない（真っ黒バグの原因になる）

個人開発でもサーバーコストをかけずにAI機能を実装できるので、ぜひ試してみてください。

---

個人開発サービス「Gear-Loom」はこちら → https://www.gear-loom.com
