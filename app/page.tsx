"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import Link from "next/link";

// Fuente elegante solo para la pantalla de bienvenida ("Girl or Boy?").
// Se carga vía <link> en app/layout.tsx (no con next/font, para no depender
// de acceso a Google Fonts durante el build).
const WELCOME_FONT = "'Playfair Display', Georgia, serif";

type Phase =
  | "welcome"
  | "language"
  | "checking"
  | "waiting"
  | "idle"
  | "loading"
  | "flashing"
  | "revealing"
  | "revealed"
  | "error";
type ResultColor = "pink" | "blue";
type Lang = "es" | "en" | "de" | "nl";

// Colores estilo iOS (system colors)
const PINK = "#FF375F";
const BLUE = "#0A84FF";
const PINK_SOFT = "#FFD1DE";
const BLUE_SOFT = "#CFE6FF";
const BG_DARK = "#000000";
const CARD_DARK = "#1C1C1E";
const HAIRLINE = "rgba(255,255,255,0.12)";

const IOS_EASE = [0.32, 0.72, 0, 1] as const;

// Videos de reveal: rosa = niña, azul = niño
const VIDEO_SRC: Record<ResultColor, string> = {
  pink: "/videos/pink.mp4",
  blue: "/videos/blue.mp4",
};

// Cuánto tiempo el video juega solo (sin texto encima) antes de que aparezca
// el anuncio en los 3 idiomas. Ajustá este valor para que coincida con el
// momento en que el video efectivamente muestra el color/género.
const VIDEO_LEAD_MS = 3000;

type FlashPhase =
  | "climb1"
  | "drop1"
  | "climb2"
  | "loop"
  | "pause"
  | "falsealarm"
  | "final";

function buildPhase(
  steps: number,
  delayFrom: number,
  delayTo: number,
  curve: "linear" | "easeIn" | "easeOut"
): number[] {
  const arr: number[] = [];
  for (let i = 0; i < steps; i++) {
    const t = steps === 1 ? 0 : i / (steps - 1);
    const eased =
      curve === "easeIn" ? t * t : curve === "easeOut" ? 1 - (1 - t) * (1 - t) : t;
    arr.push(Math.round(delayFrom + (delayTo - delayFrom) * eased));
  }
  return arr;
}

// Curva tipo montaña rusa: subida lenta, caída rápida, otra subida, un loop rápido,
// una pausa larga y tensa, un falso amague, y la bajada final hacia el aterrizaje.
const PHASES: { name: FlashPhase; delays: number[] }[] = [
  { name: "climb1", delays: buildPhase(6, 260, 180, "easeIn") },
  { name: "drop1", delays: buildPhase(9, 60, 85, "easeOut") },
  { name: "climb2", delays: buildPhase(7, 150, 300, "easeIn") },
  { name: "loop", delays: buildPhase(9, 65, 95, "easeOut") },
  { name: "pause", delays: buildPhase(7, 380, 720, "easeIn") },
  { name: "falsealarm", delays: buildPhase(8, 85, 100, "easeOut") },
  { name: "final", delays: buildPhase(12, 110, 820, "easeIn") },
];

const FLASH_DELAYS: number[] = [];
const PHASE_OF_STEP: FlashPhase[] = [];
PHASES.forEach((p) =>
  p.delays.forEach((d) => {
    FLASH_DELAYS.push(d);
    PHASE_OF_STEP.push(p.name);
  })
);

const LANGUAGES: { code: Lang; flag: string; name: string; native: string }[] = [
  { code: "en", flag: "🇬🇧", name: "English", native: "English" },
  { code: "de", flag: "🇦🇹", name: "German (Austria)", native: "Österreichisch" },
  { code: "es", flag: "🇪🇸", name: "Spanish", native: "Español" },
  { code: "nl", flag: "🇳🇱", name: "Dutch", native: "Nederlands" },
];

const UI_TEXT: Record<
  Lang,
  {
    eyebrowQuestion: string;
    title: string;
    button: string;
    loading: string;
    errorText: string;
    retry: string;
    revealEyebrow: string;
    girl: string;
    boy: string;
    waitingTitle: string;
    waitingSubtitle: string;
    checking: string;
    watchAgain: string;
    countdownEyebrow: string;
    exit: string;
  }
