import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AfterSchool Finder - Gaseste after school-ul perfect in Bucuresti",
  description: "Platforma pentru parinti din Bucuresti care cauta cel mai bun after school pentru copiii lor. Cauta dupa locatie, pret si activitati.",
  metadataBase: new URL('https://activkids.ro'),
  alternates: { canonical: 'https://activkids.ro' },
  openGraph: {
    title: "AfterSchool Finder Bucuresti",
    description: "Gaseste cel mai bun after school pentru copilul tau in Bucuresti. Cauta dupa locatie, pret si activitati.",
    url: 'https://activkids.ro',
    siteName: 'ActiveKids',
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
      <body className="antialiased">{children}</body>
    </html>
  );
}
