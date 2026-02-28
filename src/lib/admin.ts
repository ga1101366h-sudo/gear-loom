/**
 * 管理者はプロフィールの user_id（@以降のID）で判定します。
 * アカウント名（display_name）＋ user_id（@で表示、サイト内でユニーク）のうち、
 * user_id がここで指定した値のユーザーに管理者権限を付与します。
 */
export const ADMIN_USER_ID = "shiki_shouki";

export function isAdminUserId(userId: string | null | undefined): boolean {
  return userId != null && userId.trim().toLowerCase() === ADMIN_USER_ID;
}
