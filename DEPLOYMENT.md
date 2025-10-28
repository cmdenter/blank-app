# Deployment Guide - Sui Swap Vault

This guide walks you through deploying the Sui Swap Vault to testnet and mainnet.

## Prerequisites

1. **Install Sui CLI**

```bash
cargo install --locked --git https://github.com/MystenLabs/sui.git --branch mainnet sui
```

2. **Create/Import Wallet**

```bash
# Create a new wallet
sui client new-address ed25519

# Or import existing wallet
sui client import <private-key> ed25519
```

3. **Get Testnet SUI**

Visit the [Sui Testnet Faucet](https://discord.com/channels/916379725201563759/971488439931392130) and request testnet tokens.

4. **Configure Network**

```bash
# For testnet
sui client switch --env testnet

# For mainnet
sui client switch --env mainnet
```

## Step 1: Update Configuration

### 1.1 Edit Move.toml

Update the addresses in `Move.toml`:

```toml
[addresses]
sui_swap_vault = "0x0"  # Will be replaced at publish time

# Testnet addresses
deepbook = "0x000000000000000000000000000000000000dee9"
turbos = "0x91bfbc386a41afcfd9b2533058d7e915a1d3829089cc268ff4333d54d6339ca1"
usdc = "0x..." # Get testnet USDC type from Sui Explorer

# For mainnet, use:
# deepbook = "0xdee9"
# turbos = "0x91bfbc386a41afcfd9b2533058d7e915a1d3829089cc268ff4333d54d6339ca1"
# usdc = "0x5d4b302506645c37ff133b98f4b50a5ae14841659738d6d733d59d0d217a93af::coin::COIN"
```

### 1.2 Get Actual Protocol Addresses

Check [Suivision](https://suivision.xyz/) or official docs for current addresses:
- **DeepBook V2**: https://docs.deepbook.tech/
- **Turbos Finance**: https://docs.turbos.finance/

## Step 2: Build and Test

### 2.1 Build the Package

```bash
sui move build
```

Expected output:
```
BUILDING sui_swap_vault
Successfully built package at: /path/to/blank-app
```

### 2.2 Run Tests (Optional)

```bash
sui move test
```

### 2.3 Verify Bytecode

```bash
sui move build --dump-bytecode-as-base64
```

## Step 3: Deploy to Testnet

### 3.1 Publish Package

```bash
sui client publish --gas-budget 100000000
```

**Save these values from the output:**
- `Package ID`: The published package object ID
- `Vault Module`: Module path for the vault
- `Transaction Digest`: For verification

Example output:
```
----- Transaction Digest ----
ABC123...

----- Published Objects ----
Package ID: 0x1234567890abcdef...

----- Gas Used ----
Cost: 50000000 MIST
```

### 3.2 Set Environment Variables

```bash
export PACKAGE_ID="0x1234567890abcdef..."
export OWNER_ADDRESS=$(sui client active-address)
export BOT_ADDRESS="0x..." # Your bot wallet address
```

### 3.3 Create Vault

```bash
sui client call \
  --package $PACKAGE_ID \
  --module vault \
  --function create_vault \
  --args $BOT_ADDRESS \
  --gas-budget 10000000
```

Save the `Vault ID` from the output:
```bash
export VAULT_ID="0xabcdef..."
```

## Step 4: Verify Deployment

### 4.1 Check Vault Object

```bash
sui client object $VAULT_ID
```

Verify:
- Owner address matches
- Bot address matches
- Balances are zero
- Object type is `<package>::vault::Vault`

### 4.2 Test Deposit

```bash
# Get a SUI coin
SUI_COIN=$(sui client gas --json | jq -r '.[0].gasCoinId')

# Deposit 1 SUI (1000000000 MIST)
sui client call \
  --package $PACKAGE_ID \
  --module vault \
  --function deposit \
  --args $VAULT_ID $SUI_COIN \
  --gas-budget 10000000
```

### 4.3 Check Balance

```bash
sui client object $VAULT_ID | grep -A 5 "sui_balance"
```

## Step 5: Integration Testing

### 5.1 Test Bot Trade (from bot wallet)

```bash
# Switch to bot wallet
sui client switch --address $BOT_ADDRESS

# Execute trade: 0.1 SUI → USDC with 5% slippage
sui client call \
  --package $PACKAGE_ID \
  --module vault \
  --function trade_sui_to_usdc \
  --type-args "0x...::coin::COIN" \
  --args $VAULT_ID 100000000 95000 \
  --gas-budget 20000000
```

### 5.2 Monitor Events

```bash
sui client events \
  --module vault \
  --package $PACKAGE_ID \
  --limit 10
```

### 5.3 Test Withdrawal (from owner wallet)

```bash
# Switch back to owner
sui client switch --address $OWNER_ADDRESS

# Withdraw 0.5 SUI and 0 USDC
sui client call \
  --package $PACKAGE_ID \
  --module vault \
  --function withdraw \
  --type-args "0x...::coin::COIN" \
  --args $VAULT_ID 500000000 0 \
  --gas-budget 10000000
```

## Step 6: Deploy to Mainnet

### 6.1 Pre-Mainnet Checklist

- [ ] All testnet tests passed
- [ ] Security audit completed (recommended)
- [ ] Bot wallet funded with SUI for gas
- [ ] Monitoring and alerting set up
- [ ] Emergency procedures documented
- [ ] Backup keys stored securely

### 6.2 Update to Mainnet Config

Edit `Move.toml` with mainnet addresses:

```toml
deepbook = "0xdee9"
turbos = "0x91bfbc386a41afcfd9b2533058d7e915a1d3829089cc268ff4333d54d6339ca1"
usdc = "0x5d4b302506645c37ff133b98f4b50a5ae14841659738d6d733d59d0d217a93af::coin::COIN"
```

### 6.3 Switch to Mainnet

```bash
sui client switch --env mainnet
```

### 6.4 Publish to Mainnet

```bash
sui move build
sui client publish --gas-budget 100000000
```

### 6.5 Create Production Vault

```bash
export PACKAGE_ID="<mainnet-package-id>"
export BOT_ADDRESS="<production-bot-address>"

sui client call \
  --package $PACKAGE_ID \
  --module vault \
  --function create_vault \
  --args $BOT_ADDRESS \
  --gas-budget 10000000
```

### 6.6 Initial Deposit

```bash
export VAULT_ID="<vault-object-id>"

# Deposit initial capital (e.g., 10,000 SUI)
sui client call \
  --package $PACKAGE_ID \
  --module vault \
  --function deposit \
  --args $VAULT_ID <sui-coin-id> \
  --gas-budget 10000000
```

## Step 7: Post-Deployment

### 7.1 Set Up Monitoring

Monitor events using Sui GraphQL or indexer:

```typescript
// Subscribe to vault events
const subscription = await client.subscribeEvent({
  filter: {
    MoveEventModule: {
      package: PACKAGE_ID,
      module: 'vault',
    },
  },
  onMessage: (event) => {
    console.log('Vault event:', event);
    // Send to monitoring system
  },
});
```

### 7.2 Set Up Alerts

Configure alerts for:
- Unauthorized access attempts
- Large trades (> threshold)
- Slippage exceeded events
- Low gas balance on bot wallet
- Failed transactions

### 7.3 Document Addresses

Create a secure record:

```json
{
  "network": "mainnet",
  "package_id": "0x...",
  "vault_id": "0x...",
  "owner_address": "0x...",
  "bot_address": "0x...",
  "deployed_at": "2025-10-28T00:00:00Z",
  "transaction_digest": "ABC123..."
}
```

## Troubleshooting

### Build Errors

**Error: `Unknown dependency`**
```bash
# Update Sui dependency in Move.toml
[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "framework/mainnet" }
```

**Error: `Address resolution failed`**
```bash
# Ensure all addresses in Move.toml are valid
# Check that protocol addresses are correct for your network
```

### Publish Errors

**Error: `Insufficient gas`**
```bash
# Request more testnet SUI or increase gas budget
sui client publish --gas-budget 200000000
```

**Error: `Package too large`**
```bash
# Optimize code or split into multiple packages
```

### Runtime Errors

**Error: `ENotOwner` or `ENotBot`**
```bash
# Verify you're calling from the correct wallet
sui client active-address

# Switch wallet if needed
sui client switch --address <correct-address>
```

**Error: `ESlippageExceeded`**
```bash
# Increase slippage tolerance or wait for better prices
# Check current market conditions
```

## Security Best Practices

1. **Key Management**
   - Use hardware wallets for owner keys
   - Store bot keys in secure key management system (AWS KMS, HashiCorp Vault)
   - Never commit private keys to git

2. **Access Control**
   - Verify bot address is correct before deployment
   - Use separate wallets for owner and bot
   - Implement IP whitelisting for bot API

3. **Monitoring**
   - Set up real-time event monitoring
   - Configure alerts for suspicious activity
   - Log all transactions for audit trail

4. **Testing**
   - Always test on testnet first
   - Use small amounts for initial mainnet tests
   - Gradually increase trading volume

5. **Upgrades**
   - Plan for package upgrades using Sui's upgrade mechanism
   - Test upgrades thoroughly on testnet
   - Coordinate with users before mainnet upgrades

## Maintenance

### Updating Bot Address

```bash
sui client call \
  --package $PACKAGE_ID \
  --module vault \
  --function update_bot \
  --args $VAULT_ID <new-bot-address> \
  --gas-budget 10000000
```

### Querying Statistics

```bash
# Get vault balances
sui client object $VAULT_ID | jq '.data.content.fields'

# Get trade count
sui client object $VAULT_ID | jq '.data.content.fields.total_trades'
```

### Emergency Procedures

If you need to quickly withdraw all funds:

```bash
sui client call \
  --package $PACKAGE_ID \
  --module vault \
  --function withdraw_all \
  --type-args "0x5d4b302506645c37ff133b98f4b50a5ae14841659738d6d733d59d0d217a93af::coin::COIN" \
  --args $VAULT_ID \
  --gas-budget 20000000
```

## Resources

- [Sui Documentation](https://docs.sui.io)
- [Sui Explorer](https://suiexplorer.com)
- [Suivision](https://suivision.xyz)
- [DeepBook Docs](https://docs.deepbook.tech)
- [Turbos Docs](https://docs.turbos.finance)

## Support

For issues:
1. Check the [GitHub Issues](https://github.com/your-repo/issues)
2. Join [Sui Discord](https://discord.gg/sui) - #move-development channel
3. Review [Move Language Book](https://move-language.github.io/move/)

## License

MIT License - See LICENSE file for details
