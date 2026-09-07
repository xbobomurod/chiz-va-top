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
    <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-inkdeep/40 p-3 outline-1 outline-white/10">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Qalam"
          onClick={() => onTool("pen")}
          className={`grid size-9 place-items-center rounded-lg text-sm font-bold ${
            tool === "pen" ? "bg-cream text-inkdeep" : "bg-white/5 text-cream outline-1 outline-white/10"
          }`}
        >
          ✎
        </button>
        <button
          type="button"
          aria-label="O‘chirg‘ich"
          onClick={() => onTool("eraser")}
          className={`grid size-9 place-items-center rounded-lg text-sm font-bold ${
            tool === "eraser" ? "bg-cream text-inkdeep" : "bg-white/5 text-cream outline-1 outline-white/10"
          }`}
        >
          ⌫
        </button>
        <button
          type="button"
          onClick={onUndo}
          className="grid size-9 place-items-center rounded-lg bg-white/5 text-cream outline-1 outline-white/10"
          aria-label="Orqaga"
        >
          ↺
        </button>
        <button
          type="button"
          onClick={onClear}
          className="grid h-9 place-items-center rounded-lg bg-white/5 px-3 text-xs text-cream outline-1 outline-white/10"
        >
          Tozalash
        </button>
      </div>

      <span className="hidden h-6 w-px bg-white/10 sm:block" />

      <div className="flex flex-wrap items-center gap-1.5">
        {PALETTE.map((value) => (
          <button
            key={value}
            type="button"
            aria-label={`Rang ${value}`}
            onClick={() => {
              onColor(value);
              onTool("pen");
            }}
            style={{ backgroundColor: value }}
            className={`size-6 rounded-full ${
              color === value && tool === "pen" ? "outline-2 outline-offset-2 outline-cream/60" : ""
            }`}
          />
        ))}
      </div>

      <span className="hidden h-6 w-px bg-white/10 sm:block" />

      <div className="flex items-center gap-2">
        <span className="text-[11px] uppercase tracking-wider text-cream/45">O‘lcham</span>
        <div className="flex items-center gap-1.5 rounded-lg bg-white/5 p-1 outline-1 outline-white/10">
          {BRUSH_SIZES.map((value) => (
            <button
              key={value}
              type="button"
              aria-label={`O‘lcham ${value}`}
              onClick={() => onSize(value)}
              className={`grid size-7 place-items-center rounded-md ${size === value ? "bg-cream" : ""}`}
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
