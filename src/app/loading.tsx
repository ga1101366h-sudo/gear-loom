/**
 * ルート直下の loading.tsx
 * ページ遷移時に即表示され、サーバー/クライアントの準備ができるまでスケルトンを表示して体感速度を改善する。
 */
export default function RootLoading() {
  return (
    <div className="container mx-auto px-3 sm:px-4 py-8 w-full min-w-0 min-[1708px]:max-w-[min(90vw,2200px)] flex flex-col items-center justify-center min-h-[40vh]">
      <div
        className="w-10 h-10 rounded-full border-2 border-cyan-500/50 border-t-cyan-400 animate-spin"
        aria-hidden
      />
      <p className="mt-4 text-sm text-gray-400">読み込み中...</p>
    </div>
  );
}
