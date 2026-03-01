import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, ChevronDown, LogOut, Copy, Check, ExternalLink } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { WalletStatus } from '../hooks/useWallet';
import BigNumber from 'bignumber.js';

interface WalletButtonProps {
  status:     WalletStatus;
  address:    string | null;
  balance:    bigint;
  network:    string | null;
  btcPrice:   number;
  onConnect:  () => void;
  onDisconnect: () => void;
}

function truncate(addr: string) {
  return addr.slice(0, 8) + '…' + addr.slice(-6);
}

export function WalletButton({
  status, address, balance, network, btcPrice, onConnect, onDisconnect
}: WalletButtonProps) {
  const [open,   setOpen]   = useState(false);
  const [copied, setCopied] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on any click outside the wrapper
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const balanceBTC = new BigNumber(balance.toString()).div(1e8);
  const balanceUSD = balanceBTC.times(btcPrice);

  const copyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address)
      .then(() => {
        setCopied(true);
        toast.success('Address copied!');
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => toast.error('Failed to copy — please copy manually'));
  };

  if (status !== 'connected') {
    return (
      <motion.button
        onClick={onConnect}
        disabled={status === 'connecting'}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`
          flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-semibold text-sm
          bg-gold-gradient text-black
          shadow-gold hover:shadow-gold-lg transition-all duration-200
          disabled:opacity-60 disabled:cursor-not-allowed
        `}
      >
        {status === 'connecting' ? (
          <>
            <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            Connecting…
          </>
        ) : (
          <>
            <Wallet className="w-4 h-4" />
            Connect OP_WALLET
          </>
        )}
      </motion.button>
    );
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <motion.button
        onClick={() => setOpen(v => !v)}
        whileHover={{ scale: 1.01 }}
        className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-btc-orange/30 bg-btc-card hover:border-btc-orange/60 transition-all duration-200"
      >
        {/* Network indicator */}
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />

        <div className="text-left">
          <p className="text-white text-sm font-semibold">{truncate(address!)}</p>
          <p className="text-btc-muted text-xs">{balanceBTC.toFixed(5)} tBTC</p>
        </div>

        <ChevronDown className={`w-4 h-4 text-btc-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-btc-card border border-btc-border shadow-card z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 border-b border-btc-border">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-gold-gradient flex items-center justify-center">
                    <span className="text-black font-bold text-xs">₿</span>
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">{truncate(address!)}</p>
                    <p className="text-btc-muted text-xs capitalize">{network ?? 'testnet'}</p>
                  </div>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-btc-muted text-xs mb-1">Wallet Balance</p>
                  <p className="text-white font-bold text-lg">{balanceBTC.toFixed(6)} tBTC</p>
                  <p className="text-btc-muted text-xs">≈ ${balanceUSD.toFixed(2)}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="p-2">
                <button
                  onClick={copyAddress}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-sm text-btc-muted hover:text-white"
                >
                  {copied
                    ? <><Check className="w-4 h-4 text-emerald-400" /><span className="text-emerald-400">Copied!</span></>
                    : <><Copy className="w-4 h-4" /> Copy address</>}
                </button>
                <a
                  href={`https://opscan.org/accounts/${address}?network=op_testnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-sm text-btc-muted hover:text-white"
                >
                  <ExternalLink className="w-4 h-4" /> View on Explorer
                </a>
                <button
                  onClick={() => { onDisconnect(); setOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 transition-colors text-sm text-red-400 mt-1"
                >
                  <LogOut className="w-4 h-4" /> Disconnect
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
