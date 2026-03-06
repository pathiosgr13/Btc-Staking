/**
 * setRewardRate — call setRewardRate(newRate) on the deployed StakingContract
 *
 * An OP_NET wallet has TWO keys.  Both are required for signing:
 *   • EC key   (secp256k1 WIF)  — signs the Bitcoin transaction / pays fees
 *   • MLDSA key (long hex)      — OP_NET identity; sets Blockchain.tx.sender
 *                                  → must match the deployer address stored
 *                                    on-chain by onlyDeployer()
 *
 * Usage:
 *   OPNET_EC_KEY=<wif> OPNET_MLDSA_KEY=<hex> node scripts/setRewardRate.js [rate]
 *
 * Optional env vars:
 *   CONTRACT_ADDRESS — override the default contract address
 *   OPNET_RPC_URL    — override the RPC endpoint
 *   OPNET_ADDRESS    — your opt1pp... address (auto-derived if omitted)
 *   OPNET_MLDSA_LEVEL — security level: 2 (MLDSA-44, default), 3 (MLDSA-65), 5 (MLDSA-87)
 *
 * Rate examples:
 *   OPNET_EC_KEY=<wif> OPNET_MLDSA_KEY=<hex> node scripts/setRewardRate.js        # 10 sats (~12% APY)
 *   OPNET_EC_KEY=<wif> OPNET_MLDSA_KEY=<hex> node scripts/setRewardRate.js 20     # 20 sats (~25% APY)
 */

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS  || 'opt1sqzgp6q245gy7qykqgharh3d286u205yfugqyzgkr';
const RPC_URL          = process.env.OPNET_RPC_URL     || 'https://testnet.opnet.org';
const EC_KEY           = process.env.OPNET_EC_KEY      || process.env.OPNET_PRIVATE_KEY; // WIF secp256k1
const MLDSA_KEY        = process.env.OPNET_MLDSA_KEY;                                    // MLDSA hex
const OPNET_ADDRESS    = process.env.OPNET_ADDRESS;    // opt1pp... override (auto-derived if unset)
const MLDSA_LEVEL      = parseInt(process.env.OPNET_MLDSA_LEVEL || '2', 10);
const RATE             = BigInt(process.argv[2] || '10');

// ── Address helpers ──────────────────────────────────────────────────────────

/**
 * Derive the user's opt1pp... (OP_NET Taproot) address from a wallet.
 *
 * OP_NET wallet addresses are standard Taproot addresses (tb1p...) re-encoded
 * with the OP_NET-specific bech32m prefix 'opt'.  The 32-byte witness program
 * is the tweaked x-only secp256k1 public key — exactly what wallet.tweakedPubKeyKey
 * returns.  OP_NET's RPC node indexes UTXOs by this address format.
 */
function deriveOpNetAddress(tweakedPubKeyBuffer) {
  const { bech32m } = require('bech32');
  const words = [1, ...bech32m.toWords(tweakedPubKeyBuffer)]; // version 1 = bech32m
  return bech32m.encode('opt', words, 1023);
}

if (!EC_KEY) {
  console.error('❌  OPNET_EC_KEY (secp256k1 WIF) not set');
  console.error('    Export your secp256k1 key from OP_WALLET (the shorter base58 WIF key).');
  console.error('    Usage: OPNET_EC_KEY=<wif> OPNET_MLDSA_KEY=<hex> node scripts/setRewardRate.js');
  process.exit(1);
}
if (!MLDSA_KEY) {
  console.error('❌  OPNET_MLDSA_KEY (MLDSA hex private key) not set');
  console.error('    Export your MLDSA key from OP_WALLET (the very long hex string).');
  console.error('    Usage: OPNET_EC_KEY=<wif> OPNET_MLDSA_KEY=<hex> node scripts/setRewardRate.js');
  process.exit(1);
}

