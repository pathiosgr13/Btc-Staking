import { motion } from 'framer-motion';
import {
  TrendingUp, Users, Zap, ArrowUpRight, ArrowDownRight,
  Activity, BarChart2, Clock,
} from 'lucide-react';
import { SynthLineChart, ChartPoint } from '../components/SynthLineChart';

// ── Demo data ─────────────────────────────────────────────────────────────────

function pastDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(2026, 2, 1);          // March 1 2026 (current date)
    d.setDate(d.getDate() - (n - 1 - i));
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });
}

const DAYS = pastDays(30);

const TVL_VALS   = [3.2,3.5,3.8,4.1,3.9,4.3,4.6,4.2,4.8,5.1,5.4,5.2,5.6,5.9,6.1,5.8,6.4,6.7,7.0,6.8,7.2,7.5,7.8,7.4,7.9,8.2,8.5,8.3,8.7,9.0];
const STAKER_VALS= [820,845,867,891,878,912,938,925,954,982,1008,998,1024,1051,1078,1065,1092,1118,1145,1132,1158,1184,1211,1198,1224,1247,1273,1261,1284,1310];
const APY_VALS   = [14.2,13.8,13.5,13.2,13.6,13.1,12.8,13.0,12.6,12.3,12.1,12.4,12.0,11.8,11.6,11.9,11.5,11.3,11.1,11.4,11.0,10.8,10.6,10.9,10.7,10.5,10.3,10.6,10.4,12.47];

const TVL_DATA:     ChartPoint[] = TVL_VALS.map((v, i) => ({ label: DAYS[i], value: v }));
const STAKERS_DATA: ChartPoint[] = STAKER_VALS.map((v, i) => ({ label: DAYS[i], value: v }));
const APY_DATA:     ChartPoint[] = APY_VALS.map((v, i) => ({ label: DAYS[i], value: v }));

const TRANSACTIONS = [
  { hash: 'bc1q…4f2a', type: 'Stake',   amount: '+0.5000 tBTC', time: '2m ago',  status: 'Confirmed', block: 841_024 },
  { hash: 'bc1q…7d3b', type: 'Unstake', amount: '-0.2500 tBTC', time: '8m ago',  status: 'Confirmed', block: 841_021 },
  { hash: 'bc1q…1e9c', type: 'Claim',   amount: '+0.0034 tBTC', time: '15m ago', status: 'Confirmed', block: 841_018 },
  { hash: 'bc1q…8a5d', type: 'Stake',   amount: '+1.2000 tBTC', time: '23m ago', status: 'Confirmed', block: 841_015 },
  { hash: 'bc1q…2f6e', type: 'Stake',   amount: '+0.0750 tBTC', time: '41m ago', status: 'Confirmed', block: 841_010 },
  { hash: 'bc1q…9c1f', type: 'Claim',   amount: '+0.0012 tBTC', time: '1h ago',  status: 'Confirmed', block: 841_002 },
  { hash: 'bc1q…3b7a', type: 'Unstake', amount: '-0.3300 tBTC', time: '2h ago',  status: 'Confirmed', block: 840_991 },
  { hash: 'bc1q…6d4b', type: 'Stake',   amount: '+2.0000 tBTC', time: '3h ago',  status: 'Confirmed', block: 840_978 },
];

// ── Sub-components ────────────────────────────────────────────────────────────

const cardClass =
  'rounded-2xl border border-btc-border/50 bg-btc-card/80 backdrop-blur-sm p-5';
const cardStyle = {
  boxShadow: '0 4px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(150,50,255,0.07)',
};

function StatBadge({
  label, value, sub, icon, color, delay,
}: {
  label: string; value: string; sub: string;
  icon: React.ReactNode; color: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className={cardClass}
      style={cardStyle}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-btc-muted text-xs font-medium uppercase tracking-wider">{label}</span>
        <span style={{ color }} className="opacity-80">{icon}</span>
      </div>
      <p className="text-white text-2xl font-black font-mono">{value}</p>
      <p className="text-btc-muted text-xs mt-1">{sub}</p>
    </motion.div>
  );
}

function ChartCard({
  title, children, delay,
}: {
  title: string; children: React.ReactNode; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className={`${cardClass} flex flex-col gap-3`}
      style={cardStyle}
    >
      <h3 className="text-white font-semibold text-sm flex items-center gap-2">
        <BarChart2 className="w-4 h-4 text-btc-muted" />
        {title}
      </h3>
      {children}
    </motion.div>
  );
}

const TX_COLORS: Record<string, string> = {
  Stake:   '#22dd88',
  Unstake: '#ff6688',
  Claim:   '#f7931a',
};

// ── Page ──────────────────────────────────────────────────────────────────────

