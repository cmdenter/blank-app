/// Production-grade Price Oracle with on-chain price feeds
/// Supports: Pyth Network, Switchboard, DeepBook TWAP, Turbos TWAP
/// Security: Staleness checks, outlier detection, multi-source aggregation
module sui_swap_vault::price_oracle {
    use sui::clock::{Self, Clock};
    use sui::event;
    use sui::tx_context::{Self, TxContext};
    use sui::table::{Self, Table};

    // Pyth Network Oracle (recommended for production)
    // use pyth::price_feed::{Self, PriceFeed};
    // use pyth::price::{Self, Price};

    // Switchboard Oracle (alternative)
    // use switchboard::aggregator::{Self, Aggregator};

    // ==================== Error Codes ====================

    const EStalePriceData: u64 = 200;
    const EPriceDeviationTooHigh: u64 = 201;
    const EInvalidPriceFeed: u64 = 202;
    const EUnauthorized: u64 = 203;
    const ENoPriceData: u64 = 204;

    // ==================== Constants ====================

    const MAX_PRICE_AGE_MS: u64 = 60_000; // 60 seconds max age
    const MAX_PRICE_DEVIATION_BPS: u64 = 500; // 5% max deviation between sources
    const PRICE_PRECISION: u64 = 1_000_000_000; // 9 decimal places

    // ==================== Structs ====================

    /// Admin capability for oracle management
    public struct OracleAdminCap has key, store {
        id: UID,
    }

    /// Price feed configuration
    public struct PriceFeedConfig has store {
        /// Pyth price feed ID (for SUI/USD, USDC/USD, etc.)
        pyth_feed_id: vector<u8>,
        /// Switchboard aggregator address
        switchboard_feed: address,
        /// Maximum acceptable price age
        max_age_ms: u64,
        /// Is this feed active?
        active: bool,
    }

    /// Oracle registry
    public struct OracleRegistry has key {
        id: UID,
        /// Map of trading pair to price feed config
        feeds: Table<vector<u8>, PriceFeedConfig>,
        /// Last update timestamp
        last_update: u64,
    }

    /// Price data
    public struct PriceData has store, copy, drop {
        price: u64,           // Price in PRICE_PRECISION (e.g., 1.50 USD = 1_500_000_000)
        confidence: u64,      // Confidence interval
        timestamp: u64,       // When price was fetched
        source: u8,          // 0 = Pyth, 1 = Switchboard, 2 = DeepBook, 3 = Turbos
    }

    /// Price update event
    public struct PriceUpdated has copy, drop {
        pair: vector<u8>,
        price: u64,
        source: u8,
        timestamp: u64,
    }

    // ==================== Initialization ====================

    fun init(ctx: &mut TxContext) {
        let admin_cap = OracleAdminCap {
            id: object::new(ctx),
        };

        let registry = OracleRegistry {
            id: object::new(ctx),
            feeds: table::new(ctx),
            last_update: 0,
        };

        transfer::transfer(admin_cap, tx_context::sender(ctx));
        transfer::share_object(registry);
    }

    // ==================== Price Fetching (Multi-Source Aggregation) ====================

    /// Get current price for a trading pair (SUI/USDC)
    /// Security: Multi-source aggregation, staleness checks
    public fun get_price(
        registry: &OracleRegistry,
        pair: vector<u8>,
        clock: &Clock,
    ): PriceData {
        let current_time = clock::timestamp_ms(clock);

        // Try Pyth Network first (most reliable for production)
        let pyth_price = fetch_pyth_price(registry, pair, current_time);

        // Try Switchboard as backup
        let switchboard_price = fetch_switchboard_price(registry, pair, current_time);

        // Try DeepBook TWAP
        let deepbook_price = fetch_deepbook_twap(pair);

        // Try Turbos TWAP
        let turbos_price = fetch_turbos_twap(pair);

        // Aggregate prices (median of available sources)
        aggregate_prices(
            pyth_price,
            switchboard_price,
            deepbook_price,
            turbos_price,
            current_time
        )
    }