async function main() {
  const { JSONRpcProvider, getContract, BitcoinInterface, ABIDataTypes, BitcoinAbiTypes } = await import('opnet');
  const { Wallet } = await import('@btc-vision/transaction');
  const { networks }  = await import('@btc-vision/bitcoin');
  const { MLDSASecurityLevel } = await import('@btc-vision/bip32');

  const network = networks.testnet;

  // Map numeric level to enum
  const levelMap = {
    2: MLDSASecurityLevel.LEVEL2,  // MLDSA-44  (2560-byte private key)
    3: MLDSASecurityLevel.LEVEL3,  // MLDSA-65  (4032-byte private key)
    5: MLDSASecurityLevel.LEVEL5,  // MLDSA-87  (4896-byte private key)
  };
  const securityLevel = levelMap[MLDSA_LEVEL] ?? MLDSASecurityLevel.LEVEL2;

  // ── Build wallet from both keys ───────────────────────────────────────────
  // Wallet handles: EC keypair, MLDSA keypair, P2WDA address, tweaked keys.
  // EC key   → this.keypair         (secp256k1 signer, .publicKey required)
  // MLDSA key → this.mldsaKeypair   (QuantumBIP32Interface, Blockchain.tx.sender)
  // Address   → this.address.toHex() = SHA256(MLDSApubkey) = onlyDeployer address
  console.log('🔑  Loading OP_NET wallet (EC + MLDSA)…');
  const wallet = new Wallet(EC_KEY, MLDSA_KEY, network, securityLevel);

  // Derive the opt1pp... address (OP_NET Taproot format, bech32m 'opt' prefix).
  // wallet.p2wda.address returns a P2WSH tb1q... address that the OP_NET RPC
  // does not index for UTXO lookups.  wallet.p2tr returns a tb1p... Taproot
  // address; re-encoding its witness program with 'opt' prefix gives the exact
  // address the RPC and OP_WALLET use.
  const derivedOpNetAddress = deriveOpNetAddress(wallet.tweakedPubKeyKey);
  const fromAddress = OPNET_ADDRESS || derivedOpNetAddress;

  const senderHex = wallet.address.toHex(); // 0x + 32-byte MLDSA address

  console.log(`    EC (p2wpkh)       : ${wallet.p2wpkh}`);
  console.log(`    OP_NET (opt1pp...) : ${fromAddress}`);
  console.log(`    MLDSA sender       : ${senderHex}`);
  console.log('');
  console.log(`    Contract  : ${CONTRACT_ADDRESS}`);
  console.log(`    Rate      : ${RATE} sats/block/BTC`);
  console.log(`    Approx APY: ${(Number(RATE) * 52560 / 1e8 * 100).toFixed(2)}% (@ 1 BTC TVL)`);
  console.log('');

  // ── Sender object for simulation ──────────────────────────────────────────
  // The SDK calls from.toHex() during simulation to set Blockchain.tx.sender.
  // wallet.address already has these methods — we can use it directly.
  const senderObj = wallet.address;

  // ── ABI ───────────────────────────────────────────────────────────────────
  const ABI = [
    {
      name:    'setRewardRate',
      type:    BitcoinAbiTypes.Function,
      inputs:  [{ name: 'newRate', type: ABIDataTypes.UINT256 }],
      outputs: [],
    },
  ];

  // ── Provider + contract ───────────────────────────────────────────────────
  const provider = new JSONRpcProvider(RPC_URL, network);
  const iface    = new BitcoinInterface(ABI);
  const contract = getContract(CONTRACT_ADDRESS, iface, provider, network, senderObj);

  // ── Step 1: simulate ─────────────────────────────────────────────────────
  // Pass ONLY the ABI parameter — no options object.
  console.log('⏳  Simulating setRewardRate…');
  const callResult = await contract.setRewardRate(RATE);
  if (!callResult) throw new Error('Contract simulation returned no result');
  if (callResult.revert) throw new Error(`Simulation reverted: ${callResult.revert}`);
  console.log('    Simulation OK');

  // ── Step 2: sign + broadcast ─────────────────────────────────────────────
  // signer     = EC keypair  → required by P2WDAGenerator.defineLockScript / signInputs
  // mldsaSigner = MLDSA pair  → sets Blockchain.tx.sender in the witness
  // UTXOs are fetched automatically from `refundTo` by the SDK.
  console.log('📡  Signing and broadcasting…');
  const receipt = await callResult.sendTransaction({
    signer:                   wallet.keypair,      // ECPairInterface — required for all paths
    mldsaSigner:              wallet.mldsaKeypair, // QuantumBIP32Interface — onlyDeployer identity
    refundTo:                 fromAddress,
    network,
    priorityFee:              0n,
    maximumAllowedSatToSpend: 0n,
  });

  if (!receipt) throw new Error('sendTransaction returned no receipt');

  const txId = receipt?.transactionId ?? receipt?.txId ?? JSON.stringify(receipt);
  console.log('');
  console.log(`✅  setRewardRate(${RATE}) submitted!`);
  console.log(`    TX   : ${txId}`);
  console.log(`    View : https://opscan.org/transactions/${txId}?network=op_testnet`);
  console.log('    Rewards will start accruing from the next Bitcoin block.');
}

main().catch(err => {
  console.error('❌  Failed:', err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
