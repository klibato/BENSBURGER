-- Migration: Update audit_logs action CHECK constraint
-- Date: 2025-11-16
-- Description: Expand allowed actions to include all application actions

-- Drop the old constraint
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check;

-- Add the new constraint with all actions used in the application
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_action_check
CHECK (action IN (
    -- Standard CRUD operations
    'CREATE',
    'UPDATE',
    'DELETE',
    -- Authentication actions
    'LOGIN',
    'LOGOUT',
    'SWITCH_CASHIER',
    -- Cash register actions
    'OPEN_REGISTER',
    'CLOSE_REGISTER',
    -- Sales actions
    'SALE',
    'CANCEL_SALE',
    'REFUND_SALE',
    -- Product/Inventory actions
    'STOCK_INCREMENT',
    'STOCK_DECREMENT',
    -- Settings actions
    'UPDATE_SETTINGS',
    -- Generic action for backward compatibility
    'ACTION'
));

-- Migration complete
DO $$
BEGIN
    RAISE NOTICE 'Migration 011: audit_logs actions constraint updated successfully';
END $$;
