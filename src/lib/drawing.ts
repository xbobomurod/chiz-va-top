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

  if (stroke.tool === "fill") {
    const [px, py] = stroke.points[0]!;
    floodFill(ctx, Math.round(px * width), Math.round(py * height), stroke.color, width, height);
    ctx.restore();
    return;
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

/** Classic flood fill: paints the enclosed area around (x, y) with `color`. */
function floodFill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  width: number,
  height: number,
) {
  if (x < 0 || y < 0 || x >= width || y >= height) return;
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  const start = (y * width + x) * 4;
  const tr = data[start]!;
  const tg = data[start + 1]!;
  const tb = data[start + 2]!;
  const ta = data[start + 3]!;

  const tmp = document.createElement("canvas");
  tmp.width = tmp.height = 1;
  const tctx = tmp.getContext("2d")!;
  tctx.fillStyle = color;
  tctx.fillRect(0, 0, 1, 1);
  const [fr, fg, fb] = tctx.getImageData(0, 0, 1, 1).data;

  if (tr === fr && tg === fg && tb === fb && ta === 255) return;

  const matches = (i: number) =>
    data[i] === tr && data[i + 1] === tg && data[i + 2] === tb && data[i + 3] === ta;

  const stack: number[] = [x, y];
  while (stack.length) {
    const cy = stack.pop()!;
    const cx = stack.pop()!;
    let idx = (cy * width + cx) * 4;
    if (!matches(idx)) continue;
    let lx = cx;
    while (lx >= 0 && matches((cy * width + lx) * 4)) lx--;
    lx++;
    let rx = cx;
    while (rx < width && matches((cy * width + rx) * 4)) rx++;
    rx--;
    for (let ix = lx; ix <= rx; ix++) {
      idx = (cy * width + ix) * 4;
      data[idx] = fr!;
      data[idx + 1] = fg!;
      data[idx + 2] = fb!;
      data[idx + 3] = 255;
    }
    for (let ix = lx; ix <= rx; ix++) {
      if (cy > 0 && matches(((cy - 1) * width + ix) * 4)) stack.push(ix, cy - 1);
      if (cy < height - 1 && matches(((cy + 1) * width + ix) * 4)) stack.push(ix, cy + 1);
    }
  }
  ctx.putImageData(image, 0, 0);
}
