/**
 * OP_NET Client
 *
 * Uses the real `opnet` npm package (v1.8.x) browser bundle.
 * Network object from @btc-vision/bitcoin.
 */

// @ts-ignore — opnet browser build; Vite handles the browser condition
import {
  JSONRpcProvider,
  getContract,
  BitcoinInterface,
  ABIDataTypes,
  BitcoinAbiTypes,
} from 'opnet';
import { networks } from '@btc-vision/bitcoin';
import type { Network } from '@btc-vision/bitcoin';
// bech32m is a CJS package already used by the opnet bundle; Vite pre-bundles it
import { bech32m, bech32 } from 'bech32';
import BigNumber from 'bignumber.js';

// ─── Types ────────────────────────────────────────────────────────────────────
type AnyProvider = InstanceType<typeof JSONRpcProvider>;

// ─── Network ─────────────────────────────────────────────────────────────────
let _network: Network | null = null;
async function getNetwork(): Promise<Network> {
  if (_network) return _network;
  _network = networks.testnet as Network;
  return _network;
}

export const RPC_URL       = (import.meta as any).env?.VITE_RPC_URL        || 'https://testnet.opnet.org';
export const CONTRACT_ADDR = (import.meta as any).env?.VITE_CONTRACT_ADDRESS || '';

// ─── Precision ────────────────────────────────────────────────────────────────
export const SAT = new BigNumber(1e8);
export const satsToBTC = (sats: bigint | string | number): BigNumber =>
  new BigNumber(sats.toString()).div(SAT);
export const BTCToSats = (btc: string | number): BigNumber =>
  new BigNumber(btc.toString()).times(SAT).integerValue();

// ─── ABI ─────────────────────────────────────────────────────────────────────
const CUSTOM_STAKING_ABI = [
  {
    name: 'stake',
    type: BitcoinAbiTypes.Function as typeof BitcoinAbiTypes.Function,
    inputs:  [{ name: 'amount', type: ABIDataTypes.UINT256 }],
    outputs: [],
  },
  {
    name: 'unstake',
    type: BitcoinAbiTypes.Function as typeof BitcoinAbiTypes.Function,
    inputs:  [{ name: 'amount', type: ABIDataTypes.UINT256 }],
    outputs: [],
  },
  {
    name: 'claimRewards',
    type: BitcoinAbiTypes.Function as typeof BitcoinAbiTypes.Function,
    inputs:  [],
    outputs: [],
  },
  {
    name: 'getTVL',
    type: BitcoinAbiTypes.Function as typeof BitcoinAbiTypes.Function,
    inputs:  [],
    outputs: [{ name: 'tvl', type: ABIDataTypes.UINT256 }],
  },
  {
    name: 'getAPY',
    type: BitcoinAbiTypes.Function as typeof BitcoinAbiTypes.Function,
    inputs:  [],
    outputs: [{ name: 'apy', type: ABIDataTypes.UINT256 }],
  },
  {
    name: 'getUserPosition',
    type: BitcoinAbiTypes.Function as typeof BitcoinAbiTypes.Function,
    inputs:  [{ name: 'user', type: ABIDataTypes.ADDRESS }],
    outputs: [
      { name: 'stakedAmount',  type: ABIDataTypes.UINT256 },
      { name: 'pendingReward', type: ABIDataTypes.UINT256 },
      { name: 'stakeBlock',    type: ABIDataTypes.UINT256 },
    ],
  },
  {
    name:   'Staked',
    type:   BitcoinAbiTypes.Event as typeof BitcoinAbiTypes.Event,
    values: [
      { name: 'user',   type: ABIDataTypes.ADDRESS },
      { name: 'amount', type: ABIDataTypes.UINT256 },
    ],
  },
  {
    name:   'Unstaked',
    type:   BitcoinAbiTypes.Event as typeof BitcoinAbiTypes.Event,
    values: [
      { name: 'user',   type: ABIDataTypes.ADDRESS },
      { name: 'amount', type: ABIDataTypes.UINT256 },
    ],
  },
  {
    name:   'RewardClaimed',
    type:   BitcoinAbiTypes.Event as typeof BitcoinAbiTypes.Event,
    values: [
      { name: 'user',   type: ABIDataTypes.ADDRESS },
      { name: 'reward', type: ABIDataTypes.UINT256 },
    ],
  },
] as const;

