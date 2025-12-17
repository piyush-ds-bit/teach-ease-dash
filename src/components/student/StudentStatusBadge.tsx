import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { StudentStatus, getStatusInfo } from "@/lib/statusCalculation";
import { Circle } from "lucide-react";

interface StudentStatusBadgeProps {
  status: StudentStatus;
  showTooltip?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const StudentStatusBadge = ({ 
  status, 
  showTooltip = true,
  size = 'md' 
}: StudentStatusBadgeProps) => {
  const statusInfo = getStatusInfo(status);
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1',
  };
  
  const iconSizes = {
    sm: 'h-2 w-2',
    md: 'h-2.5 w-2.5',
    lg: 'h-3 w-3',
  };

  const badge = (
    <Badge 
      variant="secondary" 
      className={`${statusInfo.bgColor} ${statusInfo.color} ${sizeClasses[size]} font-medium flex items-center gap-1.5`}
    >
      <Circle className={`${iconSizes[size]} fill-current`} />
      {statusInfo.label}
    </Badge>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent>
          <p>{statusInfo.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
