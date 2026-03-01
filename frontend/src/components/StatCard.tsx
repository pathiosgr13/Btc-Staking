import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface StatCardProps {
  label:    string;
  value:    string;
  sub?:     string;
  icon:     ReactNode;
  accent?:  boolean;
  delay?:   number;
  pulse?:   boolean;
  badge?:   string;
}

export function StatCard({ label, value, sub, icon, accent, delay = 0, pulse, badge }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: 'easeOut' }}
      className={`
        relative rounded-2xl p-6 overflow-hidden group cursor-default
        ${accent
          ? 'bg-gradient-to-br from-btc-orange/10 to-btc-gold/5 border border-btc-orange/30'
          : 'bg-btc-card border border-btc-border'}
        ${pulse ? 'animate-pulse-gold' : ''}
        hover:border-btc-orange/40 transition-all duration-300 shadow-card
      `}
    >
      {/* Background glow on hover */}
      <div className="absolute inset-0 bg-glow-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {/* Inner top highlight */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-btc-orange/30 to-transparent" />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className={`
            p-2.5 rounded-xl
            ${accent ? 'bg-btc-orange/20 text-btc-orange' : 'bg-white/5 text-btc-orange/70'}
            group-hover:scale-110 transition-transform duration-300
          `}>
            {icon}
          </div>
          {badge && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              {badge}
            </span>
          )}
        </div>

        <p className="text-btc-muted text-sm font-medium mb-1.5 tracking-wide uppercase">{label}</p>

        <motion.p
          key={value}
          initial={{ opacity: 0.6, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={`
            text-3xl font-bold tracking-tight
            ${accent ? 'text-transparent bg-clip-text bg-gold-gradient' : 'text-white'}
          `}
        >
          {value}
        </motion.p>

        {sub && (
          <p className="text-btc-muted/70 text-xs mt-1.5">{sub}</p>
        )}
      </div>
    </motion.div>
  );
}