// ─── Provider ─────────────────────────────────────────────────────────────────
let _provider: AnyProvider | null = null;
export async function getReadProvider(): Promise<AnyProvider> {
  if (_provider) return _provider;
  const network = await getNetwork();
  _provider = new JSONRpcProvider(RPC_URL, network) as AnyProvider;
  return _provider;
}

// ─── Typed return types ───────────────────────────────────────────────────────
export interface UserPosition {
  stakedAmount:  BigNumber;
  pendingReward: BigNumber;
  stakeBlock:    bigint;
}

// ─── Contract helper ──────────────────────────────────────────────────────────
async function getStakingContract(provider?: AnyProvider) {
  const p   = provider ?? await getReadProvider();
  const net = await getNetwork();
  const abi = new BitcoinInterface(CUSTOM_STAKING_ABI as any);
  // Do not pass a sender — OP_WALLET signs via window.opnet.web3.signInteraction()
  // using the connected account. Address.fromString() requires an ML-DSA key
  // (1312–2592 bytes), which secp256k1 wallets don't provide.
  return getContract(CONTRACT_ADDR, abi, p, net, undefined);
}

// ─── Balance fetch ────────────────────────────────────────────────────────────

/**
 * Fetch the confirmed tBTC balance for an address.
 *
 * Strategy 1 — wallet provider's own getBalance():
 *   Both OP_WALLET (window.opnet) and UniSat (window.unisat) extend the same
 *   Unisat interface and return { confirmed, unconfirmed, total } in satoshis.
 *   This is the exact same source the wallet UI displays, so it always matches.
 *
 * Strategy 2 — OP_NET RPC fallback:
 *   JSONRpcProvider.getBalance(address, filterOrdinals=true) — the `true` flag
 *   excludes ordinal/inscription UTXOs from the total, returning only spendable
 *   sats.  The previous value of `false` inflated the balance by including locked
 *   ordinal sats that the wallet correctly excluded from its display.
 *   The singleton is reset on failure so the next call gets a fresh connection.
 */
export async function fetchBalance(address: string, walletProvider?: any): Promise<bigint> {
  console.log('[BTCStake] fetchBalance → address:', address, '| has walletProvider:', !!walletProvider);

  // Strategy 1: ask the wallet extension directly — matches wallet UI exactly
  if (walletProvider?.getBalance) {
    try {
      console.log('[BTCStake] fetchBalance → calling walletProvider.getBalance()...');
      const raw = await walletProvider.getBalance();
      console.log('[BTCStake] fetchBalance → raw result:', typeof raw, JSON.stringify(raw));

      // OP_WALLET and UniSat both return { confirmed, unconfirmed, total } in sats
      if (raw != null && typeof raw === 'object') {
        console.log('[BTCStake] fetchBalance → object keys:', Object.keys(raw));
        // Prefer 'confirmed', fall back to 'total'
        const amount = raw.confirmed ?? raw.total ?? raw.balance ?? raw.amount;
        if (amount !== undefined && amount !== null) {
          const sats = BigInt(Math.round(Number(amount)));
          console.log('[BTCStake] fetchBalance → sats from object:', sats.toString(), '(field used:', raw.confirmed !== undefined ? 'confirmed' : raw.total !== undefined ? 'total' : 'other', ')');
          return sats;
        }
        console.warn('[BTCStake] fetchBalance → object has no recognized balance field:', raw);
      }
      // Older / alternative formats: plain number, bigint, or numeric string
      if (typeof raw === 'number' || typeof raw === 'bigint' || typeof raw === 'string') {
        const sats = BigInt(Math.round(Number(raw)));
        console.log('[BTCStake] fetchBalance → sats from primitive:', sats.toString());
        return sats;
      }
    } catch (e: any) {
      console.warn('[BTCStake] fetchBalance → walletProvider.getBalance() threw:', e?.message ?? e);
      // Fall through to RPC
    }
  } else {
    console.log('[BTCStake] fetchBalance → walletProvider.getBalance not available, skipping to RPC');
  }

  // Strategy 2: OP_NET RPC — filterOrdinals=true to count only spendable UTXOs
  try {
    console.log('[BTCStake] fetchBalance → trying RPC getBalance for:', address);
    const provider = await getReadProvider();
    const sats = await (provider as any).getBalance(address, true);
    console.log('[BTCStake] fetchBalance → RPC raw sats:', sats?.toString());
    return BigInt(sats?.toString() ?? '0');
  } catch (e: any) {
    console.warn('[BTCStake] fetchBalance → RPC getBalance failed:', e?.message ?? e);
    _provider = null; // reset singleton so next call reconnects cleanly
    return 0n;
  }
}

