import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  description?: string;
  trend?: {
    value: number;
    label: string;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'destructive';
  className?: string;
}

const variantStyles = {
  default: {
    icon: 'bg-muted text-foreground',
    trend: 'text-muted-foreground',
  },
  primary: {
    icon: 'bg-primary/10 text-primary',
    trend: 'text-primary',
  },
  success: {
    icon: 'bg-success/10 text-success',
    trend: 'text-success',
  },
  warning: {
    icon: 'bg-warning/10 text-warning',
    trend: 'text-warning',
  },
  destructive: {
    icon: 'bg-destructive/10 text-destructive',
    trend: 'text-destructive',
  },
};

export function StatCard({
  title,
  value,
  icon,
  description,
  trend,
  variant = 'default',
  className,
}: StatCardProps) {
  const styles = variantStyles[variant];

  return (
    <div className={cn('stat-card', className)}>
      <div className="flex items-start justify-between">
        <div className={cn('p-3 rounded-xl', styles.icon)}>
          {icon}
        </div>
        {trend && (
          <div className={cn(
            'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
            trend.value > 0 ? 'bg-success/10 text-success' : 
            trend.value < 0 ? 'bg-destructive/10 text-destructive' : 
            'bg-muted text-muted-foreground'
          )}>
            {trend.value > 0 ? <TrendingUp className="w-3 h-3" /> : 
             trend.value < 0 ? <TrendingDown className="w-3 h-3" /> : 
             <Minus className="w-3 h-3" />}
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-3xl font-bold text-foreground tracking-tight">{value}</p>
        <p className="text-sm font-medium text-muted-foreground mt-1">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground/70 mt-1">{description}</p>
        )}
      </div>
      {trend && (
        <p className="text-xs text-muted-foreground mt-3">{trend.label}</p>
      )}
    </div>
  );
}
