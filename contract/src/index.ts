import { u256 } from '@btc-vision/as-bignum/assembly';
import {
  Address,
  AddressMemoryMap,
  Blockchain,
  BytesWriter,
  Calldata,
  EMPTY_POINTER,
  encodeSelector,
  NetEvent,
  OP_NET,
  Revert,
  SafeMath,
  Selector,
  StoredU256,
  StoredU64,
  U256_BYTE_LENGTH,
  ADDRESS_BYTE_LENGTH,
} from '@btc-vision/btc-runtime/runtime';
import { revertOnError } from '@btc-vision/btc-runtime/runtime/abort/abort';

// ─── Storage pointers ────────────────────────────────────────────────────────
// Each global scalar gets a unique u16 pointer; EMPTY_POINTER (30-byte zeroes)
// is used as the sub-pointer for single-value slots.
const PTR_TOTAL_STAKED:       u16 = 1;
const PTR_REWARD_PER_TOKEN:   u16 = 2;
const PTR_LAST_UPDATE_BLOCK:  u16 = 3;
const PTR_REWARD_RATE:        u16 = 4;
const PTR_TOTAL_REWARDS_PAID: u16 = 5;

// Per-user AddressMemoryMap pointers (one map per concept)
const PTR_USER_STAKED:        u16 = 10;
const PTR_USER_REWARD_PAID:   u16 = 11;
const PTR_USER_REWARDS:       u16 = 12;
const PTR_USER_STAKE_BLOCK:   u16 = 13;

// ─── Constants ───────────────────────────────────────────────────────────────
// Reward rate: satoshis per block per BTC staked (×1e8 precision).
// 10 sats/block/BTC ≈ 12% APY at current block rate (52 560 blocks/year).
const REWARD_RATE_DEFAULT: u256 = u256.fromU32(10);
const PRECISION:           u256 = u256.fromU64(100_000_000); // 1e8
const BLOCKS_PER_YEAR:     u256 = u256.fromU32(52_560);
const APY_BPS_MULTIPLIER:  u256 = u256.fromU32(10_000);      // basis-points scale

// ─── Events ──────────────────────────────────────────────────────────────────

@final
class StakedEvent extends NetEvent {
  constructor(user: Address, amount: u256) {
    const data = new BytesWriter(ADDRESS_BYTE_LENGTH + U256_BYTE_LENGTH);
    data.writeAddress(user);
    data.writeU256(amount);
    super('Staked', data);
  }
}

@final
class UnstakedEvent extends NetEvent {
  constructor(user: Address, amount: u256) {
    const data = new BytesWriter(ADDRESS_BYTE_LENGTH + U256_BYTE_LENGTH);
    data.writeAddress(user);
    data.writeU256(amount);
    super('Unstaked', data);
  }
}

@final
class RewardClaimedEvent extends NetEvent {
  constructor(user: Address, reward: u256) {
    const data = new BytesWriter(ADDRESS_BYTE_LENGTH + U256_BYTE_LENGTH);
    data.writeAddress(user);
    data.writeU256(reward);
    super('RewardClaimed', data);
  }
}

// ─── Contract ────────────────────────────────────────────────────────────────

@final
class StakingContract extends OP_NET {

  // Global scalar state (single-value slots use EMPTY_POINTER as sub-pointer)
  private readonly totalStaked:       StoredU256;
  private readonly rewardPerToken:    StoredU256;
  private readonly lastUpdateBlock:   StoredU64;
  private readonly rewardRate:        StoredU256;
  private readonly totalRewardsPaid:  StoredU256;

  // Per-address maps  (AddressMemoryMap stores u256 per Address key)
  private readonly userStaked:       AddressMemoryMap;
  private readonly userRewardPaid:   AddressMemoryMap;
  private readonly userRewards:      AddressMemoryMap;
  private readonly userStakeBlock:   AddressMemoryMap;

  constructor() {
    super();

    // Global slots — use EMPTY_POINTER (30 zero bytes) as the sub-pointer
    this.totalStaked      = new StoredU256(PTR_TOTAL_STAKED,       EMPTY_POINTER);
    this.rewardPerToken   = new StoredU256(PTR_REWARD_PER_TOKEN,   EMPTY_POINTER);
    this.lastUpdateBlock  = new StoredU64( PTR_LAST_UPDATE_BLOCK,  EMPTY_POINTER);
    this.rewardRate       = new StoredU256(PTR_REWARD_RATE,        EMPTY_POINTER);
    this.totalRewardsPaid = new StoredU256(PTR_TOTAL_REWARDS_PAID, EMPTY_POINTER);

    // Per-user maps
    this.userStaked      = new AddressMemoryMap(PTR_USER_STAKED);
    this.userRewardPaid  = new AddressMemoryMap(PTR_USER_REWARD_PAID);
    this.userRewards     = new AddressMemoryMap(PTR_USER_REWARDS);
    this.userStakeBlock  = new AddressMemoryMap(PTR_USER_STAKE_BLOCK);
  }

