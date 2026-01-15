import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: 'present' | 'late' | 'early_exit' | 'absent' | string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusConfig = {
    present: {
      label: 'Present',
      className: 'bg-success/10 text-success border-success/20',
    },
    late: {
      label: 'Late',
      className: 'bg-warning/10 text-warning border-warning/20',
    },
    early_exit: {
      label: 'Early Exit',
      className: 'bg-warning/10 text-warning border-warning/20',
    },
    absent: {
      label: 'Absent',
      className: 'bg-destructive/10 text-destructive border-destructive/20',
    },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || {
    label: status,
    className: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
