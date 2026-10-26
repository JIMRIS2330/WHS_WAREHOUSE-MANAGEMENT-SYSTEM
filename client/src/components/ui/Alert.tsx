import React from 'react';
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface AlertProps {
  type?: 'error' | 'warning' | 'success' | 'info';
  title?: string;
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  type = 'info',
  title,
  message,
  onDismiss,
  className
}) => {
  const styles = {
    error: 'bg-rose-950/50 border-rose-800/80 text-rose-200',
    warning: 'bg-amber-950/50 border-amber-800/80 text-amber-200',
    success: 'bg-emerald-950/50 border-emerald-800/80 text-emerald-200',
    info: 'bg-sky-950/50 border-sky-800/80 text-sky-200'
  };

  const icons = {
    error: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
    warning: <TriangleAlert className="w-5 h-5 text-amber-400 shrink-0" />,
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
    info: <Info className="w-5 h-5 text-sky-400 shrink-0" />
  };

  return (
    <div
      className={twMerge(
        clsx(
          'flex items-start gap-3 p-4 rounded-xl border transition-all shadow-sm',
          styles[type],
          className
        )
      )}
    >
      {icons[type]}
      <div className="flex-1">
        {title && <h4 className="text-sm font-semibold mb-0.5 tracking-tight">{title}</h4>}
        <p className="text-xs leading-relaxed opacity-90">{message}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-white transition-colors p-1 rounded-md"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
