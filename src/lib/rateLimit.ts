// Throttle simplu, in memorie, per proces Node (se reseteaza la `pm2 restart` - acceptabil pentru
// scopul actual). Primul endpoint din proiect cu cost real pe apel (cheama Claude), deci primul
// care are nevoie de asa ceva - restul rutelor publice (vezi CLAUDE.md) nu au niciun rate limiting.
// Nu tinta sa fie robust la scalare orizontala (mai multe procese pm2) - daca se ajunge acolo,
// migreaza la un tabel SQLite sau la un store partajat.

const buckets = new Map<string, number[]>();

// Curatare ocazionala ca Map-ul sa nu creasca nelimitat cu IP-uri vechi.
let lastSweep = Date.now();
function sweep(windowMs: number) {
  const now = Date.now();
  if (now - lastSweep < windowMs) return;
  lastSweep = now;
  for (const [key, hits] of buckets) {
    const fresh = hits.filter((t) => now - t < windowMs);
    if (fresh.length === 0) buckets.delete(key);
    else buckets.set(key, fresh);
  }
}

// true = permis (si inregistreaza hitul curent). false = peste limita.
export function allow(key: string, limit: number, windowMs: number): boolean {
  sweep(windowMs);
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  return true;
}

// IP-ul clientului dintr-un Request Next.js, avand in vedere ca ruleaza in spatele unui proxy
// (nginx pe VPS) - acelasi tip de extragere ca headerele standard forwarded-for.
export function clientIp(request: Request): string {
  // X-Real-IP intai: nginx il seteaza direct din $remote_addr (proxy_set_header il suprascrie
  // mereu, indiferent ce trimite clientul). X-Forwarded-For foloseste $proxy_add_x_forwarded_for,
  // care DOAR ADAUGA la valoarea existenta - un client care trimite el insusi acest header poate
  // pune o valoare falsa pe prima pozitie, iar IP-ul real al lui nginx ajunge la coada listei.
  // Daca am lua primul element din XFF (ca inainte), oricine ar putea ocoli throttle-ul de mai jos
  // trimitand un X-Forwarded-For diferit la fiecare cerere. XFF ramane doar fallback pt. medii fara
  // acest header (ex. testare locala fara nginx in fata).
  const real = request.headers.get('x-real-ip');
  if (real) return real.trim();
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return 'unknown';
}
