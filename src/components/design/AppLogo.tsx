import { Stethoscope } from 'lucide-react';

interface AppLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  className?: string;
}

const sizes = {
  sm: { icon: 20, box: 'w-8 h-8', title: 'text-sm', sub: 'text-[9px]' },
  md: { icon: 22, box: 'w-10 h-10', title: 'text-base', sub: 'text-[10px]' },
  lg: { icon: 28, box: 'w-12 h-12', title: 'text-lg', sub: 'text-[11px]' },
};

export function AppLogo({ size = 'md', showTagline = true, className = '' }: AppLogoProps) {
  const s = sizes[size];
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className={`${s.box} rounded-xl bg-brand-navy flex items-center justify-center text-white shadow-sm`}
      >
        <Stethoscope size={s.icon} strokeWidth={2.2} />
      </div>
      <div className="leading-tight">
        <div className={`${s.title} font-bold text-brand-navy tracking-wide`}>AIDEX</div>
        {showTagline && (
          <div className={`${s.sub} font-medium text-slate-400 tracking-widest uppercase`}>
            DENTAL CLINIC
          </div>
        )}
      </div>
    </div>
  );
}
