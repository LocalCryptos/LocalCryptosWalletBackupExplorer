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

class SearchBar extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      query: '',
    };
  }
  onSubmit = (e) => {
    e.preventDefault();
    this.props.onSearch(this.state.query);
  }
  onChange = (e) => this.setState({ query: e.target.value })
  render() {
    return (
      <form className="SearchBar" onSubmit={this.onSubmit}>
        <input placeholder="Search..." onChange={this.onChange} value={this.state.query} />
      </form>
    );
  }
}

export default SearchBar;
