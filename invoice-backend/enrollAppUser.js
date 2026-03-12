const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function main() {
    try {
        const walletPath = path.join(__dirname, 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        const mspPath = path.resolve(
            '../fabric-test/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/appUser@org1.example.com/msp'
        );

        const cert = fs.readFileSync(
            path.join(mspPath, 'signcerts', 'cert.pem')
        ).toString();

        const keyDir = path.join(mspPath, 'keystore');
        const keyFile = fs.readdirSync(keyDir)[0];
        const key = fs.readFileSync(path.join(keyDir, keyFile)).toString();

        const identity = {
            credentials: {
                certificate: cert,
                privateKey: key,
            },
            mspId: 'Org1MSP',
            type: 'X.509',
        };

        await wallet.put('appUser', identity);

        console.log('✅ appUser imported into wallet');
    } catch (error) {
        console.error(error);
    }
}

main();