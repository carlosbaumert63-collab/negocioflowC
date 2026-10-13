import "./globals.css";
import InstallBanner from "../components/InstallBanner";
import { Analytics } from "@vercel/analytics/react";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://negocioflow.vercel.app";


const JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE}/#website`,
      name: "NegocioFlow",
      alternateName: ["Negocio Flow"],
      url: `${SITE}/`,
      inLanguage: "es-CL",
    },
    {
      "@type": "SoftwareApplication",
      name: "NegocioFlow",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web, Android, iOS",
      url: `${SITE}/`,
      description: "Registra tus ventas, controla tus gastos y descubre dónde está realmente tu dinero.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "CLP" },
    },
  ],
});

export const metadata = {
  metadataBase: new URL(SITE),
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_CL",
    siteName: "NegocioFlow",
    title: "NegocioFlow — Entiende cuánto realmente gana tu negocio",
    description: "Registra tus ventas, controla tus gastos y descubre dónde está realmente tu dinero.",
    url: "/",
  },
  // Pega aquí el código de Google Search Console (variable NEXT_PUBLIC_GSC_VERIFICATION en Vercel).
  verification: process.env.NEXT_PUBLIC_GSC_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GSC_VERIFICATION }
    : undefined,
  title: "NegocioFlow — Entiende cuánto realmente gana tu negocio",
  description: "Registra tus ventas, controla tus gastos y descubre dónde está realmente tu dinero.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "NegocioFlow",
  },
  icons: {
    icon: "/favicon-32.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ fontFamily: "'Inter', -apple-system, sans-serif", margin: 0 }}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />
        {children}
        <InstallBanner />
        {/* Visitas de la página (se ven en Vercel → Analytics). Sin cookies. */}
        <Analytics />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function () {
                  navigator.serviceWorker.register('/sw.js').catch(function () {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
