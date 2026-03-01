import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity } from 'lucide-react';

interface TickerItem {
  id:      number;
  event:   string;
  amount:  string;
  address: string;
  time:    string;
}

// Simulated live feed (replace with real event subscription via OP_NET WebSocket)
const EVENTS = [
  { event: 'Staked',   amounts: ['0.05', '0.1', '0.25', '0.01', '0.5'] },
  { event: 'Unstaked', amounts: ['0.02', '0.08', '0.15'] },
  { event: 'Claimed',  amounts: ['0.00124', '0.00089', '0.00342'] },
];

function randomAddr() {
  return 'bc1q' + Math.random().toString(36).slice(2, 10) + '…' + Math.random().toString(36).slice(2, 6);
}

function randomTicker(): TickerItem {
  const e     = EVENTS[Math.floor(Math.random() * EVENTS.length)];
  const amt   = e.amounts[Math.floor(Math.random() * e.amounts.length)];
  const secs  = Math.floor(Math.random() * 59) + 1;
  return {
    id:      Date.now() + Math.random(),
    event:   e.event,
    amount:  amt,
    address: randomAddr(),
    time:    `${secs}s ago`,
  };
}

export function LiveTicker() {
  const [items, setItems] = useState<TickerItem[]>(() =>
    Array.from({ length: 4 }, randomTicker)
  );

  useEffect(() => {
    const id = setInterval(() => {
      setItems(prev => [randomTicker(), ...prev.slice(0, 5)]);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  const colors: Record<string, string> = {
    Staked:   'text-emerald-400',
    Unstaked: 'text-red-400',
    Claimed:  'text-btc-gold',
  };

  const dots: Record<string, string> = {
    Staked:   'bg-emerald-400',
    Unstaked: 'bg-red-400',
    Claimed:  'bg-yellow-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="bg-btc-card border border-btc-border rounded-2xl overflow-hidden"
    >
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-btc-border">
        <Activity className="w-4 h-4 text-btc-orange" />
        <h3 className="text-white font-semibold text-sm">Live Activity</h3>
        <div className="ml-auto flex items-center gap-1.5 text-emerald-400 text-xs">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </div>
      </div>

      <div className="divide-y divide-btc-border/50">
        <AnimatePresence initial={false}>
          {items.slice(0, 5).map(item => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20, backgroundColor: 'rgba(247,147,26,0.05)' }}
              animate={{ opacity: 1, x: 0, backgroundColor: 'transparent' }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-3 px-5 py-3"
            >
              <div className={`w-1.5 h-1.5 rounded-full ${dots[item.event]} shrink-0`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-semibold ${colors[item.event]}`}>{item.event}</span>
                  <span className="text-white text-xs font-mono">{item.amount} tBTC</span>
                </div>
                <p className="text-btc-muted/60 text-xs truncate">{item.address}</p>
              </div>
              <span className="text-btc-muted/50 text-xs shrink-0">{item.time}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
