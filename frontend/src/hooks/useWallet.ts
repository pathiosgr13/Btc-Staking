/**
 * useWallet — OP_WALLET / UniSat connection hook
 *
 * Balance strategy (see fetchBalance in opnet.ts):
 *  1. Wallet extension's own getBalance() — exact match with wallet UI
 *  2. OP_NET RPC fallback with filterOrdinals=true — spendable sats only
 *
 * The wallet provider is kept in a ref so the 30-second poll timer always
 * reads the current provider without needing to re-create the interval.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchBalance } from '../lib/opnet';

export type WalletStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface WalletState {
  status:    WalletStatus;
  address:   string | null;
  publicKey: string | null;
  network:   string | null;
  provider:  any;
  error:     string | null;
  balance:   bigint; // confirmed satoshis from OP_NET RPC
}

const INITIAL: WalletState = {
  status:    'disconnected',
  address:   null,
  publicKey: null,
  network:   null,
  provider:  null,
  error:     null,
  balance:   0n,
};

const BALANCE_POLL_MS = 30_000; // refresh balance every 30 s

declare global {
  interface Window {
    okxwallet?: any;
  }
}

function detectProvider(): any | null {
  if (typeof window === 'undefined') return null;
  return window.opnet ?? window.unisat ?? window.okxwallet?.bitcoin ?? null;
}

export function useWallet() {
  const [state, setState] = useState<WalletState>(INITIAL);
  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  // Refs let the poll timer always see the latest address and provider without
  // needing to teardown/recreate the interval on every state change.
  const addressRef  = useRef<string | null>(null);
  const providerRef = useRef<any>(null);

  // ── Balance polling ────────────────────────────────────────────────────────
  const updateBalance = useCallback(async (address: string) => {
    // Pass the live wallet provider so fetchBalance can use the wallet's own
    // getBalance() API first (matches the wallet UI exactly).
    const sats = await fetchBalance(address, providerRef.current);
    setState(prev => {
      if (prev.address !== address) return prev;
      if (prev.balance === sats) return prev;
      return { ...prev, balance: sats };
    });
  }, []);

  const startPolling = useCallback((address: string) => {
    addressRef.current = address;
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      if (addressRef.current) updateBalance(addressRef.current);
    }, BALANCE_POLL_MS);
  }, [updateBalance]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    addressRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => () => stopPolling(), [stopPolling]);

  // ── Account / network change listeners ────────────────────────────────────
  useEffect(() => {
    const provider = detectProvider();
    if (!provider) return;

    const onAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        const address = accounts[0];
        providerRef.current = detectProvider(); // refresh in case provider changed
        setState(prev => ({ ...prev, address, balance: 0n }));
        updateBalance(address);
        startPolling(address);
      }
    };
    const onNetworkChanged = (network: string) => {
      setState(prev => ({ ...prev, network }));
    };

    provider.on?.('accountsChanged', onAccountsChanged);
    provider.on?.('networkChanged',  onNetworkChanged);
    return () => {
      provider.removeListener?.('accountsChanged', onAccountsChanged);
      provider.removeListener?.('networkChanged',  onNetworkChanged);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-reconnect ────────────────────────────────────────────────────────
  useEffect(() => {
    if (localStorage.getItem('opnet_connected') === 'true') connect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Connect ───────────────────────────────────────────────────────────────
  const connect = useCallback(async () => {
    const provider = detectProvider();
    if (!provider) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error:  'OP_WALLET not detected. Please install OP_WALLET or UniSat.',
      }));
      return;
    }

    setState(prev => ({ ...prev, status: 'connecting', error: null }));

    try {
      const accounts:  string[] = await provider.requestAccounts();
      const publicKey: string   = await provider.getPublicKey?.() ?? '';
      const network:   string   = await provider.getNetwork?.()   ?? 'testnet';

      if (!accounts[0]) throw new Error('No accounts returned');

      const address = accounts[0];

      // Set the provider ref before fetching balance so Strategy 1 (wallet API)
      // is available for both the initial fetch and subsequent poll ticks.
      providerRef.current = provider;

      // Fetch balance via wallet's own API first, then RPC fallback.
      const balance = await fetchBalance(address, provider);

      setState({
        status: 'connected',
        address,
        publicKey,
        network,
        provider,
        error:   null,
        balance,
      });

      startPolling(address);
      localStorage.setItem('opnet_connected', 'true');
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error:  err?.message ?? 'Connection failed',
      }));
      localStorage.removeItem('opnet_connected');
    }
  }, [startPolling]);

  // ── Disconnect ────────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    providerRef.current = null;
    stopPolling();
    setState(INITIAL);
    localStorage.removeItem('opnet_connected');
  }, [stopPolling]);

  return { ...state, connect, disconnect };
}
