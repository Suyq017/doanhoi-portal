import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { SourceCard } from './SourceCard';
import type { CtxhSource } from '../types/chat.types';

interface Props {
  sources: CtxhSource[];
}

export function SourceList({ sources }: Props) {
  const [open, setOpen] = useState(false);
  if (!sources.length) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
      >
        <ChevronDown
          size={12}
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        />
        {sources.length} nguồn tham khảo
      </button>
      {open && (
        <div className="mt-1.5 flex flex-col gap-1.5">
          {sources.map((s) => (
            <SourceCard key={s.activityId} source={s} />
          ))}
        </div>
      )}
    </div>
  );
}
