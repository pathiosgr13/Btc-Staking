import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Copy, Check, Gift, TrendingUp, Zap,
  Trophy, Crown, Share2, Wallet, ChevronRight, Star,
} from 'lucide-react';
import { WalletStatus } from '../hooks/useWallet';
import { ReferralEntry, ReferralStats } from '../hooks/useReferral';

// ── Shared card styles ──────────────────────────────────────────────────────
const CARD_CLS   = 'rounded-2xl border border-btc-border/50 bg-btc-card/80 backdrop-blur-sm overflow-hidden';
const CARD_STYLE = { boxShadow: '0 4px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(150,50,255,0.07)' };

const ACCENT_GLOW: Record<string, string> = {
  pink:   'from-transparent via-[#ff44cc]/50 to-transparent',
  purple: 'from-transparent via-[#cc44ff]/50 to-transparent',
  cyan:   'from-transparent via-[#44ddff]/50 to-transparent',
  gold:   'from-transparent via-btc-gold/50 to-transparent',
  orange: 'from-transparent via-btc-orange/50 to-transparent',
};

function NeonCard({
  children, className = '', accent = 'purple',
}: { children: React.ReactNode; className?: string; accent?: string }) {
  return (
    <div className={`${CARD_CLS} ${className}`} style={CARD_STYLE}>
      <div className={`h-px bg-gradient-to-r ${ACCENT_GLOW[accent]}`} />
      <div className="p-5 h-full">{children}</div>
    </div>
  );
}