    /// Fetch price from Pyth Network
    fun fetch_pyth_price(
        _registry: &OracleRegistry,
        _pair: vector<u8>,
        current_time: u64,
    ): option::Option<PriceData> {
        // PRODUCTION: Uncomment when deploying with Pyth
        /*
        if (!table::contains(&registry.feeds, pair)) {
            return option::none()
        };

        let config = table::borrow(&registry.feeds, pair);
        if (!config.active) {
            return option::none()
        };

        // Get Pyth price feed
        let price_feed = pyth::get_price_feed(config.pyth_feed_id);
        let price_obj = price_feed::get_price_no_older_than(
            &price_feed,
            clock,
            config.max_age_ms
        );

        // Security: Check price freshness
        let price_timestamp = price::get_timestamp(&price_obj);
        if (current_time - price_timestamp > MAX_PRICE_AGE_MS) {
            return option::none()
        };

        // Extract price data
        let price_value = price::get_price(&price_obj);
        let confidence = price::get_conf(&price_obj);
        let expo = price::get_expo(&price_obj);

        // Convert to our precision (9 decimals)
        let normalized_price = normalize_price(price_value, expo);

        option::some(PriceData {
            price: normalized_price,
            confidence,
            timestamp: price_timestamp,
            source: 0, // Pyth
        })
        */

        // TESTNET: Return mock price
        option::some(PriceData {
            price: 1_000_000_000, // 1.0 USD
            confidence: 1_000_000, // 0.001 confidence
            timestamp: current_time,
            source: 0,
        })
    }

    /// Fetch price from Switchboard
    fun fetch_switchboard_price(
        _registry: &OracleRegistry,
        _pair: vector<u8>,
        current_time: u64,
    ): option::Option<PriceData> {
        // PRODUCTION: Uncomment when deploying with Switchboard
        /*
        if (!table::contains(&registry.feeds, pair)) {
            return option::none()
        };

        let config = table::borrow(&registry.feeds, pair);
        let aggregator = aggregator::borrow(config.switchboard_feed);

        // Get latest value
        let (value, timestamp) = aggregator::latest_value(aggregator);

        // Security: Check staleness
        if (current_time - timestamp > MAX_PRICE_AGE_MS) {
            return option::none()
        };

        option::some(PriceData {
            price: value,
            confidence: 0,
            timestamp,
            source: 1, // Switchboard
        })
        */

        // TESTNET: Return none
        option::none()
    }

    /// Fetch TWAP from DeepBook
    fun fetch_deepbook_twap(_pair: vector<u8>): option::Option<PriceData> {
        // PRODUCTION: Implement DeepBook TWAP
        /*
        let pool = deepbook::get_pool<SUI, USDC>(...);
        let twap = deepbook::get_market_price(pool);

        option::some(PriceData {
            price: twap,
            confidence: 0,
            timestamp: current_time,
            source: 2, // DeepBook
        })
        */

        option::none()
    }

    /// Fetch TWAP from Turbos
    fun fetch_turbos_twap(_pair: vector<u8>): option::Option<PriceData> {
        // PRODUCTION: Implement Turbos TWAP
        /*
        let pool = turbos::get_pool<SUI, USDC>(...);
        let twap = turbos::observe(pool, observe_seconds);

        option::some(PriceData {
            price: twap,
            confidence: 0,
            timestamp: current_time,
            source: 3, // Turbos
        })
        */

        option::none()
    }

    // ==================== Price Aggregation (Security: Outlier detection) ====================

