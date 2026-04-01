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
  const trackHref = `/api/track?type=${type}&id=${itemId}&name=${encodeURIComponent(itemName)}&lt=${linkType}&url=${encodeURIComponent(href)}`;

  return (
    <a href={trackHref} target={target} rel={rel} className={className}>
      {children}
    </a>
  );
}
