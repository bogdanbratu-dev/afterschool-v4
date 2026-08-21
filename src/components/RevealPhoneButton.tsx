'use client';

import { useState } from 'react';

interface RevealPhoneButtonProps {
  phone: string;
  trackHref: string;
  className?: string;
  icon?: React.ReactNode;
  label?: string;
}

// Buton de telefon pentru listari cu numarul vizibil (necontactHidden): nu afiseaza cifrele
// direct pe card, doar dupa ce userul apasa butonul, ca sa nu apara ca text simplu la o
// simpla rasfoire a rezultatelor.
export default function RevealPhoneButton({ phone, trackHref, className, icon, label = 'Vezi telefonul' }: RevealPhoneButtonProps) {
  const [revealed, setRevealed] = useState(false);

  if (revealed) {
    return (
      <a href={trackHref} className={className}>
        {icon}
        {phone}
      </a>
    );
  }

  return (
    <button type="button" onClick={() => setRevealed(true)} className={className}>
      {icon}
      {label}
    </button>
  );
}
