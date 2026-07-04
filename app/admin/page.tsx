"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

type ResultColor = "pink" | "blue";

const BG_DARK = "#000000";
const CARD_DARK = "#1C1C1E";
const BLUE = "#0A84FF";
const PINK = "#FF375F";
const HAIRLINE = "rgba(255,255,255,0.12)";
const IOS_EASE = [0.32, 0.72, 0, 1] as const;

// Convierte un ISO string (UTC) al formato que espera <input type="datetime-local">,
// respetando la hora local del navegador.
function isoToLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [current, setCurrent] = useState<ResultColor | null>(null);
  const [revealAtInput, setRevealAtInput] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fetchCurrent = useCallback(async () => {
    try {
      const res = await fetch("/api/reveal");
      const data = (await res.json()) as { color: ResultColor | null; revealAt: string | null };
      setCurrent(data.color);
      setRevealAtInput(isoToLocalInputValue(data.revealAt));
    } catch {
      // silencioso, no es crítico
    }
  }, []);

  useEffect(() => {
    if (authed) fetchCurrent();
  }, [authed, fetchCurrent]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setBusy(true);
    try {
      // Confirmamos la contraseña pidiendo el estado actual (GET, público)
      // y probando un guardado "inofensivo" que no cambia nada: mandamos el
      // mismo revealAt que ya está, solo para validar la contraseña.
      const res = await fetch("/api/reveal");
      const data = (await res.json()) as { color: ResultColor | null; revealAt: string | null };
      const check = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, revealAt: data.revealAt }),
      });
      if (!check.ok) {
        const err = (await check.json()) as { error?: string };
        setAuthError(err.error || "Contraseña incorrecta");
        setBusy(false);
        return;
      }
      setCurrent(data.color);
      setRevealAtInput(isoToLocalInputValue(data.revealAt));
      setAuthed(true);
    } catch {
      setAuthError("No se pudo conectar. Probá de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  const setColor = async (color: ResultColor | null) => {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, color }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        setStatus(err.error || "Algo salió mal");
        return;
      }
      const data = (await res.json()) as { color: ResultColor | null };
      setCurrent(data.color);
      setStatus(
        data.color === null
          ? "Resultado borrado. La app está lista para reusar."
          : "Guardado. Quien abra el link ya ve este resultado."
      );
    } catch {
      setStatus("No se pudo guardar. Probá de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  const saveRevealAt = async () => {
    if (!revealAtInput) return;
    setBusy(true);
    setStatus(null);
    try {
      const iso = new Date(revealAtInput).toISOString();
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, revealAt: iso }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        setStatus(err.error || "Algo salió mal");
        return;
      }
      setStatus("Fecha guardada. Los invitados van a ver la cuenta regresiva.");
    } catch {
      setStatus("No se pudo guardar. Probá de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  const clearRevealAt = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, revealAt: null }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        setStatus(err.error || "Algo salió mal");
        return;
      }
      setRevealAtInput("");
      setStatus("Cuenta regresiva quitada.");
    } catch {
      setStatus("No se pudo guardar. Probá de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  if (!authed) {
    return (
      <main
        className="h-full w-full flex items-center justify-center px-6"
        style={{ backgroundColor: BG_DARK }}
      >
        <motion.form
          onSubmit={handleLogin}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: IOS_EASE }}
          className="w-full max-w-xs text-center"
        >
          <div className="text-3xl mb-3">🔒</div>
          <h1 className="ios-large-title text-white mb-1">Admin</h1>
          <p className="ios-footnote mb-6" style={{ color: "rgba(255,255,255,0.5)" }}>
            Panel privado para cargar el resultado
          </p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            className="w-full rounded-[12px] px-4 py-3 mb-3 ios-body outline-none"
            style={{ backgroundColor: CARD_DARK, color: "white", border: `0.5px solid ${HAIRLINE}` }}
          />
          {authError && (
            <p className="ios-footnote mb-3" style={{ color: PINK }}>
              {authError}
            </p>
          )}
          <motion.button
            type="submit"
            disabled={busy || !password}
            whileTap={{ scale: 0.96 }}
            className="w-full ios-body font-semibold rounded-full px-6 py-3 disabled:opacity-50"
            style={{ backgroundColor: BLUE, color: "white" }}
          >
            {busy ? "Entrando..." : "Entrar"}
          </motion.button>
          <Link
            href="/"
            className="ios-footnote block mt-6"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            ← Volver al inicio
          </Link>
        </motion.form>
      </main>
    );
  }

  return (
    <main
      className="h-full w-full flex items-center justify-center px-6 py-10 overflow-y-auto"
      style={{ backgroundColor: BG_DARK }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: IOS_EASE }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <h1 className="ios-large-title text-white mb-2">Resultado</h1>
          <p className="ios-footnote" style={{ color: "rgba(255,255,255,0.5)" }}>
            Estado actual:{" "}
            <span style={{ color: "white" }}>
              {current === "pink" ? "Niña 💗" : current === "blue" ? "Niño 💙" : "Sin definir"}
            </span>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <motion.button
            onClick={() => setColor("pink")}
            disabled={busy}
            whileTap={{ scale: 0.96 }}
            className="ios-body font-semibold rounded-[16px] py-6 disabled:opacity-50"
            style={{
              backgroundColor: current === "pink" ? PINK : CARD_DARK,
              color: "white",
              border: `0.5px solid ${HAIRLINE}`,
            }}
          >
            💗
            <div className="mt-1">Niña</div>
          </motion.button>
          <motion.button
            onClick={() => setColor("blue")}
            disabled={busy}
            whileTap={{ scale: 0.96 }}
            className="ios-body font-semibold rounded-[16px] py-6 disabled:opacity-50"
            style={{
              backgroundColor: current === "blue" ? BLUE : CARD_DARK,
              color: "white",
              border: `0.5px solid ${HAIRLINE}`,
            }}
          >
            💙
            <div className="mt-1">Niño</div>
          </motion.button>
        </div>

        <motion.button
          onClick={() => setColor(null)}
          disabled={busy || current === null}
          whileTap={{ scale: 0.96 }}
          className="w-full ios-footnote rounded-full px-6 py-3 disabled:opacity-40 mb-8"
          style={{ backgroundColor: "transparent", color: "rgba(255,255,255,0.6)", border: `0.5px solid ${HAIRLINE}` }}
        >
          Borrar resultado (para reusar la app)
        </motion.button>

        <div className="mb-2">
          <h2 className="ios-body font-semibold text-white mb-1">Cuenta regresiva</h2>
          <p className="ios-footnote mb-3" style={{ color: "rgba(255,255,255,0.5)" }}>
            Opcional: elegí fecha y hora de la fiesta. Los invitados van a ver
            un countdown en la pantalla de espera hasta ese momento.
          </p>
        </div>
        <input
          type="datetime-local"
          value={revealAtInput}
          onChange={(e) => setRevealAtInput(e.target.value)}
          className="w-full rounded-[12px] px-4 py-3 mb-3 ios-body outline-none"
          style={{ backgroundColor: CARD_DARK, color: "white", border: `0.5px solid ${HAIRLINE}`, colorScheme: "dark" }}
        />
        <div className="grid grid-cols-2 gap-3 mb-8">
          <motion.button
            onClick={saveRevealAt}
            disabled={busy || !revealAtInput}
            whileTap={{ scale: 0.96 }}
            className="ios-body font-semibold rounded-full py-3 disabled:opacity-50"
            style={{ backgroundColor: BLUE, color: "white" }}
          >
            Guardar fecha
          </motion.button>
          <motion.button
            onClick={clearRevealAt}
            disabled={busy}
            whileTap={{ scale: 0.96 }}
            className="ios-footnote rounded-full py-3 disabled:opacity-40"
            style={{ backgroundColor: "transparent", color: "rgba(255,255,255,0.6)", border: `0.5px solid ${HAIRLINE}` }}
          >
            Quitar countdown
          </motion.button>
        </div>

        {status && (
          <p className="ios-footnote text-center mb-6" style={{ color: "rgba(255,255,255,0.6)" }}>
            {status}
          </p>
        )}

        <Link
          href="/"
          className="w-full ios-body font-semibold rounded-full px-6 py-3 flex items-center justify-center gap-2"
          style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "white" }}
        >
          ← Volver al inicio
        </Link>
      </motion.div>
    </main>
  );
}
