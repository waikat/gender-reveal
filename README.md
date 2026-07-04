# Gender Reveal 💗💙

App de Next.js para revelar el sexo del bebé: montaña rusa de colores, anuncio
en 3 idiomas (empezando por el que elige cada invitado), video final y confetti.

## Cómo funciona

Hay dos roles:

1. **Admin** (`/admin`, protegido con contraseña): entrás, elegís 💗 Niña o
   💙 Niño, y lo guardás. Podés cambiarlo cuando quieras (por ejemplo, si en
   el futuro querés reusar la app para otro embarazo, entrás y lo actualizás
   o lo borrás).
2. **Invitados** (`/`): eligen idioma, y si todavía no cargaste el resultado
   ven una pantalla de espera que se actualiza sola cada 4 segundos. Apenas
   vos lo guardás desde `/admin`, a los invitados les aparece el botón para
   revelar. Todos ven el mismo resultado, el que vos cargaste.

## Setup

1. Instalar dependencias:
   ```
   npm install
   ```

2. Crear un proyecto en [Supabase](https://supabase.com) (gratis) y correr
   el SQL de `supabase_migration.sql` en el SQL editor.

3. Copiar `.env.example` a `.env.local` y completar:
   ```
   SUPABASE_URL=...
   SUPABASE_SERVICE_ROLE_KEY=...
   ADMIN_PASSWORD=...
   ```
   > Elegí cualquier contraseña para `ADMIN_PASSWORD`, es la que vas a usar
   > para entrar a `/admin`. La Service Role Key de Supabase nunca se expone
   > al cliente, solo se usa dentro de las rutas de la API (server-side).

4. Correr en local:
   ```
   npm run dev
   ```
   La app pública está en `http://localhost:3000` y el panel de admin en
   `http://localhost:3000/admin`.

5. Deploy a Vercel:
   ```
   vercel
   ```
   Y agregar las tres variables de entorno en el dashboard de Vercel
   (Settings > Environment Variables): `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`.

## Reusar la app en el futuro

Entrá a `/admin`, tocá "Borrar resultado (para reusar la app)", y listo: la
app pública vuelve a mostrar la pantalla de espera hasta que cargues un
resultado nuevo.

## Personalización rápida

- Idiomas: constante `LANGUAGES` (lista de la pantalla inicial), `UI_TEXT`
  (textos generales por idioma) y `PHASE_TEXT_I18N` (mensajes durante el
  flash) en `app/page.tsx`. El alemán está en variante austríaca ("Bub" en
  vez de "Junge", "Mädel", "Auf geht's", "a bisserl", "Wart's ab...",
  "Jetzt kummt's!"). Para agregar un idioma nuevo hay que sumarlo en los
  tres lugares y en `REVEAL_TEXT`.
- Pantalla de idioma: componente `LanguagePicker` en `app/page.tsx`, estilo
  lista agrupada de iOS (Settings).
- Videos de reveal: `public/videos/pink.mp4` (niña) y `public/videos/blue.mp4`
  (niño), referenciados en la constante `VIDEO_SRC` de `app/page.tsx`.
  Arrancan automáticamente apenas termina el flash y se sabe el resultado, y
  siguen de fondo hasta la pantalla final. Arrancan en silencio por las
  políticas de autoplay de los navegadores; hay un botón 🔇/🔊 arriba a la
  derecha para activar el sonido.
- Colores: constantes `PINK` (#FF375F, iOS system pink) y `BLUE` (#0A84FF,
  iOS system blue) en `app/page.tsx`.
- Ritmo del flash: la constante `PHASES` en `app/page.tsx` define la curva
  tipo montaña rusa (subida lenta → caída rápida → subida → loop rápido →
  pausa tensa larga → falso amague → bajada final). Duración total: ~14s.
- Confetti final: función `fireConfetti` en `app/page.tsx`.
- Tipografía: fuente del sistema (San Francisco en iOS/Mac, Segoe UI en
  Windows, Roboto en Android) en `app/globals.css`, con clases
  `.ios-large-title`, `.ios-title-1`, `.ios-body`, `.ios-footnote`.

## Seguridad del panel de admin

La protección de `/admin` es una contraseña simple comparada contra
`ADMIN_PASSWORD` en el servidor. Alcanza para un link privado familiar, pero
no es un sistema de autenticación robusto (sin límite de intentos, sin
sesiones). No compartas la URL de `/admin` ni la contraseña fuera del
círculo de confianza.
