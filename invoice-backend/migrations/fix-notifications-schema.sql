-- Fix notifications table schema to use UUID for msme_id
-- This migration fixes the data type mismatch between msme_users.id (UUID) and notifications.msme_id (INTEGER)

-- Drop the existing notifications table if it exists (since it has wrong schema)
DROP TABLE IF EXISTS notifications;

-- Recreate notifications table with correct UUID type for msme_id
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    msme_id UUID NOT NULL,
    invoice_giid TEXT NOT NULL,
    invoice_number TEXT NOT NULL,
    lender_id UUID NOT NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('APPROVED', 'REJECTED', 'FINANCED', 'DECLINED')),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Add foreign key constraints for data integrity
    FOREIGN KEY (msme_id) REFERENCES msme_users(id) ON DELETE CASCADE,
    FOREIGN KEY (lender_id) REFERENCES lender_users(id) ON DELETE CASCADE
);

-- Add indexes for better performance
CREATE INDEX idx_notifications_msme_id ON notifications(msme_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_msme_unread ON notifications(msme_id, is_read) WHERE is_read = FALSE;

-- Add a comment to the table
COMMENT ON TABLE notifications IS 'Stores notifications for MSME users about lender actions on their invoices';