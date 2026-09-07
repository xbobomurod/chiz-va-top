
CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'lobby',
  phase text NOT NULL DEFAULT 'waiting',
  max_players int NOT NULL DEFAULT 10,
  total_rounds int NOT NULL DEFAULT 3,
  round_duration int NOT NULL DEFAULT 80,
  difficulty text NOT NULL DEFAULT 'easy',
  category text,
  current_round int NOT NULL DEFAULT 0,
  turn_index int NOT NULL DEFAULT 0,
  turn_order uuid[] NOT NULL DEFAULT '{}',
  current_drawer_id uuid,
  phase_ends_at timestamptz,
  word_mask text,
  word_length int,
  reveal_word text,
  host_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.rooms TO anon, authenticated;
GRANT ALL ON public.rooms TO service_role;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rooms readable by everyone" ON public.rooms FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.room_secrets (
  room_id uuid PRIMARY KEY REFERENCES public.rooms(id) ON DELETE CASCADE,
  word text,
  choices text[] NOT NULL DEFAULT '{}',
  turn_started_at timestamptz,
  correct_count int NOT NULL DEFAULT 0
);
GRANT ALL ON public.room_secrets TO service_role;
ALTER TABLE public.room_secrets ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  nickname text NOT NULL,
  score int NOT NULL DEFAULT 0,
  round_score int NOT NULL DEFAULT 0,
  is_host boolean NOT NULL DEFAULT false,
  connected boolean NOT NULL DEFAULT true,
  has_guessed boolean NOT NULL DEFAULT false,
  last_seen timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX players_room_nickname_key ON public.players (room_id, lower(nickname));
GRANT SELECT ON public.players TO anon, authenticated;
GRANT ALL ON public.players TO service_role;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "players readable by everyone" ON public.players FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.player_tokens (
  player_id uuid PRIMARY KEY REFERENCES public.players(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE
);
GRANT ALL ON public.player_tokens TO service_role;
ALTER TABLE public.player_tokens ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  player_id uuid REFERENCES public.players(id) ON DELETE SET NULL,
  nickname text,
  content text NOT NULL,
  kind text NOT NULL DEFAULT 'guess',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX chat_messages_room_idx ON public.chat_messages (room_id, created_at);
GRANT SELECT ON public.chat_messages TO anon, authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat readable by everyone" ON public.chat_messages FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.strokes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  turn_key text NOT NULL,
  player_id uuid,
  seq bigserial,
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX strokes_room_turn_idx ON public.strokes (room_id, turn_key, seq);
GRANT SELECT ON public.strokes TO anon, authenticated;
GRANT ALL ON public.strokes TO service_role;
ALTER TABLE public.strokes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "strokes readable by everyone" ON public.strokes FOR SELECT TO anon, authenticated USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.strokes;
ALTER TABLE public.rooms REPLICA IDENTITY FULL;
ALTER TABLE public.players REPLICA IDENTITY FULL;
