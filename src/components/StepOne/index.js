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

class StepOne extends React.PureComponent {
  onChangeFile = async (e) => {
    e.preventDefault();
    try {
      const backupObject = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const text = e.target.result;
            let object;
            try {
              object = JSON.parse(text);
            } catch (err) {
              throw new Error('Backup was malformed.');
            }
            if (!Array.isArray(object)) {
              // Old format
              object = [object];
            }
            object.forEach((wallet, i) => {
              try {
                if (typeof wallet.token !== 'string') {
                  throw new Error('Token missing.');
                }
                if (typeof wallet.export !== 'object') {
                  throw new Error('Export details missing.');
                }
                if (typeof wallet.export.wallet_version !== 'string') {
                  throw new Error('Backup version missing.');
                }
                if (typeof wallet.export.timestamp !== 'number') {
                  throw new Error('Backup timestamp missing.');
                }
                if (typeof wallet.chain_private_key !== 'string') {
                  throw new Error('Chain private key missing.');
                }
              } catch (err) {
                throw new Error(`Wallet #${i + 1} was malformed: ${err.message}`);
              }
            });
            resolve(object);
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
      this.props.onSelect(backupObject);
    } catch (err) {
      window.alert(err.message);
    }
  }
  renderActive() {
    return (
      <>
        <p>
          Your wallet backup never leaves your device. Cryptography happens in your browser.
        </p>
        <form>
          <label className="UploadButton">
            <input
              type="file"
              accept=".json,text/json,application/json"
              onChange={this.onChangeFile}
            />
            Import .JSON backup
          </label>
        </form>
      </>
    );
  }
  renderInactive() {
    const backupDate = new Date(this.props.backupObject[0].export.timestamp * 1000);
    return (
      <div className="WalletDetails">
        <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>
          {`LocalCryptos V${this.props.backupObject[0].export.wallet_version}`}
        </div>
        <small>Created {backupDate.toLocaleDateString('en-US')}</small>
      </div>
    );
  }
  render() {
    return (
      <>
        <h2>Import backup</h2>
        {this.props.active
          ? this.renderActive()
          : this.renderInactive()
        }
      </>
    );
  }
}

export default StepOne;
