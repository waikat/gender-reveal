import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

// Ruta de administración: guarda/cambia/borra el color y/o la fecha del
// countdown. Protegida por una contraseña simple (ADMIN_PASSWORD), suficiente
// para un link privado familiar, no para uso público masivo.
//
// Body acepta { password, color? , revealAt? }. Cada campo es independiente:
// si no lo mandás, no se toca. Para borrar un campo, mandalo explícitamente
// en null.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  if (!body || typeof body.password !== "string") {
    return NextResponse.json({ error: "Falta la contraseña" }, { status: 400 });
  }

  if (body.password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
  }

  const hasColor = Object.prototype.hasOwnProperty.call(body, "color");
  const hasRevealAt = Object.prototype.hasOwnProperty.call(body, "revealAt");

  if (!hasColor && !hasRevealAt) {
    return NextResponse.json({ error: "Nada para actualizar" }, { status: 400 });
  }

  if (hasColor && body.color !== null && body.color !== "pink" && body.color !== "blue") {
    return NextResponse.json({ error: "Color inválido" }, { status: 400 });
  }

  const { data: existing } = await supabaseServer
    .from("gender_reveal")
    .select("color, reveal_at")
    .eq("id", 1)
    .maybeSingle();

  const next = {
    id: 1,
    color: hasColor ? body.color : existing?.color ?? null,
    reveal_at: hasRevealAt ? body.revealAt : existing?.reveal_at ?? null,
  };

  const { error } = await supabaseServer
    .from("gender_reveal")
    .upsert(next, { onConflict: "id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, color: next.color, revealAt: next.reveal_at });
}
