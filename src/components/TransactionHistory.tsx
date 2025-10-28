import { useSuiClientQuery } from '@mysten/dapp-kit';
import { useNetworkVariable } from '../config/sui';
import './TransactionHistory.css';

export function TransactionHistory() {
  const packageId = useNetworkVariable('packageId');

  // Query recent events for this vault
  const { data: events, isLoading } = useSuiClientQuery(
    'queryEvents',
    {
      query: {
        MoveModule: {
          package: packageId,
          module: 'vault',
        },
      },
      limit: 20,
      order: 'descending',
    },
    {
      refetchInterval: 10000, // Refresh every 10 seconds
    }
  );

  if (isLoading) {
    return (
      <div className="history-card">
        <h3>Transaction History</h3>
        <div className="loading">Loading...</div>
      </div>
    );
  }

  const eventsList = events?.data || [];

  const formatEvent = (event: any) => {
    const type = event.type.split('::').pop();
    const data = event.parsedJson;
    const timestamp = new Date(Number(event.timestampMs)).toLocaleString();

    return {
      type,
      data,
      timestamp,
      txDigest: event.id.txDigest,
    };
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'DepositEvent':
        return '⬇️';
      case 'WithdrawEvent':
        return '⬆️';
      case 'TradeEvent':
        return '🔄';
      case 'SwapEvent':
        return '💱';
      case 'VaultCreatedEvent':
        return '✨';
      case 'BotUpdatedEvent':
        return '🤖';
      default:
        return '📝';
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'DepositEvent':
        return 'green';
      case 'WithdrawEvent':
        return 'orange';
      case 'TradeEvent':
        return 'blue';
      case 'SwapEvent':
        return 'purple';
      default:
        return 'gray';
    }
  };

  const formatEventData = (type: string, data: any) => {
    switch (type) {
      case 'DepositEvent':
        return `${(data.amount / 1e9).toFixed(4)} SUI`;
      case 'WithdrawEvent':
        return `${(data.amount_sui / 1e9).toFixed(4)} SUI, ${(data.amount_usdc / 1e6).toFixed(2)} USDC`;
      case 'TradeEvent':
        return `${(data.sui_in / 1e9).toFixed(4)} SUI → ${(data.usdc_out / 1e6).toFixed(2)} USDC`;
      case 'SwapEvent':
        return `${data.input_amount} → ${data.output_amount}`;
      default:
        return 'Event data';
    }
  };

  return (
    <div className="history-card">
      <h3>Transaction History</h3>

      {eventsList.length === 0 ? (
        <div className="empty-state">
          <p>No transactions yet</p>
          <span>🏦</span>
        </div>
      ) : (
        <div className="events-list">
          {eventsList.map((event, index) => {
            const formatted = formatEvent(event);
            return (
              <div key={index} className="event-item">
                <div className="event-header">
                  <span className="event-icon">{getEventIcon(formatted.type)}</span>
                  <div className="event-info">
                    <span className={`event-type ${getEventColor(formatted.type)}`}>
                      {formatted.type.replace('Event', '')}
                    </span>
                    <span className="event-time">{formatted.timestamp}</span>
                  </div>
                </div>
                <div className="event-data">
                  {formatEventData(formatted.type, formatted.data)}
                </div>
                <a
                  href={`https://suiexplorer.com/txblock/${formatted.txDigest}?network=testnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="event-link"
                >
                  View on Explorer →
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