> = {
  es: {
    eyebrowQuestion: "La gran pregunta",
    title: "¿Niño o niña?",
    button: "Toca para revelar",
    loading: "Cargando...",
    errorText: "Algo salió mal. Probá de nuevo.",
    retry: "Reintentar",
    revealEyebrow: "Es un...",
    girl: "¡Niña! 💗",
    boy: "¡Niño! 💙",
    waitingTitle: "Pronto lo vamos a saber 👀",
    waitingSubtitle: "Esta pantalla se actualiza sola.",
    checking: "Viendo si ya está listo...",
    watchAgain: "Ver de nuevo",
    countdownEyebrow: "Falta para la fiesta",
    exit: "Salir",
  },
  en: {
    eyebrowQuestion: "The big question",
    title: "Boy or girl?",
    button: "Tap to reveal",
    loading: "Loading...",
    errorText: "Something went wrong. Please try again.",
    retry: "Try again",
    revealEyebrow: "It's a...",
    girl: "It's a girl! 💗",
    boy: "It's a boy! 💙",
    waitingTitle: "Soon we'll know 👀",
    waitingSubtitle: "This screen updates on its own.",
    checking: "Checking if it's ready...",
    watchAgain: "Watch again",
    countdownEyebrow: "Until the big reveal",
    exit: "Exit",
  },
  // Alemán austríaco: "Bub" en vez de "Junge", "Mädel" en vez de "Mädchen",
  // y giros coloquiales típicos de Austria ("a bisserl", "Auf geht's", "Wart's ab", "nix", "is'").
  de: {
    eyebrowQuestion: "Die große Frage",
    title: "Bub oder Mädel?",
    button: "Zum Aufdecken tippen",
    loading: "Lädt...",
    errorText: "Etwas ist schiefgelaufen. Probier's nochmal.",
    retry: "Nochmal probieren",
    revealEyebrow: "Es wird a...",
    girl: "Mädel! 💗",
    boy: "Bub! 💙",
    waitingTitle: "Bald wissen mia's 👀",
    waitingSubtitle: "Die Seite aktualisiert sich von selbst.",
    checking: "Schauen, ob's schon so weit is...",
    watchAgain: "Nochmal anschaun",
    countdownEyebrow: "Bis zur Party",
    exit: "Beenden",
  },
  nl: {
    eyebrowQuestion: "De grote vraag",
    title: "Jongen of meisje?",
    button: "Tik om te onthullen",
    loading: "Laden...",
    errorText: "Er ging iets mis. Probeer het opnieuw.",
    retry: "Opnieuw proberen",
    revealEyebrow: "Het wordt een...",
    girl: "Een meisje! 💗",
    boy: "Een jongen! 💙",
    waitingTitle: "Binnenkort weten we het 👀",
    waitingSubtitle: "Dit scherm ververst vanzelf.",
    checking: "Even kijken of het al zover is...",
    watchAgain: "Nog een keer bekijken",
    countdownEyebrow: "Tot het grote moment",
    exit: "Afsluiten",
  },
};

const PHASE_TEXT_I18N: Record<Lang, Record<FlashPhase, string>> = {
  es: {
    climb1: "Ya casi...",
    drop1: "Ahí vamos...",
    climb2: "Un poco más...",
    loop: "¡Vamos, vamos!",
    pause: "Esperá...",
    falsealarm: "¿Ahora?",
    final: "¡Ahí llega!",
  },
  en: {
    climb1: "Almost there...",
    drop1: "Here we go...",
    climb2: "A little more...",
    loop: "Come on, come on!",
    pause: "Wait for it...",
    falsealarm: "Now?",
    final: "Here it comes!",
  },
  de: {
    climb1: "Gleich is' so weit...",
    drop1: "Auf geht's...",
    climb2: "Nur noch a bisserl...",
    loop: "Auf geht's, auf geht's!",
    pause: "Wart's ab...",
    falsealarm: "Jetzt schon?",
    final: "Jetzt kummt's!",
  },
  nl: {
    climb1: "Bijna zover...",
    drop1: "Daar gaan we...",
    climb2: "Nog even...",
    loop: "Kom op, kom op!",
    pause: "Wacht maar...",
    falsealarm: "Nu al?",
    final: "Daar komt het!",
  },
};

