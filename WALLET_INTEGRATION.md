# Wallet Integration Guide - Sui Swap Vault (2025)

Complete guide for integrating Sui wallets with your trading vault application using the latest standards and SDKs.

## Overview

As of 2025, Sui uses the **Wallet Standard** - a cross-chain protocol that allows dApps to automatically discover and interact with all compatible wallets without manual configuration. The official **@mysten/dapp-kit** package is the recommended solution from Mysten Labs.

## Supported Wallets

Your dApp will automatically support all Sui Wallet Standard-compliant wallets, including:

- **Sui Wallet** (Official browser extension)
- **Suiet Wallet**
- **Ethos Wallet**
- **Martian Wallet**
- **Glass Wallet**
- **Nightly Wallet**
- **Spacecy Wallet**
- **Morphis Wallet**

**WalletConnect Integration**: As of April 2025, WalletConnect officially supports Sui Network, enabling institutional-grade wallet connections.

## Installation

### 1. Install Required Packages

```bash
npm install @mysten/dapp-kit @mysten/sui.js @tanstack/react-query
```

### 2. Package Versions (Latest)

```json
{
  "dependencies": {
    "@mysten/dapp-kit": "^0.19.6",
    "@mysten/sui.js": "^0.54.0",
    "@tanstack/react-query": "^5.0.0"
  }
}
```

## Basic Setup

### 1. Configure Network and Providers

Create `src/config/sui.ts`:

```typescript
import { createNetworkConfig } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui.js/client';

// Configure supported networks
const { networkConfig, useNetworkVariable, useNetworkVariables } = createNetworkConfig({
  mainnet: {
    url: getFullnodeUrl('mainnet'),
  },
  testnet: {
    url: getFullnodeUrl('testnet'),
  },
  devnet: {
    url: getFullnodeUrl('devnet'),
  },
  localnet: {
    url: 'http://localhost:9000',
  },
});

export { networkConfig, useNetworkVariable, useNetworkVariables };
```

### 2. Wrap Your App with Providers

Update `src/App.tsx` or `src/main.tsx`:

```typescript
import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { networkConfig } from './config/sui';
import '@mysten/dapp-kit/dist/index.css'; // Import dApp Kit styles

// Create React Query client
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="mainnet">
        <WalletProvider autoConnect>
          {/* Your app components */}
          <YourVaultApp />
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}

export default App;
```

## Using Pre-built Components

### 1. Connect Button (Simplest Approach)

```typescript
import { ConnectButton } from '@mysten/dapp-kit';

function Header() {
  return (
    <header>
      <h1>Sui Swap Vault</h1>
      <ConnectButton />
    </header>
  );
}
```

The `ConnectButton` component:
- Shows "Connect Wallet" when disconnected
- Displays wallet address when connected
- Provides disconnect option
- Automatically detects all installed wallets
- Fully themeable

### 2. Account Info Display

```typescript
import { useCurrentAccount } from '@mysten/dapp-kit';

function AccountInfo() {
  const account = useCurrentAccount();

  if (!account) {
    return <div>Please connect your wallet</div>;
  }

  return (
    <div>
      <p>Address: {account.address}</p>
      <p>Network: {account.chains[0]}</p>
    </div>
  );
}
```

## Advanced Wallet Integration

### 1. Get Connected Wallet State

```typescript
import {
  useCurrentAccount,
  useCurrentWallet,
  useSuiClient
} from '@mysten/dapp-kit';

function VaultDashboard() {
  const account = useCurrentAccount();
  const { currentWallet } = useCurrentWallet();
  const suiClient = useSuiClient();

  // Check if wallet is connected
  if (!account) {
    return <ConnectWalletPrompt />;
  }

  const walletName = currentWallet?.name;
  const address = account.address;

  return (
    <div>
      <h2>Connected with {walletName}</h2>
      <p>Address: {address}</p>
      {/* Vault operations */}
    </div>
  );
}
```

### 2. Execute Transactions (Deposit Example)

