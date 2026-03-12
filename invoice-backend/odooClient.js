require("dotenv").config();
const xmlrpc = require("xmlrpc");

const url = process.env.ODOO_URL;
const db = process.env.ODOO_DB;
const username = process.env.ODOO_USERNAME;
const password = process.env.ODOO_PASSWORD;

const common = xmlrpc.createClient({ url: `${url}/xmlrpc/2/common` });
const models = xmlrpc.createClient({ url: `${url}/xmlrpc/2/object` });

function authenticate() {
  return new Promise((resolve, reject) => {
    common.methodCall("authenticate", [db, username, password, {}], (err, uid) => {
      if (err) return reject(err);
      resolve(uid);
    });
  });
}

async function fetchInvoice(invoiceId) {
  const uid = await authenticate();

  return new Promise((resolve, reject) => {
    models.methodCall(
      "execute_kw",
      [
        db,
        uid,
        password,
        "account.move",
        "read",
        [[invoiceId]],
        {
          fields: [
            "name",
            "invoice_date",
            "amount_total",
            "state",
            "partner_id",
            "company_id",
            "invoice_line_ids",
          ],
        },
      ],
      (err, value) => {
        if (err) return reject(err);
        resolve(value);
      }
    );
  });
}

async function fetchInvoiceLines(lineIds) {
  const uid = await authenticate();

  return new Promise((resolve, reject) => {
    models.methodCall(
      "execute_kw",
      [
        db,
        uid,
        password,
        "account.move.line",
        "read",
        [lineIds],
        {
          fields: [
            "name",
            "quantity",
            "price_unit",
            "price_subtotal",
            "tax_ids",
          ],
        },
      ],
      (err, value) => {
        if (err) return reject(err);
        resolve(value);
      }
    );
  });
}

async function fetchPartnerDetails(partnerId) {
  const uid = await authenticate();

  return new Promise((resolve, reject) => {
    models.methodCall(
      "execute_kw",
      [
        db,
        uid,
        password,
        "res.partner",
        "read",
        [[partnerId]],
        {
          fields: ["name", "vat", "phone", "email"],
        },
      ],
      (err, value) => {
        if (err) return reject(err);
        resolve(value);
      }
    );
  });
}

async function fetchCompanyDetails(companyId) {
  const uid = await authenticate();

  return new Promise((resolve, reject) => {
    models.methodCall(
      "execute_kw",
      [
        db,
        uid,
        password,
        "res.company",
        "read",
        [[companyId]],
        {
          fields: ["name", "vat"],
        },
      ],
      (err, value) => {
        if (err) return reject(err);
        resolve(value);
      }
    );
  });
}

module.exports = { 
  fetchInvoice, 
  fetchInvoiceLines, 
  fetchPartnerDetails, 
  fetchCompanyDetails 
};
