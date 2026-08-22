import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <main className="min-h-screen bg-warm-paper">
      <div className="mx-auto max-w-3xl px-8 py-12">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <Skeleton className="h-3 w-48" />
            <Skeleton className="mt-3 h-10 w-full" />
          </div>
          <Skeleton className="h-14 w-14" />
        </div>
        <Skeleton className="mt-10 h-6 w-40" />
        <div className="mt-5 flex flex-col gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    </main>
  );
}
