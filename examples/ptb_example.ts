/**
 * Example Programmable Transaction Block (PTB) for Sui Swap Vault
 *
 * This demonstrates how to interact with the vault using the Sui TypeScript SDK
 */

import { TransactionBlock } from '@mysten/sui.js/transactions';
import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';

// Configuration
const PACKAGE_ID = '0x...'; // Your deployed package ID
const VAULT_ID = '0x...';   // Your vault object ID
const USDC_TYPE = '0x5d4b302506645c37ff133b98f4b50a5ae14841659738d6d733d59d0d217a93af::coin::COIN';

// Initialize client
const client = new SuiClient({ url: getFullnodeUrl('mainnet') });

/**
 * Example 1: Create a new vault
 */
async function createVault(signer: Ed25519Keypair, botAddress: string) {
  const tx = new TransactionBlock();

  tx.moveCall({
    target: `${PACKAGE_ID}::vault::create_vault`,
    arguments: [
      tx.pure(botAddress, 'address'),
    ],
  });

  const result = await client.signAndExecuteTransactionBlock({
    transactionBlock: tx,
    signer,
    options: {
      showEffects: true,
      showObjectChanges: true,
    },
  });

  console.log('Vault created:', result.digest);

  // Extract vault object ID from created objects
  const vaultObj = result.objectChanges?.find(
    obj => obj.type === 'created' && obj.objectType.includes('::vault::Vault')
  );

  if (vaultObj && 'objectId' in vaultObj) {
    console.log('Vault ID:', vaultObj.objectId);
    return vaultObj.objectId;
  }

  throw new Error('Failed to find vault object');
}

/**
 * Example 2: Deposit SUI into vault
 */
async function depositSUI(signer: Ed25519Keypair, vaultId: string, amountMIST: number) {
  const tx = new TransactionBlock();

  // Split SUI from gas coin
  const [coin] = tx.splitCoins(tx.gas, [tx.pure(amountMIST, 'u64')]);

  // Deposit to vault
  tx.moveCall({
    target: `${PACKAGE_ID}::vault::deposit`,
    arguments: [
      tx.object(vaultId),
      coin,
    ],
  });

  const result = await client.signAndExecuteTransactionBlock({
    transactionBlock: tx,
    signer,
    options: { showEffects: true },
  });

  console.log('Deposit successful:', result.digest);
  return result;
}

/**
 * Example 3: Bot executes a trade (SUI → USDC)
 */
async function tradeSUItoUSDC(
  botSigner: Ed25519Keypair,
  vaultId: string,
  amountSUI: number,
  minUSDCOut: number
) {
  const tx = new TransactionBlock();

  tx.moveCall({
    target: `${PACKAGE_ID}::vault::trade_sui_to_usdc`,
    typeArguments: [USDC_TYPE],
    arguments: [
      tx.object(vaultId),
      tx.pure(amountSUI * 1e9, 'u64'), // Convert SUI to MIST
      tx.pure(minUSDCOut * 1e6, 'u64'), // USDC has 6 decimals
    ],
  });

  const result = await client.signAndExecuteTransactionBlock({
    transactionBlock: tx,
    signer: botSigner,
    options: {
      showEffects: true,
      showEvents: true,
    },
  });

  console.log('Trade executed:', result.digest);

  // Parse trade event
  const tradeEvent = result.events?.find(e => e.type.includes('TradeEvent'));
  if (tradeEvent) {
    console.log('Trade details:', tradeEvent.parsedJson);
  }

  return result;
}

/**
 * Example 4: Withdraw funds from vault
 */
async function withdraw(
  ownerSigner: Ed25519Keypair,
  vaultId: string,
  amountSUI: number,
  amountUSDC: number
) {
  const tx = new TransactionBlock();

  tx.moveCall({
    target: `${PACKAGE_ID}::vault::withdraw`,
    typeArguments: [USDC_TYPE],
    arguments: [
      tx.object(vaultId),
      tx.pure(amountSUI * 1e9, 'u64'),
      tx.pure(amountUSDC * 1e6, 'u64'),
    ],
  });

  const result = await client.signAndExecuteTransactionBlock({
    transactionBlock: tx,
    signer: ownerSigner,
    options: { showEffects: true },
  });

  console.log('Withdrawal successful:', result.digest);
  return result;
}

/**
 * Example 5: Complex PTB - Deposit, Trade, and Monitor in one transaction
 */
async function depositAndTrade(
  botSigner: Ed25519Keypair,
  vaultId: string,
  depositAmount: number,
  tradeAmount: number,
  minUSDCOut: number
) {
  const tx = new TransactionBlock();

  // 1. Split and deposit SUI
  const [depositCoin] = tx.splitCoins(tx.gas, [tx.pure(depositAmount * 1e9, 'u64')]);

  tx.moveCall({
    target: `${PACKAGE_ID}::vault::deposit`,
    arguments: [
      tx.object(vaultId),
      depositCoin,
    ],
  });

  // 2. Execute trade
  tx.moveCall({
    target: `${PACKAGE_ID}::vault::trade_sui_to_usdc`,
    typeArguments: [USDC_TYPE],
    arguments: [
      tx.object(vaultId),
      tx.pure(tradeAmount * 1e9, 'u64'),
      tx.pure(minUSDCOut * 1e6, 'u64'),
    ],
  });

  const result = await client.signAndExecuteTransactionBlock({
    transactionBlock: tx,
    signer: botSigner,
    options: {
      showEffects: true,
      showEvents: true,
    },
  });

  console.log('Complex transaction executed:', result.digest);
  return result;
}

