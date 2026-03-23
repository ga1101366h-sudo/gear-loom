"use client";

import Link from "next/link";
import Image from "next/image";
import { shouldUnoptimizeFirebaseStorage } from "@/lib/image-optimization";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { ShareToXButton } from "@/components/share-to-x-button";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export interface BoardCarouselCard {
  postId: string;
  title: string;
  updatedAt: string;
  authorLabel: string;
  authorAvatarUrl: string | null;
  actualPhotoUrl: string | null;
  thumbnail: string | null;
  /** ボードオーナーの Firebase UID（Xシェア文分岐用） */
  ownerUid: string | null;
}

export function BoardCarousel({ cards }: { cards: BoardCarouselCard[] }) {
  const { user } = useAuth();

  return (
    <Carousel
      opts={{ align: "start", loop: false }}
      className="w-full min-w-0 pl-10 pr-10 sm:pl-12 sm:pr-12"
    >
      <CarouselContent className="-ml-4">
        {cards.map((card) => {
          const boardUrl = `/boards/post/${encodeURIComponent(card.postId)}`;
          const isOwner = !!user && !!card.ownerUid && user.uid === card.ownerUid;
          const shareText = isOwner
            ? `${card.title} を投稿しました！\n#GearLoom\n#エフェクターボード`
            : `${card.title} | Gear-Loom\n#GearLoom\n#エフェクターボード`;

          return (
            <CarouselItem
              key={card.postId}
              className="w-[280px] sm:w-[400px] md:w-[480px] shrink-0 pl-4"
            >
              <div className="relative group flex flex-col h-full rounded-xl border border-surface-border bg-white/[0.03] overflow-hidden text-left transition-colors hover:border-cyan-500/50">
                <Link href={boardUrl} className="flex flex-col flex-1 min-w-0">
                  <div className="relative aspect-video w-full bg-[#0a0a0a] shrink-0 overflow-hidden">
                    {card.actualPhotoUrl && card.thumbnail ? (
                      <div className="flex w-full h-full">
                        <div className="relative w-1/2 h-full">
                          <Image
                            src={card.actualPhotoUrl}
                            alt="実機写真"
                            fill
                            className="object-cover group-hover:opacity-90 transition-opacity"
                            unoptimized={shouldUnoptimizeFirebaseStorage(card.actualPhotoUrl)}
                            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          />
                        </div>
                        <div className="relative w-1/2 h-full border-l border-surface-border">
                          <Image
                            src={card.thumbnail}
                            alt="配線図"
                            fill
                            className="object-cover group-hover:opacity-90 transition-opacity"
                            unoptimized={shouldUnoptimizeFirebaseStorage(card.thumbnail)}
                            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          />
                        </div>
                      </div>
                    ) : card.actualPhotoUrl ? (
                      <div className="relative w-full h-full">
                        <Image
                          src={card.actualPhotoUrl}
                          alt="実機写真"
                          fill
                          className="object-cover group-hover:opacity-90 transition-opacity"
                          unoptimized={shouldUnoptimizeFirebaseStorage(card.actualPhotoUrl)}
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      </div>
                    ) : card.thumbnail ? (
                      <div className="relative w-full h-full">
                        <Image
                          src={card.thumbnail}
                          alt="配線図"
                          fill
                          className="object-cover group-hover:opacity-90 transition-opacity"
                          unoptimized={shouldUnoptimizeFirebaseStorage(card.thumbnail)}
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      </div>
                    ) : (
                      <div className="flex w-full h-full items-center justify-center bg-gray-800 text-gray-500 text-xs">
                        サムネイルなし
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex flex-col gap-1 flex-1 min-w-0">
                    <span className="font-medium text-white truncate">
                      {card.title}
                    </span>
                    <span className="text-xs text-gray-500">
                      更新:{" "}
                      {new Date(card.updatedAt).toLocaleDateString("ja-JP", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                      })}
                    </span>
                    <div className="flex items-center gap-2 mt-1 min-w-0">
                      {card.authorAvatarUrl ? (
                        <span className="relative inline-block w-5 h-5 shrink-0 rounded-full overflow-hidden bg-surface-card">
                          <Image
                            src={card.authorAvatarUrl}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="20px"
                            unoptimized
                          />
                        </span>
                      ) : (
                        <span
                          className="w-5 h-5 shrink-0 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 text-[10px] font-semibold"
                          aria-hidden
                        >
                          {card.authorLabel.charAt(0).toUpperCase() || "?"}
                        </span>
                      )}
                      <span className="text-xs text-gray-400 truncate">
                        {card.authorLabel}
                      </span>
                    </div>
                  </div>
                </Link>
                <div
                  className="absolute top-1 right-1 sm:top-2 sm:right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="secondary"
                    size="sm"
                    asChild
                    className="h-7 w-7 p-0 sm:h-auto sm:w-auto sm:px-2"
                  >
                    <ShareToXButton
                      path={boardUrl}
                      text={shareText}
                      className="text-xs"
                    />
                  </Button>
                </div>
              </div>
            </CarouselItem>
          );
        })}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );
}
