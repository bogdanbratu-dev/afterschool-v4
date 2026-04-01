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
  const track = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const isBlank = target === '_blank';
    if (href.startsWith('tel:') || href.startsWith('mailto:') || isBlank) {
      e.preventDefault();
      fetch('/api/analytics/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, item_id: itemId, item_name: itemName, link_type: linkType }),
        keepalive: true,
      }).catch(() => {}).finally(() => {
        if (isBlank) {
          window.open(href, '_blank', 'noopener,noreferrer');
        } else {
          window.location.href = href;
        }
      });
    } else {
      fetch('/api/analytics/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, item_id: itemId, item_name: itemName, link_type: linkType }),
        keepalive: true,
      }).catch(() => {});
    }
  };

  return (
    <a href={href} target={target} rel={rel} onClick={track} className={className}>
      {children}
    </a>
  );
}
