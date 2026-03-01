/**
 * Deploy StakingContract to OP_NET Testnet
 *
 * Prerequisites:
 *   1. Build the contract:  npm run build  (inside /contract)
 *   2. Have tBTC in your testnet wallet
 *
 * Usage:
 *   OPNET_PRIVATE_KEY=<your_wif_key> node scripts/deploy.js
 *
 * After deployment, copy the printed contract address to:
 *   /frontend/.env  →  VITE_CONTRACT_ADDRESS=<address>
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WASM_PATH = join(__dirname, '../dist/contract.wasm');

// ── Config ──────────────────────────────────────────────────────────────────
const RPC_URL     = process.env.OPNET_RPC_URL     || 'https://testnet.opnet.org';
const PRIVATE_KEY = process.env.OPNET_PRIVATE_KEY;

if (!PRIVATE_KEY) {
  console.error('❌  OPNET_PRIVATE_KEY not set (WIF format required)');
  console.error('    export OPNET_PRIVATE_KEY=<your_wif_key>');
  process.exit(1);
}

// ── Deploy ──────────────────────────────────────────────────────────────────
async function deploy() {
  const { JSONRpcProvider }    = await import('opnet');
  const { EcKeyPair, TransactionFactory } = await import('@btc-vision/transaction');
  const { networks, payments } = await import('@btc-vision/bitcoin');

  const network = networks.testnet;

  console.log('🔑  Loading wallet…');
  const keyPair = EcKeyPair.fromWIF(PRIVATE_KEY, network);
  const pubkey  = Buffer.from(keyPair.publicKey);
  const { address: fromAddress } = payments.p2wpkh({ pubkey, network });
  if (!fromAddress) throw new Error('Could not derive address from private key');
  console.log(`    Address: ${fromAddress}`);

  console.log('🚀  Connecting to OP_NET testnet…');
  const provider = new JSONRpcProvider(RPC_URL, network);

  // Read compiled WASM
  let bytecode;
  try {
    bytecode = readFileSync(WASM_PATH);
    console.log(`📦  WASM size: ${bytecode.length} bytes`);
  } catch {
    console.error(`❌  WASM not found at ${WASM_PATH}`);
    console.error('    Run: npm run build  (inside the /contract directory)');
    process.exit(1);
  }

  // ── Fetch UTXOs ────────────────────────────────────────────────────────────
  console.log('🔍  Fetching UTXOs…');
  const utxos = await provider.utxoManager.getUTXOsForAmount({
    address: fromAddress,
    amount:  100_000n, // initial estimate; TransactionFactory will refine
  });
  if (!utxos || utxos.length === 0) {
    throw new Error(`No UTXOs found for ${fromAddress}. Fund the address with tBTC first.`);
  }
  console.log(`    Found ${utxos.length} UTXO(s)`);

  // ── Build & sign deployment transaction ────────────────────────────────────
  console.log('⏳  Building deployment transaction…');
  const factory = new TransactionFactory();
  const result  = await factory.signDeployment({
    from:        fromAddress,
    signer:      keyPair,
    utxos,
    bytecode:    Buffer.from(bytecode),
    network,
    priorityFee: 0n,
    feeRate:     10,  // sat/vbyte — increase on congested testnet
  });

  const { transaction, contractAddress } = result;
  if (!contractAddress) throw new Error('Deployment did not return a contract address');

  // ── Broadcast ──────────────────────────────────────────────────────────────
  console.log('📡  Broadcasting transactions…');
  const [fundingTx, deployTx] = transaction;

  const fundingResult = await provider.sendRawTransaction(fundingTx, false);
  console.log(`    Funding TX  : ${fundingResult}`);

  // Small delay so the funding UTXO is visible to the mempool
  await new Promise(r => setTimeout(r, 2000));

  const deployResult = await provider.sendRawTransaction(deployTx, false);
  console.log(`    Deployment TX: ${deployResult}`);

  // ── Done ──────────────────────────────────────────────────────────────────
  console.log('');
  console.log('✅  Contract deployed!');
  console.log(`    Contract Address : ${contractAddress}`);
  console.log('');
  console.log('📝  Add to frontend/.env:');
  console.log(`    VITE_CONTRACT_ADDRESS=${contractAddress}`);
}

deploy().catch(err => {
  console.error('❌  Deployment failed:', err.message);
  process.exit(1);
});
