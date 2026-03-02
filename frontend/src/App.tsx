import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import {
  TrendingUp, DollarSign, Users, Zap,
  AlertCircle, RefreshCw
} from 'lucide-react';
import BigNumber from 'bignumber.js';

import { ParticleBackground } from './components/ParticleBackground';
import { Header, AppPage }    from './components/Header';
import { StatCard }           from './components/StatCard';
import { StakingPanel }       from './components/StakingPanel';
import { PositionCard }       from './components/PositionCard';
import { LiveTicker }         from './components/LiveTicker';
import { RewardCalculator }   from './components/RewardCalculator';
import { Analytics }          from './pages/Analytics';
import { Docs }               from './pages/Docs';
import { Dashboard }          from './pages/Dashboard';
import { Referral }           from './pages/Referral';
import { useWallet }          from './hooks/useWallet';
import { useStaking }         from './hooks/useStaking';
import { useReferral }        from './hooks/useReferral';

export default function App() {
  const [page, setPage] = useState<AppPage>('stake');

  const wallet   = useWallet();
  const staking  = useStaking(wallet.address, wallet.provider);
  const referral = useReferral(wallet.address);

  const apy      = staking.apyBps / 100;
  const tvlUSD   = staking.tvl.times(staking.btcPrice);
  const position = staking.position;

  // ─── Derived stats ─────────────────────────────────────────────────────────
  const stats = [
    {
      label:   'Total Value Locked',
      value:   `${staking.tvl.toFixed(4)} tBTC`,
      sub:     `$${tvlUSD.toFixed(2)} USD`,
      icon:    <DollarSign className="w-5 h-5" />,
      accent:  true,
      delay:   0.1,
      badge:   'TVL',
    },
    {
      label:   'Live APY',
      value:   `${apy.toFixed(2)}%`,
      sub:     'Paid per Bitcoin block',
      icon:    <TrendingUp className="w-5 h-5" />,
      accent:  false,
      delay:   0.2,
      pulse:   true,
      badge:   '↑',
    },
    {
      label:   'BTC Price',
      value:   `$${staking.btcPrice.toLocaleString()}`,
      sub:     'Real-time via CoinGecko',
      icon:    <Zap className="w-5 h-5" />,
      accent:  false,
      delay:   0.3,
    },
    {
      label:   'Active Stakers',
      value:   '1,247',
      sub:     '+12 today',
      icon:    <Users className="w-5 h-5" />,
      accent:  false,
      delay:   0.4,
      badge:   '+12',
    },
  ];

  return (
    <div className="min-h-screen bg-dark-gradient font-sans relative overflow-x-hidden">
      {/* Ambient background */}
      <ParticleBackground />

      {/* Synthwave radial glow behind hero */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 30%, rgba(180,0,255,0.10) 0%, rgba(255,0,140,0.07) 40%, transparent 70%)',
          zIndex: 0,
        }}
      />

      {/* Header */}
      <Header
        status={wallet.status}
        address={wallet.address}
        balance={wallet.balance}
        network={wallet.network}
        btcPrice={staking.btcPrice}
        page={page}
        onConnect={wallet.connect}
        onDisconnect={wallet.disconnect}
        onNavigate={setPage}
      />

      <main className="relative z-10">
        <AnimatePresence mode="wait">

          {/* ── Stake page ───────────────────────────────────────────────────── */}
          {page === 'stake' && (
            <motion.div
              key="stake"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10"
            >
              {/* ── Hero ───────────────────────────────────────────────────── */}
              <div className="text-center mb-12">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-btc-orange/30 bg-btc-orange/5 text-btc-orange text-xs font-semibold mb-6"
                  style={{ boxShadow: '0 0 12px rgba(247,147,26,0.15), inset 0 0 12px rgba(247,147,26,0.05)' }}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-btc-orange animate-pulse" />
                  Live on OP_NET Testnet
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.6 }}
                  className="text-5xl sm:text-6xl font-black text-white leading-tight mb-4"
                >
                  Stake{' '}
                  <span className="text-transparent bg-clip-text bg-gold-gradient animate-glow">
                    tBTC
                  </span>
                  <br />
                  Earn Rewards
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.6 }}
                  className="text-btc-muted text-lg max-w-xl mx-auto"
                >
                  The first native Bitcoin staking protocol on OP_NET.
                  Secure the network and earn{' '}
                  <span className="text-btc-orange font-semibold">{apy.toFixed(2)}% APY</span>.
                </motion.p>
              </div>

              {/* ── Error banner ─────────────────────────────────────────────── */}
              <AnimatePresence>
                {wallet.error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-6"
                  >
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      {wallet.error}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Stat cards ───────────────────────────────────────────────── */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {stats.map(s => (
                  <StatCard key={s.label} {...s} />
                ))}
              </div>

              {/* ── Main layout ──────────────────────────────────────────────── */}
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Left column: Staking panel */}
                <div className="lg:col-span-2 space-y-6">
                  <StakingPanel
                    connected={wallet.status === 'connected'}
                    stakedAmount={position?.stakedAmount ?? new BigNumber(0)}
                    pendingReward={position?.pendingReward ?? new BigNumber(0)}
                    walletBalance={wallet.balance}
                    btcPrice={staking.btcPrice}
                    stakeState={staking.stakeState}
                    unstakeState={staking.unstakeState}
                    claimState={staking.claimState}
                    onStake={staking.stake}
                    onUnstake={staking.unstake}
                    onClaimRewards={staking.claimRewards}
                    onResetTx={staking.resetTx}
                    onConnect={wallet.connect}
                  />

                  {/* Position card — only when connected and staking */}
                  <AnimatePresence>
                    {wallet.status === 'connected' && position && position.stakedAmount.gt(0) && (
                      <PositionCard
                        stakedAmount={position.stakedAmount}
                        pendingReward={position.pendingReward}
                        apyBps={staking.apyBps}
                        btcPrice={staking.btcPrice}
                        stakeBlock={position.stakeBlock}
                      />
                    )}
                  </AnimatePresence>
                </div>

                {/* Right column: Calculator + Live feed */}
                <div className="space-y-6">
                  <RewardCalculator apyBps={staking.apyBps} btcPrice={staking.btcPrice} />
                  <LiveTicker />

                  {/* Refresh indicator */}
                  <motion.button
                    onClick={staking.refresh}
                    whileHover={{ scale: 1.02 }}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-btc-border text-btc-muted hover:text-white hover:border-btc-orange/30 text-sm transition-all"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh Data
                  </motion.button>
                </div>
              </div>

              {/* ── Protocol info strip ──────────────────────────────────────── */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="mt-12 grid sm:grid-cols-3 gap-4"
              >
                {[
                  { title: 'Non-custodial',  desc: 'Your keys, your Bitcoin. Smart contract secured.' },
                  { title: 'Battle-tested',  desc: "Built on OP_NET \u2014 Bitcoin's programmability layer." },
                  { title: 'Real-time APY',  desc: 'APY adjusts dynamically with TVL and reward rate.' },
                ].map(({ title, desc }) => (
                  <div key={title} className="p-5 rounded-2xl bg-btc-card/60 border border-btc-border/60 text-center synth-card">
                    <div className="w-2 h-2 rounded-full bg-gold-gradient mx-auto mb-3" />
                    <h4 className="text-white font-semibold text-sm mb-1">{title}</h4>
                    <p className="text-btc-muted text-xs">{desc}</p>
                  </div>
                ))}
              </motion.div>

              {/* Footer */}
              <footer className="mt-12 text-center text-btc-muted/40 text-xs pb-6">
                BTC Stake · Built on{' '}
                <a href="https://opnet.org" className="text-btc-orange/60 hover:text-btc-orange transition-colors">
                  OP_NET
                </a>{' '}
                · Testnet only — not financial advice
              </footer>
            </motion.div>
          )}

          {/* ── Dashboard page ───────────────────────────────────────────────── */}
          {page === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <Dashboard
                status={wallet.status}
                address={wallet.address}
                balance={wallet.balance}
                network={wallet.network}
                btcPrice={staking.btcPrice}
                position={staking.position}
                apyBps={staking.apyBps}
                stakeState={staking.stakeState}
                unstakeState={staking.unstakeState}
                claimState={staking.claimState}
                onStake={staking.stake}
                onUnstake={staking.unstake}
                onClaimRewards={staking.claimRewards}
                onResetTx={staking.resetTx}
                onConnect={wallet.connect}
                onNavigate={setPage}
                referralBonusBTC={referral.stats?.bonusEarnedBTC ?? 0}
                referralCount={referral.stats?.totalReferrals ?? 0}
                referralActive={!!referral.referrer}
              />
            </motion.div>
          )}

          {/* ── Referral page ────────────────────────────────────────────────────── */}
          {page === 'referral' && (
            <motion.div
              key="referral"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <Referral
                status={wallet.status}
                address={wallet.address}
                referralLink={referral.referralLink}
                referrer={referral.referrer}
                stats={referral.stats}
                leaderboard={referral.leaderboard}
                userRank={referral.userRank}
                bonusMultiplier={referral.bonusMultiplier}
                btcPrice={staking.btcPrice}
                onConnect={wallet.connect}
              />
            </motion.div>
          )}

          {/* ── Analytics page ───────────────────────────────────────────────── */}
          {page === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <Analytics />
            </motion.div>
          )}

          {/* ── Docs page ────────────────────────────────────────────────────── */}
          {page === 'docs' && (
            <motion.div
              key="docs"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <Docs />
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#111119',
            color: '#fff',
            border: '1px solid #1e1e2e',
            borderRadius: '12px',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#f7931a', secondary: '#000' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
    </div>
  );
}