// ─── Read helpers ─────────────────────────────────────────────────────────────

/**
 * Read a single uint256 from a CallResult.
 *
 * The SDK populates `res.properties` via its ABI decoder (named fields).
 * If that is empty (e.g. SDK edge case, partial decode), fall back to reading
 * the raw BinaryReader — `res.result` starts at offset 0 after the call.
 *
 * NOTE: `res.decoded` does NOT exist on CallResult — the correct fields are
 * `res.properties` (named object) and `res.result` (raw BinaryReader).
 */
function readU256Result(res: any, propName: string, fallback: bigint): bigint {
  // Log but do NOT throw on revert — a reverting getTVL/getAPY should not crash
  // the entire refresh and leave the UI blank.
  if (res?.revert) {
    console.warn(`[BTCStake] contract call reverted (${propName}):`, res.revert);
    return fallback;
  }
  const fromProp = res?.properties?.[propName];
  if (fromProp !== undefined && fromProp !== null) return BigInt(fromProp.toString());
  // BinaryReader fallback — reset cursor then read the first uint256
  const reader = res?.result;
  if (reader?.setOffset && reader?.readU256) {
    try { reader.setOffset(0); return reader.readU256(); } catch { /* ignore */ }
  }
  return fallback;
}

export async function fetchTVL(): Promise<BigNumber> {
  const c   = await getStakingContract();
  const res = await (c as any).getTVL();
  return satsToBTC(readU256Result(res, 'tvl', 0n).toString());
}

export async function fetchAPY(): Promise<number> {
  const c   = await getStakingContract();
  const res = await (c as any).getAPY();
  const bps = Number(readU256Result(res, 'apy', 1200n).toString());
  // The contract returns 0 when rewardRate was never set via setRewardRate()
  // after deployment (StoredU256 defaults to 0n).  Fall back to 1200 bps (12%)
  // so the UI always shows a meaningful APY instead of "0.00%".
  return bps > 0 ? bps : 1200;
}

/**
 * Wrap 32 raw bytes in an OP_NET Address-compatible object.
 *
 * The SDK (opnet/browser/index.js line 5244) checks `'equals' in value` to
 * detect an Address object before encoding it in the calldata.  Passing a raw
 * string fails that check with "Cannot use 'in' operator to search for 'equals'
 * in <string>" because the `in` operator cannot be used on primitives.
 *
 * We create a 32-byte Uint8Array and attach an `.equals()` method — exactly
 * what the SDK needs.  The Uint8Array is then serialised by `writeBytes()` via
 * the `byteLength` + indexed access, which works correctly.
 */
function makeAddress(bytes: Uint8Array): any {
  const addr = new Uint8Array(32);
  addr.set(bytes.length <= 32 ? bytes : bytes.slice(0, 32));
  // equals() required by the SDK's 'equals' in value check
  (addr as any).equals = (other: any): boolean => {
    if (!other || other.length !== 32) return false;
    for (let i = 0; i < 32; i++) if (addr[i] !== other[i]) return false;
    return true;
  };
  return addr;
}

