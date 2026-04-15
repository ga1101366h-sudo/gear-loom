---
title: "React Flowでエフェクターボードの配線を表現する — ベジェ曲線とアニメーションで「リアルなケーブル感」を出した話"
emoji: "🎸"
type: "tech"
topics: ["reactflow", "nextjs", "typescript", "react"]
published: true
---

個人開発している楽器・機材レビューサイト「[Gear-Loom](https://gear-loom.vercel.app)」に、エフェクターボードのエディタ機能を実装しました。

エフェクター同士をケーブルで繋ぐ配線のUI、思ったよりずっと難しかったのでその記録を残しておきます。

## エフェクターボードエディタとは

ギタリスト・ベーシストが使う「エフェクターボード」をビジュアルで組める機能です。機材のノードをドラッグして配置し、ケーブル（エッジ）で繋いでいく感じ。

ライブラリは **@xyflow/react（React Flow）** を使っています。

## 問題①：直線エッジだとカクカクして使えない

React Flow のデフォルトエッジは直線（StraightEdge）か、シンプルな折れ線です。試しに使ってみたところ、ノードを動かすたびに線がカクカクと跳ねて、実際のケーブルらしさが全くありませんでした。

また、複数のエッジが重なったときに見分けがつかず、「どのエフェクターに繋がっているのか」が一目でわからないという問題も出ました。

### 解決策：getBezierPath でベジェ曲線に

React Flow には `getBezierPath` というユーティリティ関数が用意されています。これを使うとエッジが滑らかなS字カーブになり、ケーブルのしなりがそれらしく表現できるようになりました。

```tsx
import { getBezierPath, BaseEdge, EdgeLabelRenderer } from "@xyflow/react";

const [basePath, baseLabelX, baseLabelY] = getBezierPath({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
});
```

## 問題②：同じノード間のエッジが完全に重なる

ベジェ曲線にしたことで見た目は改善しましたが、同じソース〜ターゲット間に複数のエッジが存在するとき（スイッチャーのループ接続など）、曲線が完全に重なってしまう問題が残りました。

### 解決策：エッジIDのハッシュ値で微妙にズラす

各エッジに「エッジIDから決定論的に計算したわずかなオフセット」を加えることで解決しました。ランダムではなく**ハッシュ**にしているのが重要で、再レンダリングしても同じオフセットが維持されます。

```tsx
const OFFSET_PX_RANGE = 7; // -3 〜 +3 px

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}
```

オフセットはベジェ曲線の制御点（コントロールポイント）を、エッジの垂直方向に数px動かすことで実現しています。

```tsx
function applyMinimalOffsetToPath(
  path: string,
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  offsetPx: number
): string {
  const match = path.match(
    /^M([^,]+),([^,]+) C([^,]+),([^\s]+) ([^,]+),([^\s]+) ([^,]+),([^]+)$/
  );
  if (!match) return path;

  const [, , , scx, scy, tcx, tcy] = match.map(Number);
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const len = Math.hypot(dx, dy) || 1;

  // エッジの向きに垂直なベクトルを計算
  const perpX = -dy / len;
  const perpY = dx / len;

  // 制御点をずらして新しいパスを生成
  return `M${sourceX},${sourceY} C${scx + perpX * offsetPx},${scy + perpY * offsetPx} ${tcx + perpX * offsetPx},${tcy + perpY * offsetPx} ${targetX},${targetY}`;
}
```

これをカスタムエッジコンポーネントでまとめるとこうなります：

```tsx
export function CustomLoopEdge(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, ... } = props;

  const { path, labelX, labelY } = useMemo(() => {
    const [basePath, baseLabelX, baseLabelY] = getBezierPath({ ... });
    const offsetPx =
      (hashString(id) % OFFSET_PX_RANGE) - (OFFSET_PX_RANGE - 1) / 2;
    const pathStr =
      offsetPx === 0
        ? basePath
        : applyMinimalOffsetToPath(basePath, sourceX, sourceY, targetX, targetY, offsetPx);
    return { path: pathStr, labelX: baseLabelX, labelY: baseLabelY };
  }, [id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition]);

  // ...
}
```

## 問題③：「信号の流れ」をどう表現するか

エフェクターボードはギターの信号がIN→OUTに流れていく仕組みです。ただ線が繋がっているだけでなく、「どのルートを信号が通っているか」を視覚的に伝えたいと思いました。

### 解決策：animated: true + 選択連動ハイライト

React Flow には `animated: true` というエッジプロパティがあり、これをオンにすると破線がアニメーションで流れ続けます。

ポイントは**常時アニメーションにしない**こと。全エッジが一斉に流れると情報過多でうるさい画面になります。そこで、ノードまたはエッジを選択したときだけ、そのエッジを `animated: true` にする仕組みにしました。

```tsx
const edgesWithHoverStyle = useMemo(() => {
  const selectedNodeIds = new Set(nodes.filter((n) => n.selected).map((n) => n.id));
  const selectedEdgeIds = new Set(edges.filter((e) => e.selected).map((e) => e.id));

  // 選択ノードに接続されたエッジもハイライト対象に含める
  const highlightedEdgeIds = new Set<string>(selectedEdgeIds);
  selectedNodeIds.forEach((nodeId) => {
    edges.forEach((e) => {
      if (e.source === nodeId || e.target === nodeId) highlightedEdgeIds.add(e.id);
    });
  });

  const hasSelection = highlightedEdgeIds.size > 0;

  return edges.map((edge) => {
    // 何も選択されていないとき：全エッジを静止表示
    if (!hasSelection) {
      return { ...edge, animated: false, style: { stroke: "#22d3ee", strokeWidth: 2 } };
    }
    // ハイライト対象：アニメーション + 太く明るく
    if (highlightedEdgeIds.has(edge.id)) {
      return {
        ...edge,
        animated: true,
        style: { stroke: "#06b6d4", strokeWidth: 3, zIndex: 1000 },
      };
    }
    // それ以外：暗くして背景に退く
    return {
      ...edge,
      animated: false,
      style: { stroke: "#555", strokeWidth: 2, opacity: 0.3, zIndex: 0 },
    };
  });
}, [edges, nodes]);
```

これにより、エフェクターをタップすると「そのエフェクターを通る信号ルート」だけがアニメーションで光り、他は暗くなる動きが実現できました。

## まとめ

React Flow でリアルな配線UIを作るときにやったことをまとめると：

- **直線→ベジェ曲線**：`getBezierPath` を使うだけで一気にそれらしくなる
- **重なり対策**：エッジIDをハッシュして決定論的なオフセットを付与。再レンダリングしてもブレない
- **信号フロー表現**：`animated: true` は常時ではなく選択連動で使うのがポイント

「ケーブルをつないだ感じ」を視覚的に出すのが思ったより奥深かったです。同じようなエディタを作ろうとしている人の参考になれば幸いです。

---

個人開発サービス「Gear-Loom」はこちら → https://gear-loom.vercel.app
