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

import StepOne from './components/StepOne';
import StepTwo from './components/StepTwo';
import StepThree from './components/StepThree';

import './App.css';

class WalletBackupExplorerApp extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      step: 1,
    };
  }
  onStepOne = (backupObject) => this.setState({ backupObject, step: 2 })
  onStepTwo = (token) => this.setState({ token, step: 3 })
  render() {
    return (
      <div className="WalletBackupExplorer">
        <div className="Steps">
          <div className={this.state.step === 1 ? 'active' : undefined}>
            <StepOne
              onSelect={this.onStepOne}
              backupObject={this.state.backupObject}
              active={this.state.step === 1}
            />
          </div>
          <div className={this.state.step === 2 ? 'active' : undefined}>
            <StepTwo
              onSelect={this.onStepTwo}
              backupObject={this.state.backupObject}
              token={this.state.token}
              active={this.state.step === 2}
            />
          </div>
          <div className={this.state.step === 3 ? 'active' : undefined}>
            <StepThree
              token={this.state.token}
              backupObject={this.state.backupObject}
              active={this.state.step === 3}
            />
          </div>
        </div>
      </div>
    );
  }
}

export default WalletBackupExplorerApp;
