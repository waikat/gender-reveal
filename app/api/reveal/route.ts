import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

// Solo lectura: devuelve lo que el admin haya guardado (color y/o la fecha
// del countdown), o null en cada uno si todavía no se cargó nada.
export async function GET() {
  const { data } = await supabaseServer
    .from("gender_reveal")
    .select("color, reveal_at")
    .eq("id", 1)
    .maybeSingle();

  return NextResponse.json({
    color: data?.color ?? null,
    revealAt: data?.reveal_at ?? null,
  });
}
