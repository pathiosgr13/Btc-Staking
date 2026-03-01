import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calculator } from 'lucide-react';
import BigNumber from 'bignumber.js';

interface RewardCalculatorProps {
  apyBps:   number;
  btcPrice: number;
}

export function RewardCalculator({ apyBps, btcPrice }: RewardCalculatorProps) {
  const [amount, setAmount] = useState('1');
  const [period, setPeriod] = useState<'1d' | '7d' | '30d' | '365d'>('30d');

  const apy = apyBps / 100; // e.g. 12.47

  const result = useMemo(() => {
    const amt  = new BigNumber(amount || '0');
    const days: Record<typeof period, number> = { '1d': 1, '7d': 7, '30d': 30, '365d': 365 };
    const d    = days[period];
    const earn = amt.times(apy / 100).times(d / 365);
    return {
      btc: earn,
      usd: earn.times(btcPrice),
    };
  }, [amount, period, apy, btcPrice]);

  const periods: { id: typeof period; label: string }[] = [
    { id: '1d',   label: '1D' },
    { id: '7d',   label: '7D' },
    { id: '30d',  label: '30D' },
    { id: '365d', label: '1Y' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-btc-card border border-btc-border rounded-2xl overflow-hidden"
    >
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-btc-border">
        <Calculator className="w-4 h-4 text-btc-orange" />
        <h3 className="text-white font-semibold text-sm">Reward Calculator</h3>
      </div>

      <div className="p-5">
        {/* Amount input */}
        <div className="mb-4">
          <label className="text-btc-muted text-xs mb-1.5 block">Stake Amount (tBTC)</label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              min="0"
              step="0.1"
              className="
                w-full bg-white/5 border border-btc-border rounded-xl px-4 py-3 pr-16
                text-white font-mono placeholder:text-btc-muted/40
                focus:outline-none focus:border-btc-orange/60 transition-all
              "
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-btc-orange text-xs font-semibold">
              tBTC
            </span>
          </div>
        </div>

        {/* Period selector */}
        <div className="flex gap-1.5 mb-5">
          {periods.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setPeriod(id)}
              className={`
                flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all
                ${period === id
                  ? 'bg-gold-gradient text-black shadow-gold'
                  : 'bg-white/5 text-btc-muted hover:text-white border border-btc-border'}
              `}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Result */}
        <div className="bg-gradient-to-br from-btc-orange/10 to-btc-gold/5 border border-btc-orange/20 rounded-xl p-4 text-center">
          <p className="text-btc-muted text-xs mb-2">Estimated Reward</p>
          <motion.p
            key={`${amount}-${period}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-2xl font-bold text-transparent bg-clip-text bg-gold-gradient"
          >
            {result.btc.toFixed(8)} tBTC
          </motion.p>
          <p className="text-btc-muted text-xs mt-1">≈ ${result.usd.toFixed(2)} USD</p>
          <p className="text-btc-muted/50 text-[10px] mt-2">
            At {apy.toFixed(2)}% APY over {period.replace('d', ' day').replace('365 day', '1 year')}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
