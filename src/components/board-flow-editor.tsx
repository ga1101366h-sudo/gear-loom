"use client";

import { useCallback, useContext, useEffect, useMemo, useRef, useState, createContext } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { mutate } from "swr";
import type { Connection, Edge, EdgeProps, Node, NodeProps } from "@xyflow/react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  ReactFlowProvider,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { CustomLoopEdge } from "@/components/CustomLoopEdge";
import {
  ArrowLeft,
  Camera,
  Guitar,
  GitMerge,
  GripVertical,
  Image as ImageIcon,
  Loader2,
  MoreVertical,
  Pencil,
  PlusCircle,
  Save,
  Settings as SettingsIcon,
  SlidersHorizontal,
  Speaker,
  Trash2,
  X as XIcon,
} from "lucide-react";
import { GearImageGeneratorContent } from "@/components/gear-image-generator";
import { useAuth } from "@/contexts/AuthContext";
import type { GearData, UserGearItem } from "@/types/gear";
import { saveBoard } from "@/actions/board";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import imageCompression from "browser-image-compression";
import { toPng } from "html-to-image";
import { gearDefaultIconToKey } from "@/types/gear";

export type GearIconKey = "guitar" | "effects" | "switcher" | "amp" | "other";

type PedalNodeData = {
  label: string;
  imageUrl?: string | null;
  iconKey?: GearIconKey;
  effectType?: string;
  useImage?: boolean;
  /** ノードの幅（px）。未指定時はデフォルトサイズ */
  width?: number;
  /** ノードの高さ（px）。未指定時はデフォルトサイズ */
  height?: number;
  /** 所持機材からドロップした場合の元の機材ID（カスタム画像登録時に使用） */
  sourceGearId?: string;
  /** スイッチャー/ジャンクションのループ端子数（データ駆動）。未指定時は DEFAULT_LOOP_COUNT */
  loopCount?: number;
};

const DEFAULT_NODE_WIDTH_NORMAL = 112;
const DEFAULT_NODE_HEIGHT_NORMAL = 160;
const DEFAULT_NODE_WIDTH_SWITCHER = 224;
const DEFAULT_NODE_HEIGHT_SWITCHER = 96;
const NODE_SIZE_MIN_W = 72;
const NODE_SIZE_MIN_H = 56;
const NODE_SIZE_MAX_W = 400;
const NODE_SIZE_MAX_H = 320;

/** 表示用アイコン（所有機材リストの category-icon と統一: エフェクター=SlidersHorizontal, スイッチャー=GitMerge） */
const GEAR_ICON_COMPONENTS: Record<GearIconKey, React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>> = {
  guitar: Guitar,
  effects: SlidersHorizontal,
  switcher: GitMerge,
  amp: Speaker,
  other: MoreVertical,
};

function getGearIconComponent(key: GearIconKey | undefined) {
  // レガシー値 "eq"（GearIconKey にない）は effects として表示
  if (String(key) === "eq") return GEAR_ICON_COMPONENTS.effects;
  return GEAR_ICON_COMPONENTS[key ?? "effects"] ?? GEAR_ICON_COMPONENTS.effects;
}

/** エフェクターの種類の value に対応するデフォルト iconKey（種類変更時の自動紐付け用） */
function effectTypeToIconKey(effectType: string): GearIconKey | null {
  const v = effectType?.trim();
  if (v === "switcher" || v === "junction_box") return "switcher";
  if (v === "guitar_body" || v === "bass_body") return "guitar";
  if (v) return "effects";
  return null;
}

/** スイッチャー/ジャンクションのループ端子数のデフォルト値 */
const DEFAULT_LOOP_COUNT = 5;
const LOOP_COUNT_MIN = 2;
const LOOP_COUNT_MAX = 12;

const LOOP_HANDLE_CLASS =
  "!z-20 !w-4 !h-4 !min-w-0 !min-h-0 !bg-gray-400/80 border border-white/40 rounded-full shadow-sm opacity-60 hover:opacity-100 hover:scale-110 transition-all duration-150";

function LoopTerminalsRow({
  isJunctionBox,
  position,
  loopCount,
}: {
  isJunctionBox: boolean;
  position: Position;
  loopCount: number;
}) {
  const count = Math.min(LOOP_COUNT_MAX, Math.max(LOOP_COUNT_MIN, loopCount));
  const slots = useMemo(() => Array.from({ length: count }, (_, i) => i), [count]);
  const isTop = position === Position.Top;
  return (
    <div
      className={`absolute left-0 right-0 z-10 flex flex-row justify-evenly pointer-events-none px-12 ${
        isJunctionBox ? "bottom-0 translate-y-1/2" : "top-0 -translate-y-1/2"
      }`}
    >
      {!isJunctionBox && (
        <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-bold text-gray-400 tracking-wider whitespace-nowrap">
          Loop
        </span>
      )}
      <div className="relative w-full h-4 pointer-events-auto">
        {slots.map((i) => {
          const oneBased = i + 1;
          const targetId = oneBased === 1 ? "loop-in" : `loop-${oneBased}-in`;
          const sourceId = oneBased === 1 ? "loop-out" : `loop-${oneBased}-out`;
          const leftPct = count > 1 ? (100 * (i + 0.5)) / count : 50;
          return (
            <div
              key={i}
              className="absolute flex items-center justify-center w-4 h-4"
              style={{
                left: `${leftPct}%`,
                top: isTop ? 0 : "100%",
                transform: "translate(-50%, " + (isTop ? "0" : "-100%") + ")",
              }}
            >
              <Handle
                id={targetId}
                type="target"
                position={position}
                className={LOOP_HANDLE_CLASS}
                style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
              />
              <Handle
                id={sourceId}
                type="source"
                position={position}
                className={LOOP_HANDLE_CLASS}
                style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
              />
            </div>
          );
        })}
      </div>
      {isJunctionBox && (
        <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] font-bold text-gray-400 tracking-wider whitespace-nowrap">
          Loop
        </span>
      )}
    </div>
  );
}

const NodeSettingsContext = createContext<(id: string) => void>(() => {});

