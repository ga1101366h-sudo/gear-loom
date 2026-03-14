"use client";

import type { EdgeProps } from "@xyflow/react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
} from "@xyflow/react";
import { useMemo } from "react";
import { X as XIcon } from "lucide-react";

/** エッジごとの微細なズラシ（数px）。自然なケーブル感を出すための最小オフセット */
const OFFSET_PX_RANGE = 7; // -3 〜 +3 px

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * getBezierPath で得たパス文字列に、数pxの垂直オフセットを加えて微調整する。
 * 端子分散後もわずかな重なり回避と自然な垂れ下がりを優先。
 */
function applyMinimalOffsetToPath(
  path: string,
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  offsetPx: number
): string {
  const match = path.match(/^M([^,]+),([^,]+) C([^,]+),([^\s]+) ([^,]+),([^\s]+) ([^,]+),([^]+)$/);
  if (!match) return path;
  const [, , , scx, scy, tcx, tcy] = match.map(Number);
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const len = Math.hypot(dx, dy) || 1;
  const perpX = -dy / len;
  const perpY = dx / len;
  const scx2 = scx + perpX * offsetPx;
  const scy2 = scy + perpY * offsetPx;
  const tcx2 = tcx + perpX * offsetPx;
  const tcy2 = tcy + perpY * offsetPx;
  return `M${sourceX},${sourceY} C${scx2},${scy2} ${tcx2},${tcy2} ${targetX},${targetY}`;
}

/**
 * 標準 getBezierPath をベースに、数pxだけズラした曲線エッジ。
 * スイッチャーのマルチ端子化で終点が分散するため、過度なオフセットは行わない。
 */
export function CustomLoopEdge(props: EdgeProps) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style,
    markerEnd,
    selected,
  } = props;

  const { setEdges } = useReactFlow();

  const { path, labelX, labelY } = useMemo(() => {
    const [basePath, baseLabelX, baseLabelY] = getBezierPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
    });
    const offsetPx = (hashString(id) % OFFSET_PX_RANGE) - (OFFSET_PX_RANGE - 1) / 2;
    const pathStr =
      offsetPx === 0
        ? basePath
        : applyMinimalOffsetToPath(basePath, sourceX, sourceY, targetX, targetY, offsetPx);
    return {
      path: pathStr,
      labelX: baseLabelX,
      labelY: baseLabelY,
    };
  }, [
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  ]);

  const onDelete = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setEdges((eds) => eds.filter((e) => e.id !== id));
  };

  return (
    <>
      <BaseEdge id={id} path={path} style={style} markerEnd={markerEnd} />
      <EdgeLabelRenderer>
        {selected && (
          <button
            type="button"
            onClick={onDelete}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto flex items-center justify-center w-6 h-6 bg-red-500 text-white rounded-full hover:bg-red-600 hover:scale-110 cursor-pointer shadow-md z-50"
            style={{ left: labelX, top: labelY }}
            aria-label="この配線を削除"
          >
            <XIcon className="w-3.5 h-3.5" aria-hidden />
          </button>
        )}
      </EdgeLabelRenderer>
    </>
  );
}
