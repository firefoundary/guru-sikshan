import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  trend?: number;
  trendLabel?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
}

export function StatCard({ 
  title, 
  value, 
  trend, 
  trendLabel = 'vs last month',
  icon: Icon,
  iconColor = 'text-primary',
  iconBgColor = 'bg-primary/10'
}: StatCardProps) {
  const isPositive = trend !== undefined && trend >= 0;
  
  return (
    <div className="dashboard-card group cursor-default">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          
          {trend !== undefined && (
            <div className="flex items-center gap-1.5">
              {isPositive ? (
                <TrendingUp size={16} className="text-success" />
              ) : (
                <TrendingDown size={16} className="text-destructive" />
              )}
              <span className={`text-sm font-medium ${isPositive ? 'text-success' : 'text-destructive'}`}>
                {isPositive ? '+' : ''}{trend}%
              </span>
              <span className="text-xs text-muted-foreground">{trendLabel}</span>
            </div>
          )}
        </div>
        
        <div className={`p-3 rounded-2xl ${iconBgColor} transition-transform group-hover:scale-110`}>
          <Icon size={24} className={iconColor} />
        </div>
      </div>
    </div>
  );
}

export default StatCard;
