import { useState } from 'react';
import { LayoutDashboard, BarChart3 } from 'lucide-react';
import { SkeletonProfileList } from '../Skeleton';
import { useDashboardData } from './useDashboardData';
import { DashboardHeader } from './DashboardHeader';
import { StatsCards } from './StatsCards';
import { ChairStatusBoard } from './ChairStatusBoard';
import { ArrivalsQueue } from './ArrivalsQueue';
import { BalanceAlerts } from './BalanceAlerts';
import { QuickActions } from './QuickActions';
import { TodayAppointments } from './TodayAppointments';
import { FinancialMetricsCard } from './FinancialMetrics';
import { ARAging } from './ARAging';
import { MonthlySummaryCard } from './MonthlySummaryCard';
import { ProductionByDentist } from './ProductionByDentist';
import { ProductionByType } from './ProductionByType';
import { QuickStatsFooter } from './QuickStatsFooter';
import { StatusBreakdown } from './StatusBreakdown';
import type { Profile } from '@/types';

type Tab = 'dashboard' | 'reports';

interface DashboardViewProps {
  onOpenProfile?: (profile: Profile) => void;
  onNavigate?: (view: 'profiles' | 'appointments' | 'payments' | 'followups' | 'reports' | 'outputs' | 'arrivals' | 'dashboard') => void;
}

export function DashboardView({ onOpenProfile, onNavigate }: DashboardViewProps) {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
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
    <div className="flex flex-col h-full">
      <DashboardHeader displayName={account?.display_name ?? null} />

      {/* Tab bar */}
      <div className="flex items-center gap-1 mt-4 mb-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            activeTab === 'dashboard'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <LayoutDashboard size={16} />
          داشبورد
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            activeTab === 'reports'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <BarChart3 size={16} />
          گزارش‌ها
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'dashboard' ? (
        /* ═══════════════════════════════════════════
           Operational tab — viewport-fitting grid
           ═══════════════════════════════════════════ */
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 auto-rows-min content-start overflow-y-auto">
          {/* Row 1: Stats + Chairs */}
          <div className="lg:col-span-5 space-y-4">
            <StatsCards stats={stats} />
            <QuickActions onNavigate={onNavigate as ((view: string) => void) | undefined} />
          </div>
          <div className="lg:col-span-7">
            <ChairStatusBoard chairStatuses={chairStatuses} />
          </div>

          {/* Row 2: Arrivals + Balance */}
          <div className="lg:col-span-6">
            <ArrivalsQueue
              arrivals={arrivals}
              onStartTreatment={handleStartTreatment}
              onNavigate={onNavigate ? () => onNavigate('arrivals') : undefined}
            />
          </div>
          <div className="lg:col-span-6">
            <BalanceAlerts
              alerts={balanceAlerts}
              onNavigate={onNavigate ? () => onNavigate('payments') : undefined}
            />
          </div>

          {/* Row 3: Today's appointments (full width, compact) */}
          <div className="lg:col-span-12">
            <TodayAppointments
              appointments={appointments}
              balanceByProfileId={balanceByProfileId}
              onOpenProfile={onOpenProfile}
              onNavigate={onNavigate ? () => onNavigate('appointments') : undefined}
              maxItems={5}
            />
          </div>
        </div>
      ) : (
        /* ═══════════════════════════════════════════
           Reports tab — analytics & summaries
           ═══════════════════════════════════════════ */
        <div className="flex-1 space-y-6 overflow-y-auto">
          <StatusBreakdown stats={stats} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <FinancialMetricsCard financial={financial} />
            <MonthlySummaryCard monthly={monthly} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ProductionByDentist dentistProd={dentistProd} />
            <ProductionByType typeProd={typeProd} />
          </div>

          <ARAging arItems={arItems} />

          <QuickStatsFooter stats={stats} />
        </div>
      )}
    </div>
  );
}
