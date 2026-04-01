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
    // For tel: and external links, delay navigation slightly to allow fetch to fire
    if (href.startsWith('tel:') || href.startsWith('mailto:') || target === '_blank') {
      e.preventDefault();
      fetch('/api/analytics/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, item_id: itemId, item_name: itemName, link_type: linkType }),
        keepalive: true,
      }).catch(() => {}).finally(() => {
        if (target === '_blank') {
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
