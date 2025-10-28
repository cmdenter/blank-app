import { useState } from 'react';
import { useSignAndExecuteTransactionBlock } from '@mysten/dapp-kit';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { useNetworkVariable, MIST_PER_SUI, USDC_TYPE, USDC_DECIMALS } from '../config/sui';
import './Forms.css';

type TradeDirection = 'sui_to_usdc' | 'usdc_to_sui';

export function TradeForm() {
  const packageId = useNetworkVariable('packageId');
  const vaultId = useNetworkVariable('vaultId');

  const [direction, setDirection] = useState<TradeDirection>('sui_to_usdc');
  const [inputAmount, setInputAmount] = useState('');
  const [minOutput, setMinOutput] = useState('');
  const [slippage, setSlippage] = useState('5'); // 5% default
  const [isProcessing, setIsProcessing] = useState(false);
  const [txResult, setTxResult] = useState<{ success: boolean; message: string } | null>(null);

  const { mutate: signAndExecute } = useSignAndExecuteTransactionBlock();

  // Calculate minimum output based on slippage
  const calculateMinOutput = (input: string, slippagePercent: string) => {
    const amount = parseFloat(input);
    const slippageBps = parseFloat(slippagePercent);

    if (isNaN(amount) || isNaN(slippageBps)) return '';

    // Assume 1:1 exchange rate for demo (in production, fetch from oracle/pool)
    const expectedOutput = amount;
    const minOut = expectedOutput * (1 - slippageBps / 100);

    return minOut.toFixed(direction === 'sui_to_usdc' ? 2 : 4);
  };

  const handleInputChange = (value: string) => {
    setInputAmount(value);
    if (value && slippage) {
      setMinOutput(calculateMinOutput(value, slippage));
    }
  };

  const handleSlippageChange = (value: string) => {
    setSlippage(value);
    if (inputAmount && value) {
      setMinOutput(calculateMinOutput(inputAmount, value));
    }
  };

  const handleTrade = async () => {
    if (!inputAmount || parseFloat(inputAmount) <= 0) {
      setTxResult({ success: false, message: 'Please enter a valid amount' });
      return;
    }

    if (!minOutput || parseFloat(minOutput) <= 0) {
      setTxResult({ success: false, message: 'Please set minimum output' });
      return;
    }

    setIsProcessing(true);
    setTxResult(null);

    try {
      const tx = new TransactionBlock();

      if (direction === 'sui_to_usdc') {
        const suiInMist = Math.floor(parseFloat(inputAmount) * MIST_PER_SUI);
        const minUsdcOut = Math.floor(parseFloat(minOutput) * Math.pow(10, USDC_DECIMALS));

        tx.moveCall({
          target: `${packageId}::vault::trade_sui_to_usdc`,
          typeArguments: [USDC_TYPE],
          arguments: [
            tx.object(vaultId),
            tx.pure(suiInMist, 'u64'),
            tx.pure(minUsdcOut, 'u64'),
          ],
        });
      } else {
        const usdcIn = Math.floor(parseFloat(inputAmount) * Math.pow(10, USDC_DECIMALS));
        const minSuiOut = Math.floor(parseFloat(minOutput) * MIST_PER_SUI);

        tx.moveCall({
          target: `${packageId}::vault::trade_usdc_to_sui`,
          typeArguments: [USDC_TYPE],
          arguments: [
            tx.object(vaultId),
            tx.pure(usdcIn, 'u64'),
            tx.pure(minSuiOut, 'u64'),
          ],
        });
      }

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
            const tradeEvent = result.events?.find((e) => e.type.includes('TradeEvent'));

            let message = `Trade executed successfully! Tx: ${result.digest.slice(0, 8)}...`;
            if (tradeEvent) {
              const eventData = tradeEvent.parsedJson as any;
              message += `\nRoute: ${eventData.route_used || 'N/A'}`;
            }

            setTxResult({ success: true, message });
            setInputAmount('');
            setMinOutput('');
            setIsProcessing(false);
          },
          onError: (error) => {
            console.error('Trade failed:', error);
            let errorMessage = 'Transaction failed';

            if (error.message.includes('Rejected')) {
              errorMessage = 'Transaction rejected by user';
            } else if (error.message.includes('ENotBot')) {
              errorMessage = 'Only authorized bot can execute trades';
            } else if (error.message.includes('ESlippageExceeded')) {
              errorMessage = 'Slippage exceeded - try increasing slippage tolerance';
            } else if (error.message.includes('EInsufficientBalance')) {
              errorMessage = 'Insufficient vault balance';
            }

            setTxResult({ success: false, message: errorMessage });
            setIsProcessing(false);
          },
        }
      );
    } catch (error: any) {
      console.error('Trade error:', error);
      setTxResult({ success: false, message: error.message || 'Unknown error' });
      setIsProcessing(false);
    }
  };

  const swapDirection = () => {
    setDirection(direction === 'sui_to_usdc' ? 'usdc_to_sui' : 'sui_to_usdc');
    setInputAmount('');
    setMinOutput('');
  };

  const inputToken = direction === 'sui_to_usdc' ? 'SUI' : 'USDC';
  const outputToken = direction === 'sui_to_usdc' ? 'USDC' : 'SUI';

  return (
    <div className="form-container">
      <h3>Execute Trade</h3>
      <p className="form-description">
        Bot-authorized trading with slippage protection
      </p>

      <div className="trade-direction">
        <div className="token-input">
          <label>From</label>
          <div className="input-wrapper">
            <input
              type="number"
              value={inputAmount}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="0.00"
              step={inputToken === 'SUI' ? '0.1' : '0.01'}
              min="0"
              disabled={isProcessing}
            />
            <span className="input-suffix">{inputToken}</span>
          </div>
        </div>

        <button className="swap-btn" onClick={swapDirection} disabled={isProcessing}>
          ⇅
        </button>

        <div className="token-input">
          <label>To (minimum)</label>
          <div className="input-wrapper">
            <input
              type="number"
              value={minOutput}
              onChange={(e) => setMinOutput(e.target.value)}
              placeholder="0.00"
              step={outputToken === 'SUI' ? '0.1' : '0.01'}
              min="0"
              disabled={isProcessing}
            />
            <span className="input-suffix">{outputToken}</span>
          </div>
        </div>
      </div>

      <div className="input-group">
        <label>Slippage Tolerance</label>
        <div className="slippage-options">
          <button
            className={slippage === '1' ? 'active' : ''}
            onClick={() => handleSlippageChange('1')}
          >
            1%
          </button>
          <button
            className={slippage === '5' ? 'active' : ''}
            onClick={() => handleSlippageChange('5')}
          >
            5%
          </button>
          <button
            className={slippage === '10' ? 'active' : ''}
            onClick={() => handleSlippageChange('10')}
          >
            10%
          </button>
          <input
            type="number"
            value={slippage}
            onChange={(e) => handleSlippageChange(e.target.value)}
            placeholder="Custom"
            step="0.1"
            min="0"
            max="50"
            className="custom-slippage"
          />
        </div>
      </div>

      <div className="trade-info">
        <div className="info-row">
          <span>Route</span>
          <span>DeepBook → Turbos</span>
        </div>
        <div className="info-row">
          <span>Estimated Fee</span>
          <span>~0.02-0.05%</span>
        </div>
      </div>

      <button
        className="submit-btn"
        onClick={handleTrade}
        disabled={isProcessing || !inputAmount || !minOutput}
      >
        {isProcessing ? (
          <>
            <span className="spinner-small"></span>
            Trading...
          </>
        ) : (
          'Execute Trade'
        )}
      </button>

      {txResult && (
        <div className={`result-message ${txResult.success ? 'success' : 'error'}`}>
          {txResult.message.split('\n').map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}

      <div className="info-box warning">
        <p>
          <strong>Bot Only:</strong> Only the authorized bot address can execute trades.
          Owner cannot trade directly.
        </p>
      </div>
    </div>
  );
}
