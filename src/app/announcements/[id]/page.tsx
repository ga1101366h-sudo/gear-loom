import Link from "next/link";
import { notFound } from "next/navigation";
import { getSiteAnnouncementByIdFromFirestore } from "@/lib/firebase/data";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const announcement = await getSiteAnnouncementByIdFromFirestore(id);
  if (!announcement) return { title: "お知らせ" };
  return {
    title: `${announcement.title} | Gear-Loomからのおしらせ`,
    description: announcement.body.slice(0, 120),
  };
}

export default async function AnnouncementDetailPage({ params }: Props) {
  const { id } = await params;
  const announcement = await getSiteAnnouncementByIdFromFirestore(id);
  if (!announcement) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <p className="mb-2 text-sm text-gray-500">
        <Link href="/announcements" className="text-electric-blue hover:underline">
          ← おしらせ一覧
        </Link>
      </p>
      <article className="rounded-xl border border-surface-border/80 bg-surface-card/80 p-6 sm:p-8">
        <p className="text-sm text-gray-500">{announcement.date}</p>
        {announcement.is_important && (
          <span className="mt-1 inline-block rounded bg-red-600/90 px-2 py-0.5 text-xs font-medium text-white">
            重要
          </span>
        )}
        <h1 className="mt-2 font-display text-xl font-bold tracking-tight text-white sm:text-2xl">
          {announcement.title}
        </h1>
        <div className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-gray-300">
          {announcement.body}
        </div>
        {announcement.url && (
          <p className="mt-6">
            <a
              href={announcement.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-electric-blue underline decoration-electric-blue/60 underline-offset-2 hover:text-cyan-400"
            >
              関連リンク →
            </a>
          </p>
        )}
      </article>
    </div>
  );
}
