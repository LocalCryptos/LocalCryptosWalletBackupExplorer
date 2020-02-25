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

import BTC from './BTC.svg';
import ETH from './ETH.svg';

class StepTwo extends React.PureComponent {
  onClick = (token) => () => this.props.onSelect(token)
  render() {
    return (
      <>
        <h2>Select wallet</h2>
        {!this.props.token ? (
          <p>
            Choose which crypto you want to look at.
          </p>
        ) : null}
        {this.props.backupObject ? (
          <div className={this.props.active ? 'TokenButtons TokenButtonsActive' : 'TokenButtons'}>
            {this.props.backupObject.map(wallet => (
              <button
                key={wallet.token}
                onClick={this.onClick(wallet.token)}
                style={{
                  backgroundImage: `url(${{
                    BTC,
                    ETH,
                  }[wallet.token]})`,
                }}
                className={this.props.token === wallet.token ? 'active' : undefined}
              >
                {{
                  BTC: 'Bitcoin',
                  ETH: 'Ethereum',
                }[wallet.token]}
              </button>
            ))}
          </div>
        ) : null}
      </>
    );
  }
}

export default StepTwo;