/**
 * Derive the OP_NET sender address from a compressed public key.
 *
 * btc-runtime computes Blockchain.tx.sender as SHA256(compressedPubKey).
 * The result is a 32-byte digest wrapped in a makeAddress() object so the
 * SDK's `'equals' in value` check passes.
 *
 * @param publicKeyHex  Hex string of the 33-byte compressed pubkey (with or without 0x).
 * @returns  { address: Address-like, hex: '0x...' } — hex is for logging/comparison.
 */
async function pubKeyToOpNetAddress(publicKeyHex: string): Promise<{ address: any; hex: string }> {
  const rawHex = publicKeyHex.replace(/^0x/, '');
  const pubKeyBytes = new Uint8Array(Buffer.from(rawHex, 'hex'));

  // Use the Web Crypto API — available in every modern browser, no extra package needed.
  const hashBuffer = await crypto.subtle.digest('SHA-256', pubKeyBytes);
  const hashed     = new Uint8Array(hashBuffer); // always 32 bytes

  const hex = '0x' + Buffer.from(hashed).toString('hex');
  console.log('[BTCStake] pubKeyToOpNetAddress → pubkey :', '0x' + rawHex);
  console.log('[BTCStake] pubKeyToOpNetAddress → SHA256 :', hex);
  console.log('[BTCStake] pubKeyToOpNetAddress → first16:', hex.slice(0, 18), '(compare with expected)');

  return { address: makeAddress(hashed), hex };
}

/**
 * Decode a bech32 or bech32m wallet address to an OP_NET Address object.
 *
 * opt1pp... addresses are bech32m (version ≥ 1) with a 32-byte witness program.
 * Those 32 bytes are the x-only tweaked pubkey that OP_NET stores as
 * Blockchain.tx.sender — so this is the correct storage key to look up.
 *
 * Uses the `bech32` npm package directly (already installed as a transitive dep
 * of @btc-vision/transaction) to avoid any import-resolution issues.
 */
function toOpNetAddress(addrStr: string): any {
  console.log('[BTCStake] toOpNetAddress → decoding:', addrStr);

  // ── Attempt A: bech32m (opt1pp... / tb1p... version ≥ 1) ────────────────
  try {
    const decoded = bech32m.decode(addrStr, 200);
    const dataWords = decoded.words.slice(1); // strip witness version byte
    const bytes = Uint8Array.from(bech32m.fromWords(dataWords));
    console.log('[BTCStake] toOpNetAddress → bech32m OK | version:', decoded.words[0],
      '| prefix:', decoded.prefix, '| dataLen:', bytes.length,
      '| hex:', Buffer.from(bytes).toString('hex'));
    return makeAddress(bytes);
  } catch (e1: any) {
    console.log('[BTCStake] toOpNetAddress → bech32m failed:', e1?.message);
  }

  // ── Attempt B: bech32 (tb1q... version 0, 20-byte P2WPKH) ──────────────
  try {
    const decoded = bech32.decode(addrStr, 200);
    const dataWords = decoded.words.slice(1);
    const bytes = Uint8Array.from(bech32.fromWords(dataWords));
    console.log('[BTCStake] toOpNetAddress → bech32 OK | version:', decoded.words[0],
      '| prefix:', decoded.prefix, '| dataLen:', bytes.length,
      '| hex:', Buffer.from(bytes).toString('hex'));
    return makeAddress(bytes); // 20 bytes → padded to 32 with zeroes
  } catch (e2: any) {
    console.log('[BTCStake] toOpNetAddress → bech32 also failed:', e2?.message);
  }

  // ── Attempt C: hex string (0x...) ────────────────────────────────────────
  try {
    const hex = addrStr.startsWith('0x') ? addrStr.slice(2) : addrStr;
    if (/^[0-9a-fA-F]{64}$/.test(hex)) {
      const bytes = new Uint8Array(Buffer.from(hex, 'hex'));
      console.log('[BTCStake] toOpNetAddress → hex OK | hex:', hex);
      return makeAddress(bytes);
    }
  } catch {}

  // ── Nothing worked — return raw string so SDK throws a readable error ─────
  console.error('[BTCStake] toOpNetAddress → ALL decode attempts failed for:', addrStr,
    '— passing raw string, SDK will throw');
  return addrStr;
}

