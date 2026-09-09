ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS avatar jsonb NOT NULL DEFAULT '{"color":0,"eyes":0,"mouth":0,"hat":0}'::jsonb,
  ADD COLUMN IF NOT EXISTS kicked boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.votekicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  voter_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, target_id, voter_id)
);

GRANT ALL ON public.votekicks TO service_role;
ALTER TABLE public.votekicks ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, target_id, reporter_id)
);

GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;