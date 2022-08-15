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
import CryptoJS from 'crypto-js';
import * as utxolib from '@bitgo/utxo-lib'
import coininfo from 'coininfo';
import cashaddr from 'cashaddrjs';
import wif from 'wif';
import { publicKeyCreate } from 'secp256k1';

const parseEscrowUTXOsCSV = (csv) => {
  if (csv.startsWith('<?')) {
    throw new Error('Error downloading CSV file.');
  }
  const data = csv.split('\n').slice(1).map(row => {
    const [
      crypto,
      addressIdentifier,
      txid,
      vout,
      value,
      escrowModel,
      revealedPayload,
      redeemScript,
      witnessScript,
    ] = row.split(',');
    return {
      crypto,
      addressIdentifier,
      txid,
      vout,
      value,
      escrowModel,
      revealedPayload: (revealedPayload && revealedPayload.length) ? revealedPayload : null,
      redeemScript,
      witnessScript,
    };
  });
  if (data.length < 10) {
    throw new Error('Error downloading CSV file.');
  }
  return data;
};

const getWIF = (token, privateKey) => {
  switch (token) {
  case 'BTC': {
    const keyWIF = wif.encode({
      version: coininfo.bitcoin.main.versions.private,
      privateKey: Buffer.from(wordArrayToByteArray(privateKey)),
      compressed: true,
    });
    return keyWIF;
  }
  case 'LTC': {
    const keyWIF = wif.encode({
      version: coininfo.litecoin.main.versions.private,
      privateKey: Buffer.from(wordArrayToByteArray(privateKey)),
      compressed: true,
    });
    return keyWIF;
  }
  case 'DASH': {
    const keyWIF = wif.encode({
      version: coininfo.dash.main.versions.private,
      privateKey: Buffer.from(wordArrayToByteArray(privateKey)),
      compressed: true,
    });
    return keyWIF;
  }
  case 'BCH': {
    const keyWIF = wif.encode({
      version: coininfo.bitcoincash.main.versions.private,
      privateKey: Buffer.from(wordArrayToByteArray(privateKey)),
      compressed: false,
    });
    return keyWIF;
  }
  default:
    throw new Error('Could not create WIF.');
  }
}
const getPrivateKeyFromChainKey = (chainKey) => {
  return CryptoJS.HmacSHA256(chainKey, CryptoJS.enc.Hex.parse('0001'));
};
const getNextChainKey = (chainKey) => {
  return CryptoJS.HmacSHA256(chainKey, CryptoJS.enc.Hex.parse('02'));
};
const getNetwork = (token) => {
  const networks = {
    BTC: () => utxolib.networks.bitcoin,
    BCH: () => coininfo.bitcoincash.main.toBitcoinJS(),
    LTC: () => coininfo.litecoin.main.toBitcoinJS(),
    DASH: () => coininfo.dash.main.toBitcoinJS(),
  };
  const network = networks[token];
  if (!network) {
    throw new Error('Unknown network!');
  }
  return network();
}
const getPayment = (token, privateKey) => {
  const publicKey = Buffer.from(publicKeyCreate(Buffer.from(wordArrayToByteArray(privateKey)), token !== 'BCH'));
  const network = getNetwork(token);
  if (['BTC', 'LTC'].includes(token)) {
    // Segwit
    const payment = utxolib.payments.p2sh({
      redeem: utxolib.payments.p2wpkh({
        pubkey: publicKey,
        network,
      }),
      network,
    });
    return payment;
  }
  const payment = utxolib.payments.p2pkh({
    pubkey: publicKey,
    network,
  });
  return payment;
}

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

class SettleUTXO extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      direction: props.utxo.revealedPayload ? 'me' : null,
    };
  }
  parseScript() {
    const scriptASM = utxolib.script.toASM(Buffer.from(this.props.utxo.witnessScript || this.props.utxo.redeemScript, 'hex')).split(' ');
    if (this.props.utxo.escrowModel === 'checkdatasig_v1') {
      const sellerPublicKeyHash = scriptASM[4];
      const buyerPublicKeyHash = scriptASM[5];
      const arbPublicKeyHash = scriptASM[11];
      const escrowKey = scriptASM[31];
      const myKeyFromWalletBackup = this.props.utxo.address.identifier.slice(2);
      let partyType = 'Unknown';
      if (myKeyFromWalletBackup === sellerPublicKeyHash) {
        partyType = 'Seller';
      } else if (myKeyFromWalletBackup === buyerPublicKeyHash) {
        partyType = 'Buyer';
      }
      return {
        'Party Type': partyType,
        'Seller Public Key Hash': sellerPublicKeyHash,
        'Buyer Public Key Hash': buyerPublicKeyHash,
        'Arbitrator Public Key Hash': arbPublicKeyHash,
        'Escrow Key': escrowKey,
      };
    } else if (this.props.utxo.escrowModel === 'commit_reveal_v1') {
      const buyerPublicKeyHash = scriptASM[5];
      const releaseCodeFromSellerHash = scriptASM[6];
      const sellerPublicKeyHash = scriptASM[21];
      const returnCodeFromBuyerHash = scriptASM[22];
      const myKeyFromWalletBackup = this.props.utxo.address.identifier.slice(2);
      let myPublicKeyHash;
      if (['BTC', 'LTC'].includes(this.props.token)) {
        // Segwit wallets
        const publicKey = Buffer.from(publicKeyCreate(Buffer.from(wordArrayToByteArray(this.props.utxo.address.privateKey)), true));
        myPublicKeyHash = utxolib.crypto.hash160(publicKey).toString('hex');
      } else {
        myPublicKeyHash = myKeyFromWalletBackup;
      }
      let partyType = 'Unknown';
      if (myPublicKeyHash === sellerPublicKeyHash) {
        partyType = 'Seller';
      } else if (myPublicKeyHash === buyerPublicKeyHash) {
        partyType = 'Buyer';
      }
      return {
        'Party Type': partyType,
        'Seller Public Key Hash': sellerPublicKeyHash,
        'Release Code From Seller Hash': releaseCodeFromSellerHash,
        'Buyer Public Key Hash': buyerPublicKeyHash,
        'Release Code From Buyer Hash': returnCodeFromBuyerHash,
      };
    }
  }
  generateSettlementDataForOtherParty() {
    const parsedScript = this.parseScript();
    if (this.props.utxo.escrowModel === 'checkdatasig_v1') {
      const action = parsedScript['Party Type'] === 'Seller' ? 'release_by_seller' : 'return_by_buyer';
      const escrowKey = Buffer.from(parsedScript['Escrow Key'], 'hex');
      const scriptActionBytes = {
        'release_by_seller': 0x01,
        'release_by_arbitrator': 0x02,
        'return_by_buyer': 0x03,
        'return_by_arbitrator': 0x04,
      };
      const actionByte = scriptActionBytes[action];
      if (!actionByte) {
        throw new Error(`Unknown action "${action}"!`);
      }
      // Construct message to sign
      const network = getNetwork(this.props.token);
      const wif = getWIF(this.props.token, this.props.utxo.address.privateKey);
      const ecPair = utxolib.ECPair.fromWIF(wif, network);
      const message = Buffer.concat([
        Buffer.from([actionByte]),
        escrowKey,
      ]);
      const hash = utxolib.crypto.sha256(message);
      const signature = ecPair.sign(hash);
      const publicKey = Buffer.from(publicKeyCreate(Buffer.from(wordArrayToByteArray(this.props.utxo.address.privateKey)), false));
      return [
        action,
        publicKey.toString('hex'),
        utxolib.ScriptSignature.encode(signature, 0x01).toString('hex').slice(0, -2),
      ].join(':');
    } else if (this.props.utxo.escrowModel === 'commit_reveal_v1') {
      const escrowKeyHash = Buffer.from(
        parsedScript['Party Type'] === 'Buyer' ? parsedScript['Release Code From Buyer Hash'] : parsedScript['Release Code From Seller Hash'],
        'hex'
      );
      const bitcoinBackup = this.props.backupObject.find(wallet => wallet.token === 'BTC');
      if (!bitcoinBackup) {
        throw new Error('script_escrow_keys missing from backup.');
      }
      const scriptEscrowKeysRootHex = bitcoinBackup.script_escrow_keys;
      if (!scriptEscrowKeysRootHex) {
        throw new Error('script_escrow_keys missing from backup.');
      }
      const scriptEscrowKeysRoot = Buffer.from(scriptEscrowKeysRootHex, 'hex');
      let escrowKey;
      for (let i = 0; i < 50000; i++) {
        const attemptEscrowKey = utxolib.crypto.sha256(Buffer.concat([scriptEscrowKeysRoot, Buffer.from(i.toString(), 'utf8')]));
        const attemptEscrowKeyHash = utxolib.crypto.hash160(attemptEscrowKey);
        if (escrowKeyHash.equals(attemptEscrowKeyHash)) {
          escrowKey = attemptEscrowKey;
          break;
        }
      }
      if (!escrowKey) {
        throw new Error('Could not find escrow key.');
      }
      return [
        parsedScript['Party Type'] === 'Buyer' ? 'return_by_buyer' : 'release_by_seller',
        escrowKey.toString('hex'),
      ].join(':');
    } else {
      throw new Error('Unhandled escrow model.');
    }
  }
  onChangeDirection = (e) => {
    const direction = e.target.value;
    if (direction === 'me') {
      this.setState({
        direction,
      });
    } else {
      try {
        const settlementDataForOtherParty = this.generateSettlementDataForOtherParty();
        this.setState({
          direction,
          settlementDataForOtherParty,
        });
      } catch (err) {
        console.error(err);
        window.alert(err.message);
      }
    }
  }
  onChangeRevealedPayload = (e) => {
    e.preventDefault();
    this.props.onChangeRevealedPayload(e.target.value.trim());
  }
  render() {
    const parsedScript = this.parseScript() || {};
    return (
      <div className="SettleUTXO">
        Since this escrow has not been released, you must communicate with the other party in order to settle it. You can use this tool to give the other party permission to unlock the escrow, or to unlock it yourself with permission from the other person.
        <table>
          <tbody>
            <tr>
              <td>Escrow model</td>
              <td>{this.props.utxo.escrowModel}</td>
            </tr>
            <tr>
              <td>Redeem script</td>
              <td>
                <pre>{this.props.utxo.redeemScript}</pre>
                <pre>{utxolib.script.toASM(Buffer.from(this.props.utxo.redeemScript, 'hex'))}</pre>
              </td>
            </tr>
            <tr>
              <td>Key in wallet backup</td>
              <td><code>{this.props.utxo.address.identifier.slice(2)}</code> (#{this.props.utxo.address.n})</td>
            </tr>
            {this.props.utxo.witnessScript ? (
              <tr>
                <td>Witness script</td>
                <td>
                  <pre>{this.props.utxo.witnessScript}</pre>
                  <pre>{utxolib.script.toASM(Buffer.from(this.props.utxo.witnessScript, 'hex'))}</pre>
                </td>
              </tr>
            ) : null}
            {Object.entries(parsedScript).map(([key, value]) => (
              <tr key={key}>
                <td>{key}</td>
                <td><code>{value}</code></td>
              </tr>
            ))}
            <tr>
              <td>Settlement direction</td>
              <td>
                <label>
                  <input
                    type="radio"
                    value="me"
                    checked={this.state.direction === 'me'}
                    onChange={this.onChangeDirection}
                  />
                  Release to me &ndash; with information from the other party
                </label>
                <br />
                <label>
                  <input
                    type="radio"
                    value="them"
                    checked={this.state.direction === 'them'}
                    onChange={this.onChangeDirection}
                  />
                  Release to other party &ndash; generate information for the other party
                </label>
              </td>
            </tr>
            {this.state.direction === 'me' ? (
              <tr>
                <td>Settlement data</td>
                <td>
                  <div>The other user can use this tool to create the information needed for you to recover this escrow.</div>
                  <label>
                    Information from seller:
                    <input type="text" value={this.props.utxo.revealedPayload || ''} onChange={this.onChangeRevealedPayload} />
                  </label>
                </td>
              </tr>
            ) : null}
            {this.state.direction === 'them' ? (
              <tr>
                <td>Settlement data</td>
                <td>
                  <div>Provide the generated data below to the other party. They can use this same tool to recover the escrow.</div>
                  <pre className="settlementData">{this.state.settlementDataForOtherParty}</pre>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    );
  }
}

class ExploreEscrowStep extends React.PureComponent {
  render() {
    return (
      <div className="ExploreEscrowStep">
        <div>{this.props.text}</div>
        <div>{this.props.description}</div>
        {this.props.children}
        {!this.props.noAction ? (
          <>
            <button onClick={this.props.onStart} disabled={this.props.unavailable || this.props.status}>Start</button>
            <div>{this.props.unavailable ? 'Not available' : (this.props.status || 'Ready')}</div>
          </>
        ) : null}
      </div>
    );
  }
}

class ExploreEscrow extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      status: {
        fetchEscrowUTXOs: null,
        extractWalletsKeys: null,
        filterEscrowUTXOs: null,
      },
      sweepToAddress: '',
      networkFee: '',
    };
  }
  setStatus = (name, status) => this.setState(state => ({
    status: {
      ...state.status,
      [name]: status,
    },
  }));
  async componentDidUpdate(prevProps) {
    if (this.props.token !== prevProps.token && this.state.addresses) {
      this.setState(state => ({
        addresses: null,
        filteredEscrowUTXOs: null,
        sweepToAddress: '',
        signedTransaction: null,
        status: {
          fetchEscrowUTXOs: state.status.fetchEscrowUTXOs,
          extractWalletsKeys: null,
          filterEscrowUTXOs: null,
        },
      }));
      this.setStatus('extractWalletsKeys', null);
    }
  }
  startFetchEscrowUTXOs = async () => {
    this.setStatus('fetchEscrowUTXOs', 'In progress');
    try {
      const unspentEscrowUTXOsURL = 'https://localcryptos-public-escrow-data.s3.ap-southeast-2.amazonaws.com/escrow-txos-unspent.csv';
      const response = await fetch(unspentEscrowUTXOsURL);
      const csv = await response.text();
      const data = parseEscrowUTXOsCSV(csv);
      this.setState({
        fetchedEscrowUTXOs: data,
      })
      this.setStatus('fetchEscrowUTXOs', `Complete (${data.length} UTXOs)`);
    } catch (err) {
      window.alert(err.message);
      this.setStatus('fetchEscrowUTXOs', null);
    }
  }
  startFetchEscrowUTXOsManualUpload = async (e) => {
    e.preventDefault();
    this.setStatus('fetchEscrowUTXOs', 'In progress');
    try {
      const csv = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const _csv = e.target.result;
            resolve(_csv);
          } catch (_err) {
            reject(_err);
          }
        };
        try {
          reader.readAsText(e.target.files[0]);
        } catch (err) {
          reject(err);
        }
      });
      const data = parseEscrowUTXOsCSV(csv);
      this.setState({
        fetchedEscrowUTXOs: data,
      })
      this.setStatus('fetchEscrowUTXOs', `Complete (${data.length} UTXOs)`);
    } catch (err) {
      window.alert(err.message);
    }
  }
  startExtractWalletsKeys = async () => {
    this.setStatus('extractWalletsKeys', 'In progress');
    try {
      setTimeout(() => {
        const wallet = this.props.backupObject.find(wallet => wallet.token === this.props.token);
        const addresses = [];
        let currentChainKey = CryptoJS.enc.Hex.parse(wallet.chain_private_key);
        for (let n = 0; n < 10000; n++) {
          const privateKey = getPrivateKeyFromChainKey(currentChainKey);
          const payment = getPayment(this.props.token, privateKey);
          const address = {
            privateKey,
            identifier: `00${Buffer.from(payment.hash).toString('hex')}`,
            n,
          };
          addresses.push(address);
          currentChainKey = getNextChainKey(currentChainKey);
        }
        this.setState({
          addresses,
        })
        this.setStatus('extractWalletsKeys', 'Complete');
      }, 200);
    } catch (err) {
      window.alert(err.message);
      this.setStatus('extractWalletsKeys', null);
    }
  }
  startFilterEscrowUTXOs = async () => {
    this.setStatus('filterEscrowUTXOs', 'In progress');
    try {
      const { addresses, fetchedEscrowUTXOs } = this.state;
      const filteredEscrowUTXOs = fetchedEscrowUTXOs.filter(utxo => this.props.token === utxo.crypto && addresses.find(address => (
        address.identifier === utxo.addressIdentifier
      )));
      this.setState({
        filteredEscrowUTXOs: filteredEscrowUTXOs.map(utxo => ({
          ...utxo,
          selected: !!utxo.revealedPayload,
          address: addresses.find(address => (
            address.identifier === utxo.addressIdentifier
          )),
        })),
      });
      this.setStatus('filterEscrowUTXOs', `Complete (${filteredEscrowUTXOs.length} results)`);
    } catch (err) {
      window.alert(err.message);
      this.setStatus('filterEscrowUTXOs', null);
    }
  }
  startSweepUTXOs = async () => {
    this.setStatus('sweepUTXOs', 'In progress');
    try {
      const selectedEscrowUTXOs = this.state.filteredEscrowUTXOs.filter(utxo => utxo.selected);
      const network = getNetwork(this.props.token);
      const psbt = new utxolib.Psbt({
        network,
      });
      const totalInputAmont = selectedEscrowUTXOs.reduce((sum, utxo) => sum + parseInt(utxo.value, 10), 0);
      const feeSatsPerByte = parseInt(this.state.networkFee, 10);
      let sweepToAddress = this.state.sweepToAddress;
      if (this.props.token === 'BCH') {
        try {
          const { type, hash } = cashaddr.decode(sweepToAddress);
          if (type === 'P2PKH') {
            const payment = utxolib.payments.p2pkh({
              hash: Buffer.from(hash),
              network,
            });
            sweepToAddress = payment.address;
          } else if (type === 'P2SH') {
            const payment = utxolib.payments.p2sh({
              hash: Buffer.from(hash),
              network,
            });
            sweepToAddress = payment.address;
          } else {
            throw new Error(`Unknown type "${type}"!`);
          }
        } catch (err) {
          console.warn(err);
          // ...
        }
      }
      psbt.addOutput({
        address: sweepToAddress,
        value: totalInputAmont - 1,
      });
      const inputs = [];
      for (let i = 0; i < selectedEscrowUTXOs.length; i++) {
        const escrowUTXO = selectedEscrowUTXOs[i];
        const address = this.state.addresses.find(address => (
          address.identifier === escrowUTXO.addressIdentifier
        ));
        const wif = getWIF(this.props.token, address.privateKey);
        const ecPair = utxolib.ECPair.fromWIF(wif, network);
        const blockchairChainName = {
          BTC: 'bitcoin',
          BCH: 'bitcoin-cash',
          LTC: 'litecoin',
          DASH: 'dash',
        }[this.props.token];
        const blockchairAPIRL = `https://api.blockchair.com/${blockchairChainName}/raw/transaction/${escrowUTXO.txid}`;
        const response = await fetch(blockchairAPIRL);
        const blockchairResult = await response.json();
        const fetchedTransactionInfo = {
          inputValue: blockchairResult.data[escrowUTXO.txid].decoded_raw_transaction.vout[escrowUTXO.vout].value,
          scriptPubKey: blockchairResult.data[escrowUTXO.txid].decoded_raw_transaction.vout[escrowUTXO.vout].scriptPubKey.hex,
        };
        inputs.push({
          ecPair,
          escrowUTXO,
          fetchedTransactionInfo,
        });
      }
      inputs.forEach(({ escrowUTXO, fetchedTransactionInfo }) => {
        // P2SH input (escrow output)
        if (['BTC', 'LTC'].includes(this.props.token)) {
          // Segwit
          const redeemScriptPush = utxolib.script.fromASM(escrowUTXO.redeemScript.toString('hex'));
          psbt.addInput({
            hash: escrowUTXO.txid,
            index: parseInt(escrowUTXO.vout, 10),
            redeemScript: redeemScriptPush,
            witnessScript: Buffer.from(escrowUTXO.witnessScript, 'hex'),
            witnessUtxo: {
              script: Buffer.from(fetchedTransactionInfo.scriptPubKey, 'hex'),
              value: parseInt(escrowUTXO.value, 10),
            },
            sequence: 0xffffffff - 1 - 1, // RBF
          });
        } else {
          psbt.addInput({
            hash: escrowUTXO.txid,
            index: parseInt(escrowUTXO.vout, 10),
            redeemScript: Buffer.from(escrowUTXO.redeemScript, 'hex'),
          });
        }
      });
      const extractedTransaction = psbt.__CACHE.__TX;
      const signInputs = () => {
        for (let vin = 0; vin < inputs.length; vin++) {
          const input = inputs[vin];
          if (input.escrowUTXO.escrowModel === 'checkdatasig_v1') {
            const [revealedType, revealerPublicKey, revealerSignature] = input.escrowUTXO.revealedPayload.split(':');
            const redeemScript = Buffer.from(input.escrowUTXO.redeemScript, 'hex');
            const scriptActionBytes = {
              'release_by_seller': 0x01,
              'release_by_arbitrator': 0x02,
              'return_by_buyer': 0x03,
              'return_by_arbitrator': 0x04,
            };
            const actionByte = scriptActionBytes[revealedType];
            if (!actionByte) {
              throw new Error(`Unknown output type "${revealedType}".`);
            }
            // Create unlocking script
            // <Sig> <SpenderPubKey> <WitnessSignature> <WitnessPubKey> <ActionByte>
            const hashType = 0x01 | 0x40; // SIGHASH_ALL | SIGHASH_BITCOINCASHBIP143
            const transactionSignatureHash = extractedTransaction.hashForWitnessV0(
              vin,
              redeemScript,
              parseInt(input.escrowUTXO.value, 10),
              hashType,
            );
            const signatureEC = input.ecPair.sign(transactionSignatureHash);
            const signature = utxolib.script.signature.encode(signatureEC, hashType);
            const redeemScriptSig = utxolib.payments.p2sh({
              redeem: {
                input: utxolib.script.compile([
                  signature,
                  input.ecPair.publicKey,
                  Buffer.from(revealerSignature, 'hex'),
                  Buffer.from(revealerPublicKey, 'hex'),
                  Buffer.from(`0${actionByte}`, 'hex'),
                ]),
                output: redeemScript,
              },
            }).input;
            extractedTransaction.ins[vin].script = redeemScriptSig;
          } else if (input.escrowUTXO.escrowModel === 'commit_reveal_v1') {
            const [revealedKeyName, revealedKeyString] = input.escrowUTXO.revealedPayload.split(':');
            const hashType = 0x01; // SIGHASH_ALL
            const revealedKey = Buffer.from(revealedKeyString, 'hex'); // TODO
            const redeemScript = Buffer.from(input.escrowUTXO.redeemScript, 'hex');
            let transactionSignatureHash;
            let witnessScript;
            if (['BTC', 'LTC'].includes(this.props.token)) {
              // Segwit
              witnessScript = Buffer.from(input.escrowUTXO.witnessScript, 'hex');
              transactionSignatureHash = extractedTransaction.hashForWitnessV0(
                vin,
                witnessScript,
                parseInt(input.escrowUTXO.value, 10),
                hashType,
              );
            } else {
              transactionSignatureHash = extractedTransaction.hashForSignature(
                vin,
                redeemScript,
                hashType,
              );
            }
            const signatureEC = input.ecPair.sign(transactionSignatureHash);
            // DER-encode signature for script
            const signature = utxolib.script.signature.encode(signatureEC, hashType);
            const scriptActionBytes = {
              'release_by_seller': 0x01,
              'release_by_arbitrator': 0x02,
              'return_by_buyer': 0x03,
              'return_by_arbitrator': 0x04,
            };
            const actionByte = scriptActionBytes[revealedKeyName];
            if (!actionByte) {
              throw new Error(`Unknown output type "${revealedKeyName}".`);
            }
            if (['BTC', 'LTC'].includes(this.props.token)) {
              // Segwit
              extractedTransaction.ins[vin].script = psbt.data.inputs[vin].redeemScript;
              extractedTransaction.ins[vin].witness = [
                // Witness's script sig:
                utxolib.script.compile(signature),
                utxolib.script.compile(input.ecPair.publicKey),
                utxolib.script.compile(revealedKey),
                utxolib.script.compile([actionByte]),
                // Original script (witness script):
                witnessScript,
              ];
            } else {
              const redeemScriptSig = utxolib.payments.p2sh({
                redeem: {
                  input: utxolib.script.compile([
                    signature,
                    input.ecPair.publicKey,
                    revealedKey,
                    Buffer.from(`0${actionByte}`, 'hex'),
                  ]),
                  output: redeemScript,
                },
              }).input;
              extractedTransaction.ins[vin].script = redeemScriptSig;
            }
          } else {
            throw new Error(`Unhandled escrow type: "${input.escrowUTXO.escrowModel}"!`);
          }
        }
      }
      signInputs();
      const transactionBytes = extractedTransaction.virtualSize();
      extractedTransaction.outs[0].value = totalInputAmont - (feeSatsPerByte * transactionBytes);
      signInputs();
      const hex = extractedTransaction.toHex();
      this.setState({
        signedTransaction: hex,
      });
      this.setStatus('sweepUTXOs', 'Complete');
    } catch (err) {
      console.trace(err);
      window.alert(err.message);
      this.setStatus('sweepUTXOs', null);
    }
  }
  onChangeUTXORevealedPayload = (changeUTXO) => (revealedPayload) => {
    this.setState(state => ({
      filteredEscrowUTXOs: state.filteredEscrowUTXOs.map(utxo => (
        changeUTXO === utxo ? {
          ...utxo,
          revealedPayload,
        } : utxo
      ))
    }));
  }
  toggleSettleUTXO = (toggleUTXO) => (e) => {
    e.preventDefault();
    this.setState(state => ({
      filteredEscrowUTXOs: state.filteredEscrowUTXOs.map(utxo => (
        toggleUTXO === utxo ? {
          ...utxo,
          settling: !utxo.settling,
        } : utxo
      ))
    }));
  }
  toggleUTXO = (toggleUTXO) => (e) => {
    e.preventDefault();
    this.setState(state => ({
      filteredEscrowUTXOs: state.filteredEscrowUTXOs.map(utxo => (
        toggleUTXO === utxo ? {
          ...utxo,
          selected: !utxo.selected,
        } : utxo
      ))
    }));
  }
  onChangeSweepToAddress = (e) => this.setState({ sweepToAddress: e.target.value })
  onChangeNetworkFee = (e) => this.setState({ networkFee: e.target.value })
  render() {
    return (
      <>
        <ExploreEscrowStep
          text="Download list of escrow UTXOs from the web"
          description="Important information about each escrow address is contained in a large CSV file."
          onStart={this.startFetchEscrowUTXOs}
          status={this.state.status.fetchEscrowUTXOs}
        >
          {!this.state.status.fetchEscrowUTXOs ? (
            <div>
              Alternatively you can upload a CSV here:
              {' '}
              <input
                type="file"
                accept=".csv,text/csv,application/csv"
                onChange={this.startFetchEscrowUTXOsManualUpload}
              />
            </div>
          ) : null}
        </ExploreEscrowStep>
        <ExploreEscrowStep
          text="Extract wallet keys from backup"
          description="You will generate thousands of address keys from your wallet backup."
          onStart={this.startExtractWalletsKeys}
          status={this.state.status.extractWalletsKeys}
        />
        <ExploreEscrowStep
          text="Search list of escrow UTXOs that pertain to wallet keys"
          description="The list of escrow UTXOs will be scanned to find any outputs that relate to one of the keys generated."
          onStart={this.startFilterEscrowUTXOs}
          unavailable={!(this.state.status.extractWalletsKeys === 'Complete' && (this.state.status.fetchEscrowUTXOs || '').startsWith('Complete'))}
          status={this.state.status.filterEscrowUTXOs}
        />
        <ExploreEscrowStep
          text="Generate transaction to sweep escrow UTXOs to an address"
          description="The identified escrow UTXOs will be swept to an address of your choice. This transaction will be created in your browser using your wallet backup."
          onStart={this.startSweepUTXOs}
          unavailable={!(this.state.filteredEscrowUTXOs && this.state.filteredEscrowUTXOs.length && this.state.filteredEscrowUTXOs.find(utxo => utxo.selected) && this.state.sweepToAddress.length)}
          status={this.state.status.sweepUTXOs}
        >
          {this.state.filteredEscrowUTXOs && this.state.filteredEscrowUTXOs.length ? (
            <>
              <table className="escrowUTXOTable">
                <tbody>
                  <tr>
                    <td />
                    <td>UTXO</td>
                    <td>Amount</td>
                    <td>Escrow type</td>
                    <td>Status</td>
                  </tr>
                  {this.state.filteredEscrowUTXOs.map(utxo => (
                    <React.Fragment key={`${utxo.txid}:${utxo.vout}`}>
                      <tr>
                        <td rowSpan={utxo.settling ? 2 : 1}>
                          <input disabled={!utxo.revealedPayload} type="checkbox" checked={utxo.selected} onChange={this.toggleUTXO(utxo)} />
                        </td>
                        <td>{utxo.txid}:{utxo.vout}</td>
                        <td>{utxo.value}</td>
                        <td>{utxo.escrowModel}</td>
                        <td>
                          {utxo.revealedPayload
                            ? (
                              <>
                                <strong>Available</strong>{' '}
                                {!utxo.settling ? <button onClick={this.toggleSettleUTXO(utxo)}>Re-settle</button> : null}
                              </>
                            )
                            : (
                              <>
                                <strong style={{ color: '#d00' }}>Locked</strong>{' '}
                                {!utxo.settling ? <button onClick={this.toggleSettleUTXO(utxo)}>Settle</button> : null}
                              </>
                            )
                          }
                        </td>
                      </tr>
                      {utxo.settling ? (
                        <tr>
                          <td colSpan={4}>
                            <SettleUTXO backupObject={this.props.backupObject} onChangeRevealedPayload={this.onChangeUTXORevealedPayload(utxo)} token={this.props.token} utxo={utxo} />
                          </td>
                        </tr>
                      ) : null}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
              <div className="recipientAddress">
                <label>Sweep to address</label>
                <input disabled={!!this.state.signedTransaction} type="text" value={this.state.sweepToAddress} onChange={this.onChangeSweepToAddress} />
              </div>
              <div className="recipientAddress">
                <label>Network fee (sats per byte)</label>
                <input disabled={!!this.state.signedTransaction} type="text" value={this.state.networkFee} onChange={this.onChangeNetworkFee} />
              </div>
            </>
          ) : null}
        </ExploreEscrowStep>
        <ExploreEscrowStep
          text={`Broadcast transaction to ${this.props.token} network`}
          description="Use a third party tool to broadcast the generated transaction to the network."
          onStart={null}
          noAction
        >
          {this.state.signedTransaction ? (
            <div className="TXData">
              <h3>Generated transaction data:</h3>
              <p>You can use a third party service such as <a rel="noopener noreferrer" target="_blank" href="https://blockchair.com/broadcast">blockchair</a> to broadcast this raw transaction to the network.</p>
              <pre>
                {this.state.signedTransaction}
              </pre>
            </div>
          ) : null}
        </ExploreEscrowStep>
      </>
    );
  }
}

export default ExploreEscrow;
