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
import CryptoJS from 'crypto-js';
import * as ethereumjsUtil from 'ethereumjs-util';
import * as bitcoinJsLib from 'bitcoinjs-lib';
import wif from 'wif';
import { publicKeyCreate } from 'secp256k1';
import { saveAs } from 'file-saver';

import SearchBar from './SearchBar';
import AddressRow from './AddressRow';

function wordToByteArray(word, length) {
  let ba = [], xFF = 0xFF;
  if (length > 0) ba.push(word >>> 24);
  if (length > 1) ba.push((word >>> 16) & xFF);
  if (length > 2) ba.push((word >>> 8) & xFF);
  if (length > 3) ba.push(word & xFF);
  return ba;
}

function wordArrayToByteArray(wordArray, length) {
  if (wordArray.hasOwnProperty("sigBytes") && wordArray.hasOwnProperty("words")) {
    length = wordArray.sigBytes;
    wordArray = wordArray.words;
  }

  var result = [],
    bytes,
    i = 0;
  while (length > 0) {
    bytes = wordToByteArray(wordArray[i], Math.min(4, length));
    length -= bytes.length;
    result.push(bytes);
    i++;
  }
  return [].concat.apply([], result);
}

class Explore extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      addresses: [],
    };
    this.searchedUntilN = 0;
    this.currentChainKey = CryptoJS.enc.Hex.parse(props.wallet.chain_private_key);
  }
  componentDidMount() {
    this.getMore();
  }
  async componentDidUpdate(prevProps) {
    if (this.props.wallet && prevProps.wallet !== this.props.wallet) {
      while (this.state.generating) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      this.setState({
        addresses: [],
      }, () => {
        this.searchedUntilN = 0;
        this.currentChainKey = CryptoJS.enc.Hex.parse(this.props.wallet.chain_private_key);
        this.getMore();
      });
    }
  }
  getMore = async () => {
    const count = Math.min(10000, this.state.addresses.length * 2 || 100);
    const renderAddressesEvery = this.state.addresses.length < 50 ? 1
      : this.state.addresses.length < 100 ? 5
        : this.state.addresses.length < 200 ? 10
          : this.state.addresses.length < 300 ? 20
            : this.state.addresses.length < 500 ? 50
              : this.state.addresses.length < 1000 ? 100
                : 500;
    if (this.state.generating) {
      return;
    }
    this.setState({
      generating: true,
    })
    try {
      const getPrivateKeyFromChainKey = (chainKey) => {
        return CryptoJS.HmacSHA256(chainKey, CryptoJS.enc.Hex.parse('0001'));
      };
      const getNextChainKey = (chainKey) => {
        return CryptoJS.HmacSHA256(chainKey, CryptoJS.enc.Hex.parse('02'));
      };
      const formatAddress = (privateKey) => {
        switch (this.props.token) {
        case 'ETH': {
          const publicKey = ethereumjsUtil.privateToPublic(Buffer.from(wordArrayToByteArray(privateKey)));
          const address = ethereumjsUtil.publicToAddress(publicKey);
          return `0x${address.toString('hex')}`;
        }
        case 'BTC': {
          const publicKey = Buffer.from(publicKeyCreate(Buffer.from(wordArrayToByteArray(privateKey)), true));
          const payment = bitcoinJsLib.payments.p2sh({
            redeem: bitcoinJsLib.payments.p2wpkh({
              pubkey: publicKey,
              network: bitcoinJsLib.networks.bitcoin,
            }),
            network: bitcoinJsLib.networks.bitcoin,
          });
          return payment.address;
        }
        default:
          return '???';
        }
      }
      const formatPrivateKey = (privateKey) => {
        switch (this.props.token) {
        case 'BTC':
          const keyWIF = wif.encode({
            version: 128,
            privateKey: Buffer.from(wordArrayToByteArray(privateKey)),
            compressed: true,
          });
          return `p2wpkh-p2sh:${keyWIF}`;
        default:
          return CryptoJS.enc.Hex.stringify(privateKey);
        }
      }
      const next = () => {
        const privateKey = getPrivateKeyFromChainKey(this.currentChainKey);
        const formattedAddress = formatAddress(privateKey);
        const address = {
          privateKey: formatPrivateKey(privateKey),
          address: formattedAddress,
          addressLowerCase: formattedAddress.toLowerCase(),
          n: this.searchedUntilN,
        };
        const nextChainKey = getNextChainKey(this.currentChainKey);
        this.currentChainKey = nextChainKey;
        this.searchedUntilN++;
        return address;
      };
      let addressesChunk = [];
      await new Promise(resolve => setTimeout(resolve, 100));
      for (let i = 0; i < count; i++) {
        const address = next();
        if (i === count - 1 || (i + this.state.addresses.length + 1) % renderAddressesEvery === 0) {
          // eslint-disable-next-line no-loop-func
          await new Promise(resolve => {
            this.setState(state => ({
              addresses: [
                ...state.addresses,
                ...addressesChunk,
                address,
              ],
            }), () => {
              // Wait for a few milliseconds to keep the browser interactive
              setTimeout(resolve, 5);
            });
          });
          addressesChunk = [];
        } else {
          addressesChunk.push(address);
        }
      }
    } catch (err) {
      window.alert(err.message);
    }
    this.setState({
      generating: false,
    });
  }
  onSearch = async (query) => {
    this.setState({
      search: query.length ? query.toLowerCase() : null,
    });
  }
  onClickExportAll = async () => {
    const minimumAddressToExport = 1000;
    while (this.state.addresses.length < minimumAddressToExport) {
      await this.getMore();
    }
    const blob = new Blob(
      [
        this.state.addresses.map(address => address.privateKey).join('\n') + '\n'
      ],
      { type: 'text/plain' },
    );
    saveAs(blob, `LocalCryptos_${this.props.token}_Seeds.txt`);
  }
  render() {
    const addresses = (
      this.state.search
        ? this.state.addresses.filter(address => (
          address.addressLowerCase === this.state.search
        || address.addressLowerCase.indexOf(this.state.search) !== -1
        ))
        : this.state.addresses
    );
    const cropAddresses = 500;
    return (
      <>
        <SearchBar
          onSearch={this.onSearch}
        />
        <div className="ResultsTableContainer">
          <table className="ResultsTable">
            <thead>
              <tr>
                <th>N</th>
                <th>Address</th>
                <th>Seed</th>
              </tr>
            </thead>
            <tbody>
              {addresses.length > cropAddresses
                ? (
                  <tr>
                    <td>0-{addresses.length - cropAddresses - 1}</td>
                    <td>(hidden)</td>
                    <td>
                      <button className="ExportAllButton" onClick={this.onClickExportAll}>Export all</button>
                    </td>
                  </tr>
                )
                : (
                  <tr>
                    <td />
                    <td />
                    <td>
                      <button className="ExportAllButton" onClick={this.onClickExportAll}>Export all</button>
                    </td>
                  </tr>
                )
              }
              {
                addresses
                  .slice(0 - cropAddresses)
                  .map(address => (
                    <AddressRow key={address.n} {...address} />
                  ))
              }
            </tbody>
          </table>
        </div>
        {this.state.generating
          ? (
            <div className="ResultsGenerating">
              {this.state.search
                ? `Generating more addresses (${this.state.addresses.length.toLocaleString()}/∞)…`
                : `Generating addresses (${this.state.addresses.length.toLocaleString()}/∞)…`
              }
            </div>
          )
          : (
            <div className="ResultsGenerating">
              {this.state.search
                ? (addresses.length === 0
                  ? `No results. Searched ${this.state.addresses.length.toLocaleString()} addresses.`
                  : `${addresses.length} result(s). Searched ${this.state.addresses.length.toLocaleString()} addresses.`
                )
                : `Generated ${this.state.addresses.length.toLocaleString()} addresses.`
              }
              <button onClick={this.getMore}>More!</button>
            </div>
          )
        }
      </>
    );
  }
}

export default Explore;
