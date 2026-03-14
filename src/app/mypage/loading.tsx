/**
 * マイページ遷移時のローディング表示（データ取得が多いため体感を改善）
 */
export default function MypageLoading() {
  return (
    <div className="max-w-3xl mx-auto py-12 flex flex-col items-center justify-center min-h-[50vh]">
      <div
        className="w-10 h-10 rounded-full border-2 border-cyan-500/50 border-t-cyan-400 animate-spin"
        aria-hidden
      />
      <p className="mt-4 text-sm text-gray-400">マイページを読み込み中...</p>
    </div>
  );
}
