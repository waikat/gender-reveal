import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: "¿Niño o niña? · Gender Reveal",
  description: "Descubrí con nosotros si es niño o niña 💗💙",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Gender Reveal",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "¿Niño o niña? · Gender Reveal",
    description: "Descubrí con nosotros el gran secreto 👀",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "¿Niño o niña? · Gender Reveal",
    description: "Descubrí con nosotros el gran secreto 👀",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#FF375F",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,700;1,900&display=swap"
          rel="stylesheet"
        />
        {/* iOS (sobre todo instalado como PWA) no recalcula bien 100vh/100vw
            al rotar el teléfono, y a veces la primera medición al cargar
            todavía no es la definitiva. Medimos con visualViewport (más
            preciso) y reintentamos varias veces temprano, además de en cada
            resize/rotación/vuelta de background. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                function getHeight() {
                  return (window.visualViewport && window.visualViewport.height) || window.innerHeight;
                }
                function getWidth() {
                  return (window.visualViewport && window.visualViewport.width) || window.innerWidth;
                }
                function setAppSize() {
                  document.documentElement.style.setProperty('--app-height', getHeight() + 'px');
                  document.documentElement.style.setProperty('--app-width', getWidth() + 'px');
                }
                setAppSize();
                [50, 150, 300, 600, 1000, 2000].forEach(function (ms) {
                  setTimeout(setAppSize, ms);
                });
                window.addEventListener('resize', setAppSize);
                window.addEventListener('orientationchange', function () {
                  setAppSize();
                  setTimeout(setAppSize, 100);
                  setTimeout(setAppSize, 400);
                  setTimeout(setAppSize, 800);
                });
                if (window.visualViewport) {
                  window.visualViewport.addEventListener('resize', setAppSize);
                }
                document.addEventListener('visibilitychange', function () {
                  if (!document.hidden) setAppSize();
                });
                window.addEventListener('pageshow', setAppSize);
              })();
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