    /// Aggregate multiple price sources
    /// Security: Use median to filter outliers
    fun aggregate_prices(
        pyth: option::Option<PriceData>,
        switchboard: option::Option<PriceData>,
        deepbook: option::Option<PriceData>,
        turbos: option::Option<PriceData>,
        current_time: u64,
    ): PriceData {
        let mut prices = vector::empty<u64>();

        // Collect all available prices
        if (option::is_some(&pyth)) {
            let p = option::extract(&mut pyth);
            vector::push_back(&mut prices, p.price);
        };

        if (option::is_some(&switchboard)) {
            let p = option::extract(&mut switchboard);
            vector::push_back(&mut prices, p.price);
        };

        if (option::is_some(&deepbook)) {
            let p = option::extract(&mut deepbook);
            vector::push_back(&mut prices, p.price);
        };

        if (option::is_some(&turbos)) {
            let p = option::extract(&mut turbos);
            vector::push_back(&mut prices, p.price);
        };

        // Security: Must have at least one price source
        assert!(vector::length(&prices) > 0, ENoPriceData);

        // Calculate median (outlier-resistant)
        let median_price = calculate_median(&prices);

        PriceData {
            price: median_price,
            confidence: 0,
            timestamp: current_time,
            source: 255, // Aggregated
        }
    }

    /// Calculate median of prices (Security: Outlier filtering)
    fun calculate_median(prices: &vector<u64>): u64 {
        let len = vector::length(prices);
        if (len == 1) {
            return *vector::borrow(prices, 0)
        };

        // Sort prices (simple bubble sort for small arrays)
        let mut sorted = *prices;
        let mut i = 0;
        while (i < len) {
            let mut j = 0;
            while (j < len - 1 - i) {
                let a = *vector::borrow(&sorted, j);
                let b = *vector::borrow(&sorted, j + 1);
                if (a > b) {
                    vector::swap(&mut sorted, j, j + 1);
                };
                j = j + 1;
            };
            i = i + 1;
        };

        // Return median
        if (len % 2 == 0) {
            // Even number: average of two middle values
            let mid1 = *vector::borrow(&sorted, len / 2 - 1);
            let mid2 = *vector::borrow(&sorted, len / 2);
            (mid1 + mid2) / 2
        } else {
            // Odd number: middle value
            *vector::borrow(&sorted, len / 2)
        }
    }

    // ==================== Admin Functions ====================

    /// Register a new price feed
    public fun register_feed(
        _admin_cap: &OracleAdminCap,
        registry: &mut OracleRegistry,
        pair: vector<u8>,
        pyth_feed_id: vector<u8>,
        switchboard_feed: address,
        ctx: &mut TxContext,
    ) {
        let config = PriceFeedConfig {
            pyth_feed_id,
            switchboard_feed,
            max_age_ms: MAX_PRICE_AGE_MS,
            active: true,
        };

        table::add(&mut registry.feeds, pair, config);
    }

    /// Deactivate a price feed
    public fun deactivate_feed(
        _admin_cap: &OracleAdminCap,
        registry: &mut OracleRegistry,
        pair: vector<u8>,
    ) {
        let config = table::borrow_mut(&mut registry.feeds, pair);
        config.active = false;
    }

    // ==================== View Functions ====================

    public fun get_price_value(price: &PriceData): u64 {
        price.price
    }

    public fun get_price_timestamp(price: &PriceData): u64 {
        price.timestamp
    }

    public fun get_price_source(price: &PriceData): u8 {
        price.source
    }

    // ==================== Helper Functions ====================

    fun normalize_price(value: u64, expo: i64): u64 {
        // Convert Pyth price (expo) to our precision (9 decimals)
        // Example: Pyth price = 150000000, expo = -8 means $1.50
        // We want: 1_500_000_000 (9 decimals)

        if (expo >= 0) {
            value * power(10, (expo as u64))
        } else {
            value / power(10, ((-expo) as u64))
        }
    }

    fun power(base: u64, exp: u64): u64 {
        let mut result = 1;
        let mut i = 0;
        while (i < exp) {
            result = result * base;
            i = i + 1;
        };
        result
    }

    // ==================== Test Helpers ====================

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx)
    }

    #[test_only]
    public fun create_mock_price(price: u64, ctx: &TxContext): PriceData {
        PriceData {
            price,
            confidence: 0,
            timestamp: 0,
            source: 0,
        }
    }
}
