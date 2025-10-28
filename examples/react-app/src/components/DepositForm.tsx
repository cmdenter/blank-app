import { useState } from 'react';
import { useSignAndExecuteTransactionBlock, useSuiClient } from '@mysten/dapp-kit';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { useNetworkVariable, MIST_PER_SUI } from '../config/sui';
import './Forms.css';

export function DepositForm() {
  const packageId = useNetworkVariable('packageId');
  const vaultId = useNetworkVariable('vaultId');
  const suiClient = useSuiClient();

  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [txResult, setTxResult] = useState<{ success: boolean; message: string } | null>(null);

  const { mutate: signAndExecute } = useSignAndExecuteTransactionBlock();

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setTxResult({ success: false, message: 'Please enter a valid amount' });
      return;
    }

    setIsProcessing(true);
    setTxResult(null);

    try {
      const tx = new TransactionBlock();

      // Split SUI for deposit
      const amountInMist = Math.floor(parseFloat(amount) * MIST_PER_SUI);
      const [coin] = tx.splitCoins(tx.gas, [tx.pure(amountInMist, 'u64')]);

      // Call vault deposit function
      tx.moveCall({
        target: `${packageId}::vault::deposit`,
        arguments: [
          tx.object(vaultId),
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
            console.log('Deposit successful:', result);
            setTxResult({
              success: true,
              message: `Successfully deposited ${amount} SUI! Tx: ${result.digest.slice(0, 8)}...`,
            });
            setAmount('');
            setIsProcessing(false);
          },
          onError: (error) => {
            console.error('Deposit failed:', error);
            let errorMessage = 'Transaction failed';

            if (error.message.includes('Rejected')) {
              errorMessage = 'Transaction rejected by user';
            } else if (error.message.includes('Insufficient')) {
              errorMessage = 'Insufficient SUI balance';
            } else if (error.message.includes('gas')) {
              errorMessage = 'Not enough SUI for gas fees';
            }

            setTxResult({ success: false, message: errorMessage });
            setIsProcessing(false);
          },
        }
      );
    } catch (error: any) {
      console.error('Deposit error:', error);
      setTxResult({ success: false, message: error.message || 'Unknown error' });
      setIsProcessing(false);
    }
  };

  return (
    <div className="form-container">
      <h3>Deposit SUI</h3>
      <p className="form-description">
        Deposit SUI into your vault for trading
      </p>

      <div className="input-group">
        <label>Amount (SUI)</label>
        <div className="input-wrapper">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            step="0.1"
            min="0"
            disabled={isProcessing}
          />
          <span className="input-suffix">SUI</span>
        </div>
        <div className="quick-amounts">
          <button onClick={() => setAmount('1')}>1 SUI</button>
          <button onClick={() => setAmount('10')}>10 SUI</button>
          <button onClick={() => setAmount('100')}>100 SUI</button>
        </div>
      </div>

      <button
        className="submit-btn"
        onClick={handleDeposit}
        disabled={isProcessing || !amount}
      >
        {isProcessing ? (
          <>
            <span className="spinner-small"></span>
            Processing...
          </>
        ) : (
          'Deposit'
        )}
      </button>

      {txResult && (
        <div className={`result-message ${txResult.success ? 'success' : 'error'}`}>
          {txResult.message}
        </div>
      )}

      <div className="info-box">
        <p>
          <strong>Note:</strong> You'll need to approve the transaction in your wallet.
          A small amount of SUI will be used for gas fees.
        </p>
      </div>
    </div>
  );
}
