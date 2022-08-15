/*
 * LocalCryptos Wallet Backup Explorer
 * Copyright (C) 2020 LocalEthereum Pty Ltd
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
import ExploreAddresses from './ExploreAddresses';
import ExploreEscrow from './ExploreEscrow';
import EthereumEscrowInstructions from './EthereumEscrowInstructions';

class StepThree extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      mode: null,
    };
  }
  selectMode = (mode) => () => this.setState({ mode })
  render() {
    if (!this.props.token) {
      return (
        <>
          <h2>Explore</h2>
          <p>
            Recover crypto from your wallet or escrow accounts.
          </p>
        </>
      );
    }
    if (!this.state.mode) {
      return (
        <>
          <h2>Explore</h2>
          <p>
            Please select the mode you wish to recover:
          </p>
          <div className="ExploreModes">
            <div onClick={this.selectMode('addresses')}>
              <h3>Wallet addresses</h3>
              <p>
                Get the private keys to your ordinary self-custodial wallet addresses. This is where you would have transferred crypto to from your own wallet.
              </p>
              <p>
                You can import these private keys into a third party wallet to recover the balance in each address.
              </p>
            </div>
            <div onClick={this.selectMode('escrow')}>
              <h3>Unsettled escrow contracts</h3>
              <p>
                Recover funds from non-custodial escrow accounts.
              </p>
              {this.props.token === 'ETH'
                ? (
                  <p>
                    ETH in peer-to-peer escrow accounts is held in an Ethereum smart contract. We will give you instructions on how to interact with the contract directly using a wallet such as MetaMask.
                  </p>
                )
                : this.props.token === 'BCH' ? (
                  <p>
                    Bitcoin Cash escrow accounts are held in P2SH smart contract addresses. They cannot be imported directly into ordinary crypto wallets.
                    To learn how these decentralized "OP_CHECKDATASIG" escrow accounts work, read <a rel="noopener noreferrer" target="_blank" href="https://blog.localcryptos.com/bitcoin-cash-trading-begins/">our blog post on the topic</a>.
                  </p>
                )
                  : (
                    <p>
                      {this.props.token} escrow accounts are held in P2SH smart contract addresses. They cannot be imported directly into ordinary crypto wallets.
                      To learn how these decentralized escrow accounts work, read <a rel="noopener noreferrer" target="_blank" href="https://blog.localcryptos.com/how-bitcoin-escrow-works/">our blog post on the topic</a>.
                    </p>
                  )
              }
            </div>
          </div>
        </>
      );
    }
    return (
      <>
        <h2>Explore: {this.state.mode === 'addresses' ? 'Wallet addresses' : 'Crypto in escrow contracts'}</h2>
        <div>
          <button className="backToModes" onClick={this.selectMode(null)}>
            Back to mode selection
          </button>
        </div>
        {
          this.state.mode === 'addresses' ? (
            <ExploreAddresses
              token={this.props.token}
              wallet={this.props.backupObject.find(wallet => wallet.token === this.props.token)}
            />
          )
            : null
        }
        {
          this.state.mode === 'escrow' && this.props.token === 'ETH' ? <EthereumEscrowInstructions />
            : this.state.mode === 'escrow' ? (
              <ExploreEscrow
                token={this.props.token}
                backupObject={this.props.backupObject}
              />
            )
              : null
        }
      </>
    );
  }
}

export default StepThree;
