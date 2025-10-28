import { createNetworkConfig } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui.js/client';

// Configure supported networks
const { networkConfig, useNetworkVariable, useNetworkVariables } = createNetworkConfig({
  mainnet: {
    url: getFullnodeUrl('mainnet'),
    variables: {
      packageId: '0x0', // Replace with your mainnet package ID
      vaultId: '0x0',   // Replace with your mainnet vault ID
    },
  },
  testnet: {
    url: getFullnodeUrl('testnet'),
    variables: {
      packageId: '0x0', // Replace with your testnet package ID
      vaultId: '0x0',   // Replace with your testnet vault ID
    },
  },
  devnet: {
    url: getFullnodeUrl('devnet'),
    variables: {
      packageId: '0x0', // Replace with your devnet package ID
      vaultId: '0x0',   // Replace with your devnet vault ID
    },
  },
  localnet: {
    url: 'http://localhost:9000',
    variables: {
      packageId: '0x0',
      vaultId: '0x0',
    },
  },
});

// USDC type on Sui
export const USDC_TYPE = '0x5d4b302506645c37ff133b98f4b50a5ae14841659738d6d733d59d0d217a93af::coin::COIN';

// Constants
export const MIST_PER_SUI = 1_000_000_000;
export const USDC_DECIMALS = 6;

export { networkConfig, useNetworkVariable, useNetworkVariables };
