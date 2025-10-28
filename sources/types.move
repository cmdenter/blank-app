/// Core types and data structures for the Sui Swap Vault
module sui_swap_vault::types {
    use sui::balance::{Self, Balance};
    use sui::sui::SUI;
    use sui::coin::Coin;

    // ==================== Error Codes ====================

    const ENotOwner: u64 = 1;
    const ENotBot: u64 = 2;
    const EInsufficientBalance: u64 = 3;
    const ESlippageExceeded: u64 = 4;
    const EInvalidAmount: u64 = 5;
    const ESwapFailed: u64 = 6;
    const EInvalidRoute: u64 = 7;

    // ==================== Data Structures ====================

    /// Main trading vault that holds SUI and USDC balances
    /// Owner can deposit/withdraw, Bot can execute trades
    public struct Vault has key, store {
        id: UID,
        /// Owner of the vault (can deposit/withdraw)
        owner: address,
        /// Bot address authorized to execute trades
        bot: address,
        /// SUI balance held in the vault
        sui_balance: Balance<SUI>,
        /// USDC balance held in the vault
        usdc_balance: Balance<u8>, // Generic placeholder for USDC type
        /// Total number of trades executed
        total_trades: u64,
        /// Total volume in SUI
        total_volume_sui: u64,
        /// Total volume in USDC
        total_volume_usdc: u64,
    }

    /// Admin capability for vault management
    public struct VaultCap has key, store {
        id: UID,
        vault_id: ID,
    }

    /// Swap route identifier
    public struct SwapRoute has copy, drop, store {
        /// Route type: 0 = DeepBook, 1 = Turbos
        route_type: u8,
        /// Pool/Market identifier
        pool_id: address,
    }

    /// Configuration for swap parameters
    public struct SwapConfig has copy, drop, store {
        /// Minimum output amount (slippage protection)
        min_output: u64,
        /// Maximum slippage in basis points (e.g., 100 = 1%)
        max_slippage_bps: u64,
        /// Preferred route (0 = DeepBook first, 1 = Turbos first)
        preferred_route: u8,
    }

    // ==================== Events ====================

    /// Emitted when SUI is deposited into the vault
    public struct DepositEvent has copy, drop {
        vault_id: ID,
        owner: address,
        amount: u64,
        timestamp: u64,
    }

    /// Emitted when funds are withdrawn from the vault
    public struct WithdrawEvent has copy, drop {
        vault_id: ID,
        owner: address,
        amount_sui: u64,
        amount_usdc: u64,
        timestamp: u64,
    }

    /// Emitted when a swap is executed
    public struct SwapEvent has copy, drop {
        vault_id: ID,
        route: vector<u8>, // "DeepBook" or "Turbos"
        input_amount: u64,
        output_amount: u64,
        input_type: vector<u8>, // "SUI" or "USDC"
        output_type: vector<u8>, // "SUI" or "USDC"
        timestamp: u64,
    }

    /// Emitted when a trade is executed by the bot
    public struct TradeEvent has copy, drop {
        vault_id: ID,
        bot: address,
        sui_in: u64,
        usdc_out: u64,
        route_used: vector<u8>,
        timestamp: u64,
    }

    /// Emitted when a new vault is created
    public struct VaultCreatedEvent has copy, drop {
        vault_id: ID,
        owner: address,
        bot: address,
        timestamp: u64,
    }

    /// Emitted when bot address is updated
    public struct BotUpdatedEvent has copy, drop {
        vault_id: ID,
        old_bot: address,
        new_bot: address,
        timestamp: u64,
    }

    // ==================== Getters ====================

    public fun vault_id(vault: &Vault): ID {
        object::uid_to_inner(&vault.id)
    }

    public fun owner(vault: &Vault): address {
        vault.owner
    }

    public fun bot(vault: &Vault): address {
        vault.bot
    }

    public fun sui_balance(vault: &Vault): u64 {
        balance::value(&vault.sui_balance)
    }

    public fun usdc_balance(vault: &Vault): u64 {
        balance::value(&vault.usdc_balance)
    }

    public fun total_trades(vault: &Vault): u64 {
        vault.total_trades
    }

    public fun total_volume_sui(vault: &Vault): u64 {
        vault.total_volume_sui
    }

    public fun total_volume_usdc(vault: &Vault): u64 {
        vault.total_volume_usdc
    }

    // ==================== Error Code Getters ====================

    public fun e_not_owner(): u64 { ENotOwner }
    public fun e_not_bot(): u64 { ENotBot }
    public fun e_insufficient_balance(): u64 { EInsufficientBalance }
    public fun e_slippage_exceeded(): u64 { ESlippageExceeded }
    public fun e_invalid_amount(): u64 { EInvalidAmount }
    public fun e_swap_failed(): u64 { ESwapFailed }
    public fun e_invalid_route(): u64 { EInvalidRoute }

    // ==================== Internal Helpers ====================

    /// Create a new vault (called from vault module)
    public(package) fun new_vault(
        owner: address,
        bot: address,
        ctx: &mut TxContext
    ): Vault {
        Vault {
            id: object::new(ctx),
            owner,
            bot,
            sui_balance: balance::zero<SUI>(),
            usdc_balance: balance::zero<u8>(),
            total_trades: 0,
            total_volume_sui: 0,
            total_volume_usdc: 0,
        }
    }

    /// Add SUI to vault balance
    public(package) fun add_sui(vault: &mut Vault, coin: Coin<SUI>) {
        let amount = coin::value(&coin);
        balance::join(&mut vault.sui_balance, coin::into_balance(coin));
        vault.total_volume_sui = vault.total_volume_sui + amount;
    }

    /// Take SUI from vault balance
    public(package) fun take_sui(vault: &mut Vault, amount: u64, ctx: &mut TxContext): Coin<SUI> {
        assert!(balance::value(&vault.sui_balance) >= amount, EInsufficientBalance);
        coin::take(&mut vault.sui_balance, amount, ctx)
    }

    /// Add USDC to vault balance
    public(package) fun add_usdc(vault: &mut Vault, balance: Balance<u8>) {
        let amount = balance::value(&balance);
        balance::join(&mut vault.usdc_balance, balance);
        vault.total_volume_usdc = vault.total_volume_usdc + amount;
    }

    /// Take USDC from vault balance
    public(package) fun take_usdc(vault: &mut Vault, amount: u64): Balance<u8> {
        assert!(balance::value(&vault.usdc_balance) >= amount, EInsufficientBalance);
        balance::split(&mut vault.usdc_balance, amount)
    }

    /// Increment trade counter
    public(package) fun increment_trades(vault: &mut Vault) {
        vault.total_trades = vault.total_trades + 1;
    }

    /// Update bot address
    public(package) fun update_bot(vault: &mut Vault, new_bot: address) {
        vault.bot = new_bot;
    }

    /// Verify caller is owner
    public(package) fun assert_owner(vault: &Vault, caller: address) {
        assert!(vault.owner == caller, ENotOwner);
    }

    /// Verify caller is bot
    public(package) fun assert_bot(vault: &Vault, caller: address) {
        assert!(vault.bot == caller, ENotBot);
    }
}
