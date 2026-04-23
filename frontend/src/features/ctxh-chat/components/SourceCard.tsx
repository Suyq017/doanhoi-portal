import type { CtxhSource } from '../types/chat.types';

interface Props {
  source: CtxhSource;
}

export function SourceCard({ source }: Props) {
  const pct = Math.round(source.similarityScore * 100);
  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs flex gap-3 items-start">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-blue-900 truncate">
          {source.activityName}
        </p>
        <p className="text-blue-600 truncate">{source.organizationName}</p>
        <div className="mt-1.5 flex items-center gap-1.5">
          <div className="h-1.5 w-20 rounded-full bg-blue-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-blue-500">{pct}% khớp</span>
        </div>
      </div>
      {source.link && (
        <a
          href={source.link}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-blue-600 hover:underline font-medium"
        >
          Xem →
        </a>
      )}
    </div>
  );
}
