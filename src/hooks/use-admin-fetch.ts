"use client";

import { getFirebaseAuth } from "@/lib/firebase/client";

/**
 * 管理者 API 呼び出し用ユーティリティフック。
 * Firebase ID トークンを自動でヘッダーに付与する。
 */
export function useAdminFetch() {
  const auth = getFirebaseAuth();

  /** 認証済みリクエストを発行する */
  async function fetchWithAuth(
    url: string,
    options?: Omit<RequestInit, "headers"> & { headers?: Record<string, string> }
  ): Promise<Response> {
    if (!auth?.currentUser) throw new Error("未認証");
    const token = await auth.currentUser.getIdToken();
    return fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...options?.headers,
      },
    });
  }

  /**
   * GET して配列を返す。失敗時は空配列。
   * @param url      フェッチ先 URL
   * @param arrayKey レスポンス JSON の配列キー名
   */
  async function fetchList<T>(url: string, arrayKey: string): Promise<T[]> {
    try {
      const res = await fetchWithAuth(url);
      const json: Record<string, unknown> = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(json[arrayKey])) return json[arrayKey] as T[];
      return [];
    } catch {
      return [];
    }
  }

  return { fetchWithAuth, fetchList };
}
