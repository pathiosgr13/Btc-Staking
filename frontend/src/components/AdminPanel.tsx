/**
 * AdminPanel — deployer-only controls.
 *
 * Hidden from regular users; visible only when the URL hash contains "#admin".
 * All actions are gated on-chain by onlyDeployer(), so a wrong wallet simply
 * gets a revert — there is no risk from non-deployers reaching this page.
 *
 * Access: append #admin to any URL, e.g. http://localhost:5173/#admin
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Loader2, CheckCircle, XCircle, ExternalLink, Zap } from 'lucide-react';
import { TxState } from '../hooks/useStaking';

interface AdminPanelProps {
  connected:           boolean;
  setRewardRateState:  TxState;
  onSetRewardRate:     (rateSats: bigint) => void;
  onResetSetRewardRate: () => void;
  onConnect:           () => void;
}

export function AdminPanel({
  connected,
  setRewardRateState,
  onSetRewardRate,
  onResetSetRewardRate,
  onConnect,
}: AdminPanelProps) {
  const [customRate, setCustomRate] = useState('10');
  const rate = BigInt(Math.max(1, Math.round(Number(customRate) || 10)));

  // Approximate APY shown next to the rate input.
  // Formula: rate * 52560 / 1e8 * 100  (assuming 1 BTC totalStaked)
  const approxApy = (Number(rate) * 52560 / 1e8 * 100).toFixed(2);

  const handleActivate = () => onSetRewardRate(rate);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="max-w-lg mx-auto mt-10 mb-6"
    >
      {/* Header badge */}
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck className="w-4 h-4 text-btc-orange" />
        <span className="text-btc-orange text-xs font-bold uppercase tracking-widest">
          Admin — Deployer Only
        </span>
      </div>

      <div className="bg-btc-card border border-btc-orange/30 rounded-2xl overflow-hidden">
        <div className="h-px bg-gradient-to-r from-transparent via-btc-orange/50 to-transparent" />

        <div className="p-6 space-y-5">
          {/* Section: Activate rewards */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-1">Activate Reward Distribution</h3>
            <p className="text-btc-muted text-xs leading-relaxed mb-4">
              The contract's <code className="text-btc-orange">rewardRate</code> is currently{' '}
              <span className="text-white font-mono">0</span> — no rewards accrue until this is called.
              Setting it to <span className="text-white font-mono">10</span> distributes{' '}
              10 sats/block per BTC staked (≈ 12% APY at 1 BTC TVL).
            </p>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1">
                <label className="text-btc-muted text-xs mb-1.5 block">
                  Rate (sats / block / BTC staked)
                </label>
                <input
                  type="number"
                  min="1"
                  value={customRate}
                  onChange={e => setCustomRate(e.target.value)}
                  className="
                    w-full bg-white/5 border border-btc-border rounded-xl px-4 py-2.5
                    text-white font-mono text-base placeholder:text-btc-muted/40
                    focus:outline-none focus:border-btc-orange/60
                    transition-all duration-200
                  "
                />
              </div>
              <div className="text-right shrink-0 mt-5">
                <p className="text-btc-muted text-xs">Approx APY</p>
                <p className="text-btc-orange font-bold text-lg font-mono">{approxApy}%</p>
                <p className="text-btc-muted/50 text-xs">(@ 1 BTC TVL)</p>
              </div>
            </div>

            {/* Quick preset buttons */}
            <div className="flex gap-2 mb-4">
              {[
                { label: '10 sats (~12%)', rate: '10' },
                { label: '20 sats (~25%)', rate: '20' },
                { label: '50 sats (~63%)', rate: '50' },
              ].map(({ label, rate: r }) => (
                <button
                  key={r}
                  onClick={() => setCustomRate(r)}
                  className={`
                    text-xs px-3 py-1.5 rounded-lg border transition-all
                    ${customRate === r
                      ? 'bg-btc-orange/15 border-btc-orange/50 text-btc-orange'
                      : 'bg-white/5 border-btc-border text-btc-muted hover:border-btc-orange/30 hover:text-white'}
                  `}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Result banner */}
            <AnimatePresence>
              {setRewardRateState.status !== 'idle' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`mb-4 p-3.5 rounded-xl border text-sm ${
                    setRewardRateState.status === 'success' ? 'bg-emerald-500/10 border-emerald-500/30' :
                    setRewardRateState.status === 'error'   ? 'bg-red-500/10 border-red-500/30' :
                    'bg-btc-orange/10 border-btc-orange/30'
                  }`}
                >
                  {setRewardRateState.status === 'pending' && (
                    <div className="flex items-center gap-2 text-btc-orange">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Broadcasting setRewardRate({rate.toString()})…
                    </div>
                  )}
                  {setRewardRateState.status === 'success' && (
                    <div>
                      <div className="flex items-center gap-2 text-emerald-400 mb-1.5">
                        <CheckCircle className="w-4 h-4" />
                        <span className="font-semibold">Reward rate activated!</span>
                      </div>
                      <p className="text-emerald-400/70 text-xs mb-1.5">
                        Rewards begin accruing from the next Bitcoin block.
                      </p>
                      {setRewardRateState.txId && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-btc-muted truncate">
                            {setRewardRateState.txId.slice(0, 40)}…
                          </span>
                          <a
                            href={`https://opscan.org/transactions/${setRewardRateState.txId}?network=op_testnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-btc-orange hover:text-btc-gold shrink-0"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}
                      <button onClick={onResetSetRewardRate} className="text-xs text-btc-muted hover:text-white mt-2 transition-colors">
                        Dismiss
                      </button>
                    </div>
                  )}
                  {setRewardRateState.status === 'error' && (
                    <div className="flex items-start gap-2 text-red-400">
                      <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium">Transaction failed</p>
                        <p className="text-xs text-red-400/70 mt-0.5">{setRewardRateState.error}</p>
                        <p className="text-xs text-btc-muted/60 mt-1">
                          Make sure your connected wallet is the contract deployer.
                        </p>
                        <button onClick={onResetSetRewardRate} className="text-xs text-btc-muted hover:text-white mt-1.5 transition-colors">
                          Try again
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {connected ? (
              <motion.button
                onClick={handleActivate}
                disabled={setRewardRateState.status === 'pending'}
                whileHover={{ scale: setRewardRateState.status === 'pending' ? 1 : 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full py-3.5 rounded-xl bg-gold-gradient text-black font-bold text-sm shadow-gold hover:shadow-gold-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {setRewardRateState.status === 'pending' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Broadcasting…</>
                ) : (
                  <><Zap className="w-4 h-4" /> setRewardRate({rate.toString()})</>
                )}
              </motion.button>
            ) : (
              <button
                onClick={onConnect}
                className="w-full py-3.5 rounded-xl border border-btc-orange/40 text-btc-orange text-sm font-semibold hover:bg-btc-orange/10 transition-all"
              >
                Connect Deployer Wallet
              </button>
            )}
          </div>

          {/* Info footer */}
          <div className="border-t border-btc-border pt-4 text-xs text-btc-muted/60 space-y-1">
            <p>• Contract: <span className="font-mono text-btc-muted">opt1sqzgp6q245gy7qykqgharh3d286u205yfugqyzgkr</span></p>
            <p>• On-chain guard: <code className="text-btc-muted">onlyDeployer</code> — non-deployer wallets will be rejected.</p>
            <p>• Rate can be updated later; each call snapshots current RPT first.</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
