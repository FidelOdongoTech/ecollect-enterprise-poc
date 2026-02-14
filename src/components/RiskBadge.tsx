import { AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import { calculateRisk } from '../utils/riskLogic';

interface RiskBadgeProps {
  dpd: number;
  status?: string;
  showIcon?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export function RiskBadge({ dpd, status, showIcon = false, size = 'sm' }: RiskBadgeProps) {
  const risk = calculateRisk(dpd, status);
  
  const sizeClasses = {
    xs: 'text-[9px] px-1.5 py-0.5 gap-1',
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-[11px] px-2.5 py-1 gap-1.5',
    lg: 'text-[12px] px-3 py-1.5 gap-1.5'
  };

  const iconSizes = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4'
  };

  const config = {
    CRITICAL: {
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200',
      icon: AlertTriangle
    },
    HIGH: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      icon: AlertCircle
    },
    LOW: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      icon: CheckCircle
    }
  };

  const { bg, text, border, icon: Icon } = config[risk.level];

  return (
    <span
      className={`inline-flex items-center font-semibold rounded border uppercase tracking-wide ${bg} ${text} ${border} ${sizeClasses[size]}`}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {risk.level}
    </span>
  );
}
