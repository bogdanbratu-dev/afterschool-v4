import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Baloo_2, Nunito_Sans } from "next/font/google";
import "./globals.css";
import ContactButton from "@/components/ContactButton";
import Footer from "@/components/Footer";

const baloo = Baloo_2({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-baloo",
  display: "swap",
});

const nunito = Nunito_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-nunito",
  display: "swap",
});

export const metadata: Metadata = {
  title: "After School București 2026 – Compară 200+ After School-uri | ActivKids",
  description: "Cel mai complet ghid de after school în București. Compară 200+ after school-uri pe sector, preț și facilități. Găsește locul potrivit pentru copilul tău.",
  metadataBase: new URL('https://activkids.ro'),
  alternates: { canonical: 'https://activkids.ro' },
  openGraph: {
    title: "After School București 2026 – Compară 200+ After School-uri | ActivKids",
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
    <html lang="ro" className={`${baloo.variable} ${nunito.variable}`}>
      <Script src="https://www.googletagmanager.com/gtag/js?id=G-Z9ZET3FJSG" strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-Z9ZET3FJSG');
      `}</Script>
      <Script id="meta-pixel" strategy="afterInteractive">{`
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '1713087986634990');
        fbq('track', 'PageView');
      `}</Script>
      <noscript><img height="1" width="1" style={{ display: 'none' }}
        src="https://www.facebook.com/tr?id=1713087986634990&ev=PageView&noscript=1" alt="" /></noscript>
      <body className="antialiased">
        {children}
        <Footer />
        <ContactButton />
      </body>
    </html>
  );
}