// ── Copy-to-clipboard button ────────────────────────────────────────────────
function CopyButton({ text, className = '' }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <motion.button
      onClick={copy}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
        copied
          ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-400'
          : 'border-[#cc44ff]/40 bg-[#cc44ff]/10 text-[#cc44ff] hover:bg-[#cc44ff]/20'
      } ${className}`}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied!' : 'Copy'}
    </motion.button>
  );
}

// ── Truncate address helper ─────────────────────────────────────────────────
function truncAddr(addr: string, head = 10, tail = 8) {
  return addr.length > head + tail + 3
    ? `${addr.slice(0, head)}…${addr.slice(-tail)}`
    : addr;
}

// ── Rank medal colors ───────────────────────────────────────────────────────
const RANK_STYLES: Record<number, { border: string; bg: string; text: string; icon?: React.ReactNode }> = {
  1: { border: 'border-btc-gold/40',    bg: 'bg-btc-gold/10',    text: 'text-btc-gold',    icon: <Crown className="w-3.5 h-3.5" /> },
  2: { border: 'border-[#c0c0c0]/40',   bg: 'bg-[#c0c0c0]/10',   text: 'text-[#c0c0c0]',  icon: <Trophy className="w-3.5 h-3.5" /> },
  3: { border: 'border-[#cd7f32]/40',   bg: 'bg-[#cd7f32]/10',   text: 'text-[#cd7f32]',  icon: <Trophy className="w-3.5 h-3.5" /> },
};

// ── Props ───────────────────────────────────────────────────────────────────
interface ReferralPageProps {
  status:       WalletStatus;
  address:      string | null;
  referralLink: string | null;
  referrer:     string | null;
  stats:        ReferralStats | null;
  leaderboard:  ReferralEntry[];
  userRank:     number | null;
  bonusMultiplier: number;
  btcPrice:     number;
  onConnect:    () => void;
}

// ── Page ────────────────────────────────────────────────────────────────────
export function Referral({
  status, address, referralLink, referrer,
  stats, leaderboard, userRank,
  bonusMultiplier, btcPrice, onConnect,
}: ReferralPageProps) {
  // ── Not connected ──────────────────────────────────────────────────────────
  if (status !== 'connected') {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-24 text-center"
        >
          <div
            className="w-20 h-20 rounded-2xl bg-[#12002a] border border-[#5500aa]/40 flex items-center justify-center mb-6"
            style={{ boxShadow: '0 0 40px rgba(160,0,255,0.18)' }}
          >
            <Share2 className="w-9 h-9 text-[#cc44ff]" />
          </div>
          <h3 className="text-white text-2xl font-black mb-2">Connect to get your referral link</h3>
          <p className="text-btc-muted text-sm mb-8 max-w-sm">
            Connect OP_WALLET or UniSat to generate your unique referral link and start
            earning 5% bonus rewards for every referred staker.
          </p>
          <motion.button
            onClick={onConnect}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="bg-gold-gradient text-black font-bold px-8 py-3 rounded-xl shadow-gold hover:shadow-gold-lg transition-all"
          >
            Connect Wallet
          </motion.button>

          {/* Leaderboard teaser even when disconnected */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-12 w-full max-w-2xl"
          >
            <LeaderboardTable leaderboard={leaderboard} userAddress={null} userRank={null} />
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // ── Connected ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <Share2 className="w-5 h-5 text-[#cc44ff]" />
          <h2 className="text-white text-2xl font-black tracking-tight">
            Referral{' '}
            <span className="text-transparent bg-clip-text"
              style={{ backgroundImage: 'linear-gradient(135deg, #cc44ff 0%, #ff44cc 100%)' }}>
              Program
            </span>
          </h2>
        </div>
        <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-[#cc44ff]/30 bg-[#cc44ff]/5 text-[#cc44ff]">
          <Gift className="w-3.5 h-3.5" />
          5% Bonus Rewards
        </div>
      </motion.div>

      {/* Referral bonus active banner (only if this user was referred) */}
      <AnimatePresence>
        {referrer && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#cc44ff]/30 bg-[#cc44ff]/5 text-sm"
              style={{ boxShadow: '0 0 20px rgba(204,68,255,0.08)' }}
            >
              <Star className="w-4 h-4 text-[#cc44ff] shrink-0" />
              <div>
                <span className="text-white font-semibold">Referral bonus active!</span>
                <span className="text-btc-muted ml-2">
                  You were referred by{' '}
                  <span className="font-mono text-[#cc44ff]">{truncAddr(referrer)}</span>{' '}
                  and earn <span className="text-white font-bold">+5% APY</span> on all staking rewards.
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Your referral link */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.4 }}
      >
        <NeonCard accent="purple">
          <div className="flex items-center gap-2 mb-4">
            <Share2 className="w-4 h-4 text-[#cc44ff]" />
            <span className="text-btc-muted text-xs font-medium uppercase tracking-wider">Your Referral Link</span>
          </div>

          <p className="text-btc-muted text-sm mb-4">
            Share your unique link. Every friend who stakes through it earns{' '}
            <span className="text-[#cc44ff] font-semibold">+5% APY</span>{' '}
            and you earn{' '}
            <span className="text-[#ff44cc] font-semibold">5% bonus rewards</span> on their staked amount.
          </p>

          <div className="flex items-center gap-3">
            <div
              className="flex-1 min-w-0 bg-white/5 border border-btc-border rounded-xl px-4 py-3 flex items-center gap-2"
              style={{ boxShadow: 'inset 0 0 12px rgba(204,68,255,0.05)' }}
            >
              <span className="font-mono text-xs text-[#cc44ff] truncate">{referralLink}</span>
            </div>
            <CopyButton text={referralLink ?? ''} />
          </div>

          {/* Wallet address for reference */}
          <div className="mt-3 flex items-center gap-2 text-xs text-btc-muted">
            <Wallet className="w-3 h-3" />
            Linked to:{' '}
            <span className="font-mono text-btc-muted/80">{address ? truncAddr(address) : '—'}</span>
          </div>
        </NeonCard>
      </motion.div>

      {/* Stats row */}
      <div className="grid sm:grid-cols-3 gap-4">
        {/* Total referrals */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.10, duration: 0.4 }}
        >
          <NeonCard accent="purple" className="h-full">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-[#cc44ff]" />
              <span className="text-btc-muted text-xs font-medium uppercase tracking-wider">Total Referrals</span>
            </div>
            <p className="text-white text-3xl font-black font-mono">{stats?.totalReferrals ?? 0}</p>
            <p className="text-btc-muted text-xs mt-1">Friends staking via your link</p>
            {userRank && (
              <div className="mt-3 pt-3 border-t border-btc-border/40">
                <span className="text-[#cc44ff] text-xs font-semibold flex items-center gap-1">
                  <Trophy className="w-3 h-3" />
                  Leaderboard rank #{userRank}
                </span>
              </div>
            )}
          </NeonCard>
        </motion.div>

        {/* Referred TVL */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          <NeonCard accent="pink" className="h-full">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-[#ff44cc]" />
              <span className="text-btc-muted text-xs font-medium uppercase tracking-wider">Referred TVL</span>
            </div>
            <p className="text-white text-3xl font-black font-mono">
              {(stats?.referredTVLBTC ?? 0).toFixed(4)}
            </p>
            <p className="text-[#ff44cc] text-xs font-semibold mt-0.5">tBTC</p>
            <p className="text-btc-muted/60 text-xs mt-1">
              ≈ ${((stats?.referredTVLBTC ?? 0) * btcPrice).toFixed(2)} USD
            </p>
          </NeonCard>
        </motion.div>

        {/* Bonus earned */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.20, duration: 0.4 }}
        >
          <NeonCard accent="gold" className="h-full">
            <div className="flex items-center gap-2 mb-3">
              <Gift className="w-4 h-4 text-btc-orange" />
              <span className="text-btc-muted text-xs font-medium uppercase tracking-wider">Bonus Earned</span>
            </div>
            <p
              className="text-3xl font-black font-mono text-transparent bg-clip-text animate-glow"
              style={{ backgroundImage: 'linear-gradient(135deg, #f7931a, #ffd700)' }}
            >
              {(stats?.bonusEarnedBTC ?? 0).toFixed(6)}
            </p>
            <p className="text-btc-orange text-xs font-semibold mt-0.5">tBTC bonus</p>
            <p className="text-btc-muted/60 text-xs mt-1">
              ≈ ${((stats?.bonusEarnedBTC ?? 0) * btcPrice).toFixed(2)} USD
            </p>
          </NeonCard>
        </motion.div>
      </div>

      {/* How it works */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4 }}
        className={CARD_CLS}
        style={CARD_STYLE}
      >
        <div className="h-px bg-gradient-to-r from-transparent via-[#cc44ff]/50 to-transparent" />
        <div className="p-5">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-[#cc44ff]" />
            How It Works
          </h3>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                step: '01',
                title: 'Share your link',
                desc: 'Copy your unique referral URL and share it with friends, on Twitter/X, or in Bitcoin communities.',
                accent: '#cc44ff',
              },
              {
                step: '02',
                title: 'Friend stakes',
                desc: 'When they stake using your link, they automatically earn +5% APY boost on their entire position.',
                accent: '#ff44cc',
              },
              {
                step: '03',
                title: 'You earn bonuses',
                desc: 'You receive 5% of their staking rewards as bonus — distributed every block, automatically.',
                accent: '#f7931a',
              },
            ].map(({ step, title, desc, accent }) => (
              <div key={step} className="flex gap-4">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-black text-xs"
                  style={{ background: `${accent}18`, border: `1px solid ${accent}30`, color: accent }}
                >
                  {step}
                </div>
                <div>
                  <p className="text-white text-sm font-semibold mb-1">{title}</p>
                  <p className="text-btc-muted text-xs leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Leaderboard */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.30, duration: 0.4 }}
      >
        <LeaderboardTable leaderboard={leaderboard} userAddress={address} userRank={userRank} />
      </motion.div>

    </div>
  );
}

// ── Leaderboard sub-component ───────────────────────────────────────────────
function LeaderboardTable({
  leaderboard, userAddress, userRank,
}: { leaderboard: ReferralEntry[]; userAddress: string | null; userRank: number | null }) {
  return (
    <div className={CARD_CLS} style={CARD_STYLE}>
      <div className="h-px bg-gradient-to-r from-transparent via-[#ff44cc]/50 to-transparent" />
      <div className="p-5">
        <h3 className="text-white font-semibold text-sm flex items-center gap-2 mb-5">
          <Trophy className="w-4 h-4 text-[#ff44cc]" />
          Top Referrers — Leaderboard
          <span className="ml-auto text-[10px] text-btc-muted font-normal">Updated every block</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-btc-border/40">
                {['Rank', 'Referrer', 'Referrals', 'TVL Referred', 'Bonus Earned'].map(h => (
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
              {leaderboard.map((entry, i) => {
                const rankStyle = RANK_STYLES[entry.rank];
                const isUser    = userAddress
                  ? entry.address.toLowerCase() === userAddress.toLowerCase()
                  : false;

                return (
                  <motion.tr
                    key={entry.address}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.32 + i * 0.04 }}
                    className={`border-b border-btc-border/20 last:border-0 transition-colors ${
                      isUser
                        ? 'bg-[#cc44ff]/5'
                        : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    {/* Rank */}
                    <td className="py-3 pr-6">
                      {rankStyle ? (
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold border ${rankStyle.border} ${rankStyle.bg} ${rankStyle.text}`}>
                          {rankStyle.icon}
                          #{entry.rank}
                        </span>
                      ) : (
                        <span className="text-btc-muted font-mono text-xs pl-1">#{entry.rank}</span>
                      )}
                    </td>

                    {/* Address */}
                    <td className="py-3 pr-6">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-btc-muted/80">{truncAddr(entry.address)}</span>
                        {isUser && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#cc44ff]/15 border border-[#cc44ff]/30 text-[#cc44ff] font-semibold">
                            You
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Referrals */}
                    <td className="py-3 pr-6">
                      <span className="flex items-center gap-1.5 text-white font-semibold text-sm">
                        <Users className="w-3 h-3 text-btc-muted" />
                        {entry.referrals}
                      </span>
                    </td>

                    {/* TVL */}
                    <td className="py-3 pr-6">
                      <span className="font-mono text-[#ff44cc] text-sm font-semibold">
                        {entry.tvlBTC.toFixed(3)} tBTC
                      </span>
                    </td>

                    {/* Bonus */}
                    <td className="py-3">
                      <span className="font-mono text-btc-orange text-sm font-semibold">
                        +{entry.bonusBTC.toFixed(6)} tBTC
                      </span>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* User rank call-to-action if they have referrals */}
        {userRank && userAddress && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-4 pt-4 border-t border-btc-border/40 flex items-center justify-between"
          >
            <div className="flex items-center gap-2 text-xs text-btc-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-[#cc44ff] animate-pulse inline-block" />
              Your position: <span className="text-[#cc44ff] font-bold ml-1">Rank #{userRank}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-btc-muted">
              Share more to climb
              <ChevronRight className="w-3 h-3" />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