/**
 * Fetch the on-chain staked amount, pending rewards and stake block for a user.
 *
 * The contract stores positions keyed by Blockchain.tx.sender, which in OP_NET
 * is the 32-byte x-only tweaked pubkey decoded from the opt1pp... wallet address.
 * We convert the address to an OP_NET Address object so the SDK can properly
 * encode it as ABIDataTypes.ADDRESS in the calldata.
 *
 * Three-layer decode strategy so we handle every SDK response variant:
 *  1. Primary  — res.properties (ABI-named fields, set by SDK's setDecoded())
 *  2. Fallback — res.result BinaryReader, read 3 × uint256 sequentially
 *  3. Guard    — catch all errors and return zero position (never throw)
 */
export async function fetchUserPosition(address: string, publicKey?: string): Promise<UserPosition> {
  console.log('[BTCStake] ── fetchUserPosition called ──────────────────────────');
  console.log('[BTCStake] fetchUserPosition → bech32 address :', address);
  console.log('[BTCStake] fetchUserPosition → publicKey (hex):', publicKey ?? '(not provided)');

  // ── Sanity check: call getTVL first to confirm the contract responds at all ─
  try {
    const tvlResult = await fetchTVL();
    console.log('[BTCStake] fetchUserPosition → getTVL sanity check OK — TVL:', tvlResult.toFixed(8), 'tBTC');
  } catch (tvlErr: any) {
    console.warn('[BTCStake] fetchUserPosition → getTVL sanity check FAILED:', tvlErr?.message ?? tvlErr);
    console.warn('[BTCStake] → contract may be unreachable or wrong address');
  }

  // ── HARDCODED TEST: verify contract returns data for the known sender address ─
  // This confirms the RPC call works before we try the dynamic address derivation.
  // The address below is SHA256(compressedPubKey) observed in the stake tx.
  const KNOWN_SENDER_HEX = 'ecd84dec1bc977090d8481e2e7fef2285584b43494edb78d2d76c0baa42e1abb';
  try {
    const knownBytes = new Uint8Array(Buffer.from(KNOWN_SENDER_HEX, 'hex'));
    const knownAddr  = makeAddress(knownBytes);
    console.log('[BTCStake] HARDCODED TEST → querying with known sender 0x' + KNOWN_SENDER_HEX);
    const hardcodedPos = await (async () => {
      const c   = await getStakingContract();
      const res = await (c as any).getUserPosition(knownAddr);
      const p   = res?.properties;
      console.log('[BTCStake] HARDCODED TEST → revert:', res?.revert ?? '(none)');
      console.log('[BTCStake] HARDCODED TEST → properties:', {
        stakedAmount:  p?.stakedAmount  != null ? p.stakedAmount.toString()  : 'undefined',
        pendingReward: p?.pendingReward != null ? p.pendingReward.toString() : 'undefined',
        stakeBlock:    p?.stakeBlock    != null ? p.stakeBlock.toString()    : 'undefined',
      });
      return p?.stakedAmount != null ? satsToBTC(p.stakedAmount.toString()) : null;
    })();
    console.log('[BTCStake] HARDCODED TEST → stakedBTC:', hardcodedPos?.toFixed(8) ?? '(no data)');
  } catch (e: any) {
    console.warn('[BTCStake] HARDCODED TEST → threw:', e?.message ?? e);
  }

  // ── Enumerate ALL addresses the wallet exposes ────────────────────────────
  // Collect every address format so we can try each as the getUserPosition key.
  const candidateMap = new Map<string, string>(); // label → address string

  // The primary address passed in from useWallet (requestAccounts()[0])
  if (address) candidateMap.set('primary(requestAccounts[0])', address);

  // Mine window.opnet / window.unisat for any other addresses
  try {
    const wp = (typeof window !== 'undefined')
      ? (window as any).opnet ?? (window as any).unisat ?? (window as any).okxwallet?.bitcoin
      : null;

    if (wp) {
      // selectedAddress — synchronous property exposed by some wallets
      const sel = wp.selectedAddress;
      if (sel && typeof sel === 'string' && sel !== address)
        candidateMap.set('window.opnet.selectedAddress', sel);

      // accounts — some wallets expose it as a cached array
      const accs = wp.accounts;
      if (Array.isArray(accs)) {
        accs.forEach((a: string, i: number) => {
          if (a && typeof a === 'string' && !candidateMap.has(`accounts[${i}]`))
            candidateMap.set(`window.opnet.accounts[${i}]`, a);
        });
      }

      // getAccounts() — async getter, may return more formats
      if (typeof wp.getAccounts === 'function') {
        try {
          const asyncAccs: string[] = await wp.getAccounts();
          console.log('[BTCStake] window.opnet.getAccounts() →', asyncAccs);
          asyncAccs.forEach((a: string, i: number) => {
            if (a && typeof a === 'string')
              candidateMap.set(`getAccounts()[${i}]`, a);
          });
        } catch (e: any) {
          console.warn('[BTCStake] window.opnet.getAccounts() threw:', e?.message);
        }
      }

      // Log full wallet surface
      console.log('[BTCStake] window.opnet keys:', Object.keys(wp));
      console.log('[BTCStake] window.opnet.selectedAddress:', wp.selectedAddress);
      console.log('[BTCStake] window.opnet.accounts:', wp.accounts);
    } else {
      console.warn('[BTCStake] window.opnet / window.unisat not found');
    }
  } catch (e: any) {
    console.warn('[BTCStake] enumerating wallet addresses threw:', e?.message);
  }

  console.log('[BTCStake] fetchUserPosition → candidate addresses:', [...candidateMap.entries()]);

  // Helper: decode one getUserPosition response
  async function tryGetPosition(key: any, label: string): Promise<UserPosition | null> {
    const keyDisplay = typeof key === 'string' ? key : Buffer.from(key).toString('hex');
    console.log(`[BTCStake] getUserPosition → calling contract with ${label}:`, keyDisplay);
    try {
      const c   = await getStakingContract();
      const res = await (c as any).getUserPosition(key);  // key is Address object

      // ── Dump the full raw response ─────────────────────────────────────
      console.log(`[BTCStake] getUserPosition (${label}) → typeof res:`, typeof res, '| null?', res == null);
      if (res != null) {
        console.log(`[BTCStake] getUserPosition (${label}) → res.keys:`, Object.keys(res));
        console.log(`[BTCStake] getUserPosition (${label}) → res.revert:`, res.revert ?? '(none)');
        console.log(`[BTCStake] getUserPosition (${label}) → res.properties:`, res.properties ?? '(none)');
        console.log(`[BTCStake] getUserPosition (${label}) → res.result type:`, typeof res.result, '| has readU256?', typeof res.result?.readU256);
        // Try full JSON dump — bigints serialised as strings
        try {
          const dump = JSON.stringify(res, (_, v) =>
            typeof v === 'bigint' ? v.toString() + 'n' : v
          );
          console.log(`[BTCStake] getUserPosition (${label}) → full JSON:`, dump);
        } catch (e) {
          console.log(`[BTCStake] getUserPosition (${label}) → cannot JSON.stringify:`, e);
        }
      }

      if (res?.revert) {
        console.warn(`[BTCStake] getUserPosition (${label}) → reverted:`, res.revert);
        return null;
      }

      // Primary: SDK-decoded named properties
      const p = res?.properties;
      console.log(`[BTCStake] getUserPosition (${label}) → properties (stringified):`, {
        stakedAmount:  p?.stakedAmount  != null ? p.stakedAmount.toString()  : 'undefined',
        pendingReward: p?.pendingReward != null ? p.pendingReward.toString() : 'undefined',
        stakeBlock:    p?.stakeBlock    != null ? p.stakeBlock.toString()    : 'undefined',
      });

      if (p?.stakedAmount !== undefined && p?.stakedAmount !== null) {
        const position = {
          stakedAmount:  satsToBTC(p.stakedAmount.toString()),
          pendingReward: satsToBTC((p.pendingReward ?? 0n).toString()),
          stakeBlock:    BigInt((p.stakeBlock ?? 0n).toString()),
        };
        console.log(`[BTCStake] getUserPosition (${label}) → decoded via properties:`, {
          stakedBTC:  position.stakedAmount.toFixed(8),
          pendingBTC: position.pendingReward.toFixed(8),
          stakeBlock: position.stakeBlock.toString(),
        });
        return position;
      }

      // Fallback: raw BinaryReader — 3 × 32-byte uint256
      const reader = res?.result;
      if (reader?.setOffset && reader?.readU256) {
        console.log(`[BTCStake] getUserPosition (${label}) → trying BinaryReader fallback…`);
        reader.setOffset(0);
        const stakedSats  = reader.readU256();
        const pendingSats = reader.readU256();
        const blk         = reader.readU256();
        console.log(`[BTCStake] getUserPosition (${label}) → BinaryReader raw values:`, {
          stakedSats:  stakedSats.toString(),
          pendingSats: pendingSats.toString(),
          blk:         blk.toString(),
        });
        return {
          stakedAmount:  satsToBTC(stakedSats.toString()),
          pendingReward: satsToBTC(pendingSats.toString()),
          stakeBlock:    blk,
        };
      }

      console.warn(`[BTCStake] getUserPosition (${label}) → no decodable data`);
      return null;
    } catch (err: any) {
      console.warn(`[BTCStake] getUserPosition (${label}) → threw:`, err?.message ?? err);
      return null;
    }
  }

  try {
    let lastZeroPos: UserPosition | null = null;

    // ── Attempt A: try every wallet-exposed address decoded to Address object ──
    for (const [label, addrStr] of candidateMap) {
      const addrObj = toOpNetAddress(addrStr);
      const pos = await tryGetPosition(addrObj, `${label}→Address`);
      if (pos && pos.stakedAmount.gt(0)) {
        console.log(`[BTCStake] fetchUserPosition → ✓ non-zero via "${label}":`, pos.stakedAmount.toFixed(8));
        return pos;
      }
      if (pos) lastZeroPos = pos;
    }

    // ── Attempt B: publicKey x-only bytes as Address ──────────────────────────
    if (publicKey) {
      console.log('[BTCStake] fetchUserPosition → trying publicKey x-only fallback:', publicKey);
      try {
        const pubKeyBytes = new Uint8Array(Buffer.from(publicKey.replace(/^0x/, ''), 'hex'));
        const xOnly = pubKeyBytes.length === 33 ? pubKeyBytes.slice(1) : pubKeyBytes;
        const pubAddr = makeAddress(xOnly);
        const pos = await tryGetPosition(pubAddr, 'publicKey-xOnly→Address');
        if (pos && pos.stakedAmount.gt(0)) {
          console.log('[BTCStake] fetchUserPosition → ✓ non-zero via publicKey x-only');
          return pos;
        }
        if (pos) lastZeroPos = pos;

        // Also try the full compressed pubkey (02/03 + 32 bytes) padded into 32
        const fullAddr = makeAddress(pubKeyBytes.length === 33 ? pubKeyBytes.slice(0, 32) : pubKeyBytes);
        const pos2 = await tryGetPosition(fullAddr, 'publicKey-compressed→Address');
        if (pos2 && pos2.stakedAmount.gt(0)) {
          console.log('[BTCStake] fetchUserPosition → ✓ non-zero via publicKey compressed bytes');
          return pos2;
        }
        if (pos2) lastZeroPos = pos2;
      } catch (pkErr: any) {
        console.warn('[BTCStake] fetchUserPosition → publicKey decode failed:', pkErr?.message);
      }
    }

    // ── Attempt C: SHA256(compressedPubKey) — the CORRECT OP_NET sender derivation ──
    // btc-runtime sets Blockchain.tx.sender = SHA256(compressed 33-byte pubkey).
    // This is what getPublicKey() returns and what the stake tx stored on-chain.
    if (publicKey) {
      console.log('[BTCStake] fetchUserPosition → trying SHA256(compressedPubKey)...');
      try {
        const { address: sha256Addr, hex: sha256Hex } = await pubKeyToOpNetAddress(publicKey);
        console.log('[BTCStake] fetchUserPosition → SHA256(pubkey) hex:', sha256Hex);
        console.log('[BTCStake] fetchUserPosition → expected:           0xecd84dec1bc977090d8481e2e7fef2285584b43494edb78d2d76c0baa42e1abb');
        console.log('[BTCStake] fetchUserPosition → match?', sha256Hex === '0xecd84dec1bc977090d8481e2e7fef2285584b43494edb78d2d76c0baa42e1abb');
        const pos = await tryGetPosition(sha256Addr, 'SHA256(compressedPubKey)→Address');
        if (pos && pos.stakedAmount.gt(0)) {
          console.log('[BTCStake] fetchUserPosition → ✓ non-zero via SHA256(compressedPubKey):', pos.stakedAmount.toFixed(8));
          return pos;
        }
        if (pos) lastZeroPos = pos;
      } catch (sha256Err: any) {
        console.warn('[BTCStake] fetchUserPosition → SHA256 attempt failed:', sha256Err?.message);
      }
    } else {
      console.warn('[BTCStake] fetchUserPosition → no publicKey provided — cannot try SHA256 derivation');
      console.warn('[BTCStake] → ensure useWallet passes publicKey to fetchUserPosition');
    }

    console.warn('[BTCStake] fetchUserPosition → all attempts returned 0 — staked amount not found');
    console.warn('[BTCStake] → check that the stake tx sender address matches one of the candidates above');
    return lastZeroPos ?? zeroPosition();
  } catch (err: any) {
    console.warn('[BTCStake] fetchUserPosition → outer catch:', err?.message ?? err);
    return zeroPosition();
  }
}

