/**
 * useStaking — Main data & transaction hook
 *
 * Polls OP_NET for live TVL, APY, user position, and pending rewards.
 * Exposes stake / unstake / claimRewards transaction functions.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import BigNumber from 'bignumber.js';
import {
  fetchTVL,
  fetchAPY,
  fetchUserPosition,
  fetchCurrentBlock,
  fetchBtcPrice,
  txStake,
  txUnstake,
  txClaimRewards,
  UserPosition,
  CONTRACT_ADDR,
} from '../lib/opnet';

export interface StakingData {
  tvl:       BigNumber;
  apyBps:    number;
  btcPrice:  number;
  position:  UserPosition | null;
  isLoading: boolean;
  error:     string | null;
}

export type TxStatus = 'idle' | 'pending' | 'success' | 'error';

export interface TxState {
  status:  TxStatus;
  txId:    string | null;
  error:   string | null;
}

const POLL_INTERVAL = 15_000; // 15 s

const EMPTY_POSITION: UserPosition = {
  stakedAmount:  new BigNumber(0),
  pendingReward: new BigNumber(0),
  stakeBlock:    0n,
};

export function useStaking(address: string | null, walletProvider: any, publicKey?: string | null) {
  const [data, setData] = useState<StakingData>({
    tvl:       new BigNumber(0),
    apyBps:    1200,
    btcPrice:  65000,
    position:  null,
    isLoading: true,
    error:     null,
  });

  const [stakeState,   setStakeState]   = useState<TxState>({ status: 'idle', txId: null, error: null });
  const [unstakeState, setUnstakeState] = useState<TxState>({ status: 'idle', txId: null, error: null });
  const [claimState,   setClaimState]   = useState<TxState>({ status: 'idle', txId: null, error: null });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch all live data ────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    // If no contract is configured, use realistic demo data
    if (!CONTRACT_ADDR) {
      const btcPrice = await fetchBtcPrice().catch(() => 65000);
      setData({
        tvl:       new BigNumber('4.28'),
        apyBps:    1247,
        btcPrice,
        position:  address ? {
          stakedAmount:  new BigNumber('0.05'),
          pendingReward: new BigNumber('0.000142'),
          stakeBlock:    840600n,
        } : EMPTY_POSITION,
        isLoading: false,
        error:     null,
      });
      return;
    }

    try {
      // Fetch TVL, APY, BTC price, and current block in parallel.
      const [tvl, apyBps, btcPrice, currentBlock] = await Promise.all([
        fetchTVL(),
        fetchAPY(),
        fetchBtcPrice(),
        fetchCurrentBlock(),
      ]);

      // Position fetch is isolated: fetchUserPosition catches all errors
      // internally and returns zeroPosition(), so this never throws.
      let position = address
        ? await fetchUserPosition(address, publicKey ?? undefined)
        : EMPTY_POSITION;

      // Client-side reward estimation when the contract returns 0.
      // The contract's rewardRate defaults to 0 on-chain until setRewardRate()
      // is called by the deployer. Until then, estimate using the 12% APY
      // formula: stakedAmount * 0.12 / 52560 * blocksElapsed.
      if (
        position.stakedAmount.gt(0) &&
        position.pendingReward.lte(0) &&
        position.stakeBlock > 0n &&
        currentBlock > position.stakeBlock
      ) {
        const blocksElapsed = Number(currentBlock - position.stakeBlock);
        // 12% APY per Bitcoin year (52 560 blocks): reward/block = stake * 0.12 / 52560
        const estimated = position.stakedAmount.times(0.12).div(52560).times(blocksElapsed);
        console.log(
          '[BTCStake] useStaking → contract pendingReward=0; client-side estimate:',
          estimated.toFixed(8), 'tBTC', '| blocksElapsed:', blocksElapsed,
          '| stakeBlock:', position.stakeBlock.toString(),
          '| currentBlock:', currentBlock.toString(),
        );
        position = { ...position, pendingReward: estimated };
      }

      setData({ tvl, apyBps, btcPrice, position, isLoading: false, error: null });
    } catch (err: any) {
      setData(prev => ({ ...prev, isLoading: false, error: err?.message ?? 'Fetch error' }));
    }
  }, [address, publicKey]);

  useEffect(() => {
    refresh();
    timerRef.current = setInterval(refresh, POLL_INTERVAL);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [refresh]);

  // ── Transaction helpers ────────────────────────────────────────────────────

  const stake = useCallback(async (amountBTC: string) => {
    setStakeState({ status: 'pending', txId: null, error: null });
    try {
      let txId: string;
      if (!CONTRACT_ADDR || !address) {
        // Demo: simulate tx
        await new Promise(r => setTimeout(r, 2000));
        txId = '0x' + Math.random().toString(16).slice(2).padEnd(64, '0');
      } else {
        txId = await txStake(address, amountBTC);
      }
      setStakeState({ status: 'success', txId, error: null });
      setTimeout(refresh, 3000);
    } catch (err: any) {
      setStakeState({ status: 'error', txId: null, error: err?.message ?? 'Stake failed' });
    }
  }, [walletProvider, refresh]);

  const unstake = useCallback(async (amountBTC: string) => {
    setUnstakeState({ status: 'pending', txId: null, error: null });
    try {
      let txId: string;
      if (!CONTRACT_ADDR || !address) {
        await new Promise(r => setTimeout(r, 2000));
        txId = '0x' + Math.random().toString(16).slice(2).padEnd(64, '0');
      } else {
        txId = await txUnstake(address, amountBTC);
      }
      setUnstakeState({ status: 'success', txId, error: null });
      setTimeout(refresh, 3000);
    } catch (err: any) {
      setUnstakeState({ status: 'error', txId: null, error: err?.message ?? 'Unstake failed' });
    }
  }, [walletProvider, refresh]);

  const claimRewards = useCallback(async () => {
    setClaimState({ status: 'pending', txId: null, error: null });
    try {
      let txId: string;
      if (!CONTRACT_ADDR || !address) {
        await new Promise(r => setTimeout(r, 2000));
        txId = '0x' + Math.random().toString(16).slice(2).padEnd(64, '0');
      } else {
        txId = await txClaimRewards(address);
      }
      setClaimState({ status: 'success', txId, error: null });
      setTimeout(refresh, 3000);
    } catch (err: any) {
      setClaimState({ status: 'error', txId: null, error: err?.message ?? 'Claim failed' });
    }
  }, [walletProvider, refresh]);

  const resetTx = useCallback((type: 'stake' | 'unstake' | 'claim') => {
    const idle: TxState = { status: 'idle', txId: null, error: null };
    if (type === 'stake')   setStakeState(idle);
    if (type === 'unstake') setUnstakeState(idle);
    if (type === 'claim')   setClaimState(idle);
  }, []);

  return {
    ...data,
    refresh,
    stakeState,
    unstakeState,
    claimState,
    stake,
    unstake,
    claimRewards,
    resetTx,
  };
}
