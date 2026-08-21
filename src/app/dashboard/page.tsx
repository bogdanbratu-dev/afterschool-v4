'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const REVOLUT_USER = '@bogdanmxn';
const PRICE_RON = 100;

function toSimpleSlug(name: string) {
  return name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function DashboardPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading'|'noListing'|'paying'|'verifying'>('loading');
  const [countdown, setCountdown] = useState(0);
  const [payDone, setPayDone] = useState(false);
  const [reference, setReference] = useState('');
  const [payError, setPayError] = useState('');
  const [payLoading, setPayLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch('/api/user/me').then(r => r.json()).then(d => {
      if (!d.authenticated) { router.push('/login'); return; }
      fetch('/api/user/my-listing').then(r => r.json()).then(data => {
        if (data.listing) {
          router.replace('/dashboard/' + toSimpleSlug(data.listing.name));
        } else {
          setStatus('noListing');
        }
      });
    });
  }, []);

  useEffect(() => {
    if (status !== 'verifying' || payDone) return;
    if (countdown <= 0) { setPayDone(true); setTimeout(() => router.push('/dashboard'), 1500); return; }
    timerRef.current = setInterval(() => {
      setCountdown(p => { if (p <= 1) { clearInterval(timerRef.current!); return 0; } return p - 1; });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status, countdown, payDone]);

  const handlePay = async () => {
    setPayLoading(true); setPayError('');
    const res = await fetch('/api/user/payment-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference }),
    });
    const data = await res.json();
    setPayLoading(false);
    if (!res.ok) { setPayError(data.error || 'Eroare'); return; }
    const dur = Math.floor(30 + Math.random() * 30);
    setCountdown(dur);
    setStatus('verifying');
  };

  if (status === 'loading') return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
      <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (status === 'verifying') {
    const progress = payDone ? 100 : Math.max(5, 100 - (countdown / 60) * 100);
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--color-bg)]">
        <div className="text-center max-w-sm w-full">
          {payDone ? (
            <>
              <div className="text-6xl mb-4">✅</div>
              <h1 className="text-2xl font-bold text-[var(--color-text)] mb-2">Plata confirmata!</h1>
              <p className="text-[var(--color-text-light)]">Contul Premium a fost activat...</p>
            </>
          ) : (
            <>
              <div className="text-5xl mb-6 animate-pulse">⏳</div>
              <h1 className="text-xl font-bold text-[var(--color-text)] mb-2">Verificam plata ta...</h1>
              <p className="text-sm text-[var(--color-text-light)] mb-6">Se confirma tranzactia Revolut — va rugam asteptati</p>
              <div className="w-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-full h-2 mb-4 overflow-hidden">
                <div className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
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
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[var(--color-primary)]">Bun venit la ActivKids!</h1>
          <p className="text-sm text-[var(--color-text-light)] mt-1">Alege planul potrivit pentru afacerea ta</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-6 flex flex-col">
            <div className="mb-4">
              <span className="text-xs font-bold text-[var(--color-text-light)] uppercase tracking-wide">Gratuit</span>
              <h2 className="text-2xl font-bold text-[var(--color-text)] mt-1">Free</h2>
              <p className="text-3xl font-bold text-[var(--color-primary)] mt-2">0 RON</p>
            </div>
            <ul className="space-y-2 text-sm text-[var(--color-text-light)] mb-6 flex-1">
              <li>✓ Listare in directorul ActivKids</li>
              <li>✓ Pagina proprie cu informatii</li>
              <li className="opacity-40">✗ Parinti te contacteaza direct</li>
              <li className="opacity-40">✗ Pozitie prioritara</li>
              <li className="opacity-40">✗ Badge Premium</li>
            </ul>
            <Link href="/submit"
              className="block w-full py-3 text-center border border-[var(--color-border)] text-[var(--color-text)] font-bold rounded-xl hover:bg-[var(--color-border)] transition-colors">
              Adauga listare gratuita →
            </Link>
          </div>

          <div className="bg-[var(--color-card)] border-2 border-[var(--color-primary)] rounded-2xl p-6 flex flex-col relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-[var(--color-primary)] text-white text-xs font-bold px-3 py-1 rounded-full">RECOMANDAT</span>
            </div>
            <div className="mb-4">
              <span className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-wide">Premium</span>
              <h2 className="text-2xl font-bold text-[var(--color-text)] mt-1">Premium</h2>
              <p className="text-3xl font-bold text-[var(--color-primary)] mt-2">{PRICE_RON} RON<span className="text-base font-normal text-[var(--color-text-light)]">/3 luni</span></p>
            </div>
            <ul className="space-y-2 text-sm mb-4 flex-1">
              <li className="text-[var(--color-text-light)]">✓ Listare in directorul ActivKids</li>
              <li className="text-[var(--color-text-light)]">✓ Pagina proprie cu informatii</li>
              <li className="text-[var(--color-text-light)]">✓ Parinti te contacteaza direct</li>
              <li className="text-[var(--color-text)] font-medium">✓ Pozitie prioritara in rezultate</li>
              <li className="text-[var(--color-text)] font-medium">✓ Badge Premium vizibil</li>
              <li className="text-[var(--color-text)] font-medium">✓ Statistici vizite detaliate</li>
            </ul>

            {status === 'noListing' && (
              <button onClick={() => setStatus('paying')}
                className="w-full py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-bold rounded-xl transition-colors">
                Activeaza Premium →
              </button>
            )}

            {status === 'paying' && (
              <div className="space-y-3">
                <div className="bg-[var(--color-bg)] rounded-xl p-3 border border-[var(--color-border)]">
                  <p className="text-xs text-[var(--color-text-light)] mb-2">Trimite <strong className="text-[var(--color-text)]">{PRICE_RON} RON</strong> in Revolut la:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-[var(--color-text)] font-mono text-sm bg-[var(--color-card)] px-2 py-1.5 rounded-lg border border-[var(--color-border)]">{REVOLUT_USER}</code>
                    <button onClick={() => navigator.clipboard.writeText(REVOLUT_USER)}
                      className="text-xs bg-[var(--color-primary)] text-white px-2 py-1.5 rounded-lg whitespace-nowrap">Copiaza</button>
                  </div>
                </div>
                <input type="text" value={reference} onChange={e => setReference(e.target.value)}
                  placeholder="Referinta tranzactie (optional)"
                  className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
                {payError && <p className="text-xs text-red-500">{payError}</p>}
                <button onClick={handlePay} disabled={payLoading}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors">
                  {payLoading ? 'Se proceseaza...' : '✅ Am platit — activeaza Premium'}
                </button>
                <button onClick={() => setStatus('noListing')}
                  className="w-full py-1.5 text-xs text-[var(--color-text-light)] hover:text-[var(--color-text)]">
                  ← Inapoi
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-[var(--color-text-light)] mt-8">
          Ai deja o listare si vrei sa o revendici?{' '}
          <Link href="/" className="text-[var(--color-primary)] hover:underline">Gaseste-o in director →</Link>
        </p>
      </div>
    </div>
  );
}
