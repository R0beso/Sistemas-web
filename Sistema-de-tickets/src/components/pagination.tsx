import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

function buildHref(
  basePath: string,
  params: Record<string, string | undefined>,
  page: number,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && key !== "page") search.set(key, value);
  }
  if (page > 1) search.set("page", String(page));
  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  basePath,
  params,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  if (total === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const pages: Array<number | "ellipsis"> = [];
  if (pageCount <= 7) {
    for (let index = 1; index <= pageCount; index += 1) pages.push(index);
  } else {
    pages.push(1);
    if (page > 3) pages.push("ellipsis");
    for (let index = Math.max(2, page - 1); index <= Math.min(pageCount - 1, page + 1); index += 1) {
      pages.push(index);
    }
    if (page < pageCount - 2) pages.push("ellipsis");
    pages.push(pageCount);
  }

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row">
      <p className="text-xs text-slate-500">
        Mostrando <span className="font-semibold text-slate-700">{from}</span>–
        <span className="font-semibold text-slate-700">{to}</span> de{" "}
        <span className="font-semibold text-slate-700">{total}</span> tickets
      </p>

      <div className="flex items-center gap-1">
        {page > 1 ? (
          <Link
            href={buildHref(basePath, params, page - 1)}
            aria-label="Página anterior"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-100 text-slate-300">
            <ChevronLeft className="h-4 w-4" />
          </span>
        )}

        {pages.map((item, index) =>
          item === "ellipsis" ? (
            <span
              key={`ellipsis-${index}`}
              className="flex h-8 w-8 items-center justify-center text-xs text-slate-400"
            >
              …
            </span>
          ) : (
            <Link
              key={item}
              href={buildHref(basePath, params, item)}
              aria-current={item === page ? "page" : undefined}
              className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-semibold transition ${
                item === page
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/25"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              {item}
            </Link>
          ),
        )}

        {page < pageCount ? (
          <Link
            href={buildHref(basePath, params, page + 1)}
            aria-label="Página siguiente"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-100 text-slate-300">
            <ChevronRight className="h-4 w-4" />
          </span>
        )}
      </div>
    </div>
  );
}
