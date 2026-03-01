import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BigNumber from 'bignumber.js';
import {
  Wallet, TrendingUp, Clock, Gift, ArrowDownToLine, ArrowUpFromLine,
  Copy, Check, Zap, Activity, Loader2, ExternalLink,
  Calendar, BarChart2, ChevronRight, Timer,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { SynthLineChart, ChartPoint } from '../components/SynthLineChart';
import { WalletStatus } from '../hooks/useWallet';
import { TxState } from '../hooks/useStaking';
import { UserPosition } from '../lib/opnet';
import { AppPage } from '../components/Header';

// ── Constants ──────────────────────────────────────────────────────────────────
const CURRENT_BLOCK = 841_024n;  // estimated BTC testnet block, March 1 2026
const BLOCK_SECS    = 600;       // ~10 min per block

// ── Mock rewards claim history ─────────────────────────────────────────────────
const CLAIM_HISTORY = [
  { date: 'Feb 28, 2026', amount: '0.000034', usd: 2.21, block: 841_001, hash: 'bc1q…3a4f' },
  { date: 'Feb 25, 2026', amount: '0.000028', usd: 1.82, block: 840_784, hash: 'bc1q…7c2d' },
  { date: 'Feb 21, 2026', amount: '0.000031', usd: 2.02, block: 840_496, hash: 'bc1q…9e1b' },
  { date: 'Feb 17, 2026', amount: '0.000026', usd: 1.69, block: 840_208, hash: 'bc1q…2f8a' },
  { date: 'Feb 13, 2026', amount: '0.000029', usd: 1.89, block: 839_920, hash: 'bc1q…5d3c' },
];

// ── Demo earnings chart (cumulative tBTC earned over 30 days) ──────────────────
const EARNINGS_DATA: ChartPoint[] = (() => {
  const pts: ChartPoint[] = [];
  let cum = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date(2026, 1, 1);
    d.setDate(d.getDate() + i);
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    cum += 0.000026 + Math.sin(i * 0.7) * 0.000004;
    pts.push({ label, value: parseFloat(cum.toFixed(6)) });
  }
  return pts;
})();

// ── Helpers ────────────────────────────────────────────────────────────────────
function stakeEntryDate(stakeBlock: bigint): Date {
  const blocksAgo = Number(CURRENT_BLOCK > stakeBlock ? CURRENT_BLOCK - stakeBlock : 0n);
  return new Date(Date.now() - blocksAgo * BLOCK_SECS * 1000);
}

