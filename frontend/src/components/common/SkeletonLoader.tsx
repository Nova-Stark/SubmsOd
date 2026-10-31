import React from 'react'

export const SkeletonLoader: React.FC<{ rows?: number }> = ({ rows = 4 }) => {
  return (
    <div className="space-y-3 w-full animate-pulse p-4 bg-white rounded-lg border border-slate-200">
      <div className="h-4 bg-slate-200 rounded w-1/4 mb-4" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 items-center">
          <div className="h-4 bg-slate-100 rounded w-1/3" />
          <div className="h-4 bg-slate-100 rounded w-1/4" />
          <div className="h-4 bg-slate-100 rounded w-1/6" />
          <div className="h-4 bg-slate-100 rounded w-1/6" />
        </div>
      ))}
    </div>
  )
}