/**
 * Example 6: Query vault balances
 */
async function getVaultBalances(vaultId: string) {
  const vault = await client.getObject({
    id: vaultId,
    options: { showContent: true },
  });

  if (vault.data?.content && 'fields' in vault.data.content) {
    const fields = vault.data.content.fields as any;

    const suiBalance = fields.sui_balance || 0;
    const usdcBalance = fields.usdc_balance || 0;
    const totalTrades = fields.total_trades || 0;

    console.log('Vault Balances:');
    console.log(`  SUI: ${suiBalance / 1e9} SUI`);
    console.log(`  USDC: ${usdcBalance / 1e6} USDC`);
    console.log(`  Total Trades: ${totalTrades}`);

    return { suiBalance, usdcBalance, totalTrades };
  }

  throw new Error('Failed to fetch vault data');
}

/**
 * Example 7: Update bot address
 */
async function updateBot(
  ownerSigner: Ed25519Keypair,
  vaultId: string,
  newBotAddress: string
) {
  const tx = new TransactionBlock();

  tx.moveCall({
    target: `${PACKAGE_ID}::vault::update_bot`,
    arguments: [
      tx.object(vaultId),
      tx.pure(newBotAddress, 'address'),
    ],
  });

  const result = await client.signAndExecuteTransactionBlock({
    transactionBlock: tx,
    signer: ownerSigner,
    options: { showEffects: true },
  });

  console.log('Bot address updated:', result.digest);
  return result;
}

/**
 * Example 8: Monitor vault events
 */
async function monitorVaultEvents(vaultId: string) {
  const events = await client.queryEvents({
    query: {
      MoveModule: {
        package: PACKAGE_ID,
        module: 'vault',
      },
    },
    limit: 50,
  });

  console.log('Recent vault events:');
  events.data.forEach(event => {
    const eventType = event.type.split('::').pop();
    console.log(`  ${eventType}:`, event.parsedJson);
  });

  return events;
}

/**
 * Example 9: Emergency withdraw all funds
 */
async function emergencyWithdrawAll(
  ownerSigner: Ed25519Keypair,
  vaultId: string
) {
  const tx = new TransactionBlock();

  tx.moveCall({
    target: `${PACKAGE_ID}::vault::withdraw_all`,
    typeArguments: [USDC_TYPE],
    arguments: [
      tx.object(vaultId),
    ],
  });

  const result = await client.signAndExecuteTransactionBlock({
    transactionBlock: tx,
    signer: ownerSigner,
    options: { showEffects: true },
  });

  console.log('Emergency withdrawal successful:', result.digest);
  return result;
}

/**
 * Example 10: Get best quote before trading
 */
async function getBestQuote(amountSUI: number) {
  // This would need to be implemented on-chain or via off-chain price feeds
  // For now, this is a placeholder showing the concept

  const deepBookPrice = amountSUI * 0.9998; // 0.02% fee
  const turbosPrice = amountSUI * 0.9995;   // 0.05% fee

  const bestRoute = deepBookPrice > turbosPrice ? 'DeepBook' : 'Turbos';
  const bestPrice = Math.max(deepBookPrice, turbosPrice);

  console.log('Best quote:');
  console.log(`  Route: ${bestRoute}`);
  console.log(`  Output: ${bestPrice} USDC`);

  return { route: bestRoute, output: bestPrice };
}

// Export all functions
export {
  createVault,
  depositSUI,
  tradeSUItoUSDC,
  withdraw,
  depositAndTrade,
  getVaultBalances,
  updateBot,
  monitorVaultEvents,
  emergencyWithdrawAll,
  getBestQuote,
};

/**
 * Usage Example:
 *
 * import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
 * import * as vault from './ptb_example';
 *
 * const ownerKeypair = Ed25519Keypair.fromSecretKey(...);
 * const botKeypair = Ed25519Keypair.fromSecretKey(...);
 *
 * // Create vault
 * const vaultId = await vault.createVault(ownerKeypair, botKeypair.getPublicKey().toSuiAddress());
 *
 * // Deposit 1000 SUI
 * await vault.depositSUI(ownerKeypair, vaultId, 1000 * 1e9);
 *
 * // Bot trades 100 SUI for minimum 95 USDC
 * await vault.tradeSUItoUSDC(botKeypair, vaultId, 100, 95);
 *
 * // Check balances
 * await vault.getVaultBalances(vaultId);
 *
 * // Withdraw 50 SUI and 100 USDC
 * await vault.withdraw(ownerKeypair, vaultId, 50, 100);
 */
