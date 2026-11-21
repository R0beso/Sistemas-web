import type { StatusCount } from "@/lib/types";
import { STATUS_META } from "@/lib/constants";

export function StatusDonut({ data }: { data: StatusCount[] }) {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  const size = 172;
  const stroke = 20;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  let cursor = 0;
  const segments = data
    .filter((item) => item.count > 0)
    .map((item) => {
      const length = total > 0 ? (item.count / total) * circumference : 0;
      const segment = { ...item, length, offset: cursor };
      cursor += length;
      return segment;
    });

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      <div className="relative shrink-0">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
          role="img"
          aria-label={`Distribución de ${total} tickets por estado`}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#eef2f7"
            strokeWidth={stroke}
          />
          {segments.map((segment) => {
            const visibleLength = Math.max(segment.length - 3, 0.5);
            return (
              <circle
                key={segment.status}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={STATUS_META[segment.status].color}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={`${visibleLength} ${circumference - visibleLength}`}
                strokeDashoffset={-segment.offset}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold tracking-tight text-slate-900">{total}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            tickets
          </span>
        </div>
      </div>

      <ul className="w-full space-y-2.5">
        {data.map((item) => {
          const meta = STATUS_META[item.status];
          const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0;
          return (
            <li key={item.status} className="flex items-center gap-2.5 text-xs">
              <span className={`h-2 w-2 shrink-0 rounded-full ${meta.dot}`} />
              <span className="flex-1 font-medium text-slate-600">{meta.label}</span>
              <span className="font-semibold text-slate-900">{item.count}</span>
              <span className="w-8 text-right text-[10px] text-slate-400">{percentage}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function WeeklyBars({ data }: { data: Array<{ label: string; value: number }> }) {
  const max = Math.max(1, ...data.map((item) => item.value));
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div>
      <div className="mb-5 flex items-baseline gap-2">
        <span className="text-3xl font-bold tracking-tight text-slate-900">{total}</span>
        <span className="text-xs text-slate-500">tickets creados en 7 días</span>
      </div>
      <div className="flex h-40 items-end gap-2 sm:gap-3">
        {data.map((item) => {
          const percentage = item.value === 0 ? 0 : Math.max(8, (item.value / max) * 100);
          return (
            <div key={item.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
              <span className="text-[10px] font-semibold text-slate-500">{item.value}</span>
              <div className="flex w-full flex-1 items-end">
                <div
                  className={`w-full rounded-t-lg transition-all ${
                    item.value === 0
                      ? "bg-slate-100"
                      : "bg-gradient-to-t from-indigo-600 to-violet-400"
                  }`}
                  style={{ height: item.value === 0 ? "4px" : `${percentage}%` }}
                  title={`${item.value} tickets`}
                />
              </div>
              <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
