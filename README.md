# LocalCryptos Wallet Backup Explorer

Have you forgotten your LocalCryptos password? 🤔

Left crypto in your wallet? 😨

Do you have a wallet backup file? 💾

Confused by the unusual JSON file? 🤷️️

*This tool will make your day!* 🦸

## How do I use this?

1. **Download the latest release from [here](https://github.com/LocalCryptos/LocalCryptosWalletBackupExplorer/releases)**
2. Extract the archive, open `index.html` in your web browser
3. Insert your wallet backup
4. Select which crypto you want to export
5. View a list of all your addresses
6. Export the private keys you pick (or dump all them all)

## Is this safe?

This tool will not upload your private key anywhere. The cryptography is done inside your browser.

## What format is the backup file in?

LocalCryptos' wallets follow a simple deterministic algorithm described in our [whitepaper](https://whitepaper.localethereum.com/#sec-Wallets).

Unfortunately, the algorithm is non-standard. This is why your backup file isn't compatible with other wallets.

Don't worry — when you use this tool, you can export a list of private keys that will be compatible with common wallets such as Electrum (for Bitcoin) or MetaMask (ETH).

## License

This software is distributed under the GNU Affero General Public License, Version 3.0. See [LICENSE.md](./LICENSE.md) for more information.
