import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowUpRight, ArrowDownRight, LucideIcon } from 'lucide-react';

export interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number | string;
  changeText?: string;
  trend?: 'up' | 'down';
  icon: LucideIcon;
  gradient?: string;
  onClick?: () => void;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  change,
  changeText,
  trend = 'up',
  icon: Icon,
  gradient = 'from-accent-500 to-accent-secondary',
  onClick,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const hoverMotion = shouldReduceMotion ? undefined : { y: -5 };
  const transition = { duration: 0.18, ease: [0.16, 1, 0.3, 1] as const };

  const inner = (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0 space-y-1">
        <p className="text-sm text-white/60 truncate">{title}</p>
        <h2 className="text-2xl font-bold text-white tabular-nums tracking-tight truncate">
          {value}
        </h2>
        <p
          className={`flex items-center gap-1 text-sm tabular-nums ${
            trend === 'down' ? 'text-amber-400' : 'text-accent-400'
          }`}
        >
          {trend === 'down' ? (
            <ArrowDownRight size={16} className="shrink-0" />
          ) : (
            <ArrowUpRight size={16} className="shrink-0" />
          )}
          <span className="truncate">
            {changeText !== undefined ? changeText : `${change ?? 0}%`}
          </span>
        </p>
      </div>

      <div
        className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shrink-0 shadow-lg shadow-black/25`}
      >
        <Icon size={22} />
      </div>
    </div>
  );

  if (onClick) {
    return (
      <motion.button
        type="button"
        onClick={onClick}
        whileHover={hoverMotion}
        transition={transition}
        className="glass-card p-6 rounded-2xl w-full text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-accent-400"
      >
        {inner}
      </motion.button>
    );
  }

  return (
    <motion.div
      whileHover={hoverMotion}
      transition={transition}
      className="glass-card p-6 rounded-2xl"
    >
      {inner}
    </motion.div>
  );
};