export function Analytics() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

      {/* Page title */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-3 mb-1">
          <Activity className="w-5 h-5 text-btc-orange" />
          <h2 className="text-white text-2xl font-black tracking-tight">
            Protocol <span className="text-transparent bg-clip-text bg-gold-gradient">Analytics</span>
          </h2>
        </div>
        <p className="text-btc-muted text-sm">30-day overview · Demo data</p>
      </motion.div>

      {/* ── Stat badges ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatBadge
          label="24h Volume"
          value="12.4 tBTC"
          sub="+8.3% vs yesterday"
          icon={<ArrowUpRight className="w-4 h-4" />}
          color="#22dd88"
          delay={0.05}
        />
        <StatBadge
          label="Total Rewards Paid"
          value="3.847 tBTC"
          sub="All-time"
          icon={<TrendingUp className="w-4 h-4" />}
          color="#f7931a"
          delay={0.10}
        />
        <StatBadge
          label="Peak APY (30d)"
          value="14.20%"
          sub="Jan 31 · block 840 021"
          icon={<Zap className="w-4 h-4" />}
          color="#ff44cc"
          delay={0.15}
        />
        <StatBadge
          label="Total Transactions"
          value="8,432"
          sub="+124 today"
          icon={<Users className="w-4 h-4" />}
          color="#44ddff"
          delay={0.20}
        />
      </div>

      {/* ── Charts row 1: TVL + Stakers ────────────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="Total Value Locked (tBTC)" delay={0.25}>
          <div className="flex items-end justify-between text-xs text-btc-muted font-mono mb-1">
            <span>30 days</span>
            <span className="text-[#ff44cc] font-bold">
              {TVL_VALS[TVL_VALS.length - 1].toFixed(2)} tBTC
            </span>
          </div>
          <SynthLineChart
            data={TVL_DATA}
            color="#ff44cc"
            id="tvl"
            formatY={v => `${v.toFixed(1)}`}
          />
        </ChartCard>

        <ChartCard title="Active Stakers" delay={0.30}>
          <div className="flex items-end justify-between text-xs text-btc-muted font-mono mb-1">
            <span>30 days</span>
            <span className="text-[#44ddff] font-bold">
              {STAKER_VALS[STAKER_VALS.length - 1].toLocaleString()} wallets
            </span>
          </div>
          <SynthLineChart
            data={STAKERS_DATA}
            color="#44ddff"
            id="stakers"
            formatY={v => Math.round(v).toLocaleString()}
          />
        </ChartCard>
      </div>

      {/* ── Charts row 2: APY (full width) ─────────────────────────────────── */}
      <ChartCard title="APY History (%)" delay={0.35}>
        <div className="flex items-end justify-between text-xs text-btc-muted font-mono mb-1">
          <span>30 days · adjusts dynamically with TVL</span>
          <span className="text-btc-orange font-bold">
            {APY_VALS[APY_VALS.length - 1].toFixed(2)}% current
          </span>
        </div>
        <SynthLineChart
          data={APY_DATA}
          color="#f7931a"
          id="apy"
          formatY={v => `${v.toFixed(1)}%`}
        />
      </ChartCard>

      {/* ── Recent transactions ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.40, duration: 0.5 }}
        className={cardClass}
        style={cardStyle}
      >
        <h3 className="text-white font-semibold text-sm flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-btc-muted" />
          Recent Transactions
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-btc-border/40">
                {['Tx Hash', 'Type', 'Amount', 'Block', 'Time', 'Status'].map(h => (
                  <th
                    key={h}
                    className="pb-2 text-left text-btc-muted text-xs font-medium uppercase tracking-wider pr-6 last:pr-0"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TRANSACTIONS.map((tx, i) => (
                <motion.tr
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.42 + i * 0.04 }}
                  className="border-b border-btc-border/20 last:border-0 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="py-3 pr-6 font-mono text-btc-muted text-xs">{tx.hash}</td>
                  <td className="py-3 pr-6">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{
                        color:            TX_COLORS[tx.type],
                        background:       `${TX_COLORS[tx.type]}18`,
                        border:           `1px solid ${TX_COLORS[tx.type]}40`,
                      }}
                    >
                      {tx.type === 'Stake'   && <ArrowUpRight   className="w-3 h-3" />}
                      {tx.type === 'Unstake' && <ArrowDownRight  className="w-3 h-3" />}
                      {tx.type === 'Claim'   && <Zap             className="w-3 h-3" />}
                      {tx.type}
                    </span>
                  </td>
                  <td className="py-3 pr-6 font-mono text-xs" style={{ color: TX_COLORS[tx.type] }}>
                    {tx.amount}
                  </td>
                  <td className="py-3 pr-6 font-mono text-btc-muted text-xs">
                    #{tx.block.toLocaleString()}
                  </td>
                  <td className="py-3 pr-6 text-btc-muted text-xs">{tx.time}</td>
                  <td className="py-3">
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                      {tx.status}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

    </div>
  );
}
