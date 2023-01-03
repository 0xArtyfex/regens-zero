# Regens Zero

## What is Regens Zero?

Regens Zero is an open, decentralized and infinitely‑extensible meta‑collection, powered by dynamic and composable NFTs.
* Meta-collection because it's a collection of collections. Regens Zero's main feature is the existence of NFTs ("Regens") made up of other NFTs ("Traits").
* Infinitely-extensible because in this meta-collection there is no such thing as a “max-supply”. The scarcity has been transferred from the Regens to the DNAs (their only fixed meta-trait) and to the Traits.
* Dynamic and composable because the owners have the power to fully customize their Regens with the different tokenized Traits they own, whenever they want. Every change is made on the blockchain in a trustless way, and the visuals are updated in real-time. The only static attribute each Regen has is its DNA.
* Open because it allows anyone to create DNAs and/or Trait Collections on top of it and then integrate them into the protocol.
* Decentralized because the contract's ownership has been (or will be, since mid-January) donated from Artyfex to Gitcoin, a decentralized and public-goods oriented community.

## Contracts

Built with [Hardhat](https://github.com/nomiclabs/hardhat).

### RegensZero

The core contract of the protocol, an ERC-721 collection of Regens.

### GenesisDNA

The first DNA of the protocol, a Vault to store Traits from an ERC-721 collection.

### GenesisDNATokenUri

The first version of the metadata generator for the GenesisDNA contract.

### GenesisTraits

The first Trait Collection of the protocol, an ERC-721 collection of Traits.

## Setup

1. Clone Repository

    ```sh
    $ git clone https://github.com/0xArtyfex/regens-zero.git
    $ cd regens-zero
    ```

2. Install Dependencies

    ```sh
    $ npm install
    ```

3. Run Tests

    ```sh
    $ npx hardhat test
    ```

    Run `npx hardhat coverage` to compute code coverage by tests.


## License

MIT License

Copyright (c) 2023 Artyfex

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.