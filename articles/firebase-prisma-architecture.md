---
title: "Firebase と Prisma（PostgreSQL）を同一Next.jsアプリで使い分ける設計にした話"
emoji: "🔀"
type: "tech"
topics: ["nextjs", "firebase", "prisma", "postgresql", "typescript"]
published: false
---

個人開発の楽器・機材レビューサイト「[Gear-Loom](https://www.gear-loom.com)」では、**FirebaseとPrisma（PostgreSQL）を同一アプリの中で使い分ける**という構成を採用しています。

「どっちかに統一すればよくない？」という疑問は当然あります。この記事では、なぜこの構成になったのか、実際にどう使い分けているのか、そして運用してみてわかったことを書きます。

## システム全体のデータフロー

```
Firebase Auth
  └─ UID（全システムの共通ユーザーID）
       ├─ Firestore（レビュー・プロフィール・いいね等）
       ├─ Firebase Storage（画像ファイル）
       └─ PostgreSQL / Prisma（ボードエディタ・機材データ）
```

認証はFirebase Authに任せ、発行されるUIDを「橋渡しのキー」としてFirestoreとPostgreSQLの両方で使っています。

## どちらに何を入れているか

### Firestore（Firebase）

| コレクション | 内容 |
|---|---|
| `reviews` | 機材レビュー本文・評価・タグ |
| `profiles` | ユーザープロフィール |
| `review_likes` | レビューへのいいね |
| `follows` | フォロー関係 |
| `makers` | メーカーマスタ |
| `categories` | カテゴリマスタ |
| `live_events` | ライブイベント情報 |
| `site_announcements` | お知らせ |

### PostgreSQL / Prisma

| テーブル | 内容 |
|---|---|
| `boards` | ボードエディタのノード・エッジ（JSON） |
| `board_posts` | ボードの公開記事 |
| `gears` | 機材マスタ（共通） |
| `user_gears` | ユーザーの所持機材 |
| `users` | Firebase UIDと紐づくユーザーレコード |

## なぜ分けたのか

### Firestoreを選んだ理由（レビュー系）

レビューは「フィールドが増えやすい」コンテンツです。カテゴリによって持つ項目が違ったり、後からタグやメタ情報を追加したりすることが多い。

Firestoreはスキーマレスなのでマイグレーションなしにフィールドを追加できます。個人開発で素早く試行錯誤したいときにこの柔軟性は大きいです。

また、いいね数やフォロー数のリアルタイム更新もFirestoreの方が手軽です。

### Prismaを選んだ理由（ボードエディタ系）

ボードエディタは**関係が複雑**です。

```
User → Board（複数持てる）
Board → BoardPost（公開記事として投稿できる）
User → UserGear（所持機材リスト）
UserGear → Gear（機材マスタと紐づく）
```

こういった「1対多・多対多の関係がある構造化データ」はSQLの方が扱いやすいです。Prismaのスキーマでリレーションを定義すると型安全にjoinできるので、バグが出にくくなります。

また、React FlowのノードとエッジはJSON文字列として保存しています（PostgreSQLではJSONB型が使えるため）。Firestoreでもできますが、ネストが深いドキュメントの部分更新はFirestoreより素直に書けます。

```prisma
model Board {
  id    String @id @default(cuid())
  nodes String // React Flowのノード配列（JSON.stringify）
  edges String // React Flowのエッジ配列（JSON.stringify）
  user  User   @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

## Firebase UIDをPrismaの主キーにする

ユーザーIDは2つのシステムで同じものを使いたいので、**Firebase AuthのUIDをそのままPrismaの`users`テーブルの主キー**にしています。

```prisma
model User {
  id    String @id  // Firebase Auth の UID をそのまま格納
  email String? @unique
  boards Board[]
  userGears UserGear[]
}
```

`@default`を付けないことで、`create`時に必ずFirebase UIDを指定する運用です。

ユーザーが初回ログインしたタイミングでPrismaのusersレコードを作成します。

```ts
// ログイン後の初回セットアップ
await prisma.user.upsert({
  where: { id: firebaseUid },
  update: {},
  create: {
    id: firebaseUid,
    email: user.email,
  },
});
```

これでFirestoreのドキュメントを引くときも、Prismaのレコードを引くときも同じUIDで統一できます。

## 運用してわかったこと

### よかった点

**スキーマ変更の心理的コストが下がった**。レビュー系はFirestoreなのでマイグレーション不要でフィールドを追加できます。一方、ボードエディタはPrismaなので型安全に扱えてバグが少ない。それぞれ「向いている方」に入れている感覚があります。

**Firebaseのコストを抑えられる**。ボードエディタのデータをFirestoreに入れると読み書きのドキュメント数が多くなりがちです。PostgreSQLに入れることでFirestoreの課金を抑えられています。

### 大変だった点

**2つのクライアントが混在するコードの読みにくさ**。同じファイルの中でFirestoreのSDKとPrismaクライアントが混在することがあり、慣れるまで読み解くのが大変でした。

データ取得のパターンが2種類になるため、新機能追加時に「これはどっちに入れるか」を都度判断する必要があります。

**2つのシステムをまたぐトランザクションが張れない**。例えば「ボードを公開してFirestoreのプロフィールも更新する」という操作を原子的に行えません。どちらかが失敗したときの補正処理が必要になります。

## まとめ

FirebaseとPrismaを使い分けた判断を振り返ると：

- **スキーマレスで柔軟に育てたいデータ** → Firestore
- **関係が複雑・型安全に扱いたいデータ** → Prisma（PostgreSQL）
- **認証のUID**をキーにして2つのシステムを橋渡し

個人開発では「速く動くものを作る」と「後から直しやすい」のバランスが大事です。全部Firestoreにすると最初は速いけど複雑な関係データの管理が辛くなり、全部RDBにするとスキーマ変更のたびにマイグレーションが発生します。

用途で使い分けるのは初期コストが上がりますが、ある程度規模が大きくなると「向いているDBに向いているデータを入れる」判断が活きてくると感じています。

---

個人開発サービス「Gear-Loom」はこちら → https://www.gear-loom.com
