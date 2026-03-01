import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, ChevronDown, Wallet, Zap, Shield,
  Code2, HelpCircle, ArrowRight, Copy, Check,
} from 'lucide-react';
import { CONTRACT_ADDR } from '../lib/opnet';

// ── Shared card style ─────────────────────────────────────────────────────────
const cardClass =
  'rounded-2xl border border-btc-border/50 bg-btc-card/80 backdrop-blur-sm';
const cardStyle = {
  boxShadow: '0 4px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(150,50,255,0.07)',
};

// ── Section IDs (for ToC) ─────────────────────────────────────────────────────
const SECTIONS = [
  { id: 'what',     label: 'What is BTCStake?' },
  { id: 'how',      label: 'How to Stake' },
  { id: 'rewards',  label: 'How Rewards Work' },
  { id: 'contract', label: 'Smart Contract' },
  { id: 'faq',      label: 'FAQ' },
];

// ── Copy button ───────────────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="ml-2 p-1.5 rounded-lg border border-btc-border/50 text-btc-muted hover:text-white hover:border-btc-orange/40 transition-all"
    >
      {copied
        ? <Check  className="w-3.5 h-3.5 text-emerald-400" />
        : <Copy   className="w-3.5 h-3.5" />}
    </button>
  );
}

// ── Code block ────────────────────────────────────────────────────────────────
function Code({ children }: { children: string }) {
  return (
    <code className="font-mono text-[13px] bg-black/40 border border-btc-border/40 rounded-lg px-3 py-2 block text-[#ff88cc] whitespace-pre-wrap">
      {children}
    </code>
  );
}

// ── Inline code ───────────────────────────────────────────────────────────────
function Ic({ children }: { children: string }) {
  return (
    <code className="font-mono text-[12px] bg-black/40 border border-btc-border/30 rounded px-1.5 py-0.5 text-[#ff88cc]">
      {children}
    </code>
  );
}

