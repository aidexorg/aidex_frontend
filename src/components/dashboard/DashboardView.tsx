import { SkeletonProfileList } from '../Skeleton';
import { useDashboardData } from './useDashboardData';
import { DashboardHeader } from './DashboardHeader';
import { StatsCards } from './StatsCards';
import { StatusBreakdown } from './StatusBreakdown';
import { ChairStatusBoard } from './ChairStatusBoard';
import { ArrivalsQueue } from './ArrivalsQueue';
import { BalanceAlerts } from './BalanceAlerts';
import { FinancialMetricsCard } from './FinancialMetrics';
import { ARAging } from './ARAging';
import { MonthlySummaryCard } from './MonthlySummaryCard';
import { ProductionByDentist } from './ProductionByDentist';
import { ProductionByType } from './ProductionByType';
import { QuickActions } from './QuickActions';
import { TodayAppointments } from './TodayAppointments';
import { QuickStatsFooter } from './QuickStatsFooter';
import type { Profile } from '@/types';

interface DashboardViewProps {
  onOpenProfile?: (profile: Profile) => void;
  onNavigate?: (view: 'profiles' | 'appointments' | 'payments' | 'followups' | 'reports' | 'outputs' | 'arrivals' | 'dashboard') => void;
}

export function DashboardView({ onOpenProfile, onNavigate }: DashboardViewProps) {
  const {
    appointments,
    loading,
    account,
    financial,
    arItems,
    monthly,
    dentistProd,
    typeProd,
    balanceAlerts,
    stats,
    chairStatuses,
    arrivals,
    balanceByProfileId,
    handleStartTreatment,
  } = useDashboardData();

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonProfileList count={3} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardHeader displayName={account?.display_name ?? null} />

      <StatsCards stats={stats} />

      <StatusBreakdown stats={stats} />

      <ChairStatusBoard chairStatuses={chairStatuses} />

      <ArrivalsQueue
        arrivals={arrivals}
        onStartTreatment={handleStartTreatment}
        onNavigate={onNavigate ? () => onNavigate('arrivals') : undefined}
      />

      <BalanceAlerts
        alerts={balanceAlerts}
        onNavigate={onNavigate ? () => onNavigate('payments') : undefined}
      />

      <FinancialMetricsCard financial={financial} />

      <ARAging arItems={arItems} />

      <MonthlySummaryCard monthly={monthly} />

      <ProductionByDentist dentistProd={dentistProd} />

      <ProductionByType typeProd={typeProd} />

      <QuickActions onNavigate={onNavigate} />

      <TodayAppointments
        appointments={appointments}
        balanceByProfileId={balanceByProfileId}
        onOpenProfile={onOpenProfile}
        onNavigate={onNavigate ? () => onNavigate('appointments') : undefined}
      />

      <QuickStatsFooter stats={stats} />
    </div>
  );
}
