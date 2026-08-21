'use client';
import { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const REVOLUT_USER = '@bogdanmxn';

const PRODUCTS = {
  premium: {
    endpoint: '/api/user/payment-request',
    price: 100,
    priceSuffix: '/3 luni',
    title: 'Upgrade Premium',
    subtitle: 'Activeaza toate functiile pentru listarea ta',
    planName: 'Abonament Premium',
    benefits: ['Pozitie prioritara in rezultatele cautarii', 'Badge Premium pe profil', 'Carusel foto vizibil chiar din rezultate, nu doar pe pagina ta', 'Statistici de vizite', 'Acces la catalogul nostru de colaboratori: logopezi, psihologi, meditatori si alti specialisti pentru copii', 'Suport prioritar'],
    successTitle: 'Plata confirmata!',
    successText: 'Contul tau Premium a fost activat. Te redirectionam...',
    payLabel: 'activeaza accesul',
  },
  outreach: {
    endpoint: '/api/user/outreach-request',
    price: 150,
    priceSuffix: ' (o singura data)',
    title: 'Pachet Introducere Directa',
    subtitle: 'Te prezentam personal, prin email, la toate afterschool-urile din Bucuresti',
    planName: 'Pachet Introducere Directa',
    benefits: ['Email de prezentare trimis catre toate afterschool-urile din baza noastra (peste 400, in continua crestere)', 'Prezentare personalizata cu specializarea si tarifele tale', 'Contactul ramane direct la tine, fara comision', 'Se trimite o singura data, rezultatele vin in timp'],
    successTitle: 'Cerere inregistrata!',
    successText: 'Verificam plata si pornim in curand introducerea ta la afterschool-uri. Te redirectionam...',
    payLabel: 'trimite cererea',
  },
} as const;

export default function PlataPage() {
  return (
    <Suspense fallback={null}>
      <PlataPageInner />
    </Suspense>
  );
}

function PlataPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productKey = searchParams.get('product') === 'outreach' ? 'outreach' : 'premium';
  const product = PRODUCTS[productKey];
  const PRICE_RON = product.price;
  const [reference, setReference] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showVerifying, setShowVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [done, setDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!showVerifying || done) return;
    if (countdown <= 0) { setDone(true); setTimeout(() => router.push('/dashboard'), 1500); return; }
    timerRef.current = setInterval(() => {
      setCountdown(p => { if (p <= 1) { clearInterval(timerRef.current!); return 0; } return p - 1; });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [showVerifying, countdown, done]);

  const handlePay = async () => {
    setLoading(true); setError('');
    const res = await fetch(product.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || 'Eroare'); return; }
    const duration = Math.floor(30 + Math.random() * 30);
    setCountdown(duration);
    setShowVerifying(true);
  };

  if (showVerifying) {
    const progress = done ? 100 : Math.max(5, 100 - (countdown / 60) * 100);
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--color-bg)]">
        <div className="text-center max-w-sm w-full">
          {done ? (
            <>
              <div className="text-6xl mb-4">✅</div>
              <h1 className="text-2xl font-bold text-[var(--color-text)] mb-2">{product.successTitle}</h1>
              <p className="text-[var(--color-text-light)]">{product.successText}</p>
            </>
          ) : (
            <>
              <div className="text-5xl mb-6 animate-pulse">⏳</div>
              <h1 className="text-xl font-bold text-[var(--color-text)] mb-2">Verificam plata ta...</h1>
              <p className="text-sm text-[var(--color-text-light)] mb-6">
                Se confirma tranzactia Revolut — va rugam asteptati
              </p>
              <div className="w-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-full h-2 mb-4 overflow-hidden">
                <div className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-1000"
                  style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-[var(--color-text-light)]">{countdown}s ramas</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 px-4 bg-[var(--color-bg)]">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[var(--color-primary)]">{product.title}</h1>
          <p className="text-sm text-[var(--color-text-light)] mt-1">{product.subtitle}</p>
        </div>

        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between py-3 border-b border-[var(--color-border)] mb-3">
            <span className="text-[var(--color-text)] font-medium">{product.planName}</span>
            <span className="text-[var(--color-primary)] font-bold text-xl">{PRICE_RON} RON{product.priceSuffix}</span>
          </div>
          <ul className="space-y-2 text-sm text-[var(--color-text-light)]">
            {product.benefits.map(b => <li key={b}>✓ {b}</li>)}
          </ul>
        </div>

        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4 mb-4">
          <p className="text-sm text-[var(--color-text-light)] mb-2">
            Trimite <strong className="text-[var(--color-text)]">{PRICE_RON} RON</strong> in aplicatia Revolut la:
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-[var(--color-bg)] text-[var(--color-text)] font-mono text-sm px-3 py-2 rounded-lg border border-[var(--color-border)]">
              {REVOLUT_USER}
            </code>
            <button onClick={() => navigator.clipboard.writeText(REVOLUT_USER)}
              className="text-xs bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white px-3 py-2 rounded-lg transition-colors whitespace-nowrap">
              Copiaza
            </button>
          </div>
          <p className="text-xs text-[var(--color-text-light)] mt-2">
            Deschide Revolut → Trimite bani → cauta <strong>{REVOLUT_USER}</strong>
          </p>
        </div>

        <div className="mb-4">
          <input type="text" value={reference} onChange={e => setReference(e.target.value)}
            placeholder="Referinta tranzactie (optional)"
            className="w-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
        </div>

        {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>}

        <button onClick={handlePay} disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-4 rounded-xl font-bold text-base transition-colors">
          {loading ? 'Se proceseaza...' : `✅ Am platit — ${product.payLabel}`}
        </button>

        <div className="mt-6 text-center">
          <Link href="/dashboard" className="text-sm text-[var(--color-text-light)] hover:text-[var(--color-text)]">
            ← Inapoi la dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