```typescript
import { useSignAndExecuteTransactionBlock, useSuiClient } from '@mysten/dapp-kit';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { PACKAGE_ID, VAULT_ID, MIST_PER_SUI } from './config/constants';

function DepositButton({ amount }: { amount: number }) {
  const { mutate: signAndExecute } = useSignAndExecuteTransactionBlock();
  const suiClient = useSuiClient();

  const handleDeposit = async () => {
    const tx = new TransactionBlock();

    // Split SUI for deposit
    const [coin] = tx.splitCoins(tx.gas, [
      tx.pure(amount * MIST_PER_SUI, 'u64')
    ]);

    // Call vault deposit function
    tx.moveCall({
      target: `${PACKAGE_ID}::vault::deposit`,
      arguments: [
        tx.object(VAULT_ID),
        coin,
      ],
    });

    // Sign and execute
    signAndExecute(
      {
        transactionBlock: tx,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      },
      {
        onSuccess: (result) => {
          console.log('Deposit successful!', result.digest);
        },
        onError: (error) => {
          console.error('Deposit failed:', error);
        },
      }
    );
  };

  return (
    <button onClick={handleDeposit}>
      Deposit {amount} SUI
    </button>
  );
}
```

### 3. Sign Transactions (Multi-step PTB)

```typescript
import { useSignAndExecuteTransactionBlock } from '@mysten/dapp-kit';
import { TransactionBlock } from '@mysten/sui.js/transactions';

function TradeButton({ vaultId, amountSUI, minUSDC }: TradeProps) {
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransactionBlock();

  const handleTrade = () => {
    const tx = new TransactionBlock();

    // Execute trade
    tx.moveCall({
      target: `${PACKAGE_ID}::vault::trade_sui_to_usdc`,
      typeArguments: [USDC_TYPE],
      arguments: [
        tx.object(vaultId),
        tx.pure(amountSUI * 1e9, 'u64'),
        tx.pure(minUSDC * 1e6, 'u64'),
      ],
    });

    signAndExecute(
      {
        transactionBlock: tx,
        options: {
          showEffects: true,
          showEvents: true,
        },
      },
      {
        onSuccess: (result) => {
          // Parse trade event
          const tradeEvent = result.events?.find(
            e => e.type.includes('TradeEvent')
          );
          console.log('Trade executed:', tradeEvent?.parsedJson);
        },
      }
    );
  };

  return (
    <button onClick={handleTrade} disabled={isPending}>
      {isPending ? 'Trading...' : 'Execute Trade'}
    </button>
  );
}
```

### 4. Query Vault Balance

```typescript
import { useSuiClientQuery, useCurrentAccount } from '@mysten/dapp-kit';

function VaultBalance({ vaultId }: { vaultId: string }) {
  const account = useCurrentAccount();

  // Query vault object
  const { data, isLoading, error } = useSuiClientQuery('getObject', {
    id: vaultId,
    options: {
      showContent: true,
    },
  });

  if (isLoading) return <div>Loading vault data...</div>;
  if (error) return <div>Error: {error.message}</div>;

  const vaultData = data?.data?.content as any;
  const suiBalance = vaultData?.fields?.sui_balance || 0;
  const usdcBalance = vaultData?.fields?.usdc_balance || 0;

  return (
    <div className="vault-balance">
      <h3>Vault Balance</h3>
      <p>SUI: {(suiBalance / 1e9).toFixed(4)}</p>
      <p>USDC: {(usdcBalance / 1e6).toFixed(2)}</p>
    </div>
  );
}
```

## Custom Wallet Connection (Advanced)

### 1. Manual Wallet Selection

```typescript
import { useWallets, useConnectWallet } from '@mysten/dapp-kit';

function WalletSelector() {
  const wallets = useWallets();
  const { mutate: connect } = useConnectWallet();

  return (
    <div className="wallet-grid">
      {wallets.map((wallet) => (
        <button
          key={wallet.name}
          onClick={() => {
            connect(
              { wallet },
              {
                onSuccess: () => console.log('Connected to', wallet.name),
                onError: (error) => console.error('Failed to connect', error),
              }
            );
          }}
        >
          {wallet.icon && <img src={wallet.icon} alt={wallet.name} />}
          <span>{wallet.name}</span>
        </button>
      ))}
    </div>
  );
}
```

### 2. Disconnect Wallet

```typescript
import { useDisconnectWallet } from '@mysten/dapp-kit';

function DisconnectButton() {
  const { mutate: disconnect } = useDisconnectWallet();

  return (
    <button
      onClick={() => {
        disconnect();
      }}
    >
      Disconnect Wallet
    </button>
  );
}
```

### 3. Switch Networks

```typescript
import { useSwitchAccount } from '@mysten/dapp-kit';

function NetworkSwitcher() {
  const { mutate: switchAccount } = useSwitchAccount();

  return (
    <select
      onChange={(e) => {
        switchAccount({ account: e.target.value });
      }}
    >
      <option value="mainnet">Mainnet</option>
      <option value="testnet">Testnet</option>
      <option value="devnet">Devnet</option>
    </select>
  );
}
```

## WalletConnect Integration (2025)

As of April 2025, WalletConnect officially supports Sui Network. For institutional-grade integrations:

### 1. Install WalletConnect Dependencies

```bash
npm install @walletconnect/universal-provider @walletconnect/modal
```

### 2. Configure WalletConnect Provider

```typescript
import UniversalProvider from '@walletconnect/universal-provider';

const provider = await UniversalProvider.init({
  projectId: 'YOUR_WALLETCONNECT_PROJECT_ID', // Get from https://cloud.walletconnect.com
  metadata: {
    name: 'Sui Swap Vault',
    description: 'Automated trading vault on Sui',
    url: 'https://your-app.com',
    icons: ['https://your-app.com/icon.png'],
  },
  chains: ['sui:mainnet'],
});

// Connect to wallet
await provider.connect({
  namespaces: {
    sui: {
      methods: [
        'sui_signAndExecuteTransactionBlock',
        'sui_signTransactionBlock',
      ],
      chains: ['sui:mainnet'],
      events: ['chainChanged', 'accountsChanged'],
    },
  },
});
```

## Complete Vault Integration Example

Here's a full example component that integrates everything:

```typescript
import { useState } from 'react';
import {
  ConnectButton,
  useCurrentAccount,
  useSignAndExecuteTransactionBlock,
  useSuiClientQuery,
} from '@mysten/dapp-kit';
import { TransactionBlock } from '@mysten/sui.js/transactions';

const PACKAGE_ID = '0x...'; // Your package ID
const VAULT_ID = '0x...';   // Your vault ID
const USDC_TYPE = '0x5d4b302506645c37ff133b98f4b50a5ae14841659738d6d733d59d0d217a93af::coin::COIN';

export function VaultInterface() {
  const account = useCurrentAccount();
  const [depositAmount, setDepositAmount] = useState('');
  const { mutate: signAndExecute } = useSignAndExecuteTransactionBlock();

  // Query vault balance
  const { data: vaultData } = useSuiClientQuery('getObject', {
    id: VAULT_ID,
    options: { showContent: true },
  });

  const handleDeposit = () => {
    const tx = new TransactionBlock();
    const [coin] = tx.splitCoins(tx.gas, [
      tx.pure(parseFloat(depositAmount) * 1e9, 'u64'),
    ]);

    tx.moveCall({
      target: `${PACKAGE_ID}::vault::deposit`,
      arguments: [tx.object(VAULT_ID), coin],
    });

    signAndExecute(
      { transactionBlock: tx },
      {
        onSuccess: (result) => {
          alert(`Deposit successful! Tx: ${result.digest}`);
          setDepositAmount('');
        },
      }
    );
  };

  if (!account) {
    return (
      <div className="connect-prompt">
        <h2>Connect Your Wallet</h2>
        <p>Please connect your Sui wallet to access the vault</p>
        <ConnectButton />
      </div>
    );
  }

  const vaultContent = vaultData?.data?.content as any;
  const suiBalance = vaultContent?.fields?.sui_balance || 0;

  return (
    <div className="vault-interface">
      <header>
        <h1>Sui Swap Vault</h1>
        <ConnectButton />
      </header>

      <div className="vault-stats">
        <h2>Your Vault</h2>
        <p>Balance: {(suiBalance / 1e9).toFixed(4)} SUI</p>
      </div>

      <div className="deposit-section">
        <h3>Deposit SUI</h3>
        <input
          type="number"
          value={depositAmount}
          onChange={(e) => setDepositAmount(e.target.value)}
          placeholder="Amount in SUI"
        />
        <button onClick={handleDeposit} disabled={!depositAmount}>
          Deposit
        </button>
      </div>
    </div>
  );
}
```

## Styling the dApp Kit Components

### 1. Import Default Styles

```typescript
import '@mysten/dapp-kit/dist/index.css';
```

### 2. Custom Theme Variables

```css
:root {
  --dapp-kit-primary: #4da2ff;
  --dapp-kit-background: #ffffff;
  --dapp-kit-text: #000000;
  --dapp-kit-border-radius: 8px;
}

[data-theme='dark'] {
  --dapp-kit-background: #1a1a1a;
  --dapp-kit-text: #ffffff;
}
```

### 3. Override Component Styles

```css
.sui-connect-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 12px 24px;
  font-weight: 600;
}

.sui-wallet-modal {
  max-width: 400px;
  border-radius: 16px;
}
```

## Best Practices

### 1. Error Handling

```typescript
import { useSignAndExecuteTransactionBlock } from '@mysten/dapp-kit';

function SafeTransaction() {
  const { mutate: signAndExecute, error, isError } = useSignAndExecuteTransactionBlock();

  const handleTransaction = () => {
    signAndExecute(
      { transactionBlock: tx },
      {
        onError: (err) => {
          if (err.message.includes('User rejected')) {
            alert('Transaction cancelled');
          } else if (err.message.includes('Insufficient gas')) {
            alert('Not enough SUI for gas');
          } else {
            alert(`Transaction failed: ${err.message}`);
          }
        },
      }
    );
  };

  return <button onClick={handleTransaction}>Execute</button>;
}
```

### 2. Loading States

```typescript
function TransactionButton() {
  const { mutate, isPending } = useSignAndExecuteTransactionBlock();

  return (
    <button disabled={isPending}>
      {isPending ? (
        <>
          <Spinner /> Processing...
        </>
      ) : (
        'Execute Transaction'
      )}
    </button>
  );
}
```

### 3. Auto-Connect on Refresh

```typescript
<WalletProvider autoConnect>
  {/* Your app */}
</WalletProvider>
```

The `autoConnect` prop will automatically reconnect to the last used wallet on page refresh.

## Testing Wallet Integration

### 1. Use Sui Testnet

```typescript
const { networkConfig } = createNetworkConfig({
  testnet: {
    url: getFullnodeUrl('testnet'),
  },
});

<SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
```

### 2. Request Testnet Tokens

Visit [Sui Discord #testnet-faucet](https://discord.gg/sui) and use:
```
!faucet <your-address>
```

### 3. Mock Wallet for E2E Tests

```typescript
// In your test setup
import { MockWallet } from '@mysten/dapp-kit/test';

const mockWallet = new MockWallet();
mockWallet.setAddress('0x123...');
```

## Migration from Legacy Packages

If you're upgrading from `@mysten/wallet-kit` (deprecated):

```bash
npm uninstall @mysten/wallet-kit
npm install @mysten/dapp-kit
```

Update imports:
```typescript
// Old
import { WalletProvider } from '@mysten/wallet-kit';

// New
import { WalletProvider } from '@mysten/dapp-kit';
```

## Resources

- **Official Docs**: https://sdk.mystenlabs.com/dapp-kit
- **Wallet Standard**: https://docs.sui.io/standards/wallet-standard
- **GitHub**: https://github.com/MystenLabs/sui/tree/main/sdk/dapp-kit
- **NPM Package**: https://www.npmjs.com/package/@mysten/dapp-kit
- **WalletConnect Sui**: https://walletconnect.com/chains
- **Sui Explorer**: https://suiexplorer.com

## Support

- Sui Discord: #dapp-kit channel
- GitHub Issues: https://github.com/MystenLabs/sui/issues
- Stack Overflow: [sui] tag

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 0.19.6 | 2025-10 | Latest stable release |
| 0.18.0 | 2025-08 | WalletConnect integration |
| 0.15.0 | 2025-05 | Auto-connect feature |

---

**Note**: This guide reflects the state of Sui wallet integration as of October 2025. Always refer to the official documentation for the most current information.