function formatCountdown(msRemaining: number) {
  const clamped = Math.max(0, msRemaining);
  const totalSeconds = Math.floor(clamped / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return { days, hours, minutes, seconds, pad, isPast: msRemaining <= 0 };
}

// --- Fullscreen y desbloqueo de audio ---
// El truco (el mismo que usan Instagram/TikTok): estas funciones se llaman
// de forma SÍNCRONA, dentro del mismo toque de "Toca para revelar", para que
// el navegador asocie el permiso de audio/pantalla completa a esta sesión.
// Así, cuando el video real aparece varios segundos después, ya puede
// reproducirse con sonido y sin la barra del navegador, sin pedir otro toque.

type FullscreenCapableElement = HTMLElement & {
  webkitRequestFullscreen?: () => void;
  webkitEnterFullscreen?: () => void;
  mozRequestFullScreen?: () => void;
  msRequestFullscreen?: () => void;
};

function requestFullscreenSafe(el: HTMLElement | null) {
  if (!el) return;
  const anyEl = el as FullscreenCapableElement;
  try {
    if (anyEl.requestFullscreen) anyEl.requestFullscreen().catch(() => {});
    else if (anyEl.webkitRequestFullscreen) anyEl.webkitRequestFullscreen();
    else if (anyEl.mozRequestFullScreen) anyEl.mozRequestFullScreen();
    else if (anyEl.msRequestFullscreen) anyEl.msRequestFullscreen();
  } catch {
    // Si el navegador no lo permite, seguimos con el layout normal, sin drama.
  }
}

type FullscreenCapableDocument = Document & {
  webkitExitFullscreen?: () => void;
  webkitFullscreenElement?: Element | null;
  mozCancelFullScreen?: () => void;
  msExitFullscreen?: () => void;
};

function exitFullscreenSafe() {
  const anyDoc = document as FullscreenCapableDocument;
  try {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    } else if (anyDoc.webkitFullscreenElement && anyDoc.webkitExitFullscreen) {
      anyDoc.webkitExitFullscreen();
    } else if (anyDoc.mozCancelFullScreen) {
      anyDoc.mozCancelFullScreen();
    } else if (anyDoc.msExitFullscreen) {
      anyDoc.msExitFullscreen();
    }
  } catch {
    // no es crítico
  }
}

function primeVideoForAutoplay(video: HTMLVideoElement | null) {
  if (!video) return;
  video.muted = false;
  // Ojo: reproducimos con volume=0 (no muted=true) durante la "activación".
  // Para las políticas de autoplay del navegador esto sigue contando como
  // "reproducción con sonido permitida" (lo que necesitamos desbloquear),
  // pero no se escucha nada mientras tanto — así no pisa el taca-taca-taca
  // de la montaña rusa. El volumen real se restaura recién cuando el video
  // de verdad arranca (ver el useEffect de showVideo).
  video.volume = 0;
  const playPromise = video.play();
  if (playPromise && typeof playPromise.then === "function") {
    playPromise
      .then(() => {
        video.pause();
        video.currentTime = 0;
        video.volume = 1;
      })
      .catch(() => {
        // Ni siquiera esto lo dejó: no pasa nada, el video igual va a
        // intentar reproducirse (silenciado si hace falta) más adelante.
      });
  }
}

// Fanfarria cortita al momento del confetti: un arpegio ascendente alegre,
// como un "ta-dá". No es un aplauso grabado (no tenemos ese archivo), pero
// da la sensación festiva de "ruido" en el momento del reveal.
// AudioContext ÚNICO y compartido para todos los sonidos de la app (en vez
// de crear uno nuevo por cada tick, que en iOS puede arrancar "suspendido"
// si no está bien ligado al toque original). Se activa explícitamente en
// el mismo toque de "Toca para revelar" (ver ensureAudioContext).
let sharedAudioContext: AudioContext | null = null;

function getAudioContextClass(): typeof AudioContext | null {
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ||
    null
  );
}

function ensureAudioContext(): AudioContext | null {
  const AudioContextClass = getAudioContextClass();
  if (!AudioContextClass) return null;
  if (!sharedAudioContext) {
    sharedAudioContext = new AudioContextClass();
  }
  if (sharedAudioContext.state === "suspended") {
    sharedAudioContext.resume().catch(() => {});
  }
  return sharedAudioContext;
}

function playCheerSound() {
  const ctx = ensureAudioContext();
  if (!ctx) return;
  try {
    const notes = [523.25, 659.25, 783.99, 1046.5]; // Do-Mi-Sol-Do (mayor, alegre)
    notes.forEach((freq, i) => {
      const start = ctx.currentTime + i * 0.09;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = "triangle";
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.13, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.55);
    });
  } catch {
    // si el navegador bloquea audio, no pasa nada, el confetti sigue solo
  }
}

function playTick(frequency: number) {
  const ctx = ensureAudioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = frequency;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch {
    // Si el navegador bloquea audio, seguimos sin sonido, no es crítico.
  }
}

