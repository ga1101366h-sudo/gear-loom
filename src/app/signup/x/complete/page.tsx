"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithCustomToken } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";

function SignupXCompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    const token = searchParams.get("token");
    const next = searchParams.get("next") ?? "/";

    if (!token) {
      setStatus("error");
      return;
    }

    const auth = getFirebaseAuth();
    if (!auth) {
      setStatus("error");
      return;
    }

    signInWithCustomToken(auth, token)
      .then(() => {
        setStatus("ok");
        const path = next.startsWith("/") ? next : `/${next}`;
        router.replace(path || "/");
      })
      .catch(() => {
        setStatus("error");
      });
  }, [searchParams, router]);

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-md py-12 text-center text-gray-400">
        登録を完了しています...
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mx-auto max-w-md py-12 text-center">
        <p className="text-red-400">ログインの完了に失敗しました。</p>
        <a href="/signup/x" className="mt-4 inline-block text-sm text-electric-blue hover:underline">
          Xで新規登録に戻る
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md py-12 text-center text-gray-400">
      リダイレクトしています...
    </div>
  );
}

export default function SignupXCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md py-12 text-center text-gray-400">
          読み込み中...
        </div>
      }
    >
      <SignupXCompleteContent />
    </Suspense>
  );
}
