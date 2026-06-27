// blockchain/showLedger.js

const FabricService = require("./fabricService");

(async () => {
    const fabric = new FabricService();

    await fabric.connect();

    const invoices = await fabric.getAllInvoices();

    console.log(JSON.stringify(invoices, null, 2));

    fabric.disconnect();
})();