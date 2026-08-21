const FB_PAGE_URL = 'https://www.facebook.com/profile.php?id=61591256207467';

// hideCount (implicit true): foloseste plugin-ul oficial "Follow Button" (doar buton, fara nr.
// de urmaritori) in loc de plugin-ul "Page" (care afiseaza si contorul) - numarul mic actual de
// urmaritori da o impresie proasta despre marimea afacerii; se poate reveni la implicit false
// cand numarul de urmaritori creste semnificativ.
export default function FacebookFollow({ hideCount = true }: { hideCount?: boolean }) {
  if (hideCount) {
    const src = `https://www.facebook.com/plugins/follow.php?href=${encodeURIComponent(FB_PAGE_URL)}&layout=button&size=large`;
    return (
      <div className="flex flex-col items-center gap-2 py-4 border-t border-[var(--color-border)]">
        <p className="text-sm font-semibold text-[var(--color-text-main)]">Urmărește-ne pe Facebook</p>
        <iframe
          src={src}
          width="180"
          height="40"
          style={{ border: 'none', overflow: 'hidden', maxWidth: '100%' }}
          scrolling="no"
          loading="lazy"
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
        />
      </div>
    );
  }

  const src = `https://www.facebook.com/plugins/page.php?href=${encodeURIComponent(FB_PAGE_URL)}&tabs=&width=280&height=213&small_header=true&adapt_container_width=true&show_facepile=true`;

  return (
    <div className="flex flex-col items-center gap-2 py-4 border-t border-[var(--color-border)]">
      <p className="text-sm font-semibold text-[var(--color-text-main)]">Urmărește-ne pe Facebook</p>
      <iframe
        src={src}
        width="280"
        height="213"
        style={{ border: 'none', overflow: 'hidden', maxWidth: '100%' }}
        scrolling="no"
        loading="lazy"
        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
      />
    </div>
  );
}
