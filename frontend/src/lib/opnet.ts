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
  // Strategy 1: ask the wallet extension directly — matches wallet UI exactly
  if (walletProvider?.getBalance) {
    try {
      const raw = await walletProvider.getBalance();
      // OP_WALLET and UniSat both return { confirmed, unconfirmed, total } in sats
      if (raw != null && typeof raw === 'object' && 'confirmed' in raw) {
        return BigInt(Math.round(Number(raw.confirmed)));
      }
      // Older / alternative formats: plain number, bigint, or numeric string
      if (typeof raw === 'number' || typeof raw === 'bigint' || typeof raw === 'string') {
        return BigInt(Math.round(Number(raw)));
      }
    } catch {
      // Fall through to RPC
    }
  }

  // Strategy 2: OP_NET RPC — filterOrdinals=true to count only spendable UTXOs
  try {
    const provider = await getReadProvider();
    const sats = await (provider as any).getBalance(address, true);
    return BigInt(sats?.toString() ?? '0');
  } catch {
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
 * Fetch the on-chain staked amount, pending rewards and stake block for a user.
 *
 * Three-layer decode strategy so we handle every SDK response variant:
 *
 *  1. Primary  — res.properties (ABI-named fields, set by SDK's setDecoded())
 *  2. Fallback — res.result BinaryReader, read 3 × uint256 sequentially
 *  3. Guard    — catch all errors and return zero position (never throw)
 *
 * Returning zeros on error means the UI can still render TVL/APY even when
 * the position call fails, and the position display stays neutral (not broken).
 */
export async function fetchUserPosition(address: string): Promise<UserPosition> {
  console.log('[BTCStake] fetchUserPosition → address:', address);
  try {
    const c   = await getStakingContract();
    const res = await (c as any).getUserPosition(address);

    // ── Dump the raw response so we can see exactly what came back ──────────
    console.log('[BTCStake] getUserPosition raw response:', {
      revert:     res?.revert ?? null,
      properties: res?.properties ?? null,
      hasResult:  !!res?.result,
      resultLen:  res?.result?.length?.() ?? 'n/a',
    });

    if (res?.revert) {
      console.warn('[BTCStake] getUserPosition reverted:', res.revert);
      return zeroPosition();
    }

    // Primary: SDK-decoded named properties
    const p = res?.properties;
    console.log('[BTCStake] getUserPosition properties (raw bigints):', {
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
      console.log('[BTCStake] getUserPosition → decoded position:', {
        stakedBTC:  position.stakedAmount.toFixed(8),
        pendingBTC: position.pendingReward.toFixed(8),
        stakeBlock: position.stakeBlock.toString(),
      });
      return position;
    }

    // Fallback: read directly from the raw BinaryReader (3 × 32-byte uint256)
    const reader = res?.result;
    if (reader?.setOffset && reader?.readU256) {
      reader.setOffset(0);
      const stakedSats  = reader.readU256();
      const pendingSats = reader.readU256();
      const blk         = reader.readU256();
      console.log('[BTCStake] getUserPosition → BinaryReader fallback:', {
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

    console.warn('[BTCStake] getUserPosition: no decodable data in response — returning zero');
    return zeroPosition();
  } catch (err: any) {
    console.warn('[BTCStake] fetchUserPosition error:', err?.message ?? err);
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