function fireConfetti(color: ResultColor, shoot: ReturnType<typeof confetti.create>) {
  const base = color === "pink" ? [PINK, PINK_SOFT, "#FFB6D9"] : [BLUE, BLUE_SOFT, "#8ECBFF"];
  const palette = [...base, "#FFD166", "#FFFFFF"];

  shoot({
    particleCount: 220,
    spread: 130,
    startVelocity: 55,
    origin: { y: 0.55 },
    colors: palette,
    gravity: 0.85,
    scalar: 1.2,
    ticks: 250,
  });

  const shootAngled = (angle: number, originX: number, delay: number) =>
    setTimeout(
      () =>
        shoot({
          particleCount: 110,
          angle,
          spread: 70,
          origin: { x: originX, y: 0.65 },
          colors: palette,
          startVelocity: 50,
          gravity: 0.9,
          scalar: 1.1,
          ticks: 250,
        }),
      delay
    );
  shootAngled(55, 0.05, 100);
  shootAngled(125, 0.95, 100);
  shootAngled(60, 0.15, 350);
  shootAngled(120, 0.85, 350);

  setTimeout(
    () =>
      shoot({
        particleCount: 180,
        spread: 160,
        startVelocity: 30,
        origin: { y: -0.1 },
        colors: palette,
        gravity: 1.0,
        scalar: 1.0,
        ticks: 300,
      }),
    600
  );

  setTimeout(
    () =>
      shoot({
        particleCount: 150,
        spread: 100,
        startVelocity: 40,
        origin: { y: 0.5 },
        colors: palette,
        gravity: 0.9,
        scalar: 1.1,
      }),
    1100
  );
}

// Frase "Niño o niña" en cada idioma, para la pantalla de bienvenida.
const WELCOME_PHRASES: { lang: Lang; text: string }[] = [
  { lang: "en", text: "Boy or girl?" },
  { lang: "de", text: "Bub oder Mädel?" },
  { lang: "es", text: "¿Niño o niña?" },
  { lang: "nl", text: "Jongen of meisje?" },
];

