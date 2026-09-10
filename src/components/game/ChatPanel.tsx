import { useEffect, useRef, useState } from "react";
import type { ChatMessage, PlayerState } from "@/hooks/useRoomState";
import { Avatar } from "./Avatar";

interface Props {
  messages: ChatMessage[];
  disabled: boolean;
  placeholder: string;
  onSend: (text: string) => void;
  players?: PlayerState[];
  mutedIds?: string[];
}

const TONES = ["bg-coral", "bg-gold", "bg-teal", "bg-sky", "bg-cream"];

function toneFor(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.codePointAt(0)!) % 9973;
  return TONES[hash % TONES.length];
}

export function ChatPanel({
  messages,
  disabled,
  placeholder,
  onSend,
  players = [],
  mutedIds = [],
}: Props) {
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);

  /* scroll only the message list, never the page */
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    onSend(value);
    setText("");
  }

  return (
    <div className="panel flex h-full min-h-0 flex-col p-3 lg:p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-cream/50">
        Topish suhbati
      </h3>
      <div
        ref={listRef}
        className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-1 lg:mt-3"
      >
        {messages
          .filter((m) => !(m.player_id && mutedIds.includes(m.player_id) && m.kind === "guess"))
          .map((message) => {
          if (message.kind === "system" || message.kind === "close") {
            return (
              <p key={message.id} className="popin px-1 text-xs italic text-cream/50">
                {message.content}
              </p>
            );
          }
          if (message.kind === "correct") {
            return (
              <div
                key={message.id}
                className="popin rounded-xl rounded-tl-sm bg-teal/15 p-2.5 outline-1 outline-teal/30"
              >
                <p className="text-sm font-semibold text-teal">{message.content}</p>
              </div>
            );
          }
          const name = message.nickname ?? "?";
          const author = players.find((p) => p.id === message.player_id);
          return (
            <div key={message.id} className="popin flex items-start gap-2">
              {author ? (
                <Avatar avatar={author.avatar} size={28} className="mt-0.5" title={name} />
              ) : (
                <span
                  className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg font-display text-xs font-extrabold text-inkdeep ${toneFor(name)}`}
                >
                  {name.slice(0, 1).toLocaleUpperCase("uz")}
                </span>
              )}
              <div className="min-w-0 flex-1 rounded-xl rounded-tl-sm bg-white/5 p-2.5">
                <p className="truncate text-[11px] font-semibold text-gold">{name}</p>
                <p className="text-sm break-words text-cream/80">{message.content}</p>
              </div>
            </div>
          );
        })}
      </div>
      <form
        onSubmit={submit}
        className="mt-2 flex shrink-0 items-center gap-2 rounded-xl bg-inkdeep/50 p-1.5 outline-1 outline-white/10 lg:mt-3"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled}
          maxLength={120}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-cream outline-none placeholder:text-cream/40 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled}
          className="rounded-lg bg-coral px-3 py-2 text-xs font-semibold text-inkdeep outline-1 outline-coral/60 disabled:opacity-40"
        >
          Yuborish
        </button>
      </form>
    </div>
  );
}
