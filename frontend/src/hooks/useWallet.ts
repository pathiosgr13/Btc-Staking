/**
 * useWallet — OP_WALLET connection hook
 *
 * Balance is read from the OP_NET JSON-RPC node (JSONRpcProvider.getBalance),
 * NOT from the wallet extension, because:
 *  - OP_WALLET's getBalance() is unreliable / absent on many versions
 *  - The RPC node has the authoritative confirmed UTXO set
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
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Keep a ref so the poll timer always sees the latest address
  const addressRef = useRef<string | null>(null);

  // ── Balance polling ────────────────────────────────────────────────────────
  const updateBalance = useCallback(async (address: string) => {
    const sats = await fetchBalance(address);
    setState(prev => {
      // Only update if the address hasn't changed and balance actually differs
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

      // Fetch balance from OP_NET RPC first, then set all state at once
      const balance = await fetchBalance(address);

      setState({
        status: 'connected',
        address,
        publicKey,
        network,
        provider,
        error:   null,
        balance,           // ← correct value, not overwritten by 0n
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
    stopPolling();
    setState(INITIAL);
    localStorage.removeItem('opnet_connected');
  }, [stopPolling]);

  return { ...state, connect, disconnect };
}