function formatDuration(ms: number): string {
  const days  = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const mins  = Math.floor((ms % 3_600_000) / 60_000);
  if (days > 0)  return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function truncAddr(addr: string) {
  return addr.length > 18 ? `${addr.slice(0, 9)}…${addr.slice(-9)}` : addr;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

const CARD_CLS   = 'rounded-2xl border border-btc-border/50 bg-btc-card/80 backdrop-blur-sm overflow-hidden';
const CARD_STYLE = { boxShadow: '0 4px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(150,50,255,0.07)' };

const ACCENT_GLOW: Record<string, string> = {
  orange: 'from-transparent via-btc-orange/50 to-transparent',
  pink:   'from-transparent via-[#ff44cc]/50 to-transparent',
  cyan:   'from-transparent via-[#44ddff]/50 to-transparent',
  purple: 'from-transparent via-[#cc44ff]/50 to-transparent',
  gold:   'from-transparent via-btc-gold/50 to-transparent',
};

function NeonCard({
  children, className = '', accent = 'orange',
}: { children: React.ReactNode; className?: string; accent?: string }) {
  return (
    <div className={`${CARD_CLS} ${className}`} style={CARD_STYLE}>
      <div className={`h-px bg-gradient-to-r ${ACCENT_GLOW[accent]}`} />
      <div className="p-5 h-full">{children}</div>
    </div>
  );
}

// Real-time countdown to the next estimated Bitcoin block
function useBlockCountdown() {
  const [secs, setSecs] = useState(() => 600 - (Math.floor(Date.now() / 1000) % 600));
  useEffect(() => {
    const id = setInterval(() => setSecs(s => (s <= 1 ? 600 : s - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return { display: `${m}:${s}`, pct: (600 - secs) / 600 };
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="text-btc-muted hover:text-white transition-colors shrink-0">
      {copied
        ? <Check className="w-3.5 h-3.5 text-emerald-400" />
        : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ── Props ──────────────────────────────────────────────────────────────────────
interface DashboardProps {
  status:         WalletStatus;
  address:        string | null;
  balance:        bigint;
  network:        string | null;
  btcPrice:       number;
  position:       UserPosition | null;
  apyBps:         number;
  stakeState:     TxState;
  unstakeState:   TxState;
  claimState:     TxState;
  onStake:        (amount: string) => void;
  onUnstake:      (amount: string) => void;
  onClaimRewards: () => void;
  onResetTx:      (type: 'stake' | 'unstake' | 'claim') => void;
  onConnect:      () => void;
  onNavigate:     (p: AppPage) => void;
}

// ── Page ───────────────────────────────────────────────────────────────────────
export function Dashboard({
  status, address, balance, network, btcPrice,
  position, apyBps,
  stakeState, unstakeState, claimState,
  onStake: _onStake, onUnstake, onClaimRewards, onResetTx,
  onConnect, onNavigate,
}: DashboardProps) {
  const [unstakeAmt,  setUnstakeAmt]  = useState('');
  const [showUnstake, setShowUnstake] = useState(false);
  const countdown = useBlockCountdown();

  const stakedAmount  = position?.stakedAmount  ?? new BigNumber(0);
  const pendingReward = position?.pendingReward  ?? new BigNumber(0);
  const stakeBlock    = position?.stakeBlock     ?? 0n;

  const isStaked  = stakedAmount.gt(0);
  const walletBTC = new BigNumber(balance.toString()).div(1e8);
  const apy       = apyBps / 100;

  const entryDate  = stakeBlock > 0n ? stakeEntryDate(stakeBlock) : null;
  const durationMs = entryDate ? Date.now() - entryDate.getTime() : 0;
  const stakedUSD  = stakedAmount.times(btcPrice);
  const pendingUSD = pendingReward.times(btcPrice);
  const totalEarned =
    CLAIM_HISTORY.reduce((s, c) => s + parseFloat(c.amount), 0) + pendingReward.toNumber();

  // ── Not connected ────────────────────────────────────────────────────────────
  if (status !== 'connected') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-24 text-center"
        >
          <div
            className="w-20 h-20 rounded-2xl bg-[#12002a] border border-[#5500aa]/40 flex items-center justify-center mb-6"
            style={{ boxShadow: '0 0 40px rgba(160,0,255,0.18)' }}
          >
            <Wallet className="w-9 h-9 text-[#cc44ff]" />
          </div>
          <h3 className="text-white text-2xl font-black mb-2">Connect your wallet</h3>
          <p className="text-btc-muted text-sm mb-8 max-w-sm">
            Connect OP_WALLET or UniSat to view your personal staking dashboard,
            track live rewards, and manage your position.
          </p>
          <motion.button
            onClick={onConnect}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="bg-gold-gradient text-black font-bold px-8 py-3 rounded-xl shadow-gold hover:shadow-gold-lg transition-all"
          >
            Connect Wallet
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleClaim = () => {
    if (pendingReward.lte(0)) { toast.error('No rewards to claim yet'); return; }
    onClaimRewards();
  };

  const handleUnstake = () => {
    if (!unstakeAmt || new BigNumber(unstakeAmt).lte(0)) { toast.error('Enter an amount'); return; }
    if (new BigNumber(unstakeAmt).gt(stakedAmount))       { toast.error('Exceeds staked balance'); return; }
    onUnstake(unstakeAmt);
  };

  // ── Connected view ────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">

      {/* ── Title ─────────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-[#cc44ff]" />
          <h2 className="text-white text-2xl font-black tracking-tight">
            My <span className="text-transparent bg-clip-text bg-gold-gradient">Dashboard</span>
          </h2>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-btc-muted">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
          Live · auto-refreshes
        </div>
      </motion.div>

      {/* ── Row 1: Wallet · Staked · Performance ─────────────────────────────── */}
      <div className="grid sm:grid-cols-3 gap-4">

        {/* Wallet */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.4 }}
        >
          <NeonCard accent="pink" className="h-full">
            <div className="flex items-center gap-2 mb-3">
              <Wallet className="w-4 h-4 text-[#ff44cc]" />
              <span className="text-btc-muted text-xs font-medium uppercase tracking-wider">Wallet</span>
              {network && (
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[#ff44cc]/10 border border-[#ff44cc]/20 text-[#ff44cc]">
                  {network}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mb-3">
              <p className="font-mono text-xs text-btc-muted truncate">{address ? truncAddr(address) : '—'}</p>
              {address && <CopyButton text={address} />}
            </div>
            <p className="text-white text-2xl font-black font-mono">{walletBTC.toFixed(6)}</p>
            <p className="text-btc-muted text-xs mt-0.5">tBTC balance</p>
            <p className="text-btc-muted/60 text-xs mt-1">
              ≈ ${walletBTC.times(btcPrice).toFixed(2)} USD
            </p>
          </NeonCard>
        </motion.div>

        {/* Staked amount */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.10, duration: 0.4 }}
        >
          <NeonCard accent="orange" className="h-full">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ArrowDownToLine className="w-4 h-4 text-btc-orange" />
                <span className="text-btc-muted text-xs font-medium uppercase tracking-wider">Staked</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                isStaked
                  ? 'bg-emerald-400/10 border-emerald-400/20 text-emerald-400'
                  : 'bg-btc-muted/10 border-btc-muted/20 text-btc-muted'
              }`}>
                {isStaked ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-white text-2xl font-black font-mono">{stakedAmount.toFixed(6)}</p>
            <p className="text-btc-muted text-xs mt-0.5">
              {isStaked ? `≈ $${stakedUSD.toFixed(2)} USD` : 'No active stake'}
            </p>
            {entryDate && (
              <div className="mt-3 pt-3 border-t border-btc-border/40 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-btc-muted">
                  <Calendar className="w-3 h-3" />
                  Since {entryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-btc-muted">
                  <Clock className="w-3 h-3" />
                  Staked for {formatDuration(durationMs)}
                </div>
              </div>
            )}
          </NeonCard>
        </motion.div>

        {/* Performance */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          <NeonCard accent="cyan" className="h-full">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-[#44ddff]" />
              <span className="text-btc-muted text-xs font-medium uppercase tracking-wider">Performance</span>
            </div>
            <p className="text-white text-2xl font-black font-mono">{apy.toFixed(2)}%</p>
            <p className="text-btc-muted text-xs mt-0.5">Current APY</p>
            <div className="mt-3 pt-3 border-t border-btc-border/40 space-y-1.5">
              <div>
                <p className="text-[10px] text-btc-muted uppercase tracking-wider">All-time earned</p>
                <p className="text-[#44ddff] font-mono font-bold text-sm mt-0.5">
                  {totalEarned.toFixed(6)} tBTC
                </p>
              </div>
              <p className="text-btc-muted/60 text-xs">
                ≈ ${(totalEarned * btcPrice).toFixed(2)} USD
              </p>
            </div>
          </NeonCard>
        </motion.div>
      </div>

      {/* ── Row 2: Pending rewards + Countdown | Quick Actions ───────────────── */}
      <div className="grid lg:grid-cols-5 gap-4">

        {/* Pending rewards + countdown (col-span 3) */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.20, duration: 0.4 }}
          className="lg:col-span-3"
        >
          <NeonCard accent="gold">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-btc-orange" />
                <span className="text-btc-muted text-xs font-medium uppercase tracking-wider">Pending Rewards</span>
              </div>
              {isStaked && durationMs > 0 && (
                <span className="flex items-center gap-1.5 text-xs text-btc-muted">
                  <Clock className="w-3 h-3" />
                  Staked {formatDuration(durationMs)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-6">
              {/* Amount */}
              <div className="flex-1 min-w-0">
                <p className="text-4xl font-black font-mono text-transparent bg-clip-text bg-gold-gradient animate-glow">
                  {pendingReward.toFixed(8)}
                </p>
                <p className="text-btc-orange text-sm font-semibold mt-1">tBTC</p>
                <p className="text-btc-muted text-xs mt-0.5">≈ ${pendingUSD.toFixed(4)} USD</p>
              </div>

              {/* Countdown ring */}
              <div className="text-center shrink-0">
                <div className="flex items-center gap-1 text-btc-muted text-[10px] mb-2 justify-center">
                  <Timer className="w-3 h-3" />
                  Next reward
                </div>
                <div className="relative w-16 h-16">
                  <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
                    <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(80,0,140,0.3)" strokeWidth="4" />
                    <circle
                      cx="32" cy="32" r="26" fill="none"
                      stroke="#f7931a" strokeWidth="4"
                      strokeDasharray={`${countdown.pct * 163.4} 163.4`}
                      strokeLinecap="round"
                      style={{ filter: 'drop-shadow(0 0 4px rgba(247,147,26,0.6))' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white font-mono font-bold text-xs">{countdown.display}</span>
                  </div>
                </div>
                <p className="text-btc-muted text-[10px] mt-1.5">~10 min/block</p>
              </div>
            </div>

            {/* Block range */}
            {stakeBlock > 0n && (
              <div className="mt-4 pt-4 border-t border-btc-border/40 flex items-center gap-2 text-xs text-btc-muted font-mono">
                <Zap className="w-3 h-3 text-btc-orange shrink-0" />
                Entry #{stakeBlock.toLocaleString()} · Current #{CURRENT_BLOCK.toLocaleString()}
                · <span className="text-btc-orange">
                  {(Number(CURRENT_BLOCK - (stakeBlock > 0n ? stakeBlock : CURRENT_BLOCK))).toLocaleString()} blocks
                </span>
              </div>
            )}
          </NeonCard>
        </motion.div>

        {/* Quick Actions (col-span 2) */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="lg:col-span-2"
        >
          <NeonCard accent="pink">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-[#ff44cc]" />
              <span className="text-btc-muted text-xs font-medium uppercase tracking-wider">Quick Actions</span>
            </div>

            <div className="space-y-2.5">
              {/* Stake More */}
              <motion.button
                onClick={() => onNavigate('stake')}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gold-gradient text-black font-bold text-sm shadow-gold transition-all"
              >
                <ArrowDownToLine className="w-4 h-4" />
                Stake More
                <ChevronRight className="w-4 h-4 ml-auto" />
              </motion.button>

              {/* Unstake toggle */}
              <motion.button
                onClick={() => setShowUnstake(v => !v)}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                disabled={!isStaked}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-btc-orange/40 text-btc-orange bg-btc-orange/5 hover:bg-btc-orange/10 font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ArrowUpFromLine className="w-4 h-4" />
                Unstake
                <ChevronRight className={`w-4 h-4 ml-auto transition-transform duration-200 ${showUnstake ? 'rotate-90' : ''}`} />
              </motion.button>

              {/* Inline unstake form */}
              <AnimatePresence>
                {showUnstake && isStaked && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2 pt-1">
                      <div className="relative">
                        <input
                          type="number"
                          value={unstakeAmt}
                          onChange={e => setUnstakeAmt(e.target.value)}
                          placeholder="0.00000000"
                          min="0"
                          step="0.00001"
                          className="w-full bg-white/5 border border-btc-border rounded-xl px-3 py-2.5 pr-14 text-white font-mono text-sm placeholder:text-btc-muted/40 focus:outline-none focus:border-btc-orange/60 transition-all"
                        />
                        <button
                          onClick={() => setUnstakeAmt(stakedAmount.toFixed(8))}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-btc-orange hover:text-btc-gold px-1.5 py-0.5 rounded border border-btc-orange/30 transition-colors"
                        >
                          MAX
                        </button>
                      </div>
                      <motion.button
                        onClick={handleUnstake}
                        disabled={unstakeState.status === 'pending'}
                        whileTap={{ scale: 0.97 }}
                        className="w-full py-2.5 rounded-xl border border-btc-orange/50 text-btc-orange bg-btc-orange/5 font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                      >
                        {unstakeState.status === 'pending'
                          ? <><Loader2 className="w-4 h-4 animate-spin" /> Unstaking…</>
                          : <><ArrowUpFromLine className="w-4 h-4" /> Confirm Unstake</>}
                      </motion.button>
                      {unstakeState.status === 'success' && (
                        <p className="text-emerald-400 text-xs text-center">
                          Unstaked!{' '}
                          <button onClick={() => { onResetTx('unstake'); setShowUnstake(false); }} className="underline">
                            Dismiss
                          </button>
                        </p>
                      )}
                      {unstakeState.status === 'error' && (
                        <p className="text-red-400 text-xs text-center">{unstakeState.error}</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Claim Rewards */}
              <motion.button
                onClick={handleClaim}
                disabled={claimState.status === 'pending' || pendingReward.lte(0)}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-[#ff44cc]/40 text-[#ff44cc] bg-[#ff44cc]/5 hover:bg-[#ff44cc]/10 font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {claimState.status === 'pending'
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Claiming…</>
                  : <><Gift className="w-4 h-4" /> Claim Rewards</>}
                {claimState.status !== 'pending' && (
                  <span className="ml-auto text-[10px] font-mono opacity-70">{pendingReward.toFixed(6)}</span>
                )}
              </motion.button>

              {claimState.status === 'success' && (
                <p className="text-emerald-400 text-xs text-center">
                  Claimed!{' '}
                  <button onClick={() => onResetTx('claim')} className="underline">Dismiss</button>
                </p>
              )}
            </div>
          </NeonCard>
        </motion.div>
      </div>

      {/* ── Earnings chart ────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.30, duration: 0.4 }}
        className={CARD_CLS} style={CARD_STYLE}
      >
        <div className="h-px bg-gradient-to-r from-transparent via-[#cc44ff]/50 to-transparent" />
        <div className="p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-[#cc44ff]" />
              Staking Earnings — Last 30 Days
            </h3>
            <span className="text-[#cc44ff] font-mono font-bold text-xs">
              {totalEarned.toFixed(6)} tBTC total
            </span>
          </div>
          <p className="text-btc-muted text-xs mb-3">Cumulative tBTC earned since staking began</p>
          <SynthLineChart
            data={EARNINGS_DATA}
            color="#cc44ff"
            id="dash-earnings"
            formatY={v => v.toFixed(4)}
          />
        </div>
      </motion.div>

      {/* ── Rewards history table ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4 }}
        className={CARD_CLS} style={CARD_STYLE}
      >
        <div className="h-px bg-gradient-to-r from-transparent via-[#44ddff]/50 to-transparent" />
        <div className="p-5">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-[#44ddff]" />
            Rewards History
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-btc-border/40">
                  {['Date', 'Amount', 'USD Value', 'Block', 'Tx Hash', 'Status'].map(h => (
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
                {CLAIM_HISTORY.map((row, i) => (
                  <motion.tr
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.37 + i * 0.05 }}
                    className="border-b border-btc-border/20 last:border-0 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-3 pr-6 text-btc-muted text-xs">{row.date}</td>
                    <td className="py-3 pr-6 font-mono text-sm text-btc-orange">+{row.amount} tBTC</td>
                    <td className="py-3 pr-6 text-btc-muted font-mono text-xs">${row.usd.toFixed(2)}</td>
                    <td className="py-3 pr-6 font-mono text-btc-muted text-xs">#{row.block.toLocaleString()}</td>
                    <td className="py-3 pr-6 font-mono text-btc-muted text-xs">
                      <div className="flex items-center gap-1.5">
                        {row.hash}
                        <a
                          href={`https://testnet.opnet.org/tx/${row.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-btc-muted hover:text-btc-orange transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                        Claimed
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>

    </div>
  );
}
