import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { WalletButton } from './WalletButton';
import { WalletStatus } from '../hooks/useWallet';

export type AppPage = 'stake' | 'analytics' | 'docs' | 'dashboard' | 'referral';

const NAV_ITEMS: { label: string; page: AppPage }[] = [
  { label: 'Stake',     page: 'stake'     },
  { label: 'Dashboard', page: 'dashboard' },
  { label: 'Referral',  page: 'referral'  },
  { label: 'Analytics', page: 'analytics' },
  { label: 'Docs',      page: 'docs'      },
];

interface HeaderProps {
  status:       WalletStatus;
  address:      string | null;
  balance:      bigint;
  network:      string | null;
  btcPrice:     number;
  page:         AppPage;
  onConnect:    () => void;
  onDisconnect: () => void;
  onNavigate:   (p: AppPage) => void;
}

export function Header({
  status, address, balance, network, btcPrice,
  page, onConnect, onDisconnect, onNavigate,
}: HeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative z-50 flex items-center justify-between px-6 py-4 border-b border-btc-border/50 backdrop-blur-sm"
      style={{ background: 'rgba(6,0,14,0.85)' }}
    >
      {/* Logo */}
      <button
        onClick={() => onNavigate('stake')}
        className="flex items-center gap-3 hover:opacity-90 transition-opacity"
      >
        <div className="relative w-9 h-9">
          <div className="absolute inset-0 rounded-xl bg-gold-gradient opacity-20 animate-pulse" />
          <div className="relative w-9 h-9 rounded-xl bg-gold-gradient flex items-center justify-center shadow-gold">
            <span className="text-black font-black text-lg">₿</span>
          </div>
        </div>
        <div>
          <h1 className="text-white font-black text-lg leading-none tracking-tight">
            BTC<span className="text-transparent bg-clip-text bg-gold-gradient">Stake</span>
          </h1>
          <p className="text-btc-muted text-[10px] font-medium tracking-widest uppercase">OP_NET Testnet</p>
        </div>
      </button>

      {/* Center: nav links */}
      <nav className="hidden md:flex items-center gap-1">
        {NAV_ITEMS.map(({ label, page: p }) => {
          const active = page === p;
          return (
            <button
              key={p}
              onClick={() => onNavigate(p)}
              className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                active
                  ? 'text-btc-orange'
                  : 'text-btc-muted hover:text-white hover:bg-white/5'
              }`}
            >
              {label}
              {active && (
                <motion.span
                  layoutId="nav-indicator"
                  className="absolute inset-0 rounded-lg border border-btc-orange/30 bg-btc-orange/5"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Right: network badge + wallet */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-btc-border text-xs text-btc-muted">
          <Zap className="w-3 h-3 text-btc-orange" />
          Testnet
        </div>
        <WalletButton
          status={status}
          address={address}
          balance={balance}
          network={network}
          btcPrice={btcPrice}
          onConnect={onConnect}
          onDisconnect={onDisconnect}
        />
      </div>
    </motion.header>
  );
}
