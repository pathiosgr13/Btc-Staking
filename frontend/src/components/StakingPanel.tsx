import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDownToLine, ArrowUpFromLine, Gift, Loader2, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { TxState } from '../hooks/useStaking';
import BigNumber from 'bignumber.js';

type Tab = 'stake' | 'unstake' | 'claim';

interface StakingPanelProps {
  connected:      boolean;
  stakedAmount:   BigNumber;
  pendingReward:  BigNumber;
  walletBalance:  bigint;
  btcPrice:       number;
  stakeState:     TxState;
  unstakeState:   TxState;
  claimState:     TxState;
  onStake:        (amount: string) => void;
  onUnstake:      (amount: string) => void;
  onClaimRewards: () => void;
  onResetTx:      (type: 'stake' | 'unstake' | 'claim') => void;
  onConnect:      () => void;
}

function TxResult({ state, type, onReset }: { state: TxState; type: 'stake' | 'unstake' | 'claim'; onReset: () => void }) {
  if (state.status === 'idle') return null;
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className={`mt-4 p-4 rounded-xl border ${
          state.status === 'success' ? 'bg-emerald-500/10 border-emerald-500/30' :
          state.status === 'error'   ? 'bg-red-500/10 border-red-500/30' :
          'bg-btc-orange/10 border-btc-orange/30'
        }`}
      >
        {state.status === 'pending' && (
          <div className="flex items-center gap-3 text-btc-orange">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-medium">Broadcasting transaction…</span>
          </div>
        )}
        {state.status === 'success' && (
          <div>
            <div className="flex items-center gap-3 text-emerald-400 mb-2">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-semibold">Transaction confirmed!</span>
            </div>
            {state.txId && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-btc-muted font-mono truncate">{state.txId.slice(0, 32)}…</span>
                <a
                  href={`https://opscan.org/transactions/${state.txId}?network=op_testnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-btc-orange hover:text-btc-gold"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
            <button onClick={onReset} className="text-xs text-btc-muted hover:text-white mt-2 transition-colors">
              Dismiss
            </button>
          </div>
        )}
        {state.status === 'error' && (
          <div className="flex items-start gap-3 text-red-400">
            <XCircle className="w-5 h-5 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Transaction failed</p>
              <p className="text-xs text-red-400/70 mt-1">{state.error}</p>
              <button onClick={onReset} className="text-xs text-btc-muted hover:text-white mt-2 transition-colors">
                Try again
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function AmountInput({
  value,
  onChange,
  max,
  label,
  placeholder,
  btcPrice,
}: {
  value: string;
  onChange: (v: string) => void;
  max: BigNumber;
  label: string;
  placeholder: string;
  btcPrice: number;
}) {
  const usdValue = value ? new BigNumber(value).times(btcPrice) : new BigNumber(0);
  const pct = (n: number) => onChange(max.times(n / 100).toFixed(8));

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <label className="text-btc-muted text-sm">{label}</label>
        <span className="text-btc-muted text-xs">
          Max: <button onClick={() => onChange(max.toFixed(8))} className="text-btc-orange hover:text-btc-gold transition-colors font-medium">
            {max.toFixed(6)} tBTC
          </button>
        </span>
      </div>

      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          min="0"
          step="0.00001"
          className="
            w-full bg-white/5 border border-btc-border rounded-xl px-4 py-3.5 pr-20
            text-white font-mono text-lg placeholder:text-btc-muted/40
            focus:outline-none focus:border-btc-orange/60 focus:ring-1 focus:ring-btc-orange/20
            transition-all duration-200
          "
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-btc-orange font-semibold text-sm">
          tBTC
        </span>
      </div>

      <div className="flex items-center justify-between mt-2">
        <div className="flex gap-1.5">
          {[25, 50, 75, 100].map(n => (
            <button
              key={n}
              onClick={() => pct(n)}
              className="text-xs px-2 py-0.5 rounded-lg bg-white/5 text-btc-muted hover:bg-btc-orange/10 hover:text-btc-orange border border-btc-border hover:border-btc-orange/30 transition-all"
            >
              {n}%
            </button>
          ))}
        </div>
        {value && (
          <span className="text-btc-muted text-xs">≈ ${usdValue.toFixed(2)}</span>
        )}
      </div>
    </div>
  );
}

export function StakingPanel({
  connected, stakedAmount, pendingReward, walletBalance, btcPrice,
  stakeState, unstakeState, claimState,
  onStake, onUnstake, onClaimRewards, onResetTx, onConnect,
}: StakingPanelProps) {
  const [tab, setTab] = useState<Tab>('stake');
  const [stakeAmt, setStakeAmt]   = useState('');
  const [unstakeAmt, setUnstakeAmt] = useState('');

  const walletBTC = new BigNumber(walletBalance.toString()).div(1e8);

  const tabs: { id: Tab; label: string; icon: typeof ArrowDownToLine }[] = [
    { id: 'stake',   label: 'Stake',   icon: ArrowDownToLine },
    { id: 'unstake', label: 'Unstake', icon: ArrowUpFromLine },
    { id: 'claim',   label: 'Claim',   icon: Gift },
  ];

  const handleStake = () => {
    if (!stakeAmt || new BigNumber(stakeAmt).lte(0)) {
      toast.error('Enter a valid amount');
      return;
    }
    if (new BigNumber(stakeAmt).gt(walletBTC)) {
      toast.error('Insufficient wallet balance');
      return;
    }
    onStake(stakeAmt);
  };

  const handleUnstake = () => {
    if (!unstakeAmt || new BigNumber(unstakeAmt).lte(0)) {
      toast.error('Enter a valid amount');
      return;
    }
    if (new BigNumber(unstakeAmt).gt(stakedAmount)) {
      toast.error('Insufficient staked balance');
      return;
    }
    onUnstake(unstakeAmt);
  };

  const handleClaim = () => {
    if (pendingReward.lte(0)) {
      toast.error('No rewards to claim yet');
      return;
    }
    onClaimRewards();
  };

  if (!connected) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-btc-card border border-btc-border rounded-2xl p-8 text-center"
      >
        <div className="w-16 h-16 rounded-2xl bg-btc-orange/10 border border-btc-orange/20 flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">₿</span>
        </div>
        <h3 className="text-white text-xl font-bold mb-2">Connect your wallet</h3>
        <p className="text-btc-muted text-sm mb-6 max-w-xs mx-auto">
          Connect OP_WALLET or UniSat to start staking tBTC and earn rewards.
        </p>
        <motion.button
          onClick={onConnect}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="bg-gold-gradient text-black font-bold px-8 py-3 rounded-xl shadow-gold hover:shadow-gold-lg transition-all"
        >
          Connect Wallet
        </motion.button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-btc-card border border-btc-border rounded-2xl overflow-hidden"
    >
      {/* Top border glow */}
      <div className="h-px bg-gradient-to-r from-transparent via-btc-orange/50 to-transparent" />

      {/* Tabs */}
      <div className="flex border-b border-btc-border">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`
              flex-1 flex items-center justify-center gap-2 py-4 text-sm font-semibold
              transition-all duration-200 relative
              ${tab === id ? 'text-btc-orange' : 'text-btc-muted hover:text-white'}
            `}
          >
            <Icon className="w-4 h-4" />
            {label}
            {tab === id && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold-gradient"
              />
            )}
          </button>
        ))}
      </div>

      <div className="p-6">
        <AnimatePresence mode="wait">
          {tab === 'stake' && (
            <motion.div
              key="stake"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <AmountInput
                value={stakeAmt}
                onChange={setStakeAmt}
                max={walletBTC}
                label="Amount to stake"
                placeholder="0.00000000"
                btcPrice={btcPrice}
              />

              <TxResult state={stakeState} type="stake" onReset={() => onResetTx('stake')} />

              <motion.button
                onClick={handleStake}
                disabled={stakeState.status === 'pending'}
                whileHover={{ scale: stakeState.status === 'pending' ? 1 : 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full mt-5 py-4 rounded-xl bg-gold-gradient text-black font-bold text-base shadow-gold hover:shadow-gold-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {stakeState.status === 'pending' ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Staking…</>
                ) : (
                  <><ArrowDownToLine className="w-5 h-5" /> Stake tBTC</>
                )}
              </motion.button>

              <p className="text-btc-muted/60 text-xs text-center mt-3">
                Rewards accrue every Bitcoin block (~10 min)
              </p>
            </motion.div>
          )}

          {tab === 'unstake' && (
            <motion.div
              key="unstake"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              {stakedAmount.lte(0) ? (
                <div className="text-center py-8">
                  <p className="text-btc-muted text-sm">You have no staked tBTC.</p>
                  <button onClick={() => setTab('stake')} className="text-btc-orange text-sm mt-2 hover:text-btc-gold transition-colors">
                    Stake now →
                  </button>
                </div>
              ) : (
                <>
                  <AmountInput
                    value={unstakeAmt}
                    onChange={setUnstakeAmt}
                    max={stakedAmount}
                    label="Amount to unstake"
                    placeholder="0.00000000"
                    btcPrice={btcPrice}
                  />

                  <TxResult state={unstakeState} type="unstake" onReset={() => onResetTx('unstake')} />

                  <motion.button
                    onClick={handleUnstake}
                    disabled={unstakeState.status === 'pending'}
                    whileHover={{ scale: unstakeState.status === 'pending' ? 1 : 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="w-full mt-5 py-4 rounded-xl border border-btc-orange/50 text-btc-orange bg-btc-orange/5 hover:bg-btc-orange/10 font-bold text-base transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {unstakeState.status === 'pending' ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Unstaking…</>
                    ) : (
                      <><ArrowUpFromLine className="w-5 h-5" /> Unstake tBTC</>
                    )}
                  </motion.button>
                </>
              )}
            </motion.div>
          )}

          {tab === 'claim' && (
            <motion.div
              key="claim"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="text-center"
            >
              <div className="bg-gradient-to-br from-btc-orange/10 to-btc-gold/5 border border-btc-orange/20 rounded-2xl p-6 mb-5">
                <p className="text-btc-muted text-sm mb-2">Claimable Rewards</p>
                <p className="text-4xl font-bold text-transparent bg-clip-text bg-gold-gradient animate-glow">
                  {pendingReward.toFixed(8)}
                </p>
                <p className="text-btc-orange text-base font-semibold mt-1">tBTC</p>
                <p className="text-btc-muted text-xs mt-2">
                  ≈ ${pendingReward.times(btcPrice).toFixed(4)} USD
                </p>
              </div>

              <TxResult state={claimState} type="claim" onReset={() => onResetTx('claim')} />

              <motion.button
                onClick={handleClaim}
                disabled={claimState.status === 'pending' || pendingReward.lte(0)}
                whileHover={{ scale: claimState.status === 'pending' || pendingReward.lte(0) ? 1 : 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 rounded-xl bg-gold-gradient text-black font-bold text-base shadow-gold hover:shadow-gold-lg transition-all duration-200 disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {claimState.status === 'pending' ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Claiming…</>
                ) : (
                  <><Gift className="w-5 h-5" /> Claim All Rewards</>
                )}
              </motion.button>

              <p className="text-btc-muted/60 text-xs text-center mt-3">
                Rewards are sent directly to your wallet
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
