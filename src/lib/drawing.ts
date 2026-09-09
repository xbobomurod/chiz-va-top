/** Shared drawing types + rendering (client-safe). */

export type Tool = "pen" | "eraser" | "fill";

export interface Stroke {
  color: string;
  size: number;
  tool: Tool;
  points: [number, number][];
}

export const PALETTE = [
  "#f6efe0",
  "#0a1822",
  "#ff5a3c",
  "#ffb02e",
  "#2f9e8f",
  "#55a7d6",
  "#8b5cf6",
  "#e0518f",
  "#7cc243",
  "#8a5a2b",
];

export const BRUSH_SIZES = [4, 10, 22];

export function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  width: number,
  height: number,
) {
  if (stroke.points.length === 0) return;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = (stroke.size / 800) * width;
  if (stroke.tool === "eraser") {
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "rgba(0,0,0,1)";
    ctx.lineWidth = ((stroke.size * 2.2) / 800) * width;
  } else {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = stroke.color;
  }

  ctx.beginPath();
  const [first, ...rest] = stroke.points;
  ctx.moveTo(first![0] * width, first![1] * height);
  if (rest.length === 0) {
    ctx.lineTo(first![0] * width + 0.01, first![1] * height);
  }
  for (const [x, y] of rest) ctx.lineTo(x * width, y * height);
  ctx.stroke();
  ctx.restore();
}
