import { BRUSH_SIZES, PALETTE, type Tool } from "@/lib/drawing";

interface Props {
  color: string;
  size: number;
  tool: Tool;
  onColor: (color: string) => void;
  onSize: (size: number) => void;
  onTool: (tool: Tool) => void;
  onUndo: () => void;
  onClear: () => void;
}

export function Toolbar({ color, size, tool, onColor, onSize, onTool, onUndo, onClear }: Props) {
  return (
    <div className="mt-2 flex shrink-0 flex-wrap items-center justify-center gap-x-2 gap-y-1.5 rounded-xl bg-inkdeep/40 p-1.5 outline-1 outline-white/10 lg:mt-3 lg:justify-start lg:gap-3 lg:p-3">
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          aria-label="Qalam"
          onClick={() => onTool("pen")}
          className={`grid size-8 shrink-0 place-items-center rounded-lg text-sm font-bold lg:size-9 ${
            tool === "pen" ? "bg-cream text-inkdeep" : "bg-white/5 text-cream outline-1 outline-white/10"
          }`}
        >
          ✎
        </button>
        <button
          type="button"
          aria-label="O‘chirg‘ich"
          onClick={() => onTool("eraser")}
          className={`grid size-8 shrink-0 place-items-center rounded-lg text-sm font-bold lg:size-9 ${
            tool === "eraser" ? "bg-cream text-inkdeep" : "bg-white/5 text-cream outline-1 outline-white/10"
          }`}
        >
          ⌫
        </button>
        <button
          type="button"
          aria-label="Bo‘yash"
          title="Bo‘yash — yopiq maydonni ranglaydi"
          onClick={() => onTool("fill")}
          className={`grid size-8 shrink-0 place-items-center rounded-lg text-sm font-bold lg:size-9 ${
            tool === "fill" ? "bg-cream text-inkdeep" : "bg-white/5 text-cream outline-1 outline-white/10"
          }`}
        >
          🪣
        </button>
        <button
          type="button"
          onClick={onUndo}
          className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/5 text-cream outline-1 outline-white/10 lg:size-9"
          aria-label="Orqaga"
        >
          ↺
        </button>
        <button
          type="button"
          onClick={onClear}
          aria-label="Tozalash"
          className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/5 text-cream outline-1 outline-white/10 lg:h-9 lg:w-auto lg:px-3 lg:text-xs"
        >
          <span className="lg:hidden">🗑</span>
          <span className="hidden lg:inline">Tozalash</span>
        </button>
      </div>

      <span className="hidden h-6 w-px shrink-0 bg-white/10 lg:block" />

      <div className="grid shrink-0 grid-flow-col grid-rows-2 gap-1.5 lg:flex lg:flex-wrap lg:grid-rows-1">
        {PALETTE.map((value) => (
          <button
            key={value}
            type="button"
            aria-label={`Rang ${value}`}
            onClick={() => {
              onColor(value);
              if (tool === "eraser") onTool("pen");
            }}
            style={{ backgroundColor: value }}
            className={`size-6 shrink-0 rounded-full ${
              color === value && tool !== "eraser" ? "outline-2 outline-offset-2 outline-cream/60" : ""
            }`}
          />
        ))}
      </div>

      <span className="hidden h-6 w-px shrink-0 bg-white/10 lg:block" />

      <div className="flex shrink-0 items-center gap-2">
        <span className="hidden text-[11px] uppercase tracking-wider text-cream/45 lg:inline">
          O‘lcham
        </span>
        <div className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white/5 p-1 outline-1 outline-white/10">
          {BRUSH_SIZES.map((value) => (
            <button
              key={value}
              type="button"
              aria-label={`O‘lcham ${value}`}
              onClick={() => onSize(value)}
              className={`grid size-7 shrink-0 place-items-center rounded-md ${size === value ? "bg-cream" : ""}`}
            >
              <span
                className={`rounded-full ${size === value ? "bg-inkdeep" : "bg-cream/70"}`}
                style={{ width: value / 2 + 4, height: value / 2 + 4 }}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
