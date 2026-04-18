---
title: "Windowsでgit commitのauthorを全件書き換えた話 — filter-branchが罠だらけだった"
emoji: "🪟"
type: "tech"
topics: ["git", "windows", "python", "github"]
published: false
---

個人開発のリポジトリを育てていたら、初期のコミットが別のgit設定（別アカウントのメールアドレス）で積まれていることに気づいた。GitHubのContributionsグラフに反映されないのが原因で発覚したパターンだ。

「`git filter-branch`で一発でしょ」と思っていたが、**Windowsはそんなに甘くなかった**。

## やりたかったこと

- 過去コミット全件のauthor/committerを正しいアカウントに統一
- 混在していた複数のメールアドレスを1つに書き換え
- おまけ：AIペアプログラミングで自動挿入されていた `Co-Authored-By: Claude` 行も削除

## まず filter-branch を試した

ネットで調べると大体これが出てくる。

```bash
git filter-branch --env-filter '
if [ "$GIT_AUTHOR_EMAIL" = "old@example.com" ]; then
    export GIT_AUTHOR_EMAIL="new@example.com"
    export GIT_AUTHOR_NAME="newname"
fi
' --tag-name-filter cat -- --branches --tags
```

### 罠①：ロックファイルの地獄

Windowsでは `.git/` 以下にロックファイルが残りやすい。特に複数のgitプロセスが同時に動いていた後（IDEのgit連携など）は顕著だ。

```
fatal: Unable to create '.git/index.lock': File exists.
fatal: Cannot lock ref 'HEAD': Is the repository corrupted?
```

`rm -f .git/index.lock` で消そうとしたら…

```bash
bash: rm: command not found
```

Git BashのMSYS2環境では `rm` がPATHに入っていないことがある。仕方なくPowerShellで削除する。

```bash
powershell -Command "Remove-Item -Force .git/index.lock -ErrorAction SilentlyContinue"
```

### 罠②：「Ref was rewritten」なのに何も変わっていない

ロックファイルを消して再実行すると、一見成功したように見える。

```
Ref 'refs/heads/main' was rewritten
```

しかし `git log --format="%ae"` で確認すると古いメールアドレスのまま。

原因は `.git/refs/original/` というバックアップディレクトリだ。`filter-branch` は書き換え前のrefをここに保存するが、このディレクトリが存在するとロックが競合して実際には書き換えが反映されないことがある。`rm -rf .git/refs/original` で消してもロックファイルが再生成される状況が続いた。

WindowsのNTFSとgitのロック機構の相性問題が重なり、`filter-branch` は諦めることにした。

## 次に fast-export | sed | fast-import を試した

```bash
git fast-export --all \
  | sed \
    -e 's/old@example.com/new@example.com/g' \
    -e '/Co-Authored-By: Claude/d' \
  | git fast-import --force
```

Git BashのMSYS2環境でパスを通す問題でまたハマったが、それよりも深刻な問題が起きた。

### 罠③：バイナリデータを sed に通すと壊れる

`git fast-export` の出力はテキストではない。コミットのメタデータ（author、committer、コミットメッセージ）はテキストだが、ファイルの中身は **`data N` ヘッダーに続く生のバイナリデータ** として出力される。

`sed` で全行をテキスト置換すると、バイナリデータ中にたまたま `Co-Authored-By:` という文字列が現れたとき、その行が削除される。すると `data N` で宣言したバイト数と実際のデータが一致しなくなり、`git fast-import` がクラッシュする。

```
Fatal: Unsupported command: :1023 src/app/hoge/page.tsx
```

このエラーメッセージだけ見てもバイナリ破損が原因だとはまず気づけない。

## Python スクリプトで解決した

`sed` の代わりに、`data N` ブロックを **正確に N バイト読んでそのまま書き出す** Pythonスクリプトを書いた。

```python
#!/usr/bin/env python3
import subprocess
import os
from collections import Counter

repo_dir = r"C:\dev\your-repo"
os.chdir(repo_dir)

# Step 1: ロックファイルを消す
for f in [".git/HEAD.lock", ".git/index.lock", ".git/packed-refs.lock",
          ".git/refs/heads/main.lock", ".git/objects/maintenance.lock"]:
    try:
        os.remove(f)
        print(f"  Removed: {f}")
    except FileNotFoundError:
        pass

# Step 2: fast-export | 書き換え | fast-import
EMAIL_MAP = {
    b"old1@example.com": b"new@example.com",
    b"old2@example.com": b"new@example.com",
}
NAME_MAP = {
    b"OldName1": b"NewName",
    b"OldName2": b"NewName",
}

export_proc = subprocess.Popen(
    ["git", "fast-export", "--all"],
    stdout=subprocess.PIPE,
    cwd=repo_dir,
)
import_proc = subprocess.Popen(
    ["git", "fast-import", "--force", "--quiet"],
    stdin=subprocess.PIPE,
    cwd=repo_dir,
)

inp = export_proc.stdout
out = import_proc.stdin

while True:
    line = inp.readline()
    if not line:
        break

    # ここが肝心：data ブロックはバイナリなので一切触らずそのまま流す
    if line.startswith(b"data "):
        out.write(line)
        try:
            size = int(line.split()[1])
            remaining = size
            while remaining > 0:
                chunk = inp.read(min(remaining, 65536))
                if not chunk:
                    break
                out.write(chunk)
                remaining -= len(chunk)
        except (IndexError, ValueError):
            pass
        continue

    # メタデータ行だけ書き換える
    if b"Co-Authored-By: Claude" in line:
        continue  # この行を削除

    for old, new in EMAIL_MAP.items():
        line = line.replace(old, new)

    if line.startswith(b"author ") or line.startswith(b"committer "):
        for old, new in NAME_MAP.items():
            line = line.replace(old, new)

    out.write(line)

out.close()
export_proc.wait()
ret = import_proc.wait()
print(f"fast-import exit code: {ret}")

# Step 3: 書き換え後のブランチをチェックアウト
subprocess.run(["git", "checkout", "-f", "main"], cwd=repo_dir)

# Step 4: 検証
r = subprocess.run(
    ["git", "log", "--format=%ae"],
    capture_output=True, text=True, cwd=repo_dir
)
counts = Counter(r.stdout.strip().split("\n"))
for email, n in sorted(counts.items(), key=lambda x: -x[1]):
    status = "OK" if email == "new@example.com" else "BAD"
    print(f"  [{status}] {n:4d}  {email}")
```

`data N` ブロックの処理がポイントで、ヘッダー行（`data 12345`）を読んだら、次の N バイトを一切解釈せずにそのまま書き出す。これによりバイナリデータの整合性が保たれる。

## 実行結果

```
[OK]  176  new@example.com
```

全176コミットが正しく書き換えられた。

## force push して完了

```bash
git push --force origin main
```

GitHubのContributionsキャッシュ更新には数日かかることがある。

## まとめ

Windowsでgit historyを書き換えるときのポイントをまとめると：

- `git filter-branch` はWindowsのロックファイル問題で詰まりやすい
- `git fast-export | sed | git fast-import` はバイナリデータを破壊するので使えない
- Pythonで `data N` ブロックをバイナリのまま読み書きするのが正解
- ロックファイルは `os.remove()` や PowerShell の `Remove-Item` で事前に掃除する

ネット上の記事はMac/Linux前提のものが多いので、同じ罠にハマっているWindowsユーザーの参考になれば幸いです。

---

個人開発サービス「Gear-Loom」はこちら → https://www.gear-loom.com
