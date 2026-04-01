'use client';

interface Props {
  href: string;
  type: 'afterschool' | 'club';
  itemId: number;
  itemName: string;
  linkType: string;
  target?: string;
  rel?: string;
  className?: string;
  children: React.ReactNode;
}

export default function TrackedLink({ href, type, itemId, itemName, linkType, target, rel, className, children }: Props) {
  const track = () => {
    const body = JSON.stringify({ type, item_id: itemId, item_name: itemName, link_type: linkType });
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/click', new Blob([body], { type: 'application/json' }));
    } else {
      fetch('/api/analytics/click', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    }
  };

  return (
    <a href={href} target={target} rel={rel} onClick={track} className={className}>
      {children}
    </a>
  );
}