  // ─── Entry point ────────────────────────────────────────────────────────────
  public override execute(method: Selector, calldata: Calldata): BytesWriter {
    switch (method) {
      case encodeSelector('stake(uint256)'):           return this._stake(calldata);
      case encodeSelector('unstake(uint256)'):         return this._unstake(calldata);
      case encodeSelector('claimRewards()'):           return this._claimRewards();
      case encodeSelector('getTVL()'):                 return this._getTVL();
      case encodeSelector('getAPY()'):                 return this._getAPY();
      case encodeSelector('getUserPosition(address)'): return this._getUserPosition(calldata);
      case encodeSelector('setRewardRate(uint256)'):   return this._setRewardRate(calldata);
      default:
        throw new Revert('Unknown method selector');
    }
  }

  // ─── Internal reward bookkeeping ────────────────────────────────────────────

  /** Compute the up-to-date reward-per-token (not yet persisted). */
  private _currentRPT(): u256 {
    const ts = this.totalStaked.value;
    if (u256.eq(ts, u256.Zero)) return this.rewardPerToken.value;

    const currentBlock = Blockchain.block.number;
    const lastBlock    = this.lastUpdateBlock.get(0);
    if (currentBlock <= lastBlock) return this.rewardPerToken.value;

    const delta     = u256.fromU64(currentBlock - lastBlock);
    // newRPT_delta = delta * rewardRate * PRECISION / totalStaked
    const num   = SafeMath.mul(SafeMath.mul(delta, this.rewardRate.value), PRECISION);
    const incr  = SafeMath.div(num, ts);
    return SafeMath.add(this.rewardPerToken.value, incr);
  }

  /** Pending rewards for a user against a given RPT snapshot. */
  private _earned(user: Address, rpt: u256): u256 {
    const staked     = this.userStaked.get(user);
    const paidRPT    = this.userRewardPaid.get(user);
    const accumulated = this.userRewards.get(user);

    if (u256.eq(staked, u256.Zero)) return accumulated;

    const rptDelta  = SafeMath.sub(rpt, paidRPT);
    const newEarned = SafeMath.div(SafeMath.mul(staked, rptDelta), PRECISION);
    return SafeMath.add(newEarned, accumulated);
  }

  /** Snapshot RPT + update user's pending reward cache. */
  private _updateReward(user: Address): u256 {
    const rpt = this._currentRPT();
    this.rewardPerToken.value  = rpt;
    this.lastUpdateBlock.set(0, Blockchain.block.number);
    this.lastUpdateBlock.save();

    const earned = this._earned(user, rpt);
    this.userRewards.set(user, earned);
    this.userRewardPaid.set(user, rpt);

    return earned;
  }

  // ─── Write methods ──────────────────────────────────────────────────────────

  /** stake(amount: uint256) → bool */
  private _stake(calldata: Calldata): BytesWriter {
    const amount = calldata.readU256();
    if (u256.eq(amount, u256.Zero)) throw new Revert('Cannot stake 0');

    const caller = Blockchain.tx.sender;
    this._updateReward(caller);

    const prev = this.userStaked.get(caller);
    this.userStaked.set(caller, SafeMath.add(prev, amount));
    this.totalStaked.value = SafeMath.add(this.totalStaked.value, amount);

    // Record first-stake block (don't overwrite if already staked)
    if (u256.eq(prev, u256.Zero)) {
      this.userStakeBlock.set(caller, u256.fromU64(Blockchain.block.number));
    }

    this.emitEvent(new StakedEvent(caller, amount));

    const writer = new BytesWriter(1);
    writer.writeBoolean(true);
    return writer;
  }

