# Sui Swap Vault - Production-Ready Trading System

A complete, secure, and gas-optimized Sui Move module suite for automated trading with SUI ↔ USDC swaps using DeepBook and Turbos protocols.

## Features

- **Trading Vault**: Secure storage for SUI and USDC with owner-controlled deposits/withdrawals
- **Smart Routing**: Automatic routing between DeepBook (CLOB) and Turbos (CLMM) for best execution
- **Bot Trading**: Authorized bot address can execute trades atomically via PTB
- **Slippage Protection**: Minimum output guarantees on all swaps
- **Event Emissions**: Full auditability with deposit, withdrawal, swap, and trade events
- **Gas Optimized**: Efficient use of `Balance` and `Coin` types, minimal transfers

## Architecture

```
sui_swap_vault/
├── types.move          # Core data structures, events, and error codes
├── swap_router.move    # Swap routing logic (DeepBook + Turbos)
└── vault.move          # Main vault with deposit/withdraw/trade functions
```

## Security Features

- **Access Control**: Owner-only deposits/withdrawals, bot-only trading
- **Slippage Protection**: Configurable minimum output on all swaps
- **Reentrancy Safety**: Move's linear types prevent reentrancy attacks
- **Event Logging**: All critical operations emit events for transparency
- **Balance Safety**: Proper use of `Balance` and `Coin` types

## Quick Start

### 1. Update Addresses

Edit `Move.toml` and replace placeholder addresses:

```toml
[addresses]
sui_swap_vault = "0x0"  # Will be assigned at publish
deepbook = "0xdee9"     # DeepBook V2 mainnet
turbos = "0x91bfbc386a41afcfd9b2533058d7e915a1d3829089cc268ff4333d54d6339ca1"  # Turbos mainnet
usdc = "0x5d4b302506645c37ff133b98f4b50a5ae14841659738d6d733d59d0d217a93af"  # USDC mainnet
```

### 2. Build the Package

```bash
sui move build
```

### 3. Run Tests

```bash
sui move test
```

### 4. Deploy to Testnet

```bash
sui client publish --gas-budget 100000000
```

Save the package ID and object IDs from the output.

## Usage Examples

### Initialize a Vault

```bash
# Create a new vault with bot address
sui client call \
  --package $PACKAGE_ID \
  --module vault \
  --function create_vault \
  --args $BOT_ADDRESS \
  --gas-budget 10000000
```

### Deposit SUI

```bash
# Owner deposits 1000 SUI (1000000000000 MIST)
sui client call \
  --package $PACKAGE_ID \
  --module vault \
  --function deposit \
  --args $VAULT_ID $SUI_COIN_ID \
  --gas-budget 10000000
```

### Bot Executes Trade (SUI → USDC)

```bash
# Bot swaps 100 SUI with minimum 95 USDC output (5% slippage tolerance)
sui client call \
  --package $PACKAGE_ID \
  --module vault \
  --function trade_sui_to_usdc \
  --type-args $USDC_TYPE \
  --args $VAULT_ID 100000000000 95000000 \
  --gas-budget 10000000
```

### Withdraw Funds

```bash
# Owner withdraws 50 SUI and 100 USDC
sui client call \
  --package $PACKAGE_ID \
  --module vault \
  --function withdraw \
  --type-args $USDC_TYPE \
  --args $VAULT_ID 50000000000 100000000 \
  --gas-budget 10000000
```

## Module Details

### types.move

Core data structures:

- `Vault`: Main vault object holding balances and metadata
- `SwapRoute`: Route identifier for swap execution
- `SwapConfig`: Configuration for swap parameters
- Events: `DepositEvent`, `WithdrawEvent`, `SwapEvent`, `TradeEvent`

### swap_router.move

Swap routing functions:

- `swap_sui_to_usdc()`: SUI → USDC with intelligent routing
- `swap_usdc_to_sui()`: USDC → SUI with intelligent routing
- `get_best_quote_sui_to_usdc()`: Query best price across routes

**Routing Logic:**
1. Try DeepBook first (lower maker fees ~0.02%)
2. Fallback to Turbos CLMM if DeepBook fails (~0.05% fee)
3. Revert if output < minimum

### vault.move

Main vault functions:

**Owner Functions:**
- `create_vault()`: Initialize new vault with bot address
- `deposit()`: Add SUI to vault
- `withdraw()`: Remove SUI/USDC from vault
- `withdraw_all()`: Emergency withdrawal
- `update_bot()`: Change authorized bot address

**Bot Functions:**
- `trade_sui_to_usdc()`: Execute SUI → USDC swap
- `trade_usdc_to_sui()`: Execute USDC → SUI swap
- `trade_multi_hop()`: Multi-step swap (extensible)

**View Functions:**
- `get_balances()`: Query SUI/USDC balances
- `get_stats()`: Query trade statistics
- `get_addresses()`: Query owner/bot addresses

## Programmable Transaction Blocks (PTB)

For advanced users, combine multiple operations in one PTB:

```typescript
// Example PTB: Deposit → Trade → Withdraw in one transaction
const tx = new TransactionBlock();

// 1. Split SUI for deposit
const [depositCoin] = tx.splitCoins(tx.gas, [tx.pure(1000000000000)]);

// 2. Deposit to vault
tx.moveCall({
  target: `${packageId}::vault::deposit`,
  arguments: [tx.object(vaultId), depositCoin],
});

// 3. Execute trade
tx.moveCall({
  target: `${packageId}::vault::trade_sui_to_usdc`,
  typeArguments: [usdcType],
  arguments: [
    tx.object(vaultId),
    tx.pure(100000000000), // 100 SUI
    tx.pure(95000000),     // Min 95 USDC
  ],
});

// 4. Sign and execute
const result = await client.signAndExecuteTransactionBlock({
  transactionBlock: tx,
  signer: keypair,
});
```

## Integration Guide

### DeepBook Integration

To integrate with DeepBook V2, update `swap_router.move`:

```move
use deepbook::clob_v2::{Self, Pool};
use deepbook::custodian::{Self, AccountCap};

// In try_deepbook_swap_sui_to_usdc():
let pool = clob_v2::borrow_mut_pool<SUI, USDC>(pool_id);
let account_cap = // ... get or create account cap
let (base_out, quote_out) = clob_v2::swap_exact_base_for_quote(
    pool,
    input,
    account_cap,
    min_out,
    ctx
);
```

### Turbos Integration

To integrate with Turbos CLMM, update `swap_router.move`:

```move
use turbos::pool::{Self, Pool};
use turbos::swap_router;

// In try_turbos_swap_sui_to_usdc():
let pool = pool::borrow_mut<SUI, USDC>(pool_id);
let output = swap_router::swap_exact_input<SUI, USDC>(
    pool,
    input,
    min_out,
    ctx
);
```

## Error Codes

| Code | Name | Description |
|------|------|-------------|
| 1 | `ENotOwner` | Caller is not vault owner |
| 2 | `ENotBot` | Caller is not authorized bot |
| 3 | `EInsufficientBalance` | Vault balance too low |
| 4 | `ESlippageExceeded` | Output below minimum |
| 5 | `EInvalidAmount` | Amount is zero or invalid |
| 6 | `ESwapFailed` | All swap routes failed |
| 7 | `EInvalidRoute` | Invalid routing parameter |

## Events

All events include timestamps for auditability:

- `VaultCreatedEvent`: Emitted on vault creation
- `DepositEvent`: Emitted on SUI deposit
- `WithdrawEvent`: Emitted on withdrawal
- `SwapEvent`: Emitted on each swap with route info
- `TradeEvent`: Emitted on bot trade execution
- `BotUpdatedEvent`: Emitted on bot address change

## Gas Optimization Tips

1. **Batch Operations**: Use PTB to combine multiple operations
2. **Reuse Coins**: Split/join coins efficiently to minimize transfers
3. **View Functions**: Query balances off-chain before transactions
4. **Event Monitoring**: Index events instead of polling chain state

## Security Considerations

1. **Bot Key Management**: Store bot private keys securely (HSM, KMS)
2. **Slippage Limits**: Always set reasonable `min_out` values
3. **Access Control**: Verify owner/bot addresses are correct
4. **Event Monitoring**: Monitor events for unauthorized access attempts
5. **Upgrade Path**: Consider using package upgrades for bug fixes

## Testing

Run the test suite:

```bash
sui move test
```

Key test scenarios:
- Vault creation and initialization
- Deposit and withdrawal flows
- Bot trade execution
- Access control enforcement
- Slippage protection
- Event emissions

## Production Deployment Checklist

- [ ] Update all placeholder addresses in `Move.toml`
- [ ] Integrate actual DeepBook and Turbos swap logic
- [ ] Run full test suite
- [ ] Deploy to testnet and verify functionality
- [ ] Conduct security audit
- [ ] Set up event monitoring and alerting
- [ ] Document bot operational procedures
- [ ] Deploy to mainnet
- [ ] Verify all functions work on mainnet
- [ ] Set up monitoring dashboards

## Roadmap

- [ ] Add support for additional DEXs (Cetus, Kriya)
- [ ] Implement advanced order types (limit orders, TWAP)
- [ ] Add portfolio rebalancing strategies
- [ ] Support multiple trading pairs
- [ ] Add governance for parameter updates
- [ ] Implement fee collection mechanism

## Resources

- [Sui Documentation](https://docs.sui.io)
- [Move Language Book](https://move-language.github.io/move/)
- [DeepBook Docs](https://docs.deepbook.tech/)
- [Turbos Finance Docs](https://docs.turbos.finance/)

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: [Create an issue]
- Sui Discord: #move-development
- DeepBook Discord: #developers

## Disclaimer

This code is provided as-is for educational purposes. Conduct thorough testing and security audits before using in production. Trading cryptocurrencies involves risk of loss.
