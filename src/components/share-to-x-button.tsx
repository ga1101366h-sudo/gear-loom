"use client";

/**
 * X (Twitter) でシェアするボタン。
 * path を渡すとクリック時に window.location.origin と結合して絶対URLを生成（SSR対応）。
 * url を渡した場合はそのまま使用。
 */
export function ShareToXButton({
  url: urlProp,
  path,
  text,
  className,
  children,
}: {
  url?: string;
  path?: string;
  text: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url =
      urlProp ??
      (typeof window !== "undefined" && path ? `${window.location.origin}${path}` : "");
    if (!url) return;
    const fullText = `${text}\n${url}`;
    const params = new URLSearchParams();
    params.set("text", fullText);
    const shareUrl = `https://twitter.com/intent/tweet?${params.toString()}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <a
      href="#"
      onClick={handleClick}
      className={className}
      aria-label="Xでシェア"
    >
      {children ?? <span>Xでポスト</span>}
    </a>
  );
}
