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
import Explore from './Explore';

class StepThree extends React.PureComponent {
  render() {
    return (
      <>
        <h2>Explore</h2>
        {!this.props.active
          ? (
            <>
              <p>
                Print a list of addresses and their private keys.
              </p>
            </>
          )
          : (
            <Explore
              token={this.props.token}
              wallet={this.props.backupObject.find(wallet => wallet.token === this.props.token)}
            />
          )
        }
      </>
    );
  }
}

export default StepThree;
