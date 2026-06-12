import { useEffect, useMemo, useState } from 'react';
import { resolveMediaUrl } from '../utils/mediaUrl';

export default function UserAvatar({ src, name, className = 'h-10 w-10 rounded-full', fallbackClassName = '' }) {
  const resolvedSrc = resolveMediaUrl(src);
  const [failed, setFailed] = useState(false);
  const initials = useMemo(
    () => (name || 'U')
      .split(' ')
      .filter(Boolean)
      .slice(-2)
      .map((part) => part[0])
      .join('')
      .toUpperCase(),
    [name]
  );

  useEffect(() => {
    setFailed(false);
  }, [resolvedSrc]);

  if (resolvedSrc && !failed) {
    return <img src={resolvedSrc} alt={name || 'Ảnh đại diện'} className={`${className} object-cover`} onError={() => setFailed(true)} />;
  }

  return (
    <span className={`inline-flex items-center justify-center bg-gradient-to-br from-pink-300 to-purple-500 font-bold text-white ${className} ${fallbackClassName}`}>
      {initials}
    </span>
  );
}
