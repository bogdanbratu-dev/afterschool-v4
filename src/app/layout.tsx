import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import ContactButton from "@/components/ContactButton";

export const metadata: Metadata = {
  title: "ActivKids — After School și Activități pentru Copii în București",
  description: "Găsește after school-ul sau activitatea perfectă pentru copilul tău în București: înot, fotbal, dans, arte marțiale, robotică și multe altele. Caută după locație și preț.",
  metadataBase: new URL('https://activkids.ro'),
  alternates: { canonical: 'https://activkids.ro' },
  openGraph: {
    title: "ActivKids — After School și Activități pentru Copii în București",
    description: "Găsește after school-ul sau activitatea perfectă pentru copilul tău în București. Caută după locație, preț și activități.",
    url: 'https://activkids.ro',
    siteName: 'ActivKids',
    locale: 'ro_RO',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro">
      <Script src="https://www.googletagmanager.com/gtag/js?id=G-Z9ZET3FJSG" strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-Z9ZET3FJSG');
      `}</Script>
      <body className="antialiased">
        {children}
        <ContactButton />
      </body>
    </html>
  );
}
