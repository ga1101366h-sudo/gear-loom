import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BoardPostEditForm } from "@/components/board-post-edit-form";

type PageProps = {
  params: { id: string };
};

export default async function BoardPostEditPage({ params }: PageProps) {
  const { id } = params;

  const post = await prisma.boardPost.findUnique({
    where: { id },
    include: { board: true },
  });

  if (!post || !post.board) {
    redirect("/boards");
  }

  const ownerId = post.board.userId;

  // ギャラリー用の全画像URL（BoardPost.imageUrls）を初期値として渡す
  let initialImageUrls: string[] = [];
  if (post.imageUrls) {
    try {
      const parsed = JSON.parse(post.imageUrls) as unknown;
      if (Array.isArray(parsed)) {
        initialImageUrls = parsed
          .map((u) => (typeof u === "string" ? u.trim() : ""))
          .filter((u) => u.length > 0);
      }
    } catch {
      initialImageUrls = [];
    }
  }

  return (
    <BoardPostEditForm
      postId={post.id}
      ownerId={ownerId}
      initialTitle={post.title}
      initialContent={post.content ?? ""}
      initialImageUrls={initialImageUrls}
    />
  );
}