// ── Step list ─────────────────────────────────────────────────────────────────
function Steps({ items }: { items: { title: string; desc: string }[] }) {
  return (
    <ol className="space-y-4">
      {items.map((s, i) => (
        <li key={i} className="flex gap-4">
          <span
            className="flex-none w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-black shrink-0 mt-0.5"
            style={{ background: 'linear-gradient(135deg,#f7931a,#ffd700)' }}
          >
            {i + 1}
          </span>
          <div>
            <p className="text-white font-semibold text-sm">{s.title}</p>
            <p className="text-btc-muted text-sm mt-0.5">{s.desc}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

// ── FAQ accordion ─────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    q: 'Is my Bitcoin safe while staking?',
    a: 'Yes. BTCStake is a non-custodial smart contract deployed on OP_NET. Your private keys never leave your wallet. The contract only holds accounting data; your funds are secured by the Bitcoin consensus layer.',
  },
  {
    q: 'How do I withdraw my staked tBTC?',
    a: 'Click the "Unstake" tab in the staking panel, enter the amount you want to withdraw, and confirm the transaction with your wallet. Rewards are automatically claimed to your wallet at the same time.',
  },
  {
    q: 'When exactly are rewards paid out?',
    a: 'Rewards accrue every Bitcoin block (roughly every 10 minutes). They are calculated and credited to your account whenever you interact with the contract (stake, unstake, or claim). You can also trigger a claim at any time without affecting your staked position.',
  },
  {
    q: 'What are the protocol fees?',
    a: 'BTCStake charges no protocol fee. You only pay the standard Bitcoin network fee required to include your transaction in a block. Fees depend on network congestion and are estimated automatically by the SDK.',
  },
  {
    q: 'Which wallets are supported?',
    a: 'Any wallet that supports the OP_NET signing interface works. Currently that includes OP_WALLET (recommended) and UniSat Wallet. MetaMask-style EVM wallets are not supported — you need a Bitcoin-native wallet.',
  },
  {
    q: 'What is the minimum stake amount?',
    a: 'There is no enforced minimum in the contract. However, practical minimums exist due to Bitcoin dust limits (546 satoshis). We recommend staking at least 0.001 tBTC to make the transaction fees economically sensible.',
  },
  {
    q: 'Does APY change over time?',
    a: 'Yes. APY is dynamic and inversely proportional to Total Value Locked. As more tBTC is staked, the reward rate per staker decreases, and vice versa. This mirrors standard DeFi staking incentive mechanics.',
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-btc-border/40 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-4 py-4 text-left group"
      >
        <span className="text-white text-sm font-medium group-hover:text-btc-orange transition-colors">
          {q}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-none text-btc-muted"
        >
          <ChevronDown className="w-4 h-4" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <p className="pb-4 text-btc-muted text-sm leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({
  id, icon, title, accent, children, delay,
}: {
  id: string; icon: React.ReactNode; title: string;
  accent?: string; children: React.ReactNode; delay: number;
}) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className={`${cardClass} p-6`}
      style={cardStyle}
    >
      <div className="flex items-center gap-3 mb-5">
        <span
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(100,0,200,0.25)', border: '1px solid rgba(150,50,255,0.3)' }}
        >
          {icon}
        </span>
        <h3 className="text-white font-bold text-lg">
          {title}
          {accent && (
            <span className="text-transparent bg-clip-text bg-gold-gradient ml-2">{accent}</span>
          )}
        </h3>
      </div>
      {children}
    </motion.section>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function Docs() {
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const [activeSection, setActiveSection] = useState('what');

  const scrollTo = (id: string) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      {/* Page title */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-1">
          <BookOpen className="w-5 h-5 text-btc-orange" />
          <h2 className="text-white text-2xl font-black tracking-tight">
            Protocol <span className="text-transparent bg-clip-text bg-gold-gradient">Docs</span>
          </h2>
        </div>
        <p className="text-btc-muted text-sm">Everything you need to use BTCStake on OP_NET testnet</p>
      </motion.div>

      <div className="flex gap-8 items-start">

        {/* ── Sticky ToC sidebar (desktop) ──────────────────────────────────── */}
        <motion.aside
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="hidden lg:block w-52 shrink-0 sticky top-24"
        >
          <div className={`${cardClass} p-4`} style={cardStyle}>
            <p className="text-btc-muted text-[10px] font-semibold uppercase tracking-widest mb-3">
              Contents
            </p>
            <nav className="space-y-1">
              {SECTIONS.map(s => (
                <button
                  key={s.id}
                  onClick={() => scrollTo(s.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-all ${
                    activeSection === s.id
                      ? 'bg-btc-orange/10 text-btc-orange border border-btc-orange/20'
                      : 'text-btc-muted hover:text-white hover:bg-white/5'
                  }`}
                >
                  <ArrowRight className="w-3 h-3 shrink-0" />
                  {s.label}
                </button>
              ))}
            </nav>
          </div>
        </motion.aside>

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <div className="flex-1 space-y-6 min-w-0">

          {/* What is BTCStake? */}
          <Section id="what" icon={<BookOpen className="w-4 h-4 text-[#ff88cc]" />}
            title="What is" accent="BTCStake?" delay={0.15}>
            <div className="space-y-3 text-btc-muted text-sm leading-relaxed">
              <p>
                <strong className="text-white">BTCStake</strong> is the first native Bitcoin staking
                protocol built on <strong className="text-btc-orange">OP_NET</strong> — Bitcoin's
                programmability layer. It lets holders of tBTC (testnet Bitcoin) lock their assets in
                a non-custodial smart contract and earn block rewards paid in satoshis.
              </p>
              <p>
                Unlike wrapped-token DeFi on EVM chains, BTCStake operates directly on the Bitcoin
                execution layer. Contracts are compiled from{' '}
                <Ic>AssemblyScript</Ic> to <Ic>WASM</Ic> and verified
                by OP_NET's consensus nodes. No bridges, no wrapped assets.
              </p>
              <div
                className="rounded-xl p-4 mt-2 border"
                style={{ background: 'rgba(247,147,26,0.05)', borderColor: 'rgba(247,147,26,0.2)' }}
              >
                <p className="text-btc-orange text-xs font-semibold mb-1">⚠ Testnet only</p>
                <p className="text-btc-muted text-xs">
                  BTCStake is currently deployed on OP_NET testnet. tBTC has no real-world value.
                  Do not send mainnet BTC to this contract.
                </p>
              </div>
            </div>
          </Section>

          {/* How to Stake */}
          <Section id="how" icon={<Wallet className="w-4 h-4 text-[#44ddff]" />}
            title="How to" accent="Stake tBTC" delay={0.20}>
            <div className="space-y-5">
              <p className="text-btc-muted text-sm leading-relaxed">
                Staking takes under a minute. You'll need a compatible Bitcoin wallet and some tBTC
                from a testnet faucet.
              </p>
              <Steps items={[
                {
                  title: 'Install a compatible wallet',
                  desc:  'Install OP_WALLET or UniSat Wallet as a browser extension. Both support the OP_NET signing interface required to interact with smart contracts.',
                },
                {
                  title: 'Get testnet tBTC',
                  desc:  'Visit a Bitcoin testnet faucet to receive tBTC. Set your wallet to OP_NET Testnet mode if it has a network selector.',
                },
                {
                  title: 'Connect your wallet',
                  desc:  'Click "Connect Wallet" in the top-right corner. Approve the connection request in your wallet popup.',
                },
                {
                  title: 'Enter a stake amount',
                  desc:  'Type the tBTC amount in the Stake tab, or drag the slider. The panel shows your expected monthly earnings in real time.',
                },
                {
                  title: 'Confirm the transaction',
                  desc:  'Click "Stake tBTC" and approve the transaction in your wallet. Once the Bitcoin transaction confirms, your stake is live and earning rewards immediately.',
                },
              ]} />
            </div>
          </Section>

          {/* How Rewards Work */}
          <Section id="rewards" icon={<Zap className="w-4 h-4 text-btc-orange" />}
            title="How" accent="Rewards Work" delay={0.25}>
            <div className="space-y-4 text-sm text-btc-muted leading-relaxed">
              <p>
                Rewards accrue every Bitcoin block (~10 minutes) using a global
                reward-per-token accumulator pattern — the same mechanism used by Synthetix and
                Uniswap v3 staking contracts, adapted for the Bitcoin execution layer.
              </p>

              <div>
                <p className="text-white font-semibold mb-2">Core formula</p>
                <Code>{`rewardPerToken += (blockDelta × rewardRate × PRECISION) ÷ totalStaked

pendingReward = stakedAmount × (rewardPerToken − userLastRewardPerToken) ÷ PRECISION`}</Code>
              </div>

              <ul className="space-y-2 mt-2">
                {[
                  ['rewardRate', 'Satoshis distributed per block per BTC staked (set by deployer; currently 10 sat/block/BTC).'],
                  ['blockDelta', 'Number of Bitcoin blocks since the last contract interaction.'],
                  ['totalStaked', 'Total tBTC currently locked in the contract.'],
                  ['PRECISION', '1 × 10⁸ — used to avoid integer division rounding errors.'],
                ].map(([term, def]) => (
                  <li key={term as string} className="flex gap-2">
                    <Ic>{term as string}</Ic>
                    <span className="text-xs mt-0.5">{def as string}</span>
                  </li>
                ))}
              </ul>

              <p>
                Rewards are credited automatically whenever you stake, unstake, or manually claim.
                There's no lock-up period — you can withdraw at any time.
              </p>

              <div
                className="rounded-xl p-4 border"
                style={{ background: 'rgba(34,221,136,0.05)', borderColor: 'rgba(34,221,136,0.2)' }}
              >
                <p className="text-emerald-400 text-xs font-semibold mb-1">APY calculation</p>
                <p className="text-xs">
                  APY (%) = <Ic>rewardRate × 52 560 × 10 000 ÷ totalStaked</Ic>
                  &nbsp;where 52 560 is the approximate number of Bitcoin blocks per year.
                  APY decreases as TVL grows.
                </p>
              </div>
            </div>
          </Section>

          {/* Smart Contract */}
          <Section id="contract" icon={<Code2 className="w-4 h-4 text-[#cc44ff]" />}
            title="Smart" accent="Contract" delay={0.30}>
            <div className="space-y-4 text-sm">
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { label: 'Network',   value: 'OP_NET Testnet' },
                  { label: 'Language',  value: 'AssemblyScript → WASM' },
                  { label: 'Runtime',   value: 'btc-runtime v1.10.12' },
                  { label: 'Entry points', value: 'execute · onDeploy' },
                ].map(r => (
                  <div
                    key={r.label}
                    className="rounded-xl p-3 border border-btc-border/40"
                    style={{ background: 'rgba(20,0,40,0.4)' }}
                  >
                    <p className="text-btc-muted text-xs mb-0.5">{r.label}</p>
                    <p className="text-white font-mono text-sm">{r.value}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-white font-semibold mb-2">Contract address</p>
                <div className="flex items-center gap-2 rounded-xl border border-btc-border/40 p-3"
                  style={{ background: 'rgba(20,0,40,0.4)' }}>
                  <span className="font-mono text-sm text-[#ff88cc] break-all flex-1">
                    {CONTRACT_ADDR || '(not deployed — set VITE_CONTRACT_ADDRESS in .env)'}
                  </span>
                  {CONTRACT_ADDR && <CopyButton text={CONTRACT_ADDR} />}
                </div>
              </div>

              <div>
                <p className="text-white font-semibold mb-2">Exposed methods</p>
                <div className="space-y-2">
                  {[
                    { sig: 'stake(uint256)',              desc: 'Lock tBTC and start earning rewards.' },
                    { sig: 'unstake(uint256)',            desc: 'Withdraw staked tBTC (claims pending rewards first).' },
                    { sig: 'claimRewards()',              desc: 'Transfer pending rewards without changing stake.' },
                    { sig: 'getTVL() → uint256',         desc: 'Total satoshis currently staked.' },
                    { sig: 'getAPY() → uint256',         desc: 'Current APY in basis points (1200 = 12%).' },
                    { sig: 'getUserPosition(address)',   desc: 'Returns staked, pending reward, stake block.' },
                    { sig: 'setRewardRate(uint256)',     desc: 'Deployer-only: update the reward rate.' },
                  ].map(m => (
                    <div key={m.sig} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                      <Ic>{m.sig}</Ic>
                      <span className="text-btc-muted text-xs">{m.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-white font-semibold mb-2">Events emitted</p>
                <div className="flex flex-wrap gap-2">
                  {['Staked(address, uint256)', 'Unstaked(address, uint256)', 'RewardClaimed(address, uint256)'].map(e => (
                    <Ic key={e}>{e}</Ic>
                  ))}
                </div>
              </div>
            </div>
          </Section>

          {/* FAQ */}
          <Section id="faq" icon={<HelpCircle className="w-4 h-4 text-[#ff44cc]" />}
            title="Frequently Asked" accent="Questions" delay={0.35}>
            <div>
              {FAQ_ITEMS.map((item, i) => (
                <FaqItem key={i} q={item.q} a={item.a} />
              ))}
            </div>
          </Section>

        </div>
      </div>
    </div>
  );
}
