import { Badge } from "@/components/ui/badge";

interface LendingStatusBadgeProps {
  isCleared: boolean;
}

export function LendingStatusBadge({ isCleared }: LendingStatusBadgeProps) {
  if (isCleared) {
    return (
      <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
        Cleared
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
      Active
    </Badge>
  );
}
