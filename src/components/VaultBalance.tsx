import { useSuiClientQuery } from '@mysten/dapp-kit';
import { useNetworkVariable } from '../config/sui';
import { MIST_PER_SUI, USDC_DECIMALS } from '../config/sui';
import './VaultBalance.css';

export function VaultBalance() {
  const vaultId = useNetworkVariable('vaultId');

  // Query vault object
  const { data, isLoading, error, refetch } = useSuiClientQuery(
    'getObject',
    {
      id: vaultId,
      options: {
        showContent: true,
      },
    },
    {
      refetchInterval: 5000, // Refresh every 5 seconds
    }
  );

  if (isLoading) {
    return (
      <div className="balance-card loading">
        <div className="spinner"></div>
        <p>Loading vault data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="balance-card error">
        <h3>Error Loading Vault</h3>
        <p>{error.message}</p>
        <button onClick={() => refetch()}>Retry</button>
      </div>
    );
  }

  const vaultContent = data?.data?.content as any;
  const fields = vaultContent?.fields;

  const suiBalance = Number(fields?.sui_balance || 0) / MIST_PER_SUI;
  const usdcBalance = Number(fields?.usdc_balance || 0) / Math.pow(10, USDC_DECIMALS);
  const totalTrades = Number(fields?.total_trades || 0);
  const totalVolumeSUI = Number(fields?.total_volume_sui || 0) / MIST_PER_SUI;
  const totalVolumeUSDC = Number(fields?.total_volume_usdc || 0) / Math.pow(10, USDC_DECIMALS);

  // Calculate approximate USD value (assuming 1 SUI = $1 for demo)
  const totalValueUSD = suiBalance * 1 + usdcBalance;

  return (
    <div className="balance-card">
      <div className="balance-header">
        <h2>Vault Balance</h2>
        <button className="refresh-btn" onClick={() => refetch()}>
          🔄
        </button>
      </div>

      <div className="total-value">
        <span className="label">Total Value</span>
        <span className="value">${totalValueUSD.toFixed(2)}</span>
      </div>

      <div className="balances">
        <div className="balance-item">
          <div className="balance-info">
            <span className="token-icon">◎</span>
            <div>
              <span className="token-name">SUI</span>
              <span className="balance-amount">{suiBalance.toFixed(4)}</span>
            </div>
          </div>
          <span className="balance-usd">${(suiBalance * 1).toFixed(2)}</span>
        </div>

        <div className="balance-item">
          <div className="balance-info">
            <span className="token-icon">💵</span>
            <div>
              <span className="token-name">USDC</span>
              <span className="balance-amount">{usdcBalance.toFixed(2)}</span>
            </div>
          </div>
          <span className="balance-usd">${usdcBalance.toFixed(2)}</span>
        </div>
      </div>

      <div className="stats">
        <div className="stat-item">
          <span className="stat-label">Total Trades</span>
          <span className="stat-value">{totalTrades}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Volume (SUI)</span>
          <span className="stat-value">{totalVolumeSUI.toFixed(2)}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Volume (USDC)</span>
          <span className="stat-value">{totalVolumeUSDC.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
