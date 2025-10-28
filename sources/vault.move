/// Trading Vault with bot-controlled swap execution
/// Owner can deposit/withdraw, Bot can execute trades via atomic PTB
module sui_swap_vault::vault {
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::sui::SUI;
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use sui::object::{Self, ID, UID};

    use sui_swap_vault::types::{
        Self,
        Vault,
        DepositEvent,
        WithdrawEvent,
        TradeEvent,
        VaultCreatedEvent,
        BotUpdatedEvent
    };
    use sui_swap_vault::swap_router;

    // ==================== Error Codes ====================

    const ENotOwner: u64 = 1;
    const ENotBot: u64 = 2;
    const EInsufficientBalance: u64 = 3;
    const EInvalidAmount: u64 = 4;

    // ==================== Initialization ====================

    /// Create a new trading vault
    /// @param bot: Address authorized to execute trades
    /// @returns: Vault object (shared or owned depending on use case)
    public entry fun create_vault(
        bot: address,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let vault = types::new_vault(sender, bot, ctx);
        let vault_id = types::vault_id(&vault);

        // Emit creation event
        event::emit(VaultCreatedEvent {
            vault_id,
            owner: sender,
            bot,
            timestamp: tx_context::epoch_timestamp_ms(ctx),
        });

        // Share the vault so bot can access it
        transfer::share_object(vault);
    }

    // ==================== Owner Functions ====================

    /// Deposit SUI into the vault
    /// Only owner can deposit
    public entry fun deposit(
        vault: &mut Vault,
        payment: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        types::assert_owner(vault, sender);

        let amount = coin::value(&payment);
        assert!(amount > 0, EInvalidAmount);

        let vault_id = types::vault_id(vault);

        // Add to vault balance
        types::add_sui(vault, payment);

        // Emit deposit event
        event::emit(DepositEvent {
            vault_id,
            owner: sender,
            amount,
            timestamp: tx_context::epoch_timestamp_ms(ctx),
        });
    }

    /// Withdraw SUI and USDC from the vault
    /// Only owner can withdraw
    public entry fun withdraw<USDC>(
        vault: &mut Vault,
        amount_sui: u64,
        amount_usdc: u64,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        types::assert_owner(vault, sender);

        let vault_id = types::vault_id(vault);

        // Withdraw SUI if requested
        if (amount_sui > 0) {
            let sui_coin = types::take_sui(vault, amount_sui, ctx);
            transfer::public_transfer(sui_coin, sender);
        };

        // Withdraw USDC if requested
        if (amount_usdc > 0) {
            let usdc_balance = types::take_usdc(vault, amount_usdc);
            let usdc_coin = coin::from_balance(usdc_balance, ctx);
            transfer::public_transfer(usdc_coin, sender);
        };

        // Emit withdrawal event
        event::emit(WithdrawEvent {
            vault_id,
            owner: sender,
            amount_sui,
            amount_usdc,
            timestamp: tx_context::epoch_timestamp_ms(ctx),
        });
    }

    /// Emergency withdraw all funds
    /// Only owner can withdraw
    public entry fun withdraw_all<USDC>(
        vault: &mut Vault,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        types::assert_owner(vault, sender);

        let amount_sui = types::sui_balance(vault);
        let amount_usdc = types::usdc_balance(vault);

        withdraw<USDC>(vault, amount_sui, amount_usdc, ctx);
    }

    /// Update bot address
    /// Only owner can update bot
    public entry fun update_bot(
        vault: &mut Vault,
        new_bot: address,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        types::assert_owner(vault, sender);

        let vault_id = types::vault_id(vault);
        let old_bot = types::bot(vault);

        types::update_bot(vault, new_bot);

        event::emit(BotUpdatedEvent {
            vault_id,
            old_bot,
            new_bot,
            timestamp: tx_context::epoch_timestamp_ms(ctx),
        });
    }

    // ==================== Bot Functions ====================

    /// Execute a trade: SUI → USDC via best route
    /// Only bot can call this function
    /// All operations happen in one atomic PTB:
    /// 1. Take SUI from vault
    /// 2. Swap SUI → USDC via swap_router
    /// 3. Deposit USDC back to vault
    /// 4. Emit trade event
    public entry fun trade_sui_to_usdc<USDC>(
        vault: &mut Vault,
        amount_sui: u64,
        min_usdc_out: u64,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        types::assert_bot(vault, sender);

        assert!(amount_sui > 0, EInvalidAmount);
        assert!(types::sui_balance(vault) >= amount_sui, EInsufficientBalance);

        let vault_id = types::vault_id(vault);

        // Step 1: Withdraw SUI from vault
        let sui_coin = types::take_sui(vault, amount_sui, ctx);

        // Step 2: Swap SUI → USDC using swap router
        let usdc_balance = swap_router::swap_sui_to_usdc<USDC>(
            sui_coin,
            min_usdc_out,
            vault_id,
            ctx
        );

        let usdc_out = balance::value(&usdc_balance);

        // Step 3: Deposit USDC back to vault
        types::add_usdc(vault, usdc_balance);

        // Update vault stats
        types::increment_trades(vault);

        // Step 4: Emit trade event
        event::emit(TradeEvent {
            vault_id,
            bot: sender,
            sui_in: amount_sui,
            usdc_out,
            route_used: b"SUI->USDC",
            timestamp: tx_context::epoch_timestamp_ms(ctx),
        });
    }

    /// Execute a trade: USDC → SUI via best route
    /// Only bot can call this function
    public entry fun trade_usdc_to_sui<USDC>(
        vault: &mut Vault,
        amount_usdc: u64,
        min_sui_out: u64,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        types::assert_bot(vault, sender);

        assert!(amount_usdc > 0, EInvalidAmount);
        assert!(types::usdc_balance(vault) >= amount_usdc, EInsufficientBalance);

        let vault_id = types::vault_id(vault);

        // Step 1: Withdraw USDC from vault
        let usdc_balance = types::take_usdc(vault, amount_usdc);

        // Step 2: Swap USDC → SUI using swap router
        let sui_coin = swap_router::swap_usdc_to_sui<USDC>(
            usdc_balance,
            min_sui_out,
            vault_id,
            ctx
        );

        let sui_out = coin::value(&sui_coin);

        // Step 3: Deposit SUI back to vault
        types::add_sui(vault, sui_coin);

        // Update vault stats
        types::increment_trades(vault);

        // Step 4: Emit trade event
        event::emit(TradeEvent {
            vault_id,
            bot: sender,
            sui_in: sui_out,
            usdc_out: amount_usdc,
            route_used: b"USDC->SUI",
            timestamp: tx_context::epoch_timestamp_ms(ctx),
        });
    }

    /// Advanced trade function for multi-hop swaps
    /// Example: SUI → USDC → TOKEN_X → back to vault
    /// Only bot can call this function
    public entry fun trade_multi_hop<USDC, TOKEN_X>(
        vault: &mut Vault,
        amount_sui: u64,
        min_usdc_out: u64,
        min_token_x_out: u64,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        types::assert_bot(vault, sender);

        assert!(amount_sui > 0, EInvalidAmount);

        let vault_id = types::vault_id(vault);

        // Step 1: SUI → USDC
        let sui_coin = types::take_sui(vault, amount_sui, ctx);
        let usdc_balance = swap_router::swap_sui_to_usdc<USDC>(
            sui_coin,
            min_usdc_out,
            vault_id,
            ctx
        );

        // Step 2: USDC → TOKEN_X (placeholder for custom token swaps)
        // In production, implement token swap logic here
        // let token_x_balance = swap_router::swap_usdc_to_token<USDC, TOKEN_X>(...);

        // For now, just store USDC back
        types::add_usdc(vault, usdc_balance);

        types::increment_trades(vault);

        event::emit(TradeEvent {
            vault_id,
            bot: sender,
            sui_in: amount_sui,
            usdc_out: balance::value(&usdc_balance),
            route_used: b"Multi-hop",
            timestamp: tx_context::epoch_timestamp_ms(ctx),
        });
    }

    // ==================== View Functions ====================

    /// Get vault balance information
    public fun get_balances(vault: &Vault): (u64, u64) {
        (types::sui_balance(vault), types::usdc_balance(vault))
    }

    /// Get vault statistics
    public fun get_stats(vault: &Vault): (u64, u64, u64) {
        (
            types::total_trades(vault),
            types::total_volume_sui(vault),
            types::total_volume_usdc(vault)
        )
    }

    /// Get vault owner and bot
    public fun get_addresses(vault: &Vault): (address, address) {
        (types::owner(vault), types::bot(vault))
    }

    // ==================== Testing Functions ====================

    #[test_only]
    /// Create a vault for testing
    public fun test_create_vault(
        owner: address,
        bot: address,
        ctx: &mut TxContext
    ): Vault {
        types::new_vault(owner, bot, ctx)
    }

    #[test_only]
    /// Deposit SUI for testing
    public fun test_deposit(
        vault: &mut Vault,
        payment: Coin<SUI>
    ) {
        types::add_sui(vault, payment);
    }
}