function WelcomeScreen({ onContinue }: { onContinue: () => void }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % WELCOME_PHRASES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      key="welcome"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      onDragEnd={(_, info) => {
        if (info.offset.x < -70) onContinue();
      }}
      className="absolute inset-0 flex flex-col items-center justify-center px-6 cursor-grab active:cursor-grabbing"
      style={{
        background: `linear-gradient(180deg, ${PINK} 0%, ${PINK} 42%, ${BLUE} 58%, ${BLUE} 100%)`,
      }}
    >
      <p
        className="ios-footnote uppercase tracking-[0.3em] mb-4"
        style={{ color: "rgba(255,255,255,0.75)" }}
      >
        Welcome
      </p>

      <div className="h-32 flex items-center justify-center w-full max-w-md">
        <AnimatePresence mode="wait">
          <motion.h1
            key={WELCOME_PHRASES[index].lang}
            initial={{ opacity: 0, scale: 0.85, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
            className="italic text-center text-white"
            style={{
              fontFamily: WELCOME_FONT,
              fontWeight: 800,
              fontSize: "clamp(34px, 8vw, 56px)",
              textShadow: "0 4px 24px rgba(0,0,0,0.35)",
              lineHeight: 1.15,
            }}
          >
            {WELCOME_PHRASES[index].text}
          </motion.h1>
        </AnimatePresence>
      </div>

      <motion.button
        onClick={onContinue}
        whileTap={{ scale: 0.9 }}
        animate={{ y: [0, 6, 0] }}
        transition={{ y: { duration: 1.4, repeat: Infinity, ease: "easeInOut" } }}
        className="absolute bottom-12 w-14 h-14 rounded-full flex items-center justify-center text-2xl"
        style={{ backgroundColor: "rgba(255,255,255,0.18)", color: "white" }}
        aria-label="Continue"
      >
        →
      </motion.button>
    </motion.div>
  );
}

function LanguagePicker({ onSelect }: { onSelect: (l: Lang) => void }) {
  const [selecting, setSelecting] = useState<Lang | null>(null);

  const handlePick = (code: Lang) => {
    setSelecting(code);
    setTimeout(() => onSelect(code), 220);
  };

  return (
    <motion.div
      key="language"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.45, ease: IOS_EASE }}
      className="w-full max-w-sm mx-auto max-h-full overflow-y-auto py-4"
    >
      <div className="text-center mb-4">
        <h1 className="ios-title-1 text-white mb-1">Choose your language</h1>
        <p className="ios-footnote" style={{ color: "rgba(255,255,255,0.5)" }}>
          Sprache wählen · Elige tu idioma · Kies je taal
        </p>
      </div>

      <div
        className="rounded-[14px] overflow-hidden"
        style={{ backgroundColor: CARD_DARK }}
      >
        {LANGUAGES.map((l, i) => (
          <motion.button
            key={l.code}
            onClick={() => handlePick(l.code)}
            whileTap={{ backgroundColor: "rgba(255,255,255,0.06)" }}
            className="w-full flex items-center justify-between px-4 py-2.5 text-left"
            style={{
              borderBottom: i < LANGUAGES.length - 1 ? `0.5px solid ${HAIRLINE}` : "none",
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl leading-none">{l.flag}</span>
              <div>
                <div className="ios-body text-white">{l.native}</div>
                <div className="ios-footnote" style={{ color: "rgba(255,255,255,0.45)" }}>
                  {l.name}
                </div>
              </div>
            </div>
            <AnimatePresence>
              {selecting === l.code ? (
                <motion.span
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-[#0A84FF] text-lg"
                >
                  ✓
                </motion.span>
              ) : (
                <span style={{ color: "rgba(255,255,255,0.25)" }}>›</span>
              )}
            </AnimatePresence>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

export default function GenderRevealPage() {
  const [phase, setPhase] = useState<Phase>("welcome");
  const [lang, setLang] = useState<Lang>("en");
  const [currentColor, setCurrentColor] = useState<string>(BG_DARK);
  const [result, setResult] = useState<ResultColor | null>(null);
  const [revealAt, setRevealAt] = useState<string | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const [suspenseText, setSuspenseText] = useState("");
  const [tension, setTension] = useState(false);
  const [bounceDuration, setBounceDuration] = useState(0.9);
  const [screenShake, setScreenShake] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);
  const stepIndex = useRef(0);
  const lastPhaseRef = useRef<FlashPhase | null>(null);
  const videoRefPink = useRef<HTMLVideoElement>(null);
  const videoRefBlue = useRef<HTMLVideoElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const confettiCanvasRef = useRef<HTMLCanvasElement>(null);
  const confettiInstanceRef = useRef<ReturnType<typeof confetti.create> | null>(null);

  const selectLanguage = useCallback((l: Lang) => {
    setLang(l);
    setPhase("checking");
  }, []);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/reveal");
      if (!res.ok) throw new Error("No se pudo consultar el estado");
      const data = (await res.json()) as { color: ResultColor | null; revealAt: string | null };
      setRevealAt(data.revealAt);
      const countdownActive = data.revealAt ? new Date(data.revealAt).getTime() > Date.now() : false;
      setPhase(data.color && !countdownActive ? "idle" : "waiting");
    } catch {
      setPhase("error");
    }
  }, []);

  // Apenas se elige idioma, consultamos si ya hay un resultado cargado.
  useEffect(() => {
    if (phase === "checking") {
      checkStatus();
    }
  }, [phase, checkStatus]);

  // Mientras se espera, reintentamos solos cada 4s (sin que el invitado
  // tenga que hacer nada) hasta que el admin cargue el resultado.
  useEffect(() => {
    if (phase !== "waiting") return;
    const interval = setInterval(checkStatus, 4000);
    return () => clearInterval(interval);
  }, [phase, checkStatus]);

  // Creamos la instancia de confetti enlazada a NUESTRO canvas (adentro del
  // contenedor que pide pantalla completa), en vez de dejar que la librería
  // agregue el suyo afuera, directo al <body> — si no, cuando el navegador
  // entra en pantalla completa real, ese canvas externo queda fuera del
  // árbol que se renderiza y el confetti no se ve.
  useEffect(() => {
    if (!confettiCanvasRef.current) return;
    confettiInstanceRef.current = confetti.create(confettiCanvasRef.current, {
      resize: true,
      useWorker: true,
    });
  }, []);

  // Si hay una fecha de countdown configurada, actualizamos el reloj cada
  // segundo, y apenas llega a cero, revisamos el estado al instante (sin
  // esperar el poll de 4s) para desbloquear el botón justo en el momento.
  useEffect(() => {
    if (phase !== "waiting" || !revealAt) return;
    const target = new Date(revealAt).getTime();
    const interval = setInterval(() => {
      const nowTs = Date.now();
      setNow(nowTs);
      if (nowTs >= target) {
        clearInterval(interval);
        checkStatus();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, revealAt, checkStatus]);

  const runRevealFlow = useCallback((finalColor: ResultColor) => {
    setCurrentColor(finalColor === "pink" ? PINK : BLUE);
    setResult(finalColor);
    // El video arranca solo, sin ningún texto encima: es el video el que
    // muestra el color/género. El texto final aparece después, directo en
    // el idioma que la persona ya eligió (sin ciclar por otros idiomas).
    setPhase("revealing");
    setTimeout(() => {
      setPhase("revealed");
      fireConfetti(finalColor, confettiInstanceRef.current || (confetti as unknown as ReturnType<typeof confetti.create>));
      playCheerSound();
      setScreenShake(true);
      setTimeout(() => setScreenShake(false), 350);
    }, VIDEO_LEAD_MS);
  }, []);

  const runFlashSequence = useCallback(
    (finalColor: ResultColor) => {
      setPhase("flashing");
      stepIndex.current = 0;
      lastPhaseRef.current = null;

      const step = () => {
        const idx = stepIndex.current;

        if (idx >= FLASH_DELAYS.length) {
          runRevealFlow(finalColor);
          return;
        }

        const delay = FLASH_DELAYS[idx];
        const flashPhase = PHASE_OF_STEP[idx];
        const isPinkTick = idx % 2 === 0;

        setCurrentColor(isPinkTick ? PINK : BLUE);
        playTick(isPinkTick ? 660 : 520);

        setBounceDuration(Math.max(0.28, (delay * 2.4) / 1000));
        setTension(flashPhase === "pause" || flashPhase === "falsealarm");
        if (flashPhase !== lastPhaseRef.current) {
          setSuspenseText(PHASE_TEXT_I18N[lang][flashPhase]);
          lastPhaseRef.current = flashPhase;
        }

        stepIndex.current += 1;
        setTimeout(step, delay);
      };

      step();
    },
    [lang, runRevealFlow]
  );

  const start = useCallback(async () => {
    // Todo esto es SÍNCRONO, en respuesta directa al toque: activamos el
    // AudioContext compartido (para el taca-taca y la fanfarria), "activamos"
    // el audio de los dos videos, y pedimos pantalla completa.
    ensureAudioContext();
    primeVideoForAutoplay(videoRefPink.current);
    primeVideoForAutoplay(videoRefBlue.current);
    requestFullscreenSafe(mainRef.current);

    setPhase("loading");
    try {
      const res = await fetch("/api/reveal");
      if (!res.ok) throw new Error("No se pudo obtener el resultado");
      const data = (await res.json()) as { color: ResultColor | null; revealAt: string | null };
      setRevealAt(data.revealAt);
      const countdownActive = data.revealAt ? new Date(data.revealAt).getTime() > Date.now() : false;
      if (!data.color || countdownActive) {
        // Puede pasar si el admin todavía no cargó nada, si lo borró justo
        // en este momento, o si hay una cuenta regresiva que todavía no llegó.
        setPhase("waiting");
        return;
      }
      runFlashSequence(data.color);
    } catch {
      setPhase("error");
    }
  }, [runFlashSequence]);

  const toggleSound = useCallback(() => {
    setVideoMuted((m) => {
      const next = !m;
      const video = result === "pink" ? videoRefPink.current : result === "blue" ? videoRefBlue.current : null;
      if (video) {
        video.volume = 1;
        video.muted = next;
        video.play().catch(() => {});
      }
      return next;
    });
  }, [result]);

  const watchAgain = useCallback(() => {
    if (!result) return;
    const video = result === "pink" ? videoRefPink.current : videoRefBlue.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
    setVideoMuted(false);
    // Repetimos el mismo resultado que ya se reveló (no volvemos a preguntar
    // a la base de datos): "ver de nuevo" es literalmente eso, no una nueva
    // revelación que podría dar otra respuesta si alguien cambió el admin.
    runFlashSequence(result);
  }, [result, runFlashSequence]);

  const exitToWelcome = useCallback(() => {
    const video = result === "pink" ? videoRefPink.current : result === "blue" ? videoRefBlue.current : null;
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
    exitFullscreenSafe();
    setResult(null);
    setVideoMuted(false);
    setCurrentColor(BG_DARK);
    setPhase("welcome");
  }, [result]);

  const t = UI_TEXT[lang];
  const showVideo = (phase === "revealing" || phase === "revealed") && result;

  // Apenas aparece el video, intentamos reproducirlo CON sonido (audio
  // activado por defecto). Como ya lo "activamos" al tocar "Toca para
  // revelar" (ver primeVideoForAutoplay), esto debería andar sin pedir un
  // toque extra. Si igual el navegador lo bloquea, reintentamos en silencio
  // automáticamente; el botón 🔇/🔊 sigue disponible para activarlo a mano.
  useEffect(() => {
    if (!showVideo || !result) return;
    const video = result === "pink" ? videoRefPink.current : videoRefBlue.current;
    if (!video) return;
    video.currentTime = 0;
    video.volume = 1;
    video.muted = videoMuted;
    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {
        video.muted = true;
        setVideoMuted(true);
        video.play().catch(() => {});
      });
    }
    // Solo cuando el video aparece o cambia de resultado, no en cada toggle de mute.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showVideo, result]);

  const currentLangMeta = LANGUAGES.find((l) => l.code === lang);
  const canChangeLanguage =
    phase === "checking" || phase === "waiting" || phase === "idle" || phase === "loading";
  const canShowSettings = canChangeLanguage || phase === "language";

  return (
    <motion.main
      ref={mainRef}
      className="relative h-full w-full flex items-center justify-center overflow-hidden transition-colors duration-150 px-6"
      style={{
        backgroundColor:
          phase === "welcome" ||
          phase === "language" ||
          phase === "checking" ||
          phase === "waiting" ||
          phase === "idle" ||
          phase === "loading"
            ? BG_DARK
            : currentColor,
      }}
      animate={
        screenShake
          ? { x: [0, -6, 6, -4, 4, 0], y: [0, 3, -4, 4, -2, 0] }
          : { x: 0, y: 0 }
      }
      transition={{ duration: 0.35, ease: "easeInOut" }}
    >
      {(phase === "language" ||
        phase === "checking" ||
        phase === "waiting" ||
        phase === "idle" ||
        phase === "loading") && (
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, ${PINK} 0%, ${PINK} 42%, ${BLUE} 58%, ${BLUE} 100%)`,
          }}
        />
      )}

      {canChangeLanguage && (
        <motion.button
          onClick={() => setPhase("language")}
          whileTap={{ scale: 0.9 }}
          className="absolute z-20 w-11 h-11 rounded-full flex items-center justify-center text-lg"
          style={{
            backgroundColor: "rgba(255,255,255,0.08)",
            color: "white",
            top: "max(20px, env(safe-area-inset-top))",
            left: "max(20px, env(safe-area-inset-left))",
          }}
          aria-label="Change language"
        >
          {currentLangMeta?.flag}
          <span
            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
            style={{ backgroundColor: BLUE, border: `2px solid ${BG_DARK}` }}
          >
            🌐
          </span>
        </motion.button>
      )}

      {/* Canvas propio para el confetti, adentro del contenedor que pide
          pantalla completa (ver comentario en el useEffect que lo inicializa). */}
      <canvas
        ref={confettiCanvasRef}
        className="absolute inset-0 pointer-events-none z-30"
        style={{ width: "100%", height: "100%" }}
      />

      {canShowSettings && (
        <Link
          href="/admin"
          className="absolute z-20 w-11 h-11 rounded-full flex items-center justify-center text-lg"
          style={{
            backgroundColor: "rgba(255,255,255,0.08)",
            color: "white",
            top: "max(20px, env(safe-area-inset-top))",
            right: "max(20px, env(safe-area-inset-right))",
          }}
          aria-label="Admin settings"
        >
          ⚙️
        </Link>
      )}

      <AnimatePresence>
        {phase === "welcome" && (
          <WelcomeScreen onContinue={() => setPhase("language")} />
        )}
      </AnimatePresence>

      {/* Los dos videos quedan SIEMPRE montados (nunca se desmontan) para no
          perder el permiso de audio/autoplay que se "activó" al tocar
          "Toca para revelar". Se muestra uno u otro según el resultado. */}
      <video
        ref={videoRefPink}
        src={VIDEO_SRC.pink}
        muted={videoMuted}
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          opacity: showVideo && result === "pink" ? 1 : 0,
          zIndex: showVideo && result === "pink" ? 1 : -1,
          pointerEvents: "none",
        }}
      />
      <video
        ref={videoRefBlue}
        src={VIDEO_SRC.blue}
        muted={videoMuted}
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          opacity: showVideo && result === "blue" ? 1 : 0,
          zIndex: showVideo && result === "blue" ? 1 : -1,
          pointerEvents: "none",
        }}
      />
      {showVideo && (
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/50" />
          <motion.button
            onClick={toggleSound}
            whileTap={{ scale: 0.9 }}
            className="absolute z-20 w-11 h-11 rounded-full flex items-center justify-center text-lg"
            style={{
              backgroundColor: "rgba(0,0,0,0.45)",
              color: "white",
              top: "max(20px, env(safe-area-inset-top))",
              right: "max(20px, env(safe-area-inset-right))",
            }}
            aria-label={videoMuted ? "Activar sonido" : "Silenciar"}
          >
            {videoMuted ? "🔇" : "🔊"}
          </motion.button>
        </>
      )}


      <div className="relative z-10 w-full flex items-center justify-center">
        <AnimatePresence mode="wait">
          {phase === "language" && <LanguagePicker onSelect={selectLanguage} />}

          {phase === "checking" && (
            <motion.div
              key="checking"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
                className="w-8 h-8 border-2 rounded-full mx-auto"
                style={{ borderColor: "rgba(255,255,255,0.2)", borderTopColor: "white" }}
              />
            </motion.div>
          )}

          {phase === "waiting" && (
            <motion.div
              key="waiting"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: IOS_EASE }}
              className="text-center max-w-xs"
            >
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                className="text-4xl mb-4"
              >
                {revealAt && !formatCountdown(new Date(revealAt).getTime() - now).isPast ? "🎉" : "⏳"}
              </motion.div>
              <h1 className="ios-title-1 text-white mb-3">{t.waitingTitle}</h1>

              {revealAt && !formatCountdown(new Date(revealAt).getTime() - now).isPast ? (
                (() => {
                  const c = formatCountdown(new Date(revealAt).getTime() - now);
                  return (
                    <>
                      <p
                        className="ios-footnote uppercase tracking-[0.2em] mb-2"
                        style={{ color: "rgba(255,255,255,0.5)" }}
                      >
                        {t.countdownEyebrow}
                      </p>
                      <div
                        className="flex items-center justify-center gap-2 mb-4"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                      >
                        {c.days > 0 && (
                          <span className="ios-title-1 text-white">
                            {c.days}
                            <span className="ios-footnote" style={{ color: "rgba(255,255,255,0.5)" }}>
                              d
                            </span>
                          </span>
                        )}
                        <span className="ios-title-1 text-white">
                          {c.pad(c.hours)}
                          <span className="ios-footnote" style={{ color: "rgba(255,255,255,0.5)" }}>
                            h
                          </span>
                        </span>
                        <span className="ios-title-1 text-white">
                          {c.pad(c.minutes)}
                          <span className="ios-footnote" style={{ color: "rgba(255,255,255,0.5)" }}>
                            m
                          </span>
                        </span>
                        <span className="ios-title-1 text-white">
                          {c.pad(c.seconds)}
                          <span className="ios-footnote" style={{ color: "rgba(255,255,255,0.5)" }}>
                            s
                          </span>
                        </span>
                      </div>
                    </>
                  );
                })()
              ) : null}

              <p className="ios-footnote" style={{ color: "rgba(255,255,255,0.5)" }}>
                {t.waitingSubtitle}
              </p>
            </motion.div>
          )}

          {(phase === "idle" || phase === "loading") && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: IOS_EASE }}
              className="text-center"
            >
              <p
                className="ios-footnote uppercase tracking-[0.2em] mb-4"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                {t.eyebrowQuestion}
              </p>
              <h1 className="ios-large-title text-white mb-10">{t.title}</h1>
              <motion.button
                onClick={start}
                disabled={phase === "loading"}
                whileTap={{ scale: 0.96 }}
                className="ios-body font-semibold rounded-full px-10 py-4 disabled:opacity-60 shadow-lg"
                style={{ backgroundColor: "white", color: "#111827" }}
              >
                {phase === "loading" ? t.loading : t.button}
              </motion.button>
            </motion.div>
          )}

          {phase === "flashing" && (
            <motion.div
              key="flashing"
              initial={{ opacity: 0 }}
              animate={
                tension
                  ? { opacity: 1, x: [0, -3, 3, -2, 0] }
                  : { opacity: 1, x: 0 }
              }
              transition={{ x: { duration: 0.07, repeat: Infinity } }}
              className="text-center"
            >
              <motion.p
                className="ios-title-1 text-white inline-block"
                animate={{
                  y: [0, -20, 16, -8, 0],
                  rotate: [0, -3, 2, -1, 0],
                  scale: [1, 1.04, 0.97, 1.01, 1],
                }}
                transition={{ duration: bounceDuration, repeat: Infinity, ease: "easeInOut" }}
              >
                {suspenseText}
              </motion.p>
            </motion.div>
          )}

          {phase === "revealing" && (
            <motion.div
              key="revealing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex gap-2"
            >
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="w-2.5 h-2.5 rounded-full bg-white/70"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
                />
              ))}
            </motion.div>
          )}

          {phase === "revealed" && result && (
            <motion.div
              key="revealed"
              initial={{ opacity: 0, scale: 0.7, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
              className="text-center"
            >
              <p
                className="ios-footnote tracking-[0.3em] uppercase mb-3"
                style={{ color: "rgba(255,255,255,0.85)" }}
              >
                {t.revealEyebrow}
              </p>
              <h1
                className="ios-large-title text-white"
                style={{ textShadow: "0 4px 20px rgba(0,0,0,0.5)" }}
              >
                {result === "pink" ? t.girl : t.boy}
              </h1>
              <div className="flex items-center justify-center gap-3 mt-8">
                <motion.button
                  onClick={watchAgain}
                  whileTap={{ scale: 0.96 }}
                  className="ios-body font-semibold rounded-full px-6 py-3"
                  style={{ backgroundColor: "rgba(255,255,255,0.16)", color: "white" }}
                >
                  🔁 {t.watchAgain}
                </motion.button>
                <motion.button
                  onClick={exitToWelcome}
                  whileTap={{ scale: 0.96 }}
                  className="ios-body font-semibold rounded-full px-6 py-3"
                  style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.75)" }}
                >
                  {t.exit}
                </motion.button>
              </div>
            </motion.div>
          )}

          {phase === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <p className="ios-body text-white mb-6">{t.errorText}</p>
              <motion.button
                onClick={start}
                whileTap={{ scale: 0.96 }}
                className="ios-body font-semibold rounded-full px-8 py-3"
                style={{ backgroundColor: BLUE, color: "white" }}
              >
                {t.retry}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.main>
  );
}
