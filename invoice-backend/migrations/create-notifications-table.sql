-- Create notifications table for MSME notification system
-- This table stores notifications sent to MSMEs when lenders perform actions on their invoices

CREATE TABLE IF NOT EXISTS notifications (
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_msme_id ON notifications(msme_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_msme_unread ON notifications(msme_id, is_read) WHERE is_read = FALSE;

-- Add comment
COMMENT ON TABLE notifications IS 'Stores notifications for MSME users when lenders perform actions on their invoices';