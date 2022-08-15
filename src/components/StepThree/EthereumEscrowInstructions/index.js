/*
 * LocalCryptos Wallet Backup Explorer
 * Copyright (C) 2022 LocalEthereum Pty Ltd
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import React from 'react';

class EthereumEscrowInstructions extends React.PureComponent {
  render() {
    return (
      <div className="EthereumEscrowInstructions">
        <p>Ethereum escrows are held in an on-chain smart contract which you can interact with directly using your wallet.</p>
        <p>To learn how the Ethereum smart contract works, <a target="_blank" rel="noopener noreferrer" href="https://blog.localcryptos.com/how-our-escrow-smart-contract-works/">read this blog post</a>.</p>
        <h3>How to recover ETH from escrow</h3>
        <ol>
          <li>
            Locate the transaction hash of the deposit you made into the non-custodial escrow smart contract. The name of the method called is <code>createEscrow</code>.
          </li>
          <li>
            Use a capable blockchain explorer such as Etherscan.io to decode the input data of the transaction. You will need to take note of:
            <ul>
              <li>The "Trade ID" (parameter 1)</li>
              <li>Seller's address (parameter 2)</li>
              <li>Buyer's address (parameter 3)</li>
              <li>Value of the escrow in wei (parameter 4)</li>
              <li>Escrow fee (parameter 5)</li>
            </ul>
          </li>
          <li>
            Use the "Explore Wallet addresses" tool here to locate and export the private key of your Ethereum wallet address. Import the address into another self-custodial wallet such as MetaMask.
          </li>
          <li>
            Call the relevant function depending on what you are attempting to do. You can do this using Etherscan's "Write" tool.
            <ul>
              <li><code>release</code> to transfer the ETH to the buyer, as the seller</li>
              <li><code>sellerCancel</code> to transfer the ETH to yourself, as the seller</li>
              <li><code>buyerCancel</code> to transfer the ETH to yourself, as the buyer</li>
            </ul>
          </li>
          <li>
            Copy the values obtained from step 2 into the input fields of the method call. They must match the <code>createEscrow</code> call exactly.
          </li>
          <li>
            Wait for your transaction to propagate on the Ethereum network.
          </li>
        </ol>
      </div>
    );
  }
}

export default EthereumEscrowInstructions;