  /** unstake(amount: uint256) → bool */
  private _unstake(calldata: Calldata): BytesWriter {
    const amount = calldata.readU256();
    if (u256.eq(amount, u256.Zero)) throw new Revert('Cannot unstake 0');

    const caller = Blockchain.tx.sender;
    const staked = this.userStaked.get(caller);
    if (u256.lt(staked, amount)) throw new Revert('Insufficient staked balance');

    this._updateReward(caller);

    this.userStaked.set(caller, SafeMath.sub(staked, amount));
    this.totalStaked.value = SafeMath.sub(this.totalStaked.value, amount);

    this.emitEvent(new UnstakedEvent(caller, amount));

    const writer = new BytesWriter(1);
    writer.writeBoolean(true);
    return writer;
  }

  /** claimRewards() → uint256 (amount claimed) */
  private _claimRewards(): BytesWriter {
    const caller  = Blockchain.tx.sender;
    const earned  = this._updateReward(caller);
    if (u256.eq(earned, u256.Zero)) throw new Revert('No rewards to claim');

    this.userRewards.set(caller, u256.Zero);
    this.totalRewardsPaid.value = SafeMath.add(this.totalRewardsPaid.value, earned);

    this.emitEvent(new RewardClaimedEvent(caller, earned));

    const writer = new BytesWriter(U256_BYTE_LENGTH);
    writer.writeU256(earned);
    return writer;
  }

  /** setRewardRate(newRate: uint256) — deployer only */
  private _setRewardRate(calldata: Calldata): BytesWriter {
    this.onlyDeployer(Blockchain.tx.sender);
    const newRate = calldata.readU256();
    if (u256.eq(newRate, u256.Zero)) throw new Revert('Rate cannot be zero');
    // Snapshot current RPT before changing rate
    this.rewardPerToken.value  = this._currentRPT();
    this.lastUpdateBlock.set(0, Blockchain.block.number);
    this.lastUpdateBlock.save();
    this.rewardRate.value = newRate;

    const writer = new BytesWriter(1);
    writer.writeBoolean(true);
    return writer;
  }

  // ─── View methods ────────────────────────────────────────────────────────────

  /** getTVL() → uint256 (satoshis) */
  private _getTVL(): BytesWriter {
    const writer = new BytesWriter(U256_BYTE_LENGTH);
    writer.writeU256(this.totalStaked.value);
    return writer;
  }

  /**
   * getAPY() → uint256 (basis points, e.g. 1200 = 12.00%)
   *
   * APY_bps = rewardRate × BLOCKS_PER_YEAR × 10 000 / totalStaked
   * When totalStaked == 0 returns the default rate as if 1 BTC were staked.
   */
  private _getAPY(): BytesWriter {
    const writer = new BytesWriter(U256_BYTE_LENGTH);
    const ts     = this.totalStaked.value;
    let apy: u256;

    if (u256.eq(ts, u256.Zero)) {
      // Use default rate × 1 BTC (1e8 sats) as denominator for display
      const oneBTC   = PRECISION;
      const num      = SafeMath.mul(SafeMath.mul(REWARD_RATE_DEFAULT, BLOCKS_PER_YEAR), APY_BPS_MULTIPLIER);
      apy            = SafeMath.div(num, oneBTC);
    } else {
      const num = SafeMath.mul(SafeMath.mul(this.rewardRate.value, BLOCKS_PER_YEAR), APY_BPS_MULTIPLIER);
      apy       = SafeMath.div(num, ts);
    }

    writer.writeU256(apy);
    return writer;
  }

  /**
   * getUserPosition(user: address) → (stakedAmount, pendingReward, stakeBlock)
   * Each is a uint256; total response = 3 × 32 bytes.
   */
  private _getUserPosition(calldata: Calldata): BytesWriter {
    const user        = calldata.readAddress();
    const rpt         = this._currentRPT();
    const staked      = this.userStaked.get(user);
    const pending     = this._earned(user, rpt);
    const stakeBlock  = this.userStakeBlock.get(user);

    const writer = new BytesWriter(U256_BYTE_LENGTH * 3);
    writer.writeU256(staked);
    writer.writeU256(pending);
    writer.writeU256(stakeBlock);
    return writer;
  }
}

// ─── OP_NET runtime wiring ───────────────────────────────────────────────────

// Register the contract factory — required for the runtime to instantiate it.
Blockchain.contract = (): StakingContract => new StakingContract();

// Export execute() and onDeploy() entry points called by the OP_NET host.
export * from '@btc-vision/btc-runtime/runtime/exports';

// Replace AssemblyScript's default env.abort (not provided by OP_NET) with
// the runtime's own revert-based handler so panics become on-chain reverts.
export function abort(message: string, fileName: string, line: u32, column: u32): void {
  revertOnError(message, fileName, line, column);
}
