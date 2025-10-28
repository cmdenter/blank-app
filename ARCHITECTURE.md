# Architecture Documentation - Sui Swap Vault

## System Overview

The Sui Swap Vault is a production-ready DeFi system that enables secure, automated trading between SUI and USDC tokens using multiple liquidity sources (DeepBook and Turbos) with intelligent routing.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface Layer                      │
│  (Web App, CLI, Bot Scripts via Sui TypeScript SDK)         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  Sui Blockchain Layer                        │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Vault Module (vault.move)               │  │
│  │                                                       │  │
│  │  • create_vault()      - Initialize new vault        │  │
│  │  • deposit()           - Owner deposits SUI          │  │
│  │  • withdraw()          - Owner withdraws funds       │  │
│  │  • trade_sui_to_usdc() - Bot executes trades         │  │
│  │  • trade_usdc_to_sui() - Reverse trading            │  │
│  │  • update_bot()        - Change bot address          │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                        │
│                     ▼                                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Swap Router Module (swap_router.move)        │  │
│  │                                                       │  │
│  │  • swap_sui_to_usdc()   - Smart routing logic       │  │
│  │  • swap_usdc_to_sui()   - Reverse swap routing      │  │
│  │  • get_best_quote()     - Price discovery           │  │
│  │                                                       │  │
│  │  Routing Strategy:                                   │  │
│  │  1. Try DeepBook first (lower fees)                 │  │
│  │  2. Fallback to Turbos CLMM                         │  │
│  │  3. Enforce slippage protection                     │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                        │
│         ┌───────────┴───────────┐                           │
│         ▼                       ▼                           │
│  ┌─────────────┐         ┌─────────────┐                   │
│  │  DeepBook   │         │   Turbos    │                   │
│  │  CLOB V2    │         │  CLMM Pool  │                   │
│  │             │         │             │                   │
│  │ • Limit     │         │ • Constant  │                   │
│  │   Orders    │         │   Product   │                   │
│  │ • ~0.02%    │         │ • ~0.05%    │                   │
│  │   Maker Fee │         │   Fee       │                   │
│  └─────────────┘         └─────────────┘                   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Types Module (types.move)                  │  │
│  │                                                       │  │
│  │  Data Structures:                                    │  │
│  │  • Vault       - Main vault object                   │  │
│  │  • SwapRoute   - Route configuration                 │  │
│  │  • SwapConfig  - Swap parameters                     │  │
│  │                                                       │  │
│  │  Events:                                             │  │
│  │  • VaultCreatedEvent, DepositEvent                   │  │
│  │  • TradeEvent, SwapEvent, WithdrawEvent             │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Module Breakdown

### 1. Types Module (`types.move`)

**Purpose**: Core data structures, events, and error definitions

**Key Components**:

```move
// Main vault structure
struct Vault {
    owner: address,           // Vault owner (deposits/withdraws)
    bot: address,             // Authorized trading bot
    sui_balance: Balance<SUI>, // SUI holdings
    usdc_balance: Balance<u8>, // USDC holdings
    total_trades: u64,         // Trade counter
    total_volume_sui: u64,     // Cumulative SUI volume
    total_volume_usdc: u64,    // Cumulative USDC volume
}
```

**Error Codes**:
- `ENotOwner (1)`: Unauthorized owner operation
- `ENotBot (2)`: Unauthorized bot operation
- `EInsufficientBalance (3)`: Insufficient vault balance
- `ESlippageExceeded (4)`: Output below minimum
- `EInvalidAmount (5)`: Invalid input amount
- `ESwapFailed (6)`: All swap routes failed
- `EInvalidRoute (7)`: Invalid routing configuration

**Events**: All events include timestamps for auditability and monitoring

### 2. Swap Router Module (`swap_router.move`)

**Purpose**: Intelligent swap routing with multi-DEX support

**Routing Algorithm**:

```
Input: SUI amount, minimum USDC output
Output: USDC balance

1. Try DeepBook:
   - Check liquidity availability
   - Calculate expected output with 0.02% fee
   - Execute if liquidity sufficient
   - Return on success

2. Fallback to Turbos:
   - Calculate CLMM swap output with 0.05% fee
   - Execute swap
   - Verify output >= minimum
   - Return on success

3. Revert if both fail:
   - Emit failure event
   - Revert transaction with ESwapFailed
```

**Key Functions**:

```move
// Primary swap functions
public fun swap_sui_to_usdc<USDC>(
    input: Coin<SUI>,
    min_out: u64,
    vault_id: ID,
    ctx: &mut TxContext
): Balance<USDC>

public fun swap_usdc_to_sui<USDC>(
    input: Balance<USDC>,
    min_out: u64,
    vault_id: ID,
    ctx: &mut TxContext
): Coin<SUI>

// Price discovery
public fun get_best_quote_sui_to_usdc(
    amount_sui: u64
): (u64, u8) // Returns (output_amount, route)
```

**Integration Points**:
- DeepBook V2 CLOB for limit order execution
- Turbos CLMM for AMM-style swaps
- Extensible for additional DEXs (Cetus, Kriya, etc.)

### 3. Vault Module (`vault.move`)

**Purpose**: Main user-facing interface for vault operations

**Access Control Matrix**:

| Function | Owner | Bot | Anyone |
|----------|-------|-----|--------|
| `create_vault()` | ✓ | ✓ | ✓ |
| `deposit()` | ✓ | ✗ | ✗ |
| `withdraw()` | ✓ | ✗ | ✗ |
| `withdraw_all()` | ✓ | ✗ | ✗ |
| `update_bot()` | ✓ | ✗ | ✗ |
| `trade_sui_to_usdc()` | ✗ | ✓ | ✗ |
| `trade_usdc_to_sui()` | ✗ | ✓ | ✗ |
| `trade_multi_hop()` | ✗ | ✓ | ✗ |
| `get_balances()` | ✓ | ✓ | ✓ |
| `get_stats()` | ✓ | ✓ | ✓ |

**State Transitions**:

```
┌──────────┐
│  Created │ (create_vault)
└────┬─────┘
     │
     ▼
┌──────────┐  deposit()   ┌──────────┐
│  Empty   │────────────▶ │  Funded  │
└──────────┘              └────┬─────┘
                              │
                              │ trade_sui_to_usdc()
                              ▼
                         ┌──────────┐
                         │ Trading  │
                         └────┬─────┘
                              │
                              │ withdraw()
                              ▼
                         ┌──────────┐
                         │  Empty   │
                         └──────────┘
```

## Data Flow

### Deposit Flow

```
User (Owner)
    │
    ├─ Initiates deposit with SUI coin
    │
    ▼
Vault Module
    │
    ├─ Verify sender == owner
    ├─ Validate amount > 0
    ├─ Add to vault.sui_balance
    ├─ Emit DepositEvent
    │
    ▼
Blockchain State Updated
```

### Trade Flow (Atomic PTB)

```
Bot
    │
    ├─ Initiates trade_sui_to_usdc(vault, 100 SUI, min 95 USDC)
    │
    ▼
Vault Module
    │
    ├─ Verify sender == bot
    ├─ Check sufficient balance
    ├─ Take 100 SUI from vault
    │
    ▼
Swap Router
    │
    ├─ Try DeepBook
    │   ├─ Check liquidity
    │   ├─ Calculate output
    │   └─ Execute if possible ──▶ Success ──┐
    │                                         │
    ├─ Fallback to Turbos                    │
    │   ├─ Calculate CLMM output             │
    │   ├─ Execute swap                       │
    │   └─ Verify output >= 95 USDC          │
    │                                         │
    ▼                                         │
Return USDC Balance ◀─────────────────────────┘
    │
    ▼
Vault Module
    │
    ├─ Add USDC to vault.usdc_balance
    ├─ Increment total_trades
    ├─ Emit TradeEvent
    │
    ▼
Complete (all in one transaction)
```