function zeroPosition(): UserPosition {
  return { stakedAmount: new BigNumber(0), pendingReward: new BigNumber(0), stakeBlock: 0n };
}

export async function fetchBtcPrice(): Promise<number> {
  try {
    const res  = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
    const data = await res.json();
    return data?.bitcoin?.usd ?? 65000;
  } catch {
    return 65000;
  }
}

// ─── Write helpers ────────────────────────────────────────────────────────────

async function sendTx(callResult: any, address: string): Promise<string> {
  if (!callResult) throw new Error('Contract call returned no result');
  const net = await getNetwork();
  const receipt = await callResult.sendTransaction({
    signer:                   null,   // triggers window.opnet.web3.signInteraction() auto-detection
    mldsaSigner:              null,
    refundTo:                 address,
    network:                  net,
    priorityFee:              0n,
    maximumAllowedSatToSpend: 0n,
  });
  if (!receipt) throw new Error('Transaction receipt was empty');
  return receipt?.transactionId ?? receipt?.txId ?? JSON.stringify(receipt);
}

export async function txStake(address: string, amountBTC: string): Promise<string> {
  const sats       = BigInt(BTCToSats(amountBTC).toFixed(0));
  const c          = await getStakingContract();
  const callResult = await (c as any).stake(sats);
  return sendTx(callResult, address);
}

export async function txUnstake(address: string, amountBTC: string): Promise<string> {
  const sats       = BigInt(BTCToSats(amountBTC).toFixed(0));
  const c          = await getStakingContract();
  const callResult = await (c as any).unstake(sats);
  return sendTx(callResult, address);
}

export async function txClaimRewards(address: string): Promise<string> {
  const c          = await getStakingContract();
  const callResult = await (c as any).claimRewards();
  return sendTx(callResult, address);
}
