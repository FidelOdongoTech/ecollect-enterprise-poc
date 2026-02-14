import { RiskLevel, RiskAssessment } from '@/types';

/**
 * Dynamic Risk Engine
 * Calculates risk based on Days Past Due (DPD) and account status
 * 
 * Risk Levels:
 * - CRITICAL: DPD > 90 or Status "Bankruptcy"
 * - HIGH: DPD > 30
 * - LOW: DPD <= 30
 */
export function calculateRisk(dpd: number, status?: string): RiskAssessment {
  const normalizedStatus = status?.toLowerCase() || '';
  
  // Check for critical conditions first
  if (dpd > 90 || normalizedStatus.includes('bankruptcy') || normalizedStatus.includes('legal')) {
    return {
      level: 'CRITICAL',
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      borderColor: 'border-red-500'
    };
  }
  
  // Check for high risk
  if (dpd > 30) {
    return {
      level: 'HIGH',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      borderColor: 'border-orange-500'
    };
  }
  
  // Default to low risk
  return {
    level: 'LOW',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-500'
  };
}

/**
 * Get risk level description for display
 */
export function getRiskDescription(level: RiskLevel): string {
  switch (level) {
    case 'CRITICAL':
      return 'Immediate action required. Account at high risk of default or legal proceedings.';
    case 'HIGH':
      return 'Elevated risk. Proactive engagement recommended.';
    case 'LOW':
      return 'Standard monitoring. Account within acceptable parameters.';
    default:
      return 'Risk level unknown.';
  }
}

/**
 * Calculate DPD from last payment date
 */
export function calculateDPD(lastPaymentDate: string | Date): number {
  const lastPayment = new Date(lastPaymentDate);
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - lastPayment.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Get priority score for sorting accounts
 */
export function getPriorityScore(dpd: number, balance: number, status?: string): number {
  const risk = calculateRisk(dpd, status);
  let score = 0;
  
  // Risk level weight
  switch (risk.level) {
    case 'CRITICAL':
      score += 1000;
      break;
    case 'HIGH':
      score += 500;
      break;
    case 'LOW':
      score += 100;
      break;
  }
  
  // DPD weight
  score += dpd * 2;
  
  // Balance weight (normalize to reasonable range)
  score += Math.min(balance / 100, 200);
  
  return score;
}