### Withdrawal Flow

```
Owner
    │
    ├─ Initiates withdraw(vault, 50 SUI, 100 USDC)
    │
    ▼
Vault Module
    │
    ├─ Verify sender == owner
    ├─ Check sufficient balances
    ├─ Take 50 SUI from vault
    ├─ Take 100 USDC from vault
    ├─ Transfer coins to owner
    ├─ Emit WithdrawEvent
    │
    ▼
Owner receives coins
```

## Security Architecture

### 1. Access Control

**Owner Permissions**:
- Deposit funds
- Withdraw funds
- Update bot address
- Emergency withdrawal

**Bot Permissions**:
- Execute trades only
- Cannot withdraw funds
- Cannot change addresses

**Implementation**:
```move
public(package) fun assert_owner(vault: &Vault, caller: address) {
    assert!(vault.owner == caller, ENotOwner);
}

public(package) fun assert_bot(vault: &Vault, caller: address) {
    assert!(vault.bot == caller, ENotBot);
}
```

### 2. Slippage Protection

Every swap includes minimum output enforcement:

```move
// User specifies minimum acceptable output
let usdc_balance = swap_router::swap_sui_to_usdc(
    sui_coin,
    min_usdc_out, // Slippage protection
    vault_id,
    ctx
);

// Router ensures output >= min_usdc_out or reverts
assert!(balance::value(&usdc_balance) >= min_usdc_out, ESlippageExceeded);
```

### 3. Reentrancy Protection

Move's linear types provide inherent reentrancy protection:
- Objects can only be used once per transaction
- No callback mechanisms that could enable reentrancy
- All state changes are atomic

### 4. Event Logging

All critical operations emit events for monitoring:
- Deposits, withdrawals tracked with amounts
- Trades logged with routes and execution details
- Bot address changes logged
- Events include timestamps for auditability

## Gas Optimization

### 1. Balance vs Coin Usage

```move
// Efficient: Use Balance for internal accounting
struct Vault {
    sui_balance: Balance<SUI>,  // No object overhead
    usdc_balance: Balance<USDC>,
}

// Only convert to Coin when transferring
public entry fun withdraw(...) {
    let balance = types::take_usdc(vault, amount);
    let coin = coin::from_balance(balance, ctx); // Convert once
    transfer::public_transfer(coin, sender);
}
```

### 2. Minimize Object Operations

```move
// Good: Single split operation
let [coin] = tx.splitCoins(tx.gas, [amount]);

// Bad: Multiple splits
let coin1 = tx.splitCoins(tx.gas, [amount1]);
let coin2 = tx.splitCoins(tx.gas, [amount2]);
```

### 3. Batch Operations in PTB

```typescript
// Efficient: Combine operations in one transaction
const tx = new TransactionBlock();
tx.moveCall({ target: 'deposit', ... });
tx.moveCall({ target: 'trade', ... });
// Single transaction, lower total gas cost
```

## Scalability Considerations

### Current Capacity

- **Throughput**: Limited by Sui's ~15-20 TPS per object
- **Vault per User**: Supports individual vaults per user
- **Concurrent Trades**: Limited to sequential execution per vault

### Future Enhancements

1. **Multi-Vault Support**:
   ```move
   struct VaultRegistry {
       vaults: Table<address, ID>,
   }
   ```

2. **Parallel Execution**:
   - Use separate vault objects for different strategies
   - Execute trades in parallel across vaults

3. **Batch Trading**:
   ```move
   public entry fun trade_batch(
       vault: &mut Vault,
       trades: vector<TradeConfig>,
       ctx: &mut TxContext
   )
   ```

## Monitoring and Observability

### Key Metrics

1. **Vault Metrics**:
   - Total deposits
   - Total withdrawals
   - Current balances
   - Trade count
   - Win rate (if tracking profit)

