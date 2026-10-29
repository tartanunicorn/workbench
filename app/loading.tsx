import { Skeleton } from "@/components/ui-kit/skeleton";

// Shown the moment a link is clicked, while the next page asks the database for its data
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <Skeleton className="mb-2 h-6 w-40" />
      <Skeleton className="mb-5 h-4 w-96 max-w-full" />
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
      <Skeleton className="h-[60vh] rounded-xl" />
    </div>
  );
}
