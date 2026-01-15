import { cn } from '@/lib/utils';
import { CheckCircle2, Clock, LogOut, XCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: 'present' | 'late' | 'early_exit' | 'absent' | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const statusConfig: Record<string, { 
  label: string; 
  className: string;
  icon: typeof CheckCircle2;
}> = {
  present: { 
    label: 'Present', 
    className: 'bg-success/10 text-success border-success/20',
    icon: CheckCircle2
  },
  late: { 
    label: 'Late', 
    className: 'bg-warning/10 text-warning border-warning/20',
    icon: Clock
  },
  early_exit: { 
    label: 'Early Exit', 
    className: 'bg-warning/10 text-warning border-warning/20',
    icon: LogOut
  },
  absent: { 
    label: 'Absent', 
    className: 'bg-destructive/10 text-destructive border-destructive/20',
    icon: XCircle
  },
};

const sizeStyles = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-xs px-2.5 py-1',
  lg: 'text-sm px-3 py-1.5',
};

export function StatusBadge({ status, size = 'md', showIcon = true, className }: StatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status,
    className: 'bg-muted text-muted-foreground border-border',
    icon: XCircle
  };
  const Icon = config.icon;

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 font-semibold rounded-full border',
      config.className,
      sizeStyles[size],
      className
    )}>
      {showIcon && <Icon className="w-3 h-3" />}
      {config.label}
    </span>
  );
}
