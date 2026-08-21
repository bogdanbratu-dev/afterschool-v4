'use client';

import { useState } from 'react';

interface LockedContactButtonProps {
  className?: string;
  children: React.ReactNode;
  label: string;
}

// Buton de contact pentru listari cu telefon/email ascunse: pastreaza aspectul normal al
// butonului, dar la click arata temporar de ce nu poate fi folosit, in loc sa dispara din pagina.
export default function LockedContactButton({ className, children, label }: LockedContactButtonProps) {
  const [locked, setLocked] = useState(false);

  function handleClick() {
    setLocked(true);
    setTimeout(() => setLocked(false), 2500);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title="Devine vizibil dupa activarea gratuita a listarii sau cu Premium"
      className={className}
    >
      {locked ? (
        <span className="inline-flex items-center gap-1.5">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          {label} indisponibil
        </span>
      ) : children}
    </button>
  );
}
