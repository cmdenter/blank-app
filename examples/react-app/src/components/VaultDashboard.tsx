import { useState } from 'react';
import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';
import { VaultBalance } from './VaultBalance';
import { DepositForm } from './DepositForm';
import { WithdrawForm } from './WithdrawForm';
import { TradeForm } from './TradeForm';
import { TransactionHistory } from './TransactionHistory';
import './VaultDashboard.css';

export function VaultDashboard() {
  const account = useCurrentAccount();
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw' | 'trade'>('deposit');

  if (!account) {
    return (
      <div className="connect-prompt">
        <div className="connect-card">
          <h1>Sui Swap Vault</h1>
          <p className="subtitle">
            Automated SUI ↔ USDC trading with intelligent routing
          </p>
          <div className="features">
            <div className="feature">
              <span className="icon">🔒</span>
              <h3>Secure</h3>
              <p>Owner-controlled deposits & withdrawals</p>
            </div>
            <div className="feature">
              <span className="icon">⚡</span>
              <h3>Smart Routing</h3>
              <p>DeepBook + Turbos integration</p>
            </div>
            <div className="feature">
              <span className="icon">🤖</span>
              <h3>Bot Trading</h3>
              <p>Authorized automated execution</p>
            </div>
          </div>
          <div className="connect-button-container">
            <ConnectButton />
          </div>
          <p className="info-text">
            Connect your Sui wallet to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="vault-dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <h1>Sui Swap Vault</h1>
          <p className="address">
            {account.address.slice(0, 6)}...{account.address.slice(-4)}
          </p>
        </div>
        <div className="header-right">
          <ConnectButton />
        </div>
      </header>

      <div className="dashboard-content">
        <div className="main-section">
          {/* Vault Balance Card */}
          <VaultBalance />

          {/* Action Tabs */}
          <div className="action-card">
            <div className="tabs">
              <button
                className={activeTab === 'deposit' ? 'tab active' : 'tab'}
                onClick={() => setActiveTab('deposit')}
              >
                Deposit
              </button>
              <button
                className={activeTab === 'withdraw' ? 'tab active' : 'tab'}
                onClick={() => setActiveTab('withdraw')}
              >
                Withdraw
              </button>
              <button
                className={activeTab === 'trade' ? 'tab active' : 'tab'}
                onClick={() => setActiveTab('trade')}
              >
                Trade
              </button>
            </div>

            <div className="tab-content">
              {activeTab === 'deposit' && <DepositForm />}
              {activeTab === 'withdraw' && <WithdrawForm />}
              {activeTab === 'trade' && <TradeForm />}
            </div>
          </div>
        </div>

        {/* Transaction History Sidebar */}
        <div className="sidebar-section">
          <TransactionHistory />
        </div>
      </div>
    </div>
  );
}