function PedalNode({ id, data }: NodeProps<Node<PedalNodeData>>) {
  const [imageError, setImageError] = useState(false);
  const { setNodes } = useReactFlow();
  const useImage = data.useImage !== false;
  const hasImage = useImage && Boolean(data.imageUrl) && !imageError;
  const openSettings = useContext(NodeSettingsContext);
  /** 設定済み＝所持機材から紐付いている、または手入力で名前を設定した */
  const isConfigured = Boolean(data.sourceGearId) || (Boolean(data.label?.trim()) && data.label !== "未設定の機材");
  /** 未設定プレースホルダー（点線枠で表示） */
  const isUnassignedPlaceholder = !isConfigured;
  const isSwitcher = data.iconKey === "switcher";
  const isJunctionBox = data.effectType === "junction_box";
  const hasLoopTerminal = isSwitcher || isJunctionBox;

  const defaultW = hasLoopTerminal ? DEFAULT_NODE_WIDTH_SWITCHER : DEFAULT_NODE_WIDTH_NORMAL;
  const defaultH = hasLoopTerminal ? DEFAULT_NODE_HEIGHT_SWITCHER : DEFAULT_NODE_HEIGHT_NORMAL;
  const nodeWidth = data.width ?? defaultW;
  const nodeHeight = data.height ?? defaultH;

  const resizeStartRef = useRef<{ startX: number; startY: number; startW: number; startH: number } | null>(null);

  const handleResizeMove = useCallback(
    (e: MouseEvent) => {
      const r = resizeStartRef.current;
      if (!r) return;
      const dw = e.clientX - r.startX;
      const dh = e.clientY - r.startY;
      const newW = Math.min(NODE_SIZE_MAX_W, Math.max(NODE_SIZE_MIN_W, r.startW + dw));
      const newH = Math.min(NODE_SIZE_MAX_H, Math.max(NODE_SIZE_MIN_H, r.startH + dh));
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, width: newW, height: newH } } : n)),
      );
    },
    [id, setNodes],
  );

  const handleResizeEnd = useCallback(() => {
    resizeStartRef.current = null;
    window.removeEventListener("mousemove", handleResizeMove);
    window.removeEventListener("mouseup", handleResizeEnd);
  }, [handleResizeMove]);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      resizeStartRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startW: nodeWidth,
        startH: nodeHeight,
      };
      window.addEventListener("mousemove", handleResizeMove);
      window.addEventListener("mouseup", handleResizeEnd);
    },
    [nodeWidth, nodeHeight, handleResizeMove, handleResizeEnd],
  );

  const handleDeleteNode = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setNodes((nds) => nds.filter((node) => node.id !== id));
  };

  const isGuitarBass = data.iconKey === "guitar";
  const labelLen = data.label?.length ?? 0;
  const nameSizeClass = hasLoopTerminal
    ? labelLen <= 8
      ? "text-[10px]"
      : labelLen <= 14
        ? "text-[9px]"
        : "text-[8px]"
    : labelLen <= 6
      ? "text-xs"
      : labelLen <= 12
        ? "text-[11px]"
        : "text-[10px]";
  const effectSizeClass = hasLoopTerminal ? "text-[8px]" : "text-[8px]";

  /* 未割り当てプレースホルダー: 点線枠 ＋ ＋アイコン ＋ AI推測カテゴリ名（完全中央寄せ） */
  if (isUnassignedPlaceholder) {
    return (
      <div
        className="relative flex flex-col items-center justify-center w-full h-full text-center p-2 rounded-lg border-2 border-dashed border-gray-500/60 bg-white/[0.03] cursor-pointer hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-colors box-border"
        style={{
          width: nodeWidth,
          height: nodeHeight,
          minWidth: NODE_SIZE_MIN_W,
          minHeight: NODE_SIZE_MIN_H,
        }}
        onClick={(e) => {
          e.stopPropagation();
          openSettings(id);
        }}
      >
        <div className="absolute -top-2 -right-2 flex items-center gap-1 z-50">
          <button
            type="button"
            className="w-5 h-5 bg-cyan-500/20 text-cyan-400 rounded-full flex items-center justify-center cursor-pointer hover:bg-cyan-500/30 hover:scale-110 shadow-md"
            onClick={(e) => {
              e.stopPropagation();
              openSettings(id);
            }}
            aria-label="機材を割り当てる"
          >
            <PlusCircle className="w-3 h-3" aria-hidden />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteNode(e as unknown as React.MouseEvent<HTMLButtonElement>);
            }}
            className="w-5 h-5 bg-red-500/90 text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-red-500 hover:scale-110 shadow-md"
            aria-label="このスロットを削除"
          >
            <XIcon className="w-3 h-3" aria-hidden />
          </button>
        </div>
        <div className="pointer-events-none absolute -left-8 top-1/2 -translate-y-1/2">
          <span className="text-[9px] font-bold text-gray-400 tracking-wider">OUT</span>
        </div>
        <Handle
          type="source"
          position={Position.Left}
          id="out"
          className="!z-20 !w-5 !h-5 !bg-orange-500 border-none rounded-full shadow-md hover:scale-125 transition-transform"
        />
        <div className="pointer-events-none absolute -right-7 top-1/2 -translate-y-1/2">
          <span className="text-[9px] font-bold text-gray-400 tracking-wider">IN</span>
        </div>
        <Handle
          type="target"
          position={Position.Right}
          id="in"
          className="!z-20 !w-5 !h-5 !bg-cyan-500 border-none rounded-full shadow-md hover:scale-125 transition-transform"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 z-10 w-full min-w-0 p-2 pointer-events-none">
          <PlusCircle className="w-8 h-8 text-gray-500 shrink-0" aria-hidden />
          <span className="text-sm font-medium text-gray-400 text-center break-all line-clamp-2 w-full min-w-0" title={data.label}>
            {data.label || "未設定の機材"}
          </span>
          <span className="text-[9px] text-gray-500">クリックで機材を割り当て</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative flex items-center justify-center ${
        hasImage ? "bg-transparent border-transparent shadow-none" : ""
      }`}
      style={{
        width: nodeWidth,
        height: nodeHeight,
        minWidth: NODE_SIZE_MIN_W,
        minHeight: NODE_SIZE_MIN_H,
      }}
    >
      {/* Top-right controls */}
      <div className="absolute -top-2 -right-2 flex items-center gap-1 z-50">
        <button
          type="button"
          className="w-5 h-5 bg-white/10 text-gray-200 rounded-full flex items-center justify-center cursor-pointer hover:bg-white/20 hover:scale-110 shadow-md"
          onClick={(e) => {
            e.stopPropagation();
            openSettings(id);
          }}
          aria-label="機材設定を開く"
        >
          <SettingsIcon className="w-3 h-3" aria-hidden />
        </button>
        <button
          type="button"
          onClick={handleDeleteNode}
          className="w-5 h-5 bg-red-500/90 text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-red-500 hover:scale-110 shadow-md"
          aria-label="この機材を削除"
        >
          <XIcon className="w-3 h-3" aria-hidden />
        </button>
      </div>

      {/* IN/OUT 端子: 左 OUT・右 IN（中央 top: 50%） */}
      <div className="pointer-events-none absolute -left-8 top-1/2 -translate-y-1/2 flex items-center gap-1">
        <span className="text-[9px] font-bold text-gray-400 tracking-wider">OUT</span>
      </div>
      <Handle
        type="source"
        position={Position.Left}
        id="out"
        className="!z-20 !w-5 !h-5 !bg-orange-500 border-none rounded-full shadow-md hover:scale-125 transition-transform"
      />
      {!isGuitarBass && (
        <>
          <div className="pointer-events-none absolute -right-7 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <span className="text-[9px] font-bold text-gray-400 tracking-wider">IN</span>
          </div>
          <Handle
            type="target"
            position={Position.Right}
            id="in"
            className="!z-20 !w-5 !h-5 !bg-cyan-500 border-none rounded-full shadow-md hover:scale-125 transition-transform"
          />
        </>
      )}

      {/* スイッチャー・ジャンクション: 上辺/下辺に複数ループ端子を均等配置（data.loopCount で数指定、中央寄せで右上アイコンと干渉しない） */}
      {hasLoopTerminal && (
        <LoopTerminalsRow
          isJunctionBox={isJunctionBox}
          position={isJunctionBox ? Position.Bottom : Position.Top}
          loopCount={data.loopCount ?? DEFAULT_LOOP_COUNT}
        />
      )}

      {hasImage ? (
        <>
          {/* レイヤー1: 背景画像（一番下・枠いっぱい。ラッパーのみ overflow-hidden、枠線なし） */}
          <div className="absolute inset-0 rounded-lg overflow-hidden z-0">
            <img
              src={data.imageUrl ?? undefined}
              alt={data.label}
              className="absolute inset-0 w-full h-full object-contain scale-125 z-0 drop-shadow-lg pointer-events-none select-none"
              onError={() => setImageError(true)}
            />
            <div className="absolute inset-0 bg-black/20 pointer-events-none" aria-hidden />
          </div>
          {/* レイヤー3: テキスト（一番上・半透明の座布団で視認性確保） */}
          <div className="relative z-10 flex flex-col items-center justify-end w-full h-full pointer-events-none pb-1">
            {data.effectType ? (
              <div className="bg-black/50 px-2 py-1 rounded-md backdrop-blur-sm text-center">
                <span
                  className="text-cyan-500/90 font-medium text-[10px] truncate block w-full"
                  title={getEffectTypeLabel(data.effectType)}
                >
                  {getEffectTypeLabel(data.effectType)}
                </span>
              </div>
            ) : null}
          </div>
        </>
      ) : (
        <div className={`w-full h-full bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl overflow-hidden flex ${hasLoopTerminal ? "flex-row items-center" : "flex-col"}`}>
          {/* Icon (central) */}
          <div className={`flex items-center justify-center shrink-0 ${hasLoopTerminal ? "w-12 h-full px-1" : "flex-1 min-h-0"}`}>
            {(() => {
              const Icon = getGearIconComponent(data.iconKey);
              return <Icon className={hasLoopTerminal ? "w-6 h-6 text-gray-400" : "w-8 h-8 text-gray-400 shrink-0"} aria-hidden />;
            })()}
          </div>
          {/* 機材名（最大2行で折り返し）＋ エフェクターの種類 */}
          <div className={`flex flex-col items-center justify-center text-center shrink-0 min-w-0 ${hasLoopTerminal ? "flex-1 py-1 pr-2 pl-0" : "px-1.5 pb-1.5 pt-0.5 w-full"}`}>
            <span
              className={`text-white font-bold w-full min-w-0 break-words line-clamp-2 ${nameSizeClass}`}
              title={data.label}
            >
              {data.label}
            </span>
            {data.effectType ? (
              <span className={`text-cyan-500/80 font-medium truncate w-full min-w-0 mt-0.5 ${effectSizeClass}`} title={getEffectTypeLabel(data.effectType)}>
                {getEffectTypeLabel(data.effectType)}
              </span>
            ) : null}
          </div>
        </div>
      )}
      {/* 右下リサイズハンドル（nodrag でノードのドラッグ開始を防ぐ） */}
      <div
        role="slider"
        aria-label="ノードサイズを変更"
        tabIndex={0}
        className="nodrag nopan absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-end justify-end p-0.5 z-40 rounded-bl-lg bg-white/5 hover:bg-white/15 border border-transparent hover:border-white/20"
        onMouseDown={handleResizeStart}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" className="text-gray-400 shrink-0" aria-hidden>
          <path d="M10 10H6L10 6v4zM4 10H0v-4l4 4z" fill="currentColor" />
        </svg>
      </div>
    </div>
  );
}

const nodeTypes = {
  pedal: PedalNode,
};

function CustomEdge(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, markerEnd, selected } = props;
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const { setEdges } = useReactFlow();

  const onDelete = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setEdges((eds) => eds.filter((e) => e.id !== id));
  };

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} />
      <EdgeLabelRenderer>
        {selected && (
          <button
            type="button"
            onClick={onDelete}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto flex items-center justify-center w-6 h-6 bg-red-500 text-white rounded-full hover:bg-red-600 hover:scale-110 cursor-pointer shadow-md z-50"
            style={{
              left: labelX,
              top: labelY,
            }}
            aria-label="この配線を削除"
          >
            <XIcon className="w-3.5 h-3.5" aria-hidden />
          </button>
        )}
      </EdgeLabelRenderer>
    </>
  );
}

const edgeTypes = {
  custom: CustomEdge,
  customLoop: CustomLoopEdge,
};

// エディタ外（詳細ページの読み取り専用ビューなど）で再利用できるように公開
export { nodeTypes as boardFlowNodeTypes, edgeTypes as boardFlowEdgeTypes };

const initialNodes: Node<PedalNodeData>[] = [];
const initialEdges: Edge[] = [];

/** エフェクターの種類の value → 表示ラベル（ノード等で表示用） */
const EFFECT_TYPE_LABELS: Record<string, string> = {
  guitar_body: "ギター本体",
  bass_body: "ベース本体",
  tuner: "チューナー",
  switcher: "スイッチャー",
  junction_box: "ジャンクションボックス",
  overdrive: "オーバードライブ",
  distortion: "ディストーション",
  fuzz: "ファズ",
  preamp: "プリアンプ",
  delay: "ディレイ",
  reverb: "リバーブ",
  chorus: "コーラス",
  compressor: "コンプレッサー",
  phaser: "フェイザー",
  flanger: "フランジャー",
  looper: "ルーパー",
  wah: "ワウ",
  eq: "イコライザー",
  buffer: "バッファ",
  audio_interface: "オーディオインターフェース",
  filter: "フィルター",
  octaver: "オクターバー",
  other: "その他",
};

/** 設定モーダルの種類セレクトの並び順（よく使う・ボードの起点になる順） */
const EFFECT_TYPE_ORDER = [
  "guitar_body",
  "bass_body",
  "tuner",
  "switcher",
  "junction_box",
  "overdrive",
  "distortion",
  "fuzz",
  "preamp",
  "delay",
  "reverb",
  "chorus",
  "compressor",
  "phaser",
  "flanger",
  "looper",
  "wah",
  "eq",
  "buffer",
  "audio_interface",
  "filter",
  "octaver",
  "other",
] as const;

function getEffectTypeLabel(effectType: string): string {
  return EFFECT_TYPE_LABELS[effectType] ?? effectType;
}

/** 機材の category に応じてノード/サイドバー用の iconKey を返す。スイッチャー・ルーティングは横長アイコンに */
function categoryToIconKey(category: string): PedalNodeData["iconKey"] {
  const c = category.trim();
  if (!c) return "effects";
  if (c.includes("スイッチャー") || c.includes("ルーティング")) return "switcher";
  if (c === "ギター" || c === "ベース") return "guitar";
  if (c === "アンプ") return "amp";
  return "effects";
}

type SidebarGear = {
  id: string;
  name: string;
  type: "pedal";
  imageUrl?: string;
  iconKey?: PedalNodeData["iconKey"];
  effectType?: string;
  useImage?: boolean;
  /** スイッチャー/ジャンクションのループ端子数（ドロップ時にノードへ渡す） */
  loopCount?: number;
  /** API から取得した場合の UserGear.id（削除時に DELETE で使用） */
  userGearId?: string;
};

/** GearData / UserGearItem を SidebarGear にマッピング。アイコンは effectorType → category → defaultIcon の優先順。category にスイッチャー/ルーティング含む場合は effectType も switcher に */
function mapGearDataToSidebarGear(item: GearData | UserGearItem): SidebarGear {
  const hasImage = Boolean(item.imageUrl?.trim());
  const effectIconKey = effectTypeToIconKey(item.effectorType ?? "");
  const categoryKey = item.category?.trim() ? categoryToIconKey(item.category) : null;
  const iconKey: GearIconKey =
    effectIconKey ?? categoryKey ?? gearDefaultIconToKey(item.defaultIcon);
  const categoryIsSwitcher = categoryKey === "switcher";
  const effectType = item.effectorType?.trim() || (categoryIsSwitcher ? "switcher" : undefined);
  return {
    id: item.id,
    name: item.name,
    type: "pedal",
    imageUrl: item.imageUrl?.trim() || undefined,
    iconKey,
    effectType,
    useImage: hasImage,
    userGearId: "userGearId" in item ? item.userGearId : undefined,
  };
}

type SettingsTarget =
  | { kind: "node"; id: string; name: string }
  | { kind: "sidebar"; id: string; name: string }
  | { kind: "new" };

const DEFAULT_BOARD_NAME = "名称未設定ボード";

type BoardFlowEditorInnerProps = {
  initialBoardId?: string | null;
  initialName?: string | null;
  initialNodes?: Node<PedalNodeData>[] | null;
  initialEdges?: Edge[] | null;
  initialActualPhotoUrl?: string | null;
};

function BoardFlowEditorInner({
  initialBoardId,
  initialName,
  initialNodes: initialNodesProp,
  initialEdges: initialEdgesProp,
  initialActualPhotoUrl,
}: BoardFlowEditorInnerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [nodes, setNodes, onNodesChange] = useNodesState(
    initialNodesProp && initialNodesProp.length > 0 ? initialNodesProp : initialNodes
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    initialEdgesProp && initialEdgesProp.length > 0 ? initialEdgesProp : initialEdges
  );
  const reactFlow = useReactFlow();
  const [sidebarGears, setSidebarGears] = useState<SidebarGear[]>([]);
  const [sidebarGearsLoading, setSidebarGearsLoading] = useState(true);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [boardId, setBoardId] = useState<string | null>(
    () => (initialBoardId ?? searchParams.get("boardId")) || null
  );
  const [boardName, setBoardName] = useState(
    (initialName && initialName.trim()) || DEFAULT_BOARD_NAME
  );
  const [isSavingBoard, setIsSavingBoard] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  /** ジェネレーターを「既存機材の画像上書き」で開いた場合の Gear ID */
  const [generatorInitialGearId, setGeneratorInitialGearId] = useState<string | null>(null);
  const [settingsTarget, setSettingsTarget] = useState<SettingsTarget | null>(null);
  /** ジェネレーターを「設定モーダル内」から開いたときに、閉じたあとで設定モーダルを再開するための退避先 */
  const [pendingSettingsTarget, setPendingSettingsTarget] = useState<SettingsTarget | null>(null);
  const [settingsName, setSettingsName] = useState<string>("");
  const [settingsIconKey, setSettingsIconKey] = useState<PedalNodeData["iconKey"]>("effects");
  const [settingsEffectType, setSettingsEffectType] = useState<string>("");
  const [settingsEffectTypeOther, setSettingsEffectTypeOther] = useState<string>("");
  const [settingsLoopCount, setSettingsLoopCount] = useState<number>(DEFAULT_LOOP_COUNT);
  const [settingsUseImage, setSettingsUseImage] = useState<boolean>(true);
  const [settingsHasImage, setSettingsHasImage] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingImage, setIsDeletingImage] = useState(false);
  /** 画像アップロード成功直後にモーダルへ即時反映するための最新 Gear（API 返却）。モーダル閉じ時・別機材を開いた時にクリア */
  const [settingsGearOverride, setSettingsGearOverride] = useState<GearData | null>(null);
  /** 写真から自動配置の解析中 */
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  /** 実機写真のアップロード中 */
  const [isUploadingActualPhoto, setIsUploadingActualPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  /** 設定モーダル内「所持機材から読み込む」で選択した機材ID（未選択は ""） */
  const [settingsLoadFromGearId, setSettingsLoadFromGearId] = useState("");
  /** ボード名のインライン編集モード */
  const [isEditingBoardName, setIsEditingBoardName] = useState(false);
  /** 編集中のボード名（編集中のみ使用。確定で boardName に反映） */
  const [editingBoardNameValue, setEditingBoardNameValue] = useState("");
  const boardNameInputRef = useRef<HTMLInputElement>(null);
  /** キャンバスサムネイル取得用（html-to-image の対象要素） */
  const flowContainerRef = useRef<HTMLDivElement>(null);
  /** 実機写真アップロード用の非表示 input */
  const actualPhotoInputRef = useRef<HTMLInputElement>(null);
  /** 実機写真のURL（アップロード済み。保存時に DB へ送る） */
  const [actualPhotoUrl, setActualPhotoUrl] = useState<string | null>(initialActualPhotoUrl ?? null);

  useEffect(() => {
    setActualPhotoUrl(initialActualPhotoUrl ?? null);
  }, [initialActualPhotoUrl]);

  useEffect(() => {
    if (!settingsTarget) setSettingsGearOverride(null);
  }, [settingsTarget]);

  // 画像ジェネレーター保存直後など、state の反映順で一瞬ズレても
  // 設定モーダルが「アイコン」タブに戻ったり、画像プレビューが空にならないようにガードする。
  useEffect(() => {
    if (!settingsTarget) return;
    if (!settingsUseImage) return;
    if (settingsHasImage) return;
    const overrideHasImage = Boolean(settingsGearOverride?.imageUrl?.trim());
    if (overrideHasImage) setSettingsHasImage(true);
  }, [settingsTarget, settingsUseImage, settingsHasImage, settingsGearOverride]);

  const handleDeleteCustomImage = useCallback(
    async (gearId: string, options?: { nodeId?: string }) => {
      const trimmed = (gearId ?? "").trim();
      if (!trimmed) return;
      const token = user ? await user.getIdToken() : null;
      if (!token) {
        alert("ログイン後に画像を削除できます。");
        return;
      }
      setIsDeletingImage(true);
      try {
        const res = await fetch(`/api/gears/${encodeURIComponent(trimmed)}/image`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as { error?: string }).error ?? "画像の削除に失敗しました");
        }

        setSidebarGears((gears) => gears.map((g) => (g.id === trimmed ? { ...g, imageUrl: undefined } : g)));
        setNodes((nds) =>
          nds.map((n) => {
            const d = (n.data ?? {}) as PedalNodeData;
            const matchesByNode = options?.nodeId ? n.id === options.nodeId : false;
            const matchesBySource = d.sourceGearId === trimmed;
            const matchesByLabel = !d.sourceGearId && d.label?.trim() && settingsTarget?.kind === "sidebar"
              ? d.label?.trim() === settingsTarget.name?.trim()
              : false;
            if (matchesByNode || matchesBySource || matchesByLabel) {
              return { ...n, data: { ...d, imageUrl: undefined } };
            }
            return n;
          }),
        );

        setSettingsHasImage(false);
        setSettingsGearOverride(null);
      } catch (err) {
        console.error("[handleDeleteCustomImage]", err);
        alert(err instanceof Error ? err.message : "画像の削除に失敗しました");
      } finally {
        setIsDeletingImage(false);
      }
    },
    [user, setNodes, settingsTarget],
  );

  useEffect(() => {
    if (isEditingBoardName) {
      setEditingBoardNameValue(boardName);
      boardNameInputRef.current?.focus();
      boardNameInputRef.current?.select();
    }
  }, [isEditingBoardName]); // boardName は編集開始時のスナップのみでよい

  const commitBoardNameEdit = useCallback(() => {
    const trimmed = editingBoardNameValue.trim();
    setBoardName(trimmed || DEFAULT_BOARD_NAME);
    setIsEditingBoardName(false);
  }, [editingBoardNameValue]);

  const startEditingBoardName = useCallback(() => {
    setIsEditingBoardName(true);
  }, []);

  /** 実機写真をアップロードして URL を state にセット（Exif回転適用・圧縮後に送信） */
  const handleActualPhotoChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file || !user) return;
      setIsUploadingActualPhoto(true);
      try {
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          exifOrientation: 1,
        };
        let compressedFile: File;
        try {
          compressedFile = await imageCompression(file, options);
        } catch (err) {
          console.error("画像圧縮エラー:", err);
          toast.error("画像の処理に失敗しました");
          return;
        }

        const token = await user.getIdToken();
        if (!token?.trim()) {
          toast.error("認証エラーです。再ログインしてください。");
          return;
        }
        const formData = new FormData();
        formData.append("image", compressedFile);
        const res = await fetch("/api/board-post/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data?.error ?? "アップロードに失敗しました");
          return;
        }
        const url = typeof data?.url === "string" ? data.url : null;
        if (url) {
          setActualPhotoUrl(url);
          toast.success("実機写真を登録しました。保存ボタンで反映されます。");
        }
      } catch (err) {
        console.error("[handleActualPhotoChange]", err);
        toast.error("アップロードに失敗しました");
      } finally {
        setIsUploadingActualPhoto(false);
      }
    },
    [user],
  );

  const handleRemoveActualPhoto = useCallback(() => {
    setActualPhotoUrl(null);
  }, []);

  useEffect(() => {
    if (initialBoardId) return;
    const id = searchParams.get("boardId");
    setBoardId(id);
  }, [searchParams, initialBoardId]);

  const handleSaveBoard = useCallback(async () => {
    if (!user) return;
    setIsSavingBoard(true);
    setSaveSuccessMessage(null);
    try {
      const token = await user.getIdToken();
      if (!token?.trim()) {
        setSaveSuccessMessage("認証エラーです。再ログインしてください。");
        return;
      }
      const currentNodes = reactFlow.getNodes();
      const currentEdges = reactFlow.getEdges();
      let thumbnail: string | null = null;
      if (flowContainerRef.current && currentNodes.length > 0) {
        try {
          thumbnail = await toPng(flowContainerRef.current, {
            backgroundColor: "#050709",
            pixelRatio: 2,
            cacheBust: true,
          });
        } catch (err) {
          console.warn("[handleSaveBoard] Thumbnail capture failed:", err);
        }
      }
      const result = await saveBoard(
        boardId ?? undefined,
        boardName,
        currentNodes,
        currentEdges,
        token,
        thumbnail,
        actualPhotoUrl,
      );
      if (result.success) {
        setBoardId(result.id);
        toast.success("ボードを保存しました");
        setSaveSuccessMessage("ボードを保存しました");
        setTimeout(() => setSaveSuccessMessage(null), 3000);
        // マイページ用の SWR キャッシュを楽観的に更新しておく
        if (user?.uid) {
          const optimisticBoard = {
            id: result.id,
            name: boardName,
            thumbnail: thumbnail ?? null,
            actualPhotoUrl: actualPhotoUrl ?? null,
            updatedAt: new Date().toISOString(),
          };
          mutate(
            ["mypage", user.uid],
            (current: any) => {
              if (!current) return current;
              const prevBoards: any[] = Array.isArray(current.boards)
                ? current.boards
                : [];
              const filtered = prevBoards.filter((b) => b.id !== result.id);
              return {
                ...current,
                boards: [optimisticBoard, ...filtered],
              };
            },
            { revalidate: true },
          );
        }
        // クライアント側ルーターキャッシュも明示的にリフレッシュ
        router.refresh();
      } else {
        const errMsg = result.error ?? "保存に失敗しました";
        setSaveSuccessMessage(errMsg);
        toast.error(errMsg);
      }
    } catch (err) {
      console.error("[handleSaveBoard]", err);
      const errMsg = err instanceof Error ? err.message : "保存に失敗しました";
      setSaveSuccessMessage(String(errMsg));
      toast.error(String(errMsg));
    } finally {
      setIsSavingBoard(false);
    }
  }, [user, boardId, boardName, reactFlow, actualPhotoUrl, router]);

  useEffect(() => {
    // 認証確定前 or 未ログイン時は API を叩かない
    if (authLoading) return;
    if (!user) {
      setSidebarGears([]);
      setSidebarGearsLoading(false);
      return;
    }

    const isValidToken = (t: unknown): t is string =>
      typeof t === "string" &&
      t.length > 0 &&
      t !== "undefined" &&
      t !== "null";

    let cancelled = false;
    const fetchUserGears = async () => {
      setSidebarGearsLoading(true);
      try {
        const token = await user.getIdToken();
        if (!isValidToken(token)) {
          console.error("Failed to fetch gears: トークンが取得できませんでした");
          if (!cancelled) {
            setSidebarGears([]);
            setSidebarGearsLoading(false);
          }
          return;
        }
        const res = await fetch("/api/user/gears", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          cache: "no-store",
        });
        if (!res.ok) {
          const text = await res.text();
          console.error("Failed to fetch gears:", res.status, text);
          if (!cancelled) setSidebarGears([]);
          return;
        }
        const items = (await res.json()) as UserGearItem[];
        if (cancelled) return;
        const list = Array.isArray(items) ? items.map(mapGearDataToSidebarGear) : [];
        setSidebarGears(list);
      } catch (error) {
        console.error("Failed to fetch gears:", error);
        if (!cancelled) setSidebarGears([]);
      } finally {
        if (!cancelled) setSidebarGearsLoading(false);
      }
    };

    fetchUserGears();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: "default",
            animated: true,
            style: { stroke: "#22d3ee", strokeWidth: 2 },
          },
          eds,
        ),
      );
    },
    [setEdges],
  );

  const onDragStart = useCallback(
    (event: React.DragEvent<HTMLElement>, gearId: string) => {
      const gear = sidebarGears.find((g) => g.id === gearId);
      if (!gear) return;
      event.dataTransfer.setData(
        "application/json",
        JSON.stringify({
          id: gear.id,
          name: gear.name,
          type: gear.type,
          imageUrl: gear.imageUrl,
          iconKey: gear.iconKey,
          effectType: gear.effectType,
          useImage: gear.useImage !== false,
          loopCount: gear.loopCount,
        }),
      );
      event.dataTransfer.effectAllowed = "move";
    },
    [sidebarGears],
  );

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const raw = event.dataTransfer.getData("application/json");
      if (!raw) return;
      let payload:
        | {
            id: string;
            name: string;
            type: string;
            imageUrl?: string;
            iconKey?: PedalNodeData["iconKey"];
            effectType?: string;
            useImage?: boolean;
            loopCount?: number;
          }
        | null = null;
      try {
        payload = JSON.parse(raw);
      } catch {
        return;
      }
      if (!payload || payload.type !== "pedal") return;

      const position = reactFlow.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const id = `${payload.id}-${Date.now()}`;
      setNodes((nds) =>
        nds.concat({
          id,
          type: "pedal",
          position,
          data: {
            label: payload.name,
            imageUrl: payload.imageUrl,
            iconKey: payload.iconKey,
            effectType: payload.effectType,
            useImage: payload.useImage !== false,
            sourceGearId: payload.id,
            ...(typeof payload.loopCount === "number" && {
              loopCount: Math.min(LOOP_COUNT_MAX, Math.max(LOOP_COUNT_MIN, payload.loopCount)),
            }),
          },
        }),
      );
    },
    [reactFlow, setNodes],
  );

  /** モバイル用: タップで機材ノードをキャンバス中央付近に追加し、ドロワーを閉じる */
  const addNodeFromGearTap = useCallback(
    (gearId: string) => {
      const gear = sidebarGears.find((g) => g.id === gearId);
      if (!gear || gear.type !== "pedal") return;
      const flowEl = flowContainerRef.current;
      const centerX = flowEl ? flowEl.getBoundingClientRect().left + flowEl.getBoundingClientRect().width / 2 : window.innerWidth / 2;
      const centerY = flowEl ? flowEl.getBoundingClientRect().top + flowEl.getBoundingClientRect().height / 2 : window.innerHeight / 2;
      const position = reactFlow.screenToFlowPosition({ x: centerX, y: centerY });
      const id = `${gear.id}-${Date.now()}`;
      setNodes((nds) =>
        nds.concat({
          id,
          type: "pedal",
          position,
          data: {
            label: gear.name,
            imageUrl: gear.imageUrl,
            iconKey: gear.iconKey,
            effectType: gear.effectType,
            useImage: gear.useImage !== false,
            sourceGearId: gear.id,
            ...(typeof gear.loopCount === "number" && {
              loopCount: Math.min(LOOP_COUNT_MAX, Math.max(LOOP_COUNT_MIN, gear.loopCount)),
            }),
          },
        }),
      );
      setMobileSheetOpen(false);
    },
    [sidebarGears, reactFlow, setNodes],
  );

  const openSettingsForNode = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      const label = (node?.data as PedalNodeData | undefined)?.label ?? "未設定の機材";
      const data = (node?.data ?? {}) as PedalNodeData;
      setSettingsTarget({ kind: "node", id: nodeId, name: label });
      setSettingsName(label);
      setSettingsIconKey(effectTypeToIconKey(data.effectType ?? "") ?? data.iconKey ?? "effects");
      setSettingsEffectType(data.effectType ?? "");
      setSettingsEffectTypeOther("");
      setSettingsLoopCount(
        typeof data.loopCount === "number"
          ? Math.min(LOOP_COUNT_MAX, Math.max(LOOP_COUNT_MIN, data.loopCount))
          : DEFAULT_LOOP_COUNT,
      );
      setSettingsUseImage(data.useImage !== false);
      setSettingsHasImage(Boolean(data.imageUrl));
      setSettingsLoadFromGearId(data.sourceGearId ?? "");
    },
    [nodes],
  );

  const openSettingsForSidebarGear = useCallback(
    (gearId: string, name: string) => {
      setSettingsGearOverride(null);
      setSettingsLoadFromGearId("");
      const gear = sidebarGears.find((g) => g.id === gearId);
      const label = gear?.name ?? name;
      setSettingsTarget({ kind: "sidebar", id: gearId, name: label });
      setSettingsName(label);
      setSettingsIconKey(gear?.iconKey ?? "effects");
      setSettingsEffectType(gear?.effectType ?? "");
      setSettingsEffectTypeOther("");
      setSettingsLoopCount(
        typeof gear?.loopCount === "number"
          ? Math.min(LOOP_COUNT_MAX, Math.max(LOOP_COUNT_MIN, gear.loopCount))
          : DEFAULT_LOOP_COUNT,
      );
      // 画像が登録済みの場合は「カスタム画像」タブを初期表示し、ジェネレーター閉じ後もタブがリセットされないようにする
      setSettingsUseImage(Boolean(gear?.imageUrl) || gear?.useImage !== false);
      setSettingsHasImage(Boolean(gear?.imageUrl));
      setSettingsIconKey(gear?.iconKey ?? effectTypeToIconKey(gear?.effectType ?? "") ?? "effects");
    },
    [sidebarGears],
  );

  /** ジェネレーターを閉じる。設定モーダルから開いていた場合は閉じたあとで設定モーダルを再開する。
   * 画像更新成功時は updatedGear を渡すと、リスト更新・モーダル再開時に imageUrl を反映し「カスタム画像」タブを維持する。 */
  const closeGenerator = useCallback(
    (updatedGear?: GearData) => {
      setShowGenerator(false);
      setGeneratorInitialGearId(null);
      const pending = pendingSettingsTarget;
      setPendingSettingsTarget(null);

      if (updatedGear && pending?.kind === "sidebar" && pending.id === updatedGear.id) {
        const mapped = mapGearDataToSidebarGear(updatedGear);
        setSidebarGears((gears) =>
          gears.map((g) => (g.id === updatedGear.id ? mapped : g)),
        );
        setNodes((nds) =>
          nds.map((n) => {
            const d = (n.data ?? {}) as PedalNodeData;
            // サイドバー側の機材画像を更新したとき、該当ノードにも反映する
            // 旧データで `sourceGearId` が無い場合があるので `label` でフォールバックする
            const matchesBySource = d.sourceGearId === mapped.id;
            const matchesByLabel = !d.sourceGearId && d.label?.trim() === mapped.name?.trim();
            if (matchesBySource || matchesByLabel) {
              return { ...n, data: { ...d, imageUrl: mapped.imageUrl ?? d.imageUrl, useImage: true } };
            }
            return n;
          }),
        );
        setSettingsTarget({ kind: "sidebar", id: updatedGear.id, name: mapped.name });
        setSettingsName(mapped.name);
        setSettingsIconKey(mapped.iconKey);
        setSettingsEffectType(mapped.effectType ?? "");
        setSettingsEffectTypeOther("");
        setSettingsUseImage(true);
        setSettingsHasImage(true);
        setSettingsGearOverride(updatedGear);
        return;
      }

      if (updatedGear && pending?.kind === "node") {
        const mapped = mapGearDataToSidebarGear(updatedGear);
        setSidebarGears((gears) =>
          gears.map((g) => (g.id === updatedGear.id ? mapped : g)),
        );
        setNodes((nds) =>
          nds.map((n) => {
            if (n.id !== pending.id) return n;
            const d = (n.data ?? {}) as PedalNodeData;
            return {
              ...n,
              data: { ...d, imageUrl: mapped.imageUrl ?? d.imageUrl, useImage: true },
            };
          }),
        );
        // 画像保存直後に、設定モーダル側が必ず「カスタム画像」タブ + 画像プレビューを表示できるようにする。
        // 旧データでは `sourceGearId` が無い場合があるため、ここで `settingsLoadFromGearId` にも反映して参照を安定させる。
        const node = nodes.find((n) => n.id === pending.id);
        const data = (node?.data ?? {}) as PedalNodeData;
        setSettingsTarget({ kind: "node", id: pending.id, name: data.label ?? "" });
        setSettingsName(data.label ?? "");
        setSettingsIconKey(effectTypeToIconKey(mapped.effectType ?? "") ?? data.iconKey ?? "effects");
        setSettingsEffectType(mapped.effectType ?? data.effectType ?? "");
        setSettingsEffectTypeOther("");
        setSettingsUseImage(true);
        setSettingsHasImage(true);
        setSettingsLoadFromGearId(mapped.id);
        setSettingsGearOverride(updatedGear);
        return;
      }

      if (pending) {
        setTimeout(() => {
          if (pending.kind === "node") {
            openSettingsForNode(pending.id);
          } else if (pending.kind === "sidebar") {
            openSettingsForSidebarGear(pending.id, pending.name);
          } else {
            setSettingsTarget({ kind: "new" });
            setSettingsName("");
            setSettingsIconKey("effects");
            setSettingsEffectType("");
            setSettingsEffectTypeOther("");
            setSettingsUseImage(true);
            setSettingsHasImage(false);
            setSettingsLoadFromGearId("");
          }
        }, 0);
      }
    },
    [pendingSettingsTarget, nodes, openSettingsForNode, openSettingsForSidebarGear],
  );

  /** 機材画像ジェネレーターでアップロード成功時：リストの該当のみ上書きし、設定モーダルを再開（画像・タブ維持） */
  const handleGeneratorSuccess = useCallback(
    (gear: GearData, _options: { isUpdate: boolean }) => {
      closeGenerator(gear);
    },
    [closeGenerator],
  );

  /** 機材の実機画像をDBから削除し、State を即時反映（「まだ登録されていません」表示に戻す） */
  const handleDeleteGearImage = useCallback(
    async (gearId: string) => {
      if (!settingsTarget || settingsTarget.kind !== "sidebar" || settingsTarget.id !== gearId) return;
      const token = user ? await user.getIdToken() : null;
      if (!token) {
        alert("ログイン後に画像を削除できます。");
        return;
      }
      setIsDeletingImage(true);
      try {
        const res = await fetch(`/api/gears/${encodeURIComponent(gearId)}/image`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as { error?: string }).error ?? "画像の削除に失敗しました");
        }
        setSidebarGears((gears) =>
          gears.map((g) => (g.id === gearId ? { ...g, imageUrl: undefined } : g)),
        );
        setSettingsHasImage(false);
      } catch (err) {
        console.error("[handleDeleteGearImage]", err);
        alert(err instanceof Error ? err.message : "画像の削除に失敗しました");
      } finally {
        setIsDeletingImage(false);
      }
    },
    [settingsTarget, user],
  );

  const handleSaveSettings = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!settingsTarget) return;
      const finalEffectType =
        settingsEffectType === "other" ? settingsEffectTypeOther.trim() : settingsEffectType;

      if (settingsTarget.kind === "node") {
        const loadGear = settingsLoadFromGearId ? sidebarGears.find((g) => g.id === settingsLoadFromGearId) : null;
        setNodes((nds) =>
          nds.map((n) => {
            if (n.id !== settingsTarget.id) return n;
            const prev = (n.data ?? {}) as PedalNodeData;
            const isSwitcherOrJunction =
              settingsIconKey === "switcher" ||
              finalEffectType === "switcher" ||
              finalEffectType === "junction_box";
            const base = {
              ...prev,
              label: settingsName.trim() || prev.label,
              iconKey: settingsIconKey,
              effectType: finalEffectType || prev.effectType,
              useImage: settingsUseImage,
              ...(isSwitcherOrJunction && {
                loopCount: Math.min(
                  LOOP_COUNT_MAX,
                  Math.max(LOOP_COUNT_MIN, settingsLoopCount),
                ),
              }),
            };
            if (loadGear) {
              return {
                ...n,
                data: {
                  ...base,
                  sourceGearId: loadGear.id,
                  imageUrl: loadGear.imageUrl,
                },
              };
            }
            return { ...n, data: base };
          }),
        );
        setSettingsTarget(null);
        return;
      }
      if (settingsTarget.kind === "sidebar") {
        const isSwitcherOrJunction =
          settingsIconKey === "switcher" ||
          finalEffectType === "switcher" ||
          finalEffectType === "junction_box";
        setSidebarGears((gears) =>
          gears.map((g) =>
            g.id !== settingsTarget.id
              ? g
              : {
                  ...g,
                  name: settingsName.trim() || g.name,
                  iconKey: settingsIconKey,
                  effectType: finalEffectType || g.effectType,
                  useImage: settingsUseImage,
                  ...(isSwitcherOrJunction && {
                    loopCount: Math.min(
                      LOOP_COUNT_MAX,
                      Math.max(LOOP_COUNT_MIN, settingsLoopCount),
                    ),
                  }),
                },
          ),
        );
        setSettingsTarget(null);
        return;
      }

      // 新規機材: 所有機材 API に POST（Gear 作成 + UserGear 紐付け）
      if (settingsTarget.kind === "new") {
        if (!user) {
          alert("ログイン後に機材を追加できます。");
          return;
        }
        setIsSubmitting(true);
        try {
          const token = await user.getIdToken();
          if (typeof token !== "string" || !token || token === "undefined" || token === "null") {
            setIsSubmitting(false);
            alert("認証トークンを取得できませんでした。再ログインしてください。");
            return;
          }
          const res = await fetch("/api/user/gears", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              name: settingsName.trim() || "無題の機材",
              category: "ギターエフェクター",
              effectorType: finalEffectType || null,
              imageUrl: settingsHasImage ? undefined : null,
              defaultIcon: settingsIconKey ?? "effects",
            }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error((data as { error?: string }).error ?? "保存に失敗しました");
          }
          const item = (await res.json()) as UserGearItem;
          const mapped = mapGearDataToSidebarGear(item);
          const isSwitcherOrJunctionNew =
            settingsIconKey === "switcher" ||
            finalEffectType === "switcher" ||
            finalEffectType === "junction_box";
          setSidebarGears((gears) =>
            gears.concat({
              ...mapped,
              ...(isSwitcherOrJunctionNew && {
                loopCount: Math.min(
                  LOOP_COUNT_MAX,
                  Math.max(LOOP_COUNT_MIN, settingsLoopCount),
                ),
              }),
            }),
          );
          setSettingsTarget(null);
        } catch (err) {
          console.error("[handleSaveSettings] POST /api/user/gears", err);
          alert(err instanceof Error ? err.message : "機材の保存に失敗しました");
        } finally {
          setIsSubmitting(false);
        }
      }
    },
    [
      user,
      settingsTarget,
      settingsName,
      settingsIconKey,
      settingsEffectType,
      settingsEffectTypeOther,
      settingsLoopCount,
      settingsUseImage,
      settingsHasImage,
      settingsLoadFromGearId,
      sidebarGears,
      setNodes,
    ],
  );

  /** 選択されたノード/エッジに応じてエッジのスタイルをハイライト（タッチデバイス対応） */
  const edgesWithHoverStyle = useMemo(() => {
    const selectedNodeIds = new Set(nodes.filter((n) => n.selected).map((n) => n.id));
    const selectedEdgeIds = new Set(edges.filter((e) => e.selected).map((e) => e.id));
    const highlightedEdgeIds = new Set<string>(selectedEdgeIds);
    selectedNodeIds.forEach((nodeId) => {
      edges.forEach((e) => {
        if (e.source === nodeId || e.target === nodeId) highlightedEdgeIds.add(e.id);
      });
    });
    const hasSelection = highlightedEdgeIds.size > 0;
    return edges.map((edge) => {
      if (!hasSelection) {
        return { ...edge, animated: false, style: { ...edge.style, stroke: "#22d3ee", strokeWidth: 2 } };
      }
      if (highlightedEdgeIds.has(edge.id)) {
        return {
          ...edge,
          animated: true,
          style: { ...edge.style, stroke: "#06b6d4", strokeWidth: 3, zIndex: 1000 },
        };
      }
      return {
        ...edge,
        animated: false,
        style: { ...edge.style, stroke: "#555", strokeWidth: 2, opacity: 0.3, zIndex: 0 },
      };
    });
  }, [edges, nodes]);

  /** 手動レイアウト用: ドラッグ時のグリッド吸着間隔（px） */
  const SNAP_GRID = 20;

  /** 写真から自動配置時のキャンバス基準サイズ（スナップは一切かけず生の座標を使用） */
  const CANVAS_LAYOUT_WIDTH = 1200;
  const CANVAS_LAYOUT_HEIGHT = 800;

  const handlePhotoAnalyze = useCallback(
    async (file: File) => {
      if (nodes.length > 0) {
        if (!window.confirm("現在のキャンバスをクリアして、写真のレイアウトで上書きしますか？")) {
          return;
        }
        setNodes([]);
        setEdges([]);
      }
      setIsAnalyzing(true);
      try {
        const form = new FormData();
        form.append("image", file);
        const res = await fetch("/api/board/analyze", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) {
          alert(data?.error ?? "解析に失敗しました");
          return;
        }
        const items = Array.isArray(data) ? data : data?.items ?? [];
        if (items.length === 0) {
          alert("検出された機材がありませんでした");
          return;
        }
        const baseId = `analyzed-${Date.now()}`;
        const newNodes: Node<PedalNodeData>[] = items.map(
          (item: { label?: string; x?: number; y?: number }, i: number) => {
            const relX = typeof item.x === "number" ? item.x : 0.5;
            const relY = typeof item.y === "number" ? item.y : 0.5;
            return {
              id: `${baseId}-${i}`,
              type: "pedal",
              position: {
                x: relX * CANVAS_LAYOUT_WIDTH,
                y: relY * CANVAS_LAYOUT_HEIGHT,
              },
              data: {
                label: typeof item.label === "string" ? item.label : "未設定の機材",
              },
            };
          },
        );
        setNodes((nds) => nds.concat(newNodes));
        setMobileSheetOpen(false);
      } catch (e) {
        alert(e instanceof Error ? e.message : "解析中にエラーが発生しました");
      } finally {
        setIsAnalyzing(false);
      }
    },
    [nodes.length, setNodes, setEdges, setMobileSheetOpen],
  );

  return (
    <NodeSettingsContext.Provider value={openSettingsForNode}>
      <div className="w-full h-full rounded-xl border border-surface-border bg-black/40 overflow-hidden flex flex-col">
        <div className="shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-2 px-4 py-3 border-b border-surface-border bg-black/50 backdrop-blur-sm">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => {
                router.refresh();
                router.push("/mypage");
              }}
              className="shrink-0 flex items-center gap-1.5 rounded-md py-1.5 px-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              aria-label="マイページに戻る"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">マイページ</span>
            </button>
            {isEditingBoardName ? (
              <input
                ref={boardNameInputRef}
                type="text"
                value={editingBoardNameValue}
                onChange={(e) => setEditingBoardNameValue(e.target.value)}
                onBlur={commitBoardNameEdit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitBoardNameEdit();
                  }
                  if (e.key === "Escape") {
                    setEditingBoardNameValue(boardName);
                    setIsEditingBoardName(false);
                    boardNameInputRef.current?.blur();
                  }
                }}
                className="flex-1 min-w-0 px-2 py-1 text-lg font-semibold text-white bg-white/10 border border-cyan-500/50 rounded focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                placeholder={DEFAULT_BOARD_NAME}
                aria-label="ボード名を編集"
              />
            ) : (
              <button
                type="button"
                onClick={startEditingBoardName}
                className="flex items-center gap-2 min-w-0 rounded px-2 py-1 text-left text-lg font-semibold text-white hover:bg-white/10 transition-colors group"
                aria-label="ボード名を編集"
              >
                <span className="truncate">{boardName}</span>
                <Pencil className="h-4 w-4 shrink-0 text-gray-400 group-hover:text-cyan-400" aria-hidden />
              </button>
            )}
            {saveSuccessMessage && !isEditingBoardName && (
              <span className="text-sm text-electric-blue truncate ml-2 hidden sm:inline" role="status">
                {saveSuccessMessage}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-4 shrink-0 flex-wrap">
            <input
              ref={actualPhotoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              aria-hidden
              onChange={handleActualPhotoChange}
            />
            {actualPhotoUrl ? (
              <div className="relative group/photo">
                <button
                  type="button"
                  onClick={() => actualPhotoInputRef.current?.click()}
                  disabled={isUploadingActualPhoto}
                  className="block w-12 h-12 rounded-lg overflow-hidden border border-white/20 hover:border-cyan-500/50 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  aria-label="実機写真を変更"
                >
                  <img
                    src={actualPhotoUrl}
                    alt="実機写真"
                    className="w-full h-full object-cover"
                  />
                </button>
                <button
                  type="button"
                  onClick={handleRemoveActualPhoto}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500/90 text-white flex items-center justify-center opacity-0 group-hover/photo:opacity-100 hover:bg-red-500 transition-opacity shadow-md"
                  aria-label="実機写真を削除"
                >
                  <XIcon className="w-3 h-3" aria-hidden />
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={!user || isUploadingActualPhoto}
                onClick={() => actualPhotoInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 transition-colors text-sm font-medium disabled:opacity-50 disabled:pointer-events-none"
              >
                {isUploadingActualPhoto ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                ) : (
                  <Camera className="w-4 h-4" aria-hidden />
                )}
                <span>実機写真を登録</span>
              </button>
            )}
            <Button
              type="button"
              disabled={!user || isSavingBoard}
              onClick={handleSaveBoard}
              className="shrink-0 relative px-6 py-2 rounded-full font-semibold transition-all duration-200 border border-cyan-500 text-cyan-500 bg-transparent hover:bg-cyan-500/10 hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSavingBoard ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 shrink-0" aria-hidden />
                  ボードを保存
                </>
              )}
            </Button>
          </div>
        </div>
      <div className="flex-1 min-h-0 flex overflow-hidden">
      <aside className="hidden md:flex w-72 max-w-xs bg-[#1a1a1a] border-r border-white/10 flex-col overflow-hidden shrink-0">
        <div className="shrink-0 p-4 pb-2 space-y-2">
          <button
            type="button"
            onClick={() => {
              setSettingsTarget({ kind: "new" });
              setSettingsName("");
              setSettingsIconKey("effects");
              setSettingsEffectType("");
              setSettingsEffectTypeOther("");
              setSettingsLoopCount(DEFAULT_LOOP_COUNT);
              setSettingsUseImage(true);
              setSettingsHasImage(false);
              setSettingsLoadFromGearId("");
            }}
            className="flex items-center justify-center w-full py-2.5 text-sm font-bold rounded-lg bg-transparent border border-cyan-500 text-cyan-500 hover:bg-cyan-500/10 transition-colors gap-2"
          >
            <PlusCircle className="w-4 h-4" aria-hidden />
            <span>機材を追加</span>
          </button>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            aria-hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) handlePhotoAnalyze(f);
            }}
          />
          <button
            type="button"
            disabled={isAnalyzing}
            onClick={() => photoInputRef.current?.click()}
            className="flex items-center justify-center w-full py-1.5 text-xs font-medium rounded-lg bg-transparent border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 transition-colors gap-1.5 disabled:opacity-50 disabled:pointer-events-none"
          >
            {isAnalyzing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
            ) : (
              <Camera className="w-3.5 h-3.5" aria-hidden />
            )}
            <span>{isAnalyzing ? "解析中..." : "写真から自動配置 (Beta)"}</span>
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 pt-1">
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">所持機材</p>
          {sidebarGearsLoading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin" aria-hidden />
              <p className="text-xs">機材を読み込み中...</p>
            </div>
          ) : (
            <ul className="space-y-2 pr-1 scrollbar-subtle list-none p-0 m-0">
              {sidebarGears.map((gear) => (
                <li
                  key={gear.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, gear.id)}
                  className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-gray-200 cursor-grab active:cursor-grabbing hover:border-cyan-500/60 hover:bg-white/[0.06] transition-colors flex items-center justify-between gap-2"
                >
                <GripVertical className="w-4 h-4 shrink-0 text-gray-500" aria-hidden />
                <div className="w-8 h-8 rounded-md bg-white/5 flex items-center justify-center shrink-0 overflow-hidden">
                  {gear.useImage !== false && gear.imageUrl ? (
                    <img
                      src={gear.imageUrl}
                      alt={gear.name}
                      className="w-full h-full object-contain pointer-events-none select-none"
                    />
                  ) : (() => {
                    const Icon = getGearIconComponent(gear.iconKey);
                    return <Icon className="w-4 h-4 text-gray-200" aria-hidden />;
                  })()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-snug truncate">{gear.name}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">ドラッグしてボードに追加</p>
                </div>
                <div className="ml-1 flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSidebarGears((gears) => gears.filter((g) => g.id !== gear.id));
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded p-1 text-gray-500 hover:bg-red-500/10 hover:text-red-500 cursor-pointer transition-colors"
                    aria-label="この機材をリストから削除"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openSettingsForSidebarGear(gear.id, gear.name);
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                    aria-label="この機材の設定を開く"
                  >
                    <MoreVertical className="w-3.5 h-3.5" aria-hidden />
                  </button>
                </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      <div
        ref={flowContainerRef}
        className="flex-1 bg-[#050709] min-h-0"
        onDrop={onDrop}
        onDragOver={onDragOver}
      >
        <ReactFlow
          nodes={nodes}
          edges={edgesWithHoverStyle}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={{
            type: "default",
            animated: true,
            style: { stroke: "#22d3ee", strokeWidth: 2 },
          }}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeClick={(event, edge) => {
            event.stopPropagation();
            if (window.confirm("この配線を削除しますか？")) {
              setEdges((eds) => eds.filter((e) => e.id !== edge.id));
            }
          }}
          snapToGrid={true}
          snapGrid={[SNAP_GRID, SNAP_GRID]}
          fitView
          colorMode="dark"
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Lines} color="#111827" gap={32} />
          <Controls />
        </ReactFlow>
      </div>

        {/* モバイル: 機材追加フローティングボタン */}
        <button
          type="button"
          onClick={() => setMobileSheetOpen(true)}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 md:hidden flex items-center justify-center gap-2 px-6 py-3.5 rounded-full font-semibold text-cyan-400 bg-[#0a0a0a]/95 border border-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.4)] hover:bg-cyan-500/10 hover:shadow-[0_0_16px_rgba(6,182,212,0.5)] active:scale-[0.98] transition-all"
          aria-label="機材を追加"
        >
          <PlusCircle className="w-5 h-5 shrink-0" aria-hidden />
          <span>機材を追加</span>
        </button>
      </div>

      {/* モバイル: 下から開く機材追加ドロワー */}
      {mobileSheetOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/60 md:hidden"
            aria-hidden
            onClick={() => setMobileSheetOpen(false)}
          />
          <div
            className="fixed inset-x-0 bottom-0 z-50 md:hidden max-h-[70vh] rounded-t-2xl border-t border-cyan-500/20 bg-[#1a1a1a] shadow-[0_-8px_32px_rgba(0,0,0,0.4)] flex flex-col animate-in slide-in-from-bottom duration-300"
            role="dialog"
            aria-modal="true"
            aria-label="機材を追加"
          >
            <div className="shrink-0 flex items-center justify-between border-b border-white/10 px-4 py-3">
              <span className="text-sm font-semibold text-gray-200">機材を追加</span>
              <button
                type="button"
                onClick={() => setMobileSheetOpen(false)}
                className="p-2 rounded-lg text-gray-400 hover:bg-cyan-500/10 hover:text-cyan-400 transition-colors"
                aria-label="閉じる"
              >
                <XIcon className="w-5 h-5" aria-hidden />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4">
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setMobileSheetOpen(false);
                    setSettingsTarget({ kind: "new" });
                    setSettingsName("");
                    setSettingsIconKey("effects");
                    setSettingsEffectType("");
                    setSettingsEffectTypeOther("");
                    setSettingsLoopCount(DEFAULT_LOOP_COUNT);
                    setSettingsUseImage(true);
                    setSettingsHasImage(false);
                    setSettingsLoadFromGearId("");
                  }}
                  className="flex items-center justify-center w-full py-2.5 text-sm font-bold rounded-lg bg-transparent border border-cyan-500 text-cyan-400 hover:bg-cyan-500/10 transition-colors gap-2"
                >
                  <PlusCircle className="w-4 h-4" aria-hidden />
                  <span>機材を追加</span>
                </button>
                <button
                  type="button"
                  disabled={isAnalyzing}
                  onClick={() => photoInputRef.current?.click()}
                  className="flex items-center justify-center w-full py-1.5 text-xs font-medium rounded-lg bg-transparent border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 transition-colors gap-1.5 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isAnalyzing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Camera className="w-3.5 h-3.5" aria-hidden />
                  )}
                  <span>{isAnalyzing ? "解析中..." : "写真から自動配置 (Beta)"}</span>
                </button>
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">所持機材（タップで配置）</p>
                {sidebarGearsLoading ? (
                  <div className="flex flex-col items-center justify-center py-6 gap-2 text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin" aria-hidden />
                    <p className="text-xs">機材を読み込み中...</p>
                  </div>
                ) : (
                  <ul className="space-y-2 list-none p-0 m-0">
                    {sidebarGears.map((gear) => (
                      <li key={gear.id}>
                        <button
                          type="button"
                          onClick={() => addNodeFromGearTap(gear.id)}
                          className="w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left text-xs text-gray-200 hover:border-cyan-500/60 hover:bg-cyan-500/10 hover:text-cyan-200 transition-colors flex items-center gap-3"
                        >
                          <div className="w-8 h-8 rounded-md bg-white/5 flex items-center justify-center shrink-0 overflow-hidden">
                            {gear.useImage !== false && gear.imageUrl ? (
                              <img
                                src={gear.imageUrl}
                                alt={gear.name}
                                className="w-full h-full object-contain pointer-events-none select-none"
                              />
                            ) : (() => {
                              const Icon = getGearIconComponent(gear.iconKey);
                              return <Icon className="w-4 h-4 text-gray-200" aria-hidden />;
                            })()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold leading-snug truncate">{gear.name}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">タップしてボードに追加</p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {showGenerator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" data-testid="gear-image-generator-modal">
          <div className="w-full max-w-4xl mx-4 rounded-xl border border-white/10 bg-[#1a1a1a] shadow-2xl relative">
            <button
              type="button"
              onClick={() => closeGenerator()}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 text-gray-200 flex items-center justify-center hover:bg-white/20 hover:text-white transition-colors"
              aria-label="閉じる"
            >
              <XIcon className="w-4 h-4" aria-hidden />
            </button>
            <div className="max-h-[80vh] overflow-y-auto p-4 sm:p-6">
              <GearImageGeneratorContent
                initialGearId={generatorInitialGearId}
                getAuthToken={user ? () => user.getIdToken() : undefined}
                onSuccess={handleGeneratorSuccess}
                onClose={closeGenerator}
              />
            </div>
          </div>
        </div>
      )}

      {settingsTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg mx-4 rounded-xl border border-white/10 bg-[#05070a] shadow-2xl relative">
            <button
              type="button"
              onClick={() => setSettingsTarget(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 text-gray-200 flex items-center justify-center hover:bg-white/20 hover:text-white transition-colors"
              aria-label="閉じる"
            >
              <XIcon className="w-4 h-4" aria-hidden />
            </button>
            <div className="max-h-[80vh] overflow-y-auto p-4 sm:p-6 space-y-4">
              <div>
                <h2 className="text-base font-semibold text-white">
                  機材の設定（
                  {settingsTarget.kind === "new" ? settingsName || "新規機材" : settingsTarget.name}
                  ）
                </h2>
                <p className="mt-1 text-xs text-gray-400">
                  アイコンやエフェクターの種類、画像の使用可否を調整できます。
                </p>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-4">
                {/* 所持機材から読み込む（ノード編集時のみ） */}
                {settingsTarget.kind === "node" && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-300">💡 所持機材から読み込む (任意)</label>
                    <select
                      value={settingsLoadFromGearId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setSettingsLoadFromGearId(id);
                        const g = sidebarGears.find((x) => x.id === id);
                        if (g) {
                          setSettingsName(g.name);
                          setSettingsUseImage(g.useImage !== false);
                          setSettingsHasImage(Boolean(g.imageUrl));
                          setSettingsIconKey(g.iconKey ?? "effects");
                          setSettingsEffectType(g.effectType ?? "");
                          setSettingsLoopCount(
                            typeof g.loopCount === "number"
                              ? Math.min(LOOP_COUNT_MAX, Math.max(LOOP_COUNT_MIN, g.loopCount))
                              : DEFAULT_LOOP_COUNT,
                          );
                        }
                      }}
                      className="w-full rounded-md border border-surface-border bg-surface-card px-3 py-2 text-xs text-gray-100 focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="">選択しない（手入力）</option>
                      {sidebarGears.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                          {g.effectType ? ` (${getEffectTypeLabel(g.effectType)})` : ""}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-gray-500">
                      選択すると名前・画像・アイコン・端子設定がフォームに反映されます。未選択の場合は自由に手入力できます。
                    </p>
                  </div>
                )}

                {/* 機材名 */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-300">機材名</p>
                  <input
                    type="text"
                    value={settingsName}
                    onChange={(e) => setSettingsName(e.target.value)}
                    placeholder="例: DS-1"
                    className="w-full rounded-md border border-surface-border bg-surface-card px-3 py-2 text-xs text-gray-100 focus:ring-2 focus:ring-cyan-500"
                    required
                  />
                </div>
                {/* ボード上での表示スタイル */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-300">ボード上での表示スタイル</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSettingsUseImage(true)}
                      className={`flex-1 min-w-[120px] flex items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 text-xs ${
                        settingsUseImage
                          ? "border-cyan-500 text-cyan-300 bg-cyan-500/10"
                          : "border-white/10 text-gray-300 hover:border-cyan-500/60 hover:bg-white/5"
                      }`}
                    >
                      <ImageIcon className="w-3.5 h-3.5" aria-hidden />
                      <span>カスタム画像</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettingsUseImage(false)}
                      className={`flex-1 min-w-[120px] flex items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 text-xs ${
                        !settingsUseImage
                          ? "border-cyan-500 text-cyan-300 bg-cyan-500/10"
                          : "border-white/10 text-gray-300 hover:border-cyan-500/60 hover:bg-white/5"
                      }`}
                    >
                      <SettingsIcon className="w-3.5 h-3.5" aria-hidden />
                      <span>アイコン</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-500">
                    カスタム画像では登録した写真が、アイコンでは下のアイコン設定が使われます。
                  </p>

                  {settingsUseImage && settingsHasImage && (() => {
                    const currentImageUrl =
                      settingsTarget?.kind === "sidebar"
                        ? (settingsGearOverride?.id === settingsTarget.id
                            ? settingsGearOverride.imageUrl ?? undefined
                            : undefined) ??
                          sidebarGears.find((g) => g.id === settingsTarget.id)?.imageUrl
                        : settingsTarget?.kind === "node"
                          ? (settingsGearOverride?.id && settingsGearOverride?.id === settingsLoadFromGearId
                              ? settingsGearOverride.imageUrl ?? undefined
                              : undefined) ??
                            (settingsLoadFromGearId
                              ? sidebarGears.find((g) => g.id === settingsLoadFromGearId)?.imageUrl
                              : undefined) ??
                            (nodes.find((n) => n.id === settingsTarget.id)?.data as PedalNodeData | undefined)?.imageUrl
                          : undefined;
                    return (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs text-gray-400">登録されている画像</p>
                        <div className="relative w-20 h-20 rounded-lg border border-white/10 overflow-hidden bg-white/5 flex items-center justify-center">
                          {currentImageUrl ? (
                            <img
                              src={currentImageUrl}
                              alt=""
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <ImageIcon className="w-6 h-6 text-gray-500" aria-hidden />
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              let gearId: string | null = null;
                              if (settingsTarget?.kind === "sidebar") {
                                gearId = settingsTarget.id;
                              } else if (settingsTarget?.kind === "node") {
                                const nodeData = nodes.find((n) => n.id === settingsTarget.id)?.data as PedalNodeData | undefined;
                                gearId = nodeData?.sourceGearId ?? null;

                                // 旧データで `sourceGearId` が無い場合があるので、見た目/属性から推定
                                if (!gearId && nodeData) {
                                  const imageUrl = nodeData.imageUrl?.trim() ?? "";
                                  if (imageUrl) {
                                    const byImage = sidebarGears.find((g) => g.imageUrl?.trim() === imageUrl);
                                    if (byImage) gearId = byImage.id;
                                  }
                                  if (!gearId) {
                                    const name = nodeData.label?.trim() ?? "";
                                    const byName = sidebarGears.find((g) => g.name?.trim() === name);
                                    if (byName) gearId = byName.id;
                                  }
                                  if (!gearId && nodeData.iconKey) {
                                    const byIcon = sidebarGears.find(
                                      (g) => g.iconKey === nodeData.iconKey && (g.effectType ?? "") === (nodeData.effectType ?? ""),
                                    );
                                    if (byIcon) gearId = byIcon.id;
                                  }
                                }
                              }

                              setGeneratorInitialGearId(gearId);
                              if (settingsTarget) {
                                setPendingSettingsTarget(settingsTarget);
                                setSettingsTarget(null);
                              }
                              setTimeout(() => setShowGenerator(true), 0);
                            }}
                            className="w-full py-2 text-center text-xs font-bold rounded-md bg-transparent border border-cyan-500 text-cyan-500 hover:bg-cyan-500/10 transition-colors flex items-center justify-center gap-1.5"
                          >
                            <PlusCircle className="w-4 h-4" aria-hidden />
                            <span>画像を新しく設定し直す</span>
                          </button>
                          {settingsTarget?.kind === "sidebar" && (
                            <button
                              type="button"
                              onClick={() => handleDeleteCustomImage(settingsTarget.id)}
                              disabled={isDeletingImage}
                              className="w-full py-2 text-center text-xs font-medium rounded-md bg-transparent border border-red-500/70 text-red-400 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                              {isDeletingImage ? (
                                <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                              ) : (
                                <Trash2 className="w-4 h-4" aria-hidden />
                              )}
                              <span>このカスタム画像を削除する（標準アイコンに戻す）</span>
                            </button>
                          )}
                          {settingsTarget?.kind === "node" && (
                            <button
                              type="button"
                              onClick={() => {
                                const nodeData = nodes.find((n) => n.id === settingsTarget.id)?.data as PedalNodeData | undefined;
                                const gearId = settingsLoadFromGearId || nodeData?.sourceGearId || "";
                                void handleDeleteCustomImage(gearId, { nodeId: settingsTarget.id });
                              }}
                              disabled={isDeletingImage}
                              className="w-full py-2 text-center text-xs font-medium rounded-md bg-transparent border border-red-500/70 text-red-400 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                              {isDeletingImage ? (
                                <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                              ) : (
                                <Trash2 className="w-4 h-4" aria-hidden />
                              )}
                              <span>このカスタム画像を削除する（標準アイコンに戻す）</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {settingsUseImage && !settingsHasImage && (
                    <div className="mt-3 rounded-lg border border-dashed border-white/20 bg-white/5 p-4 space-y-3">
                      <p className="text-center text-xs text-gray-400">
                        画像が未設定です。お気に入りの機材写真を登録して、リアルなボードを作りましょう！
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          void (async () => {
                            if (!settingsTarget) {
                              setShowGenerator(true);
                              return;
                            }

                            // 新規機材（kind:new）の場合は、先に機材を作成してから画像ジェネレーターを開く
                            if (settingsTarget.kind === "new") {
                              if (!user) {
                                alert("ログイン後に機材を追加できます。");
                                return;
                              }

                              const token = await user.getIdToken();
                              if (typeof token !== "string" || !token || token === "undefined" || token === "null") {
                                alert("認証トークンを取得できませんでした。再ログインしてください。");
                                return;
                              }

                              const finalEffectType =
                                settingsEffectType === "other" ? settingsEffectTypeOther.trim() : settingsEffectType;

                              const res = await fetch("/api/user/gears", {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                  Authorization: `Bearer ${token}`,
                                },
                                body: JSON.stringify({
                                  name: settingsName.trim() || "無題の機材",
                                  category: "ギターエフェクター",
                                  effectorType: finalEffectType || null,
                                  imageUrl: null,
                                  defaultIcon: settingsIconKey ?? "effects",
                                }),
                              });

                              if (!res.ok) {
                                const data = await res.json().catch(() => ({}));
                                toast.error((data as { error?: string }).error ?? "機材の作成に失敗しました");
                                return;
                              }

                              const item = (await res.json()) as UserGearItem;
                              const mapped = mapGearDataToSidebarGear(item);

                              setSidebarGears((gears) => gears.concat(mapped));

                              setGeneratorInitialGearId(mapped.id);
                              setPendingSettingsTarget({ kind: "sidebar", id: mapped.id, name: mapped.name });
                              setSettingsTarget(null);
                              setTimeout(() => setShowGenerator(true), 0);
                              return;
                            }

                            let gearId: string | null = null;
                            if (settingsTarget.kind === "sidebar") {
                              gearId = settingsTarget.id;
                            } else if (settingsTarget.kind === "node") {
                              const nodeData = nodes.find((n) => n.id === settingsTarget.id)?.data as PedalNodeData | undefined;
                              gearId = nodeData?.sourceGearId ?? null;

                              // 旧データで `sourceGearId` が無い場合があるので、見た目/属性から推定
                              if (!gearId && nodeData) {
                                const imageUrl = nodeData.imageUrl?.trim() ?? "";
                                if (imageUrl) {
                                  const byImage = sidebarGears.find((g) => g.imageUrl?.trim() === imageUrl);
                                  if (byImage) gearId = byImage.id;
                                }
                                if (!gearId) {
                                  const name = nodeData.label?.trim() ?? "";
                                  const byName = sidebarGears.find((g) => g.name?.trim() === name);
                                  if (byName) gearId = byName.id;
                                }
                                if (!gearId && nodeData.iconKey) {
                                  const byIcon = sidebarGears.find(
                                    (g) => g.iconKey === nodeData.iconKey && (g.effectType ?? "") === (nodeData.effectType ?? ""),
                                  );
                                  if (byIcon) gearId = byIcon.id;
                                }
                              }
                            }

                            setGeneratorInitialGearId(gearId);
                            setPendingSettingsTarget(settingsTarget);
                            setSettingsTarget(null);
                            setTimeout(() => setShowGenerator(true), 0);
                          })();
                        }}
                        className="w-full py-2.5 text-center text-xs font-medium rounded-md bg-cyan-500/10 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20 transition-colors flex items-center justify-center gap-2"
                      >
                        <Camera className="w-4 h-4" aria-hidden />
                        <span>画像を追加する（AI自動切り抜き）</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* アイコン選択（シンプルアイコン表示時のみ） */}
                {!settingsUseImage && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-300">表示するアイコン</p>
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          { key: "guitar" as const, label: "ギター・ベース" },
                          { key: "effects" as const, label: "エフェクター" },
                          { key: "switcher" as const, label: "スイッチャー" },
                          { key: "amp" as const, label: "アンプ" },
                          { key: "other" as const, label: "その他" },
                        ] as const
                      ).map((opt) => {
                        const Icon = getGearIconComponent(opt.key);
                        return (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => setSettingsIconKey(opt.key)}
                            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs ${
                              settingsIconKey === opt.key
                                ? "border-cyan-500 text-cyan-300 bg-cyan-500/10"
                                : "border-white/10 text-gray-300 hover:border-cyan-500/60 hover:bg-white/5"
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" aria-hidden />
                            <span>{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* エフェクターの種類 */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-300">エフェクターの種類</p>
                  <select
                    value={settingsEffectType}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSettingsEffectType(value);
                      const defaultIcon = effectTypeToIconKey(value);
                      if (defaultIcon) setSettingsIconKey(defaultIcon);
                    }}
                    className="w-full rounded-md border border-surface-border bg-surface-card px-3 py-2 text-xs text-gray-100 focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="">選択しない</option>
                    {EFFECT_TYPE_ORDER.map((value) => (
                      <option key={value} value={value}>
                        {value === "other" ? "その他（自由入力）" : EFFECT_TYPE_LABELS[value]}
                      </option>
                    ))}
                  </select>
                  {settingsEffectType === "other" && (
                    <div className="mt-2">
                      <input
                        type="text"
                        value={settingsEffectTypeOther}
                        onChange={(e) => setSettingsEffectTypeOther(e.target.value)}
                        placeholder="例: ビットクラッシャー"
                        className="w-full rounded-md border border-surface-border bg-surface-card px-3 py-2 text-xs text-gray-100 focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                  )}
                </div>

                {/* 端子（ループ）数：スイッチャー / ジャンクションボックスのみ表示 */}
                {(settingsIconKey === "switcher" ||
                  settingsEffectType === "switcher" ||
                  settingsEffectType === "junction_box") && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-300">端子（ループ）数</p>
                    <input
                      type="number"
                      min={LOOP_COUNT_MIN}
                      max={LOOP_COUNT_MAX}
                      value={settingsLoopCount}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (!Number.isNaN(v))
                          setSettingsLoopCount(Math.min(LOOP_COUNT_MAX, Math.max(LOOP_COUNT_MIN, v)));
                      }}
                      className="w-full rounded-md border border-surface-border bg-surface-card px-3 py-2 text-xs text-gray-100 focus:ring-2 focus:ring-cyan-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <p className="text-[10px] text-gray-500">
                      {LOOP_COUNT_MIN}〜{LOOP_COUNT_MAX}の範囲で指定。配線を分散して見やすくします。
                    </p>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 text-center font-bold rounded-md bg-transparent border border-cyan-500 text-cyan-500 hover:bg-cyan-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? "保存中..." : "設定を保存"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      </div>
    </NodeSettingsContext.Provider>
  );
}

export type BoardFlowEditorProps = {
  initialBoardId?: string | null;
  initialName?: string | null;
  initialNodes?: Node<PedalNodeData>[] | null;
  initialEdges?: Edge[] | null;
  initialActualPhotoUrl?: string | null;
};

export function BoardFlowEditor({
  initialBoardId,
  initialName,
  initialNodes,
  initialEdges,
  initialActualPhotoUrl,
}: BoardFlowEditorProps = {}) {
  return (
    <ReactFlowProvider>
      <BoardFlowEditorInner
        initialBoardId={initialBoardId}
        initialName={initialName}
        initialNodes={initialNodes}
        initialEdges={initialEdges}
        initialActualPhotoUrl={initialActualPhotoUrl}
      />
    </ReactFlowProvider>
  );
}


