/**
 * useReferral — Referral system hook
 *
 * - Parses ?ref=<address> from URL on mount and stores in localStorage
 * - Generates the user's unique referral link
 * - Returns simulated referral stats and leaderboard
 * - 5% bonus rewards for referred stakers
 */

import { useState, useEffect } from 'react';

const BASE_URL = 'https://btc-staking-alpha.vercel.app';
const REF_KEY  = 'btcstake_referrer';

export interface ReferralEntry {
  address:  string;
  referrals: number;
  tvlBTC:   number;
  bonusBTC: number;
  rank:     number;
}

export interface ReferralStats {
  totalReferrals: number;
  referredTVLBTC: number;
  bonusEarnedBTC: number;
}

const MOCK_LEADERBOARD: Omit<ReferralEntry, 'rank'>[] = [
  { address: 'tb1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', referrals: 47, tvlBTC: 2.340, bonusBTC: 0.003510 },
  { address: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx', referrals: 38, tvlBTC: 1.890, bonusBTC: 0.002835 },
  { address: 'tb1q0kfhd5vwa47stvd5am9a2n9l6v3d3xcex5gsh0', referrals: 29, tvlBTC: 1.450, bonusBTC: 0.002175 },
  { address: 'tb1qrp33g0q5c5txsp9arbc68t0exd98m4a3u2m6nq', referrals: 21, tvlBTC: 1.050, bonusBTC: 0.001575 },
  { address: 'tb1q6rz28mcfaxtmd6v789l9rrlvyvefullfmcze74', referrals: 17, tvlBTC: 0.850, bonusBTC: 0.001275 },
  { address: 'tb1q9u62w6h03wz3qp7rnpyafmvfpkst8m3j5r8hzx', referrals: 14, tvlBTC: 0.700, bonusBTC: 0.001050 },
  { address: 'tb1qa4hmr0n7wfe30ekj6gue3k25gf9xzxspk25d4d', referrals: 11, tvlBTC: 0.550, bonusBTC: 0.000825 },
  { address: 'tb1qp7wmhxvnlm5u3l24jm9hczmr96fwjdxgjzunxa', referrals:  8, tvlBTC: 0.400, bonusBTC: 0.000600 },
  { address: 'tb1qmf47llsnyv8xvv6j8ljntxl73f5qe7zy8vmh4z', referrals:  5, tvlBTC: 0.250, bonusBTC: 0.000375 },
  { address: 'tb1qvpfytsyk2jwp5kj5z4xe8r9f9nmyvzg0xjaxn6', referrals:  3, tvlBTC: 0.150, bonusBTC: 0.000225 },
];

// Demo stats for a connected user
const DEMO_STATS: ReferralStats = {
  totalReferrals: 7,
  referredTVLBTC: 0.35,
  bonusEarnedBTC: 0.000245,
};

export function useReferral(address: string | null) {
  const [referrer, setReferrer] = useState<string | null>(null);

  // Parse ?ref= from URL on mount; persist to localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');

    if (ref && ref !== address) {
      localStorage.setItem(REF_KEY, ref);
      setReferrer(ref);
      // Strip the param from the URL bar cleanly
      const url = new URL(window.location.href);
      url.searchParams.delete('ref');
      window.history.replaceState({}, '', url.toString());
    } else {
      const stored = localStorage.getItem(REF_KEY);
      if (stored) setReferrer(stored);
    }
  }, [address]);

  const referralLink = address ? `${BASE_URL}?ref=${address}` : null;

  const stats: ReferralStats | null = address ? DEMO_STATS : null;

  // Build ranked leaderboard; highlight connected user at a demo position
  const leaderboard: ReferralEntry[] = MOCK_LEADERBOARD.map((e, i) => ({ ...e, rank: i + 1 }));

  // Rank of the current user among the leaderboard (demo: rank 4 position)
  const userRank: number | null = address ? 4 : null;

  return {
    referrer,           // who referred this user (if any)
    referralLink,       // this user's shareable referral URL
    stats,              // aggregated referral stats for this user
    leaderboard,        // top-10 referrer list
    userRank,           // user's own leaderboard position
    bonusMultiplier: referrer ? 1.05 : 1.0,  // 5% APY boost when referred
  };
}
