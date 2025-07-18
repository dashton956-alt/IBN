
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface LoadingCardProps {
  showHeader?: boolean;
  rows?: number;
}

export const LoadingCard = ({ showHeader = true, rows = 3 }: LoadingCardProps) => {
  return (
    <Card className="bg-black/20 backdrop-blur-sm border-white/10">
      {showHeader && (
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-3/4 bg-white/10" />
          <Skeleton className="h-4 w-1/2 bg-white/5" />
        </CardHeader>
      )}
      <CardContent className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full bg-white/10" />
        ))}
      </CardContent>
    </Card>
  );
};
