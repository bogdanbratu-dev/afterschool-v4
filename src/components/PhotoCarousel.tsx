'use client';
import { useState, useEffect, useRef } from 'react';

export default function PhotoCarousel({ photos, name }: { photos: string[]; name: string }) {
  const [idx, setIdx] = useState(0);
  const hovered = useRef(false);

  useEffect(() => {
    if (photos.length <= 1) return;
    const interval = setInterval(() => {
      if (!hovered.current) setIdx(i => (i + 1) % photos.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [photos.length]);

  if (!photos.length) return null;

  return (
    <div
      className="relative rounded-xl overflow-hidden bg-gray-100 mb-5"
      onMouseEnter={() => { hovered.current = true; }}
      onMouseLeave={() => { hovered.current = false; }}
    >
      <img
        src={photos[idx]}
        alt={`${name} — foto ${idx + 1}`}
        className="w-full h-56 sm:h-64 object-cover"
      />
      {photos.length > 1 && (
        <>
          <button
            onClick={() => setIdx((idx - 1 + photos.length) % photos.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full w-9 h-9 flex items-center justify-center text-lg font-bold"
            aria-label="Poza anterioara"
          >‹</button>
          <button
            onClick={() => setIdx((idx + 1) % photos.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full w-9 h-9 flex items-center justify-center text-lg font-bold"
            aria-label="Poza urmatoare"
          >›</button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {photos.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`w-2 h-2 rounded-full transition-colors ${i === idx ? 'bg-white' : 'bg-white/50'}`}
                aria-label={`Foto ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
