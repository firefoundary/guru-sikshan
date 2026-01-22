import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { IssueStatus } from "@/contexts/FeedbackContext";

interface StatusBadgeProps {
  status: IssueStatus | string; // Allow string to prevent crash on unknown types
  className?: string;
}

// Configuration for each known status
const statusConfig: Record<string, { label: string; className: string }> = {
  pending: {
    label: "Pending",
    className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-300",
  },
  in_review: {
    label: "In Review",
    className: "bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300",
  },
  resolved: {
    label: "Resolved",
    className: "bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300",
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  // 🛡️ SAFETY NET: If status is unknown, default to 'pending' style or a generic gray
  const config = statusConfig[status] || {
    label: status?.replace('_', ' ') || "Unknown",
    className: "bg-gray-100 text-gray-800 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300"
  };

  return (
    <Badge 
      variant="outline" 
      className={cn("font-medium border-0", config.className, className)}
    >
      {config.label}
    </Badge>
  );
}