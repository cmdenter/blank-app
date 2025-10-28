import { useState } from 'react';
import { useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { useNetworkVariable, MIST_PER_SUI, USDC_TYPE, USDC_DECIMALS } from '../config/sui';
import './Forms.css';

export function WithdrawForm() {
  const packageId = useNetworkVariable('packageId');
  const vaultId = useNetworkVariable('vaultId');

  const [suiAmount, setSuiAmount] = useState('');
  const [usdcAmount, setUsdcAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [txResult, setTxResult] = useState<{ success: boolean; message: string } | null>(null);

  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const handleWithdraw = async () => {
    const sui = parseFloat(suiAmount) || 0;
    const usdc = parseFloat(usdcAmount) || 0;

    if (sui === 0 && usdc === 0) {
      setTxResult({ success: false, message: 'Please enter at least one amount' });
      return;
    }

    setIsProcessing(true);
    setTxResult(null);

    try {
      const tx = new TransactionBlock();

      const suiInMist = Math.floor(sui * MIST_PER_SUI);
      const usdcInSmallest = Math.floor(usdc * Math.pow(10, USDC_DECIMALS));

      // Call vault withdraw function
      tx.moveCall({
        target: `${packageId}::vault::withdraw`,
        typeArguments: [USDC_TYPE],
        arguments: [
          tx.object(vaultId),
          tx.pure(suiInMist, 'u64'),
          tx.pure(usdcInSmallest, 'u64'),
        ],
      });

      signAndExecute(
        {
          transaction: tx,
          options: {
            showEffects: true,
          },
        },
        {
          onSuccess: (result) => {
            setTxResult({
              success: true,
              message: `Successfully withdrew ${sui > 0 ? sui + ' SUI' : ''} ${usdc > 0 ? usdc + ' USDC' : ''}! Tx: ${result.digest.slice(0, 8)}...`,
            });
            setSuiAmount('');
            setUsdcAmount('');
            setIsProcessing(false);
          },
          onError: (error) => {
            console.error('Withdrawal failed:', error);
            let errorMessage = 'Transaction failed';

            if (error.message.includes('Rejected')) {
              errorMessage = 'Transaction rejected by user';
            } else if (error.message.includes('Insufficient')) {
              errorMessage = 'Insufficient vault balance';
            } else if (error.message.includes('ENotOwner')) {
              errorMessage = 'Only vault owner can withdraw';
            }

            setTxResult({ success: false, message: errorMessage });
            setIsProcessing(false);
          },
        }
      );
    } catch (error: any) {
      console.error('Withdrawal error:', error);
      setTxResult({ success: false, message: error.message || 'Unknown error' });
      setIsProcessing(false);
    }
  };

  const handleWithdrawAll = () => {
    // In production, you'd fetch the actual vault balance
    // and set both amounts to the maximum available
    setTxResult({
      success: false,
      message: 'Withdraw all feature - check vault balance first',
    });
  };

  return (
    <div className="form-container">
      <h3>Withdraw Funds</h3>
      <p className="form-description">
        Withdraw SUI and USDC from your vault
      </p>

      <div className="input-group">
        <label>SUI Amount</label>
        <div className="input-wrapper">
          <input
            type="number"
            value={suiAmount}
            onChange={(e) => setSuiAmount(e.target.value)}
            placeholder="0.00"
            step="0.1"
            min="0"
            disabled={isProcessing}
          />
          <span className="input-suffix">SUI</span>
        </div>
      </div>

      <div className="input-group">
        <label>USDC Amount</label>
        <div className="input-wrapper">
          <input
            type="number"
            value={usdcAmount}
            onChange={(e) => setUsdcAmount(e.target.value)}
            placeholder="0.00"
            step="0.01"
            min="0"
            disabled={isProcessing}
          />
          <span className="input-suffix">USDC</span>
        </div>
      </div>

      <div className="button-group">
        <button
          className="submit-btn"
          onClick={handleWithdraw}
          disabled={isProcessing || (!suiAmount && !usdcAmount)}
        >
          {isProcessing ? (
            <>
              <span className="spinner-small"></span>
              Processing...
            </>
          ) : (
            'Withdraw'
          )}
        </button>

        <button
          className="secondary-btn"
          onClick={handleWithdrawAll}
          disabled={isProcessing}
        >
          Withdraw All
        </button>
      </div>

      {txResult && (
        <div className={`result-message ${txResult.success ? 'success' : 'error'}`}>
          {txResult.message}
        </div>
      )}

      <div className="info-box">
        <p>
          <strong>Owner Only:</strong> Only the vault owner can withdraw funds.
          Bot addresses cannot withdraw.
        </p>
      </div>
    </div>
  );
}
