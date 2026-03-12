/**
 * Canonical Invoice Builder
 * 
 * Builds deterministic canonical representation of invoice data.
 * Enforces strict ordering to prevent hash drift.
 * 
 * CRITICAL: Field order and formatting must remain consistent
 * to ensure GIID (Global Invoice ID) stability.
 */

function buildCanonicalInvoice(data) {
  const { header, lines, seller_gstin, buyer_gstin } = data;

  // Enforce deterministic structure with strict field ordering
  return {
    seller_gstin: seller_gstin.trim(),
    buyer_gstin: buyer_gstin.trim(),
    invoice_number: header.name,
    invoice_date: header.invoice_date,
    total_amount: Number(header.amount_total).toFixed(2),

    line_items: lines
      .map(line => ({
        description: line.name,
        quantity: Number(line.quantity).toFixed(2),
        unit_price: Number(line.price_unit).toFixed(2),
        subtotal: Number(line.price_subtotal).toFixed(2)
      }))
      .sort((a, b) => a.description.localeCompare(b.description))
  };
}

module.exports = { buildCanonicalInvoice };