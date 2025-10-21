# Sui Bluefin Trading Interface

A decentralized trading interface for trading perpetual futures on Bluefin DEX (Sui blockchain) with integrated wallet connection.

## Features

- **Sui Wallet Integration**: Connect with any Sui-compatible wallet (Sui Wallet, Suiet, Ethos, etc.)
- **Bluefin DEX Integration**: Trade perpetual futures on Bluefin exchange
- **Real-time Market Data**: Live price feeds and market information
- **Position Management**: View and manage your open positions
- **Order Types**: Support for both Market and Limit orders
- **Responsive UI**: Beautiful, modern interface that works on all devices

## Supported Markets

- BTC-PERP (Bitcoin Perpetual)
- ETH-PERP (Ethereum Perpetual)
- SOL-PERP (Solana Perpetual)
- SUI-PERP (Sui Perpetual)

## Prerequisites

- Node.js 18+ and npm
- A Sui wallet (Sui Wallet, Suiet, etc.)
- USDC on Sui network for trading

## Installation

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

The app will open at `http://localhost:3000`

## Building for Production

```bash
npm run build
```

The production-ready files will be in the `dist` directory.

## How to Use

### 1. Connect Your Wallet

Click the "Connect Wallet" button in the top right corner and select your Sui wallet.

### 2. Select a Market

Choose the perpetual market you want to trade from the dropdown menu (e.g., BTC-PERP).

### 3. Place an Order

**For Market Orders:**
- Select "Market" order type
- Choose "Buy/Long" or "Sell/Short"
- Enter the size (amount)
- Click the buy/sell button

**For Limit Orders:**
- Select "Limit" order type
- Choose "Buy/Long" or "Sell/Short"
- Enter your desired price
- Enter the size (amount)
- Click the buy/sell button

### 4. Manage Positions

View your open positions in the "Your Positions" section. You can close positions by clicking the "Close" button.

## Technical Stack

- **React 18**: Modern React with hooks
- **Vite**: Fast build tool and dev server
- **Sui dApp Kit**: Official Sui wallet integration
- **Bluefin SDK**: Integration with Bluefin exchange
- **React Query**: Data fetching and caching

## Project Structure

```
sui-trading-interface/
├── src/
│   ├── components/
│   │   ├── TradingInterface.jsx    # Main trading interface
│   │   ├── BluefinClient.jsx       # Bluefin SDK wrapper
│   │   ├── OrderForm.jsx           # Order placement form
│   │   ├── PositionsList.jsx       # Positions display
│   │   └── MarketInfo.jsx          # Market data display
│   ├── App.jsx                      # App with providers
│   ├── main.jsx                     # Entry point
│   └── index.css                    # Global styles
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

## Bluefin Integration

This app integrates with Bluefin's v2 client SDK for Sui. The BluefinClient component handles:

- Client initialization with user wallet
- Market data fetching
- Order placement (market and limit orders)
- Position management
- Order book data
- Trade history

## Wallet Connection

The app uses Sui's official dApp Kit which supports:

- Sui Wallet
- Suiet Wallet
- Ethos Wallet
- Martian Wallet
- And other wallets following the Sui wallet standard

## Important Notes

### Security
- Never share your private keys or seed phrases
- Always verify transaction details before signing
- Start with small amounts when testing

### Testnet vs Mainnet
The app is configured for Sui mainnet by default. To switch to testnet:
1. Change the network in `src/App.jsx`
2. Ensure your wallet is connected to testnet
3. Use testnet USDC for trading

### Trading Risks
- Trading perpetual futures involves significant risk
- You can lose more than your initial investment
- This is a decentralized platform - use at your own risk
- Not financial advice - DYOR (Do Your Own Research)

## Development

### Environment Setup

The app works out of the box without environment variables. However, you can customize:

- Network selection (mainnet/testnet)
- RPC endpoints
- Default market pairs

### Adding New Markets

To add new perpetual markets, update the market selector in `TradingInterface.jsx`:

```jsx
<select value={selectedMarket} onChange={(e) => setSelectedMarket(e.target.value)}>
  <option value="YOUR-MARKET-PERP">YOUR MARKET</option>
</select>
```

## Troubleshooting

### Wallet Not Connecting
- Ensure you have a Sui wallet extension installed
- Try refreshing the page
- Check if your wallet is unlocked

### Orders Not Going Through
- Verify you have sufficient USDC balance
- Check your wallet is connected to the correct network
- Ensure you've approved the transaction in your wallet

### Market Data Not Loading
- Check your internet connection
- Verify Bluefin API is accessible
- Try refreshing the page

## Resources

- [Bluefin Documentation](https://docs.bluefin.io/)
- [Sui Developer Docs](https://docs.sui.io/)
- [Sui dApp Kit](https://sdk.mystenlabs.com/dapp-kit)
- [Bluefin Exchange](https://bluefin.io/)

## License

MIT License - See LICENSE file for details

## Disclaimer

This software is provided "as is" without warranty of any kind. Trading cryptocurrencies and derivatives involves substantial risk. Always do your own research and only trade with funds you can afford to lose.
