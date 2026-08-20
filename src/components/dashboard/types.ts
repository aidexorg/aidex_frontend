import type { Profile, Appointment, AppointmentStatus } from '@/types';

export interface DashboardViewProps {
  onOpenProfile?: (profile: Profile) => void;
  onNavigate?: (view: 'profiles' | 'appointments' | 'payments' | 'followups' | 'reports' | 'outputs' | 'arrivals' | 'dashboard') => void;
}

export interface AppointmentWithProfile extends Appointment {
  profile: Profile | null;
}

export interface FinancialMetrics {
  production: number;
  collections: number;
}

export interface ChairStatus {
  id: string;
  label: string;
  current: AppointmentWithProfile | null;
  upcoming: AppointmentWithProfile | null;
  status: 'occupied' | 'next_up' | 'empty';
}

export interface ARItem {
  profile: Profile;
  balance: number;
  daysOverdue: number;
}

export interface DailyTotal {
  date: string;
  production: number;
  collections: number;
}

export interface MonthlySummary {
  production: number;
  collections: number;
  rate: number;
  prevProduction: number;
  prevCollections: number;
  dailyTotals: DailyTotal[];
}

export interface DentistProd {
  dentistId: string;
  name: string;
  production: number;
}

export interface TypeProd {
  type: string;
  label: string;
  production: number;
}

export interface BalanceAlert {
  appointment: AppointmentWithProfile;
  balance: number;
  daysOverdue: number;
}

export interface DashboardStats {
  total: number;
  scheduled: number;
  confirmed: number;
  arrived: number;
  in_progress: number;
  completed: number;
  no_show: number;
  cancelled: number;
  upcoming: number;
  active: number;
}
