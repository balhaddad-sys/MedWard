export function LabResultSkeleton() {
  return (
    <div className="flex flex-col py-3.5 px-4 border-b border-slate-50 animate-pulse">
      <div className="flex justify-between items-center mb-2">
        <div className="flex flex-col gap-1.5">
          <div className="h-4 bg-slate-200 rounded w-24" />
          <div className="h-2.5 bg-slate-100 rounded w-12" />
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="h-6 bg-slate-200 rounded w-16" />
          <div className="h-2.5 bg-slate-100 rounded w-8" />
        </div>
      </div>
      <div className="mt-2 w-full">
        <div className="h-1.5 bg-slate-100 rounded-full w-full overflow-hidden">
          <div className="h-full bg-slate-200 w-1/3 animate-shimmer" />
        </div>
      </div>
    </div>
  )
}

export function LabPanelSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
        <div className="h-5 bg-slate-200 rounded w-32 animate-pulse" />
        <span className="text-xs font-medium text-indigo-600 animate-pulse">Processing AI...</span>
      </div>
      <div className="divide-y divide-slate-50">
        {Array.from({ length: rows }).map((_, i) => (
          <LabResultSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
