/**
 * 共通機材マスタ（Gear）をベースにした、プロフィール・エディタ共通の機材データ型。
 * API のレスポンスおよびサイドバー・ノードの data で統一して使用する。
 */
export interface GearData {
  id: string;
  name: string;
  manufacturer?: string | null;
  category: string;
  effectorType?: string | null;
  imageUrl?: string | null;
  defaultIcon?: string | null;
}

/** 所有機材一覧 API 用：GearData に UserGear の id を付与（削除時に必要） */
export interface UserGearItem extends GearData {
  userGearId: string;
}

/** GearData / UserGearItem の defaultIcon をエディタ用 iconKey に変換 */
export function gearDefaultIconToKey(
  defaultIcon?: string | null,
): "guitar" | "effects" | "switcher" | "amp" | "other" {
  if (defaultIcon === "guitar") return "guitar";
  if (defaultIcon === "amp") return "amp";
  if (defaultIcon === "other") return "other";
  if (defaultIcon === "switcher") return "switcher";
  if (defaultIcon === "eq") return "effects";
  return "effects";
}
