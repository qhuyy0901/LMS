import { useEffect, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { resolveMediaUrl } from '../utils/mediaUrl';

export default function EventImage({ src, alt, className = '', placeholderClassName = '' }) {
  const resolvedSrc = resolveMediaUrl(src);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [resolvedSrc]);

  if (!resolvedSrc || failed) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-indigo-100 ${placeholderClassName || className}`}>
        <div className="text-center text-purple-300">
          <CalendarDays className="mx-auto h-10 w-10" />
          <p className="mt-2 text-xs font-semibold">Ảnh sự kiện</p>
        </div>
      </div>
    );
  }

  return <img src={resolvedSrc} alt={alt} className={className} onError={() => setFailed(true)} />;
}
