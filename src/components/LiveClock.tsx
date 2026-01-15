import { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface LiveClockProps {
  className?: string;
  showSeconds?: boolean;
  showDate?: boolean;
}

export function LiveClock({ className, showSeconds = true, showDate = false }: LiveClockProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={className}>
      <div className="text-4xl md:text-5xl font-bold tracking-tight text-foreground tabular-nums">
        {format(time, showSeconds ? 'hh:mm:ss' : 'hh:mm')}
        <span className="text-lg md:text-xl font-medium text-muted-foreground ml-2">
          {format(time, 'a')}
        </span>
      </div>
      {showDate && (
        <p className="text-muted-foreground mt-2 font-medium">
          {format(time, 'EEEE, MMMM d, yyyy')}
        </p>
      )}
    </div>
  );
}
