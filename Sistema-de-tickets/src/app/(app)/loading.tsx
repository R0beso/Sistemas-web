export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse-soft">
      <div className="space-y-2">
        <div className="h-3 w-28 rounded-full bg-slate-200" />
        <div className="h-8 w-64 rounded-lg bg-slate-200" />
        <div className="h-3 w-80 max-w-full rounded-full bg-slate-200" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="card h-[126px] p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <div className="h-2.5 w-20 rounded-full bg-slate-200" />
                <div className="h-7 w-12 rounded-md bg-slate-200" />
              </div>
              <div className="h-10 w-10 rounded-xl bg-slate-100" />
            </div>
            <div className="mt-4 h-2.5 w-36 rounded-full bg-slate-100" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <div className="card h-64 p-6">
            <div className="h-4 w-40 rounded bg-slate-200" />
            <div className="mt-6 flex h-36 items-end gap-3">
              {[40, 65, 30, 80, 55, 90, 45].map((height, index) => (
                <div
                  key={index}
                  className="flex-1 rounded-t-lg bg-slate-100"
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
          </div>
          <div className="card h-80 p-6">
            <div className="h-4 w-36 rounded bg-slate-200" />
            <div className="mt-6 space-y-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="h-8 w-8 rounded-full bg-slate-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-3/4 rounded bg-slate-100" />
                    <div className="h-2.5 w-1/3 rounded bg-slate-100" />
                  </div>
                  <div className="h-6 w-20 rounded-full bg-slate-100" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="card h-72 p-6">
            <div className="h-4 w-32 rounded bg-slate-200" />
            <div className="mx-auto mt-8 h-40 w-40 rounded-full border-[20px] border-slate-100" />
          </div>
          <div className="card h-64 p-6">
            <div className="h-4 w-32 rounded bg-slate-200" />
            <div className="mt-6 space-y-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-3 w-full rounded bg-slate-100" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
