import { motion } from 'framer-motion';
import { TrendingUp, Clock, Coins, BarChart3 } from 'lucide-react';
import BigNumber from 'bignumber.js';

interface PositionCardProps {
  stakedAmount:  BigNumber;
  pendingReward: BigNumber;
  apyBps:        number;
  btcPrice:      number;
  stakeBlock:    bigint;
  currentBlock?: number;
}

export function PositionCard({
  stakedAmount, pendingReward, apyBps, btcPrice, stakeBlock
}: PositionCardProps) {
  const apy          = apyBps / 100;
  const stakedUSD    = stakedAmount.times(btcPrice);
  const rewardUSD    = pendingReward.times(btcPrice);
  const dailyReward  = stakedAmount.times(apy / 100 / 365);
  const monthlyEarning = stakedAmount.times(apy / 100 / 12);

  const stats = [
    {
      icon: Coins,
      label: 'Staked',
      value: `${stakedAmount.toFixed(6)} tBTC`,
      sub: `$${stakedUSD.toFixed(2)}`,
      color: 'text-btc-orange',
      bg: 'bg-btc-orange/10',
    },
    {
      icon: Gift,
      label: 'Pending Rewards',
      value: `${pendingReward.toFixed(8)} tBTC`,
      sub: `$${rewardUSD.toFixed(4)}`,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      icon: TrendingUp,
      label: 'Daily Earning',
      value: `${dailyReward.toFixed(8)} tBTC`,
      sub: `$${dailyReward.times(btcPrice).toFixed(4)}`,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      icon: BarChart3,
      label: 'Monthly Earning',
      value: `${monthlyEarning.toFixed(6)} tBTC`,
      sub: `$${monthlyEarning.times(btcPrice).toFixed(2)}`,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-btc-card border border-btc-border rounded-2xl overflow-hidden"
    >
      <div className="h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />

      <div className="p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-bold text-lg">Your Position</h3>
          {stakeBlock > 0n && (
            <div className="flex items-center gap-1.5 text-btc-muted text-xs">
              <Clock className="w-3.5 h-3.5" />
              Since block #{stakeBlock.toString()}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {stats.map(({ icon: Icon, label, value, sub, color, bg }) => (
            <div key={label} className={`${bg} rounded-xl p-4`}>
              <div className={`${color} mb-2`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-btc-muted text-xs mb-1">{label}</p>
              <p className={`${color} font-bold text-sm`}>{value}</p>
              <p className="text-btc-muted/60 text-xs">{sub}</p>
            </div>
          ))}
        </div>

        {/* APY bar */}
        <div className="mt-4 p-4 bg-gradient-to-r from-btc-orange/5 to-btc-gold/5 rounded-xl border border-btc-orange/10">
          <div className="flex justify-between items-center mb-2">
            <span className="text-btc-muted text-xs flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-btc-orange" /> Current APY
            </span>
            <span className="text-btc-orange font-bold">{apy.toFixed(2)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(apy, 100)}%` }}
              transition={{ delay: 0.5, duration: 1, ease: 'easeOut' }}
              className="h-full rounded-full bg-gold-gradient"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Need to import Gift for use above
function Gift(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect x="2" y="7" width="20" height="5" />
      <line x1="12" y1="22" x2="12" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  );
}
