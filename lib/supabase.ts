import { createClient } from "@supabase/supabase-js";

// Usa la Service Role Key SOLO en el servidor (API routes), nunca en el cliente.
export const supabaseServer = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
