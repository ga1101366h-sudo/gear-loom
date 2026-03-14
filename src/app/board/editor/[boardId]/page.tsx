import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getBoardById } from "@/actions/board";
import { BoardFlowEditor } from "@/components/board-flow-editor";

export default async function BoardEditorWithIdPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId } = await params;
  const board = await getBoardById(boardId);
  if (!board) notFound();

  return (
    <div className="w-full h-[calc(100vh-64px)] px-4 pt-4 pb-4 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4 border-b border-surface-border/60 pb-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">エフェクターボードエディタ</h1>
          <p className="text-sm text-gray-400 mt-1">
            実機ペダルを並べて配線をモックアップできるエディタです。編集後は「保存」でボードを保存できます。
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <Suspense fallback={<div className="flex items-center justify-center h-full text-gray-400">読み込み中...</div>}>
          <BoardFlowEditor
            initialBoardId={board.id}
            initialName={board.name}
            initialNodes={board.nodes}
            initialEdges={board.edges}
            initialActualPhotoUrl={board.actualPhotoUrl ?? null}
          />
        </Suspense>
      </div>
    </div>
  );
}
