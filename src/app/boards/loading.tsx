/**
 * みんなのエフェクターボード一覧の遷移時のローディング表示
 */
export default function BoardsLoading() {
  return (
    <div className="container mx-auto px-3 sm:px-4 py-12 flex flex-col items-center justify-center min-h-[40vh]">
      <div
        className="w-10 h-10 rounded-full border-2 border-cyan-500/50 border-t-cyan-400 animate-spin"
        aria-hidden
      />
      <p className="mt-4 text-sm text-gray-400">読み込み中...</p>
    </div>
  );
}