2. **Swap Metrics**:
   - Route distribution (DeepBook vs Turbos)
   - Average slippage
   - Failed swap rate
   - Gas costs per swap

3. **Performance Metrics**:
   - Transaction latency
   - Swap execution time
   - Gas usage trends

### Event Monitoring

```typescript
// Subscribe to all vault events
client.subscribeEvent({
  filter: {
    MoveEventModule: {
      package: PACKAGE_ID,
      module: 'vault',
    },
  },
  onMessage: (event) => {
    // Process event
    metrics.track(event);
    alerts.check(event);
    logs.write(event);
  },
});
```

## Extensibility

### Adding New DEXs

```move
// In swap_router.move, add new routing function
fun try_cetus_swap_sui_to_usdc<USDC>(
    input: Coin<SUI>,
    min_out: u64,
    ctx: &mut TxContext
): (bool, Balance<USDC>, String) {
    // Cetus integration logic
}

// Update main routing logic
public fun swap_sui_to_usdc<USDC>(...): Balance<USDC> {
    // Try DeepBook
    // Try Turbos
    // Try Cetus
    // Try Kriya
    // ...
}
```

### Adding New Trading Strategies

```move
// In vault.move, add new trade functions
public entry fun trade_twap<USDC>(
    vault: &mut Vault,
    total_amount: u64,
    num_intervals: u64,
    interval_ms: u64,
    ctx: &mut TxContext
) {
    // Time-Weighted Average Price execution
}

public entry fun trade_limit_order<USDC>(
    vault: &mut Vault,
    amount: u64,
    target_price: u64,
    ctx: &mut TxContext
) {
    // Limit order execution
}
```

### Multi-Token Support

```move
// Generic vault supporting multiple tokens
struct MultiTokenVault<phantom T1, phantom T2, phantom T3> {
    id: UID,
    owner: address,
    bot: address,
    balance_1: Balance<T1>,
    balance_2: Balance<T2>,
    balance_3: Balance<T3>,
}
```

## Testing Strategy

### Unit Tests

```move
#[test]
fun test_deposit() {
    // Test deposit functionality
}

#[test]
fun test_trade_execution() {
    // Test trading logic
}

#[test]
#[expected_failure(abort_code = types::e_not_bot())]
fun test_unauthorized_trade() {
    // Test access control
}
```

### Integration Tests

1. **Testnet Deployment**:
   - Deploy to testnet
   - Execute full user flows
   - Monitor gas costs
   - Test error conditions

2. **Load Testing**:
   - Simulate high-volume trading
   - Test concurrent access
   - Measure performance degradation

3. **Security Testing**:
   - Attempt unauthorized access
   - Test slippage protection
   - Verify event emissions
   - Test emergency procedures

## Future Architecture

### Phase 2: Advanced Features

```
┌────────────────────────────────────────────┐
│         Advanced Vault System              │
├────────────────────────────────────────────┤
│  • Multi-token support                     │
│  • Automated rebalancing                   │
│  • Limit orders                            │
│  • TWAP execution                          │
│  • Portfolio optimization                  │
│  • Governance module                       │
└────────────────────────────────────────────┘
```

### Phase 3: Institutional Features

```
┌────────────────────────────────────────────┐
│       Institutional Trading Suite          │
├────────────────────────────────────────────┤
│  • Multi-signature vaults                  │
│  • Timelocked withdrawals                  │
│  • Compliance modules                      │
│  • Risk management                         │
│  • Performance analytics                   │
│  • API access                              │
└────────────────────────────────────────────┘
```

## References

- [Sui Move Documentation](https://docs.sui.io/concepts/sui-move-concepts)
- [DeepBook V2 Specification](https://docs.deepbook.tech/)
- [Turbos CLMM Design](https://docs.turbos.finance/)
- [Move Language Book](https://move-language.github.io/move/)

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-10-28 | Initial architecture |
