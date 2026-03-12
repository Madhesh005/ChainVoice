const db = require('./invoice-backend/db');

async function updateInvoiceWithGIID() {
    try {
        // Update invoice 53 to have a fake GIID (simulating a blockchain reset scenario)
        const fakeGIID = 'fake-giid-12345-after-blockchain-reset';
        
        const result = await db.query(
            'UPDATE invoices SET giid = $1, ipfs_cid = $2, document_hash = $3 WHERE id = $4 RETURNING *',
            [
                fakeGIID,
                'QmFakeIPFSHash123456789',
                'fake-document-hash-sha256-12345678901234567890123456789012',
                53
            ]
        );
        
        if (result.rows.length > 0) {
            console.log('✅ Updated invoice 53 with fake GIID:', fakeGIID);
            console.log('Invoice details:', {
                id: result.rows[0].id,
                invoice_number: result.rows[0].invoice_number,
                giid: result.rows[0].giid,
                ipfs_cid: result.rows[0].ipfs_cid,
                document_hash: result.rows[0].document_hash
            });
        } else {
            console.log('❌ No invoice found with ID 53');
        }
    } catch (error) {
        console.error('❌ Error updating invoice:', error);
    } finally {
        process.exit(0);
    }
}

updateInvoiceWithGIID();