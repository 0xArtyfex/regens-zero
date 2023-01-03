const { expect, assert } = require("chai");
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");

describe('"RegensZero" Testing', function () {
    let owner, addr1, addr2, addr3, addr4,
        addr5, addr6, addr7, addr8, addr9,
        traitsSigner;
    let layer0, layer1, tokenUri, traitVault;
    let blockNum;

    /////////////////
    // Before all //
    /////////////////

    before(async function () {
        [
            owner,
            addr1,
            addr2,
            addr3,
            addr4,
            addr5,
            addr6,
            addr7,
            addr8,
            addr9,
            traitsSigner,
            addr11,
            addr12,
            addr13
        ] = await ethers.getSigners();
    });

    /////////////////
    // Before each //
    /////////////////

    beforeEach(async function () {
        hexBlockNum = await network.provider.request({
            method: "eth_blockNumber",
            params: []
        });
        blockNum = BigNumber.from(hexBlockNum);


        let artyfex = "0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa"
        let publicGoods = "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB"


        layer0TokenFactory = await hre.ethers.getContractFactory("RegensZero");
        layer0 = await layer0TokenFactory.connect(owner).deploy();
        await layer0.deployed();


        layer1TokenFactory = await hre.ethers.getContractFactory("GenesisTraits");
        layer1 = await layer1TokenFactory.connect(owner).deploy([3, 3, 5, 5, 5, 5], [2, 8, 2, 3, 5, 20]);
        await layer1.deployed();


        traitVaultFactory = await hre.ethers.getContractFactory("GenesisDNA");
        traitVault = await traitVaultFactory.connect(owner).deploy(
            layer0.address,
            layer1.address,
            blockNum.add(BigNumber.from(3000)),
            ethers.utils.parseEther("0.0853"),
            artyfex,
            publicGoods);
        await traitVault.deployed();



        tokenUriTokenFactory = await hre.ethers.getContractFactory("GenesisDNATokenUri");
        tokenUri = await tokenUriTokenFactory.connect(owner).deploy(traitVault.address);
        await tokenUri.deployed();


        await layer1.connect(owner).setTraitsVault(traitVault.address);
        await layer1.connect(owner).setRegensZero(layer0.address);

        await layer0.connect(owner).setGenesisDNA(traitVault.address);
        await traitVault.connect(owner).setTokenUriContract(tokenUri.address);

        await traitVault.connect(owner).setDNAImageUri("regens-zero/dna-image-uri.png")
        await layer1.connect(owner).setImageURI("genesis-traits/image-uri/");
        await layer1.connect(owner).setBaseURI("genesis-traits/base-uri/");
        await layer1.connect(owner).setPreRevealUri("genesis-traits/pre-reveal-uri");


        selfDestructTokenFactory = await hre.ethers.getContractFactory("selfDestruct");
        selfD = await selfDestructTokenFactory.connect(owner).deploy();
        await selfD.deployed();
        await selfD.connect(addr9).receiveEther({ value: ethers.utils.parseEther("5") })
        let address = traitVault.address;
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [address.toString()],
        });
        traitsSigner = await ethers.getSigner(address);

        await selfD.connect(owner).sendEther(traitVault.address)

    });

    ////////////////
    // After each //
    ////////////////

    afterEach(async function () {
        await network.provider.request({
            method: "hardhat_reset",
            params: []
        });
    });

    /////////////////////
    // Unitarian Tests //
    /////////////////////

    describe('Tests of "Constructor"', async function () {
        it("Should correctly set contract parameters on deployment", async function () {
            await expect(await layer0.DNAs(traitVault.address)).to.be.true;
            await expect(await layer0.genesisDNA()).to.equal(traitVault.address);
        });
    });

    describe('Tests of "setNewDNA"', async function () {
        it("Should correctly set a new DNA contract at owners request", async function () {
            await layer0.connect(owner).setNewDNA(addr2.address);
            await expect(await layer0.DNAs(addr2.address)).to.be.true;
        });

        it("Should revert if caller is not owner", async function () {
            await expect(layer0.connect(addr1).setNewDNA(addr2.address)).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should revert if address is already a DNA", async function () {
            await layer0.connect(owner).setNewDNA(addr2.address);
            await expect(layer0.connect(owner).setNewDNA(addr2.address)).to.be.revertedWith("RegensZero: Address is already a DNA");
        });
    });

    describe('Tests of "removeDNA"', async function () {
        it("Should correctly remove a DNA contract at owners request", async function () {
            await layer0.connect(owner).setNewDNA(addr2.address);
            await expect(await layer0.DNAs(addr2.address)).to.be.true;
            await layer0.connect(owner).removeDNA(addr2.address);
            await expect(await layer0.DNAs(addr2.address)).to.be.false;
        });

        it("Should revert if caller is not owner", async function () {
            await layer0.connect(owner).setNewDNA(addr2.address);
            await expect(layer0.connect(addr1).removeDNA(addr2.address)).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should revert if address is GenesisDNA", async function () {
            await expect(layer0.connect(owner).removeDNA(traitVault.address)).to.be.revertedWith("RegensZero: Cannot remove genesisDNA");
        });
    });

    describe('Tests of "setController" and "getController"', async function () {
        it("Should correctly set controller at token's owner request", async function () {
            advanceBlocks(3000);
            await layer0.connect(traitsSigner).genesisMint(1, addr2.address);
            await layer0.connect(addr2).setController(1, addr1.address);
            await expect(await layer0.getController(1)).to.equal(addr1.address);
        });

        it("Should correctly set controller at token's controller request", async function () {
            advanceBlocks(3000);
            await layer0.connect(traitsSigner).genesisMint(1, addr2.address);
            await layer0.connect(addr2).setController(1, addr1.address);
            await layer0.connect(addr1).setController(1, addr3.address);
            await expect(await layer0.getController(1)).to.equal(addr3.address);
        });

        it("Should revert if caller is not owner or controller", async function () {
            advanceBlocks(3000);
            await layer0.connect(traitsSigner).genesisMint(1, addr2.address);
            await layer0.connect(addr2).setController(1, addr1.address);
            await expect(layer0.connect(addr3).setController(1, addr3.address))
                .to.be.revertedWith("RegensZero: Only token owner or controller can set token controller.");
        });

        it("Should return address zero if just transfered", async function () {
            advanceBlocks(3000);
            await layer0.connect(traitsSigner).genesisMint(1, addr2.address);
            await layer0.connect(addr2).setController(1, addr1.address);
            await expect(
                layer0.connect(addr2).transferFrom(addr2.address, addr3.address, BigNumber.from(1))
            ).not.to.be.reverted;
            await expect(
                await layer0.ownerOf(1)
            ).to.be.equal(addr3.address);
            await expect(
                await layer0.getController(1)
            ).to.equal(ethers.constants.AddressZero);
        });

        it("Should return address zero if just minted", async function () {
            advanceBlocks(3000);
            await layer0.connect(traitsSigner).genesisMint(1, addr2.address);;
            await expect(
                await layer0.getController(1)
            ).to.equal(ethers.constants.AddressZero);
        });

        it("Should revert if token is token zero before any mint", async function () {
            await expect(
                layer0.connect(addr3).setController(1, addr3.address)
            ).to.be.revertedWith("ERC721: invalid token ID");
        });

        it("Should revert if token is token zero after one mint", async function () {
            advanceBlocks(3000);
            await layer0.connect(traitsSigner).genesisMint(1, addr2.address);
            await expect(
                layer0.connect(addr3).setController(0, addr3.address)
            ).to.be.revertedWith("ERC721: invalid token ID");
        });

        it("Should revert if token does not exist", async function () {
            advanceBlocks(3000);
            await layer0.connect(traitsSigner).genesisMint(1, addr2.address);
            await layer0.connect(addr2).setController(1, addr1.address);
            await expect(
                layer0.connect(addr3).setController(2, addr3.address)
            ).to.be.revertedWith("ERC721: invalid token ID");
        });
    });

    describe('Tests of "setSigner" and "getSigner"', async function () {
        it("Should correctly set signer at token's owner request", async function () {
            advanceBlocks(3000);
            await layer0.connect(traitsSigner).genesisMint(1, addr2.address);
            await layer0.connect(addr2).setSigner(1, addr1.address);
            await expect(await layer0.getSigner(1)).to.equal(addr1.address);
        });

        it("Should correctly set signer at token's controller request", async function () {
            advanceBlocks(3000);
            await layer0.connect(traitsSigner).genesisMint(1, addr2.address);
            await layer0.connect(addr2).setController(1, addr3.address);
            await layer0.connect(addr3).setSigner(1, addr1.address);
            await expect(await layer0.getSigner(1)).to.equal(addr1.address);
        });

        it("Should revert if caller is not owner or controller", async function () {
            advanceBlocks(3000);
            await layer0.connect(traitsSigner).genesisMint(1, addr2.address);
            await layer0.connect(addr2).setSigner(1, addr1.address);
            await expect(layer0.connect(addr3).setSigner(1, addr3.address)).to.be.revertedWith("RegensZero: Only token owner or controller can set token signer.");
        });

        it("Should return address zero if just transfered", async function () {
            advanceBlocks(3000);
            await layer0.connect(traitsSigner).genesisMint(1, addr2.address);;
            await layer0.connect(addr2).setSigner(1, addr1.address);
            await expect(
                layer0.connect(addr2).transferFrom(addr2.address, addr3.address, BigNumber.from(1))
            ).not.to.be.reverted;
            await expect(
                await layer0.ownerOf(1)
            ).to.be.equal(addr3.address);
            await expect(
                await layer0.getSigner(1)
            ).to.equal(ethers.constants.AddressZero);
        });

        it("Should return address zero if just minted", async function () {
            advanceBlocks(3000);
            await layer0.connect(traitsSigner).genesisMint(1, addr2.address);;
            await expect(
                await layer0.getSigner(1)
            ).to.equal(ethers.constants.AddressZero);
        });

        it("Should revert if token is token zero before any mint", async function () {
            await expect(
                layer0.connect(addr3).setSigner(0, addr3.address)
            ).to.be.revertedWith("ERC721: invalid token ID");
        });

        it("Should revert if token is token zero after one mint", async function () {
            advanceBlocks(3000);
            await layer0.connect(traitsSigner).genesisMint(1, addr2.address);
            await expect(
                layer0.connect(addr3).setSigner(0, addr3.address)
            ).to.be.revertedWith("ERC721: invalid token ID");
        });

        it("Should revert if token does not exist", async function () {
            advanceBlocks(3000);
            await layer0.connect(traitsSigner).genesisMint(1, addr2.address);
            await layer0.connect(addr2).setSigner(1, addr1.address);
            await expect(
                layer0.connect(addr3).setSigner(2, addr3.address)
            ).to.be.revertedWith("ERC721: invalid token ID");
        });
    });

    describe('Tests of "setGenesisDNA"', async function () {
        it("Should revert since it's already been set", async function () {
            await expect(layer0.connect(owner).setGenesisDNA(addr2.address)).to.be.revertedWith(
                "RegensZero: Cannot change genesisDNA"
            );
        });
    });

    describe('Tests of "_beforeTokenTransfer"', async function () {
        it("Should let transfer when no change has been made", async function () {
            advanceBlocks(3000);
            await layer0.connect(traitsSigner).genesisMint(1, addr2.address);
            await expect(
                layer0.connect(addr2).transferFrom(addr2.address, addr3.address, BigNumber.from(1))
            ).not.to.be.reverted;
            await expect(
                await layer0.connect(addr2).balanceOf(addr2.address)
            ).to.be.equal(0);
            await expect(
                await layer0.connect(addr3).ownerOf(1)
            ).to.be.equal(addr3.address);
        });

        it("Should let transfer when no change has been made, after traits mint", async function () {
            advanceBlocks(3000);
            await layer0.connect(traitsSigner).genesisMint(1, addr2.address);
            await traitVault.connect(addr2).mintTraits(BigNumber.from(1));
            await expect(
                layer0.connect(addr2).transferFrom(addr2.address, addr3.address, BigNumber.from(1))
            ).not.to.be.reverted;
            await expect(
                await layer0.connect(addr2).balanceOf(addr2.address)
            ).to.be.equal(0);
            await expect(
                await layer0.connect(addr3).ownerOf(1)
            ).to.be.equal(addr3.address);
        });

        it("Should revert when trying to transfer before timeout, after trait change", async function () {
            advanceBlocks(3000);
            await layer0.connect(traitsSigner).genesisMint(1, addr2.address);
            await traitVault.connect(addr2).mintTraits(BigNumber.from(1));
            await traitVault.connect(addr2).changeTraits(BigNumber.from(1), [10], [0], [0]);

            await expect(
                layer0.connect(addr2).transferFrom(addr2.address, addr3.address, BigNumber.from(1))
            ).to.be.revertedWith(
                "RegensZero: This nft is still on transfer timeout due to a modification on the DNA contract."
            );
            await expect(
                await layer0.connect(addr2).ownerOf(1)
            ).to.be.equal(addr2.address);
            await expect(
                await layer0.connect(addr3).balanceOf(addr3.address)
            ).to.be.equal(0);
        });

        it("Should let transfer after timeout, after trait change", async function () {
            advanceBlocks(3000);
            await layer0.connect(traitsSigner).genesisMint(1, addr2.address);;
            await traitVault.connect(addr2).mintTraits(BigNumber.from(1));
            await traitVault.connect(addr2).changeTraits(BigNumber.from(1), [10], [0], [0]);

            await network.provider.send('evm_increaseTime', ['0x181'])

            await expect(
                layer0.connect(addr2).transferFrom(addr2.address, addr3.address, BigNumber.from(1))
            ).not.to.be.reverted;
            await expect(
                await layer0.connect(addr2).balanceOf(addr2.address)
            ).to.be.equal(0);
            await expect(
                await layer0.connect(addr3).ownerOf(1)
            ).to.be.equal(addr3.address);
        });

        it("Should change ownerSince (when calling transferFrom)", async function () {
            advanceBlocks(3000);
            await layer0.connect(traitsSigner).genesisMint(1, addr2.address);
            await layer0.connect(addr2).setSigner(1, addr4.address);
            await layer0.connect(addr2).setController(1, addr4.address);
            await expect(
                layer0.connect(addr2).transferFrom(addr2.address, addr3.address, BigNumber.from(1))
            ).not.to.be.reverted;
            const lastBlockNumber = await ethers.provider.getBlockNumber();
            const lastBlock = await ethers.provider.getBlock(lastBlockNumber);
            const lastTimestamp = lastBlock.timestamp;
            await expect(
                await layer0.ownerOf(1)
            ).to.be.equal(addr3.address);
            await expect(
                await layer0.ownerSince(1)
            ).to.equal(lastTimestamp);
        });

        it("Should change ownerSince (when calling safeTransferFrom)", async function () {
            advanceBlocks(3000);
            await layer0.connect(traitsSigner).genesisMint(1, addr2.address);
            await layer0.connect(addr2).setSigner(1, addr4.address);
            await layer0.connect(addr2).setController(1, addr4.address);
            await layer0.connect(addr2)['safeTransferFrom(address,address,uint256)'](
                addr2.address,
                addr3.address,
                1
            );
            const lastBlockNumber = await ethers.provider.getBlockNumber();
            const lastBlock = await ethers.provider.getBlock(lastBlockNumber);
            const lastTimestamp = lastBlock.timestamp;
            await expect(
                await layer0.ownerOf(1)
            ).to.be.equal(addr3.address);
            await expect(
                await layer0.ownerSince(1)
            ).to.equal(lastTimestamp);
        });
    });

    describe('Tests of "changelastTraitModification"', async function () {
        it("Should correctly set lastTraitModification at the tokens DNA contract request", async function () {
            await layer0.connect(owner).setNewDNA(addr2.address);
            await layer0.connect(addr2).postGenesisMint(1, addr3.address);
            await network.provider.send("evm_setNextBlockTimestamp", [2530883342]);
            await layer0.connect(addr2).changeLastTraitModification(10001);
            await expect(
                await layer0.lastTraitModification(10001)
            ).to.equal(2530883342);
        });

        it("Should revert if caller is not the DNA of the token", async function () {
            await layer0.connect(owner).setNewDNA(addr2.address);
            await layer0.connect(owner).setNewDNA(addr4.address);
            await layer0.connect(addr2).postGenesisMint(1, addr3.address);
            await expect(
                layer0.connect(addr4).changeLastTraitModification(BigNumber.from(10001))
            ).to.be.revertedWith(
                "RegensZero: Only the appropriate DNA for tokenId can call this function."
            );
        });

        it("Should revert if caller is not a DNA", async function () {
            await expect(
                layer0.connect(addr2).changeLastTraitModification(BigNumber.from(1))
            ).to.be.revertedWith(
                "RegensZero: Only the appropriate DNA for tokenId can call this function."
            );
        });
    });

    describe('Tests of "lockToken"', async function () {
        it("Token should not be locked at the begining", async function () {
            advanceBlocks(3000);
            await layer0.connect(traitsSigner).genesisMint(1, addr2.address);
            await expect(await layer0.getTokenTimelock(1)).to.equal(0);
            advanceBlocks(300);
            await expect(await layer0.getTokenTimelock(1)).to.equal(0);
        });

        it("Should let owner lockToken", async function () {
            advanceBlocks(3000);
            await layer0.connect(traitsSigner).genesisMint(1, addr2.address);
            await expect(layer0.connect(addr2).lockToken(1)).not.to.be.reverted;
            await expect(await layer0.getTokenTimelock(1)).to.equal(BigNumber.from("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"))
        });

        it("Should let controller lockToken", async function () {
            advanceBlocks(3000);
            await layer0.connect(traitsSigner).genesisMint(1, addr2.address);
            await layer0.connect(addr2).setController(1, addr1.address);
            await expect(layer0.connect(addr1).lockToken(1)).not.to.be.reverted;
            await expect(await layer0.getTokenTimelock(1)).to.equal(BigNumber.from("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"));
        });

        it("Should not let lockToken twice without unlocking", async function () {
            advanceBlocks(3000);
            await layer0.connect(traitsSigner).genesisMint(1, addr2.address);
            await expect(layer0.connect(addr2).lockToken(1)).not.to.be.reverted;
            await expect(await layer0.getTokenTimelock(1)).to.equal(BigNumber.from("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"))
            await expect(
                layer0.connect(addr2).lockToken(1)
            ).to.be.revertedWith(
                "RegensZero: Token is already locked."
            );
        });

        it("Should revert if caller is not owner or controller", async function () {
            advanceBlocks(3000);
            await layer0.connect(traitsSigner).genesisMint(1, addr2.address);
            await expect(
                layer0.connect(addr3).lockToken(1)
            ).to.be.revertedWith(
                "RegensZero: Only token owner and controller can lock the token."
            );
            await expect(await layer0.getTokenTimelock(1)).to.equal(0);
        });

        it("Should revert if caller is not owner anymore", async function () {
            advanceBlocks(3000);
            await layer0.connect(traitsSigner).genesisMint(1, addr3.address);
            await layer0.connect(addr3).transferFrom(addr3.address, addr2.address, 1);
            await expect(
                layer0.connect(addr3).lockToken(1)
            ).to.be.revertedWith(
                "RegensZero: Only token owner and controller can lock the token."
            );
            await expect(await layer0.getTokenTimelock(1)).to.equal(0);
        });

        it("Should revert if caller is not controller anymore", async function () {
            advanceBlocks(3000);
            await layer0.connect(traitsSigner).genesisMint(1, addr2.address);;
            await layer0.connect(addr2).setController(1, addr3.address);
            await layer0.connect(addr2).setController(1, ethers.constants.AddressZero);
            await expect(
                layer0.connect(addr3).lockToken(1)
            ).to.be.revertedWith(
                "RegensZero: Only token owner and controller can lock the token."
            );
            await expect(await layer0.getTokenTimelock(1)).to.equal(0);
        });
    });

    describe('Tests of "unlockToken"', async function () {
        it("Should let owner unlockToken", async function () {
            advanceBlocks(3000);
            await layer0.connect(traitsSigner).genesisMint(1, addr2.address);
            await expect(layer0.connect(addr2).lockToken(1)).not.to.be.reverted;
            await network.provider.send("evm_increaseTime", ["0x93A80"]);
            await expect(layer0.connect(addr2).unlockToken(1)).not.to.be.reverted;
            const lastBlockNumber = await ethers.provider.getBlockNumber();
            const lastBlock = await ethers.provider.getBlock(lastBlockNumber);
            const lastTimestamp = lastBlock.timestamp;
            let lockUntil = lastTimestamp + 604800;
            await expect(await layer0.getTokenTimelock(1)).to.equal(BigNumber.from(lockUntil))
        });

        it("Should let controller unlockToken", async function () {
            advanceBlocks(3000);
            await layer0.connect(traitsSigner).genesisMint(1, addr2.address);
            await expect(layer0.connect(addr2).lockToken(1)).not.to.be.reverted;
            await layer0.connect(addr2).setController(1, addr1.address);
            await network.provider.send("evm_increaseTime", ["0x93A80"]);
            await expect(layer0.connect(addr1).unlockToken(1)).not.to.be.reverted;
            const lastBlockNumber = await ethers.provider.getBlockNumber();
            const lastBlock = await ethers.provider.getBlock(lastBlockNumber);
            const lastTimestamp = lastBlock.timestamp;
            let lockUntil = lastTimestamp + 604800;
            await expect(await layer0.getTokenTimelock(1)).to.equal(BigNumber.from(lockUntil))
        });

        it("Should revert if caller is not controller or owner", async function () {
            advanceBlocks(3000);
            await layer0.connect(traitsSigner).genesisMint(1, addr2.address);
            await expect(layer0.connect(addr2).lockToken(1)).not.to.be.reverted;
            await expect(
                layer0.connect(addr4).unlockToken(1)
            ).to.be.revertedWith(
                "RegensZero: Only token owner and controller can unlock the token."
            );
        });

        it("Should not let unlock if token not locked", async function () {
            advanceBlocks(3000);
            await layer0.connect(traitsSigner).genesisMint(1, addr2.address);
            await expect(layer0.connect(addr2).unlockToken(1)).to.be.revertedWith("RegensZero: Cannot unlock a token that is not locked.");

        });

        it("Token should unlock in seven days", async function () {
            let lastBlockNumber, lastBlock, lastTimestamp, lockUntil;
            advanceBlocks(3000);
            await layer0.connect(traitsSigner).genesisMint(1, addr2.address);
            await expect(layer0.connect(addr2).lockToken(1)).not.to.be.reverted;
            await network.provider.send("evm_increaseTime", [604800]);
            await expect(layer0.connect(addr2).unlockToken(1)).not.to.be.reverted;

            lastBlockNumber = await ethers.provider.getBlockNumber();
            lastBlock = await ethers.provider.getBlock(lastBlockNumber);
            lastTimestamp = lastBlock.timestamp;
            lockUntil = lastTimestamp + 604800;
            await expect(await layer0.getTokenTimelock(1)).to.equal(BigNumber.from(lockUntil))

            await network.provider.send("evm_increaseTime", [604801]);
            await network.provider.send("evm_mine", []);

            lastBlockNumber = await ethers.provider.getBlockNumber();
            lastBlock = await ethers.provider.getBlock(lastBlockNumber);
            lastTimestamp = lastBlock.timestamp;
            await expect(await layer0.getTokenTimelock(1)).to.be.below(lastTimestamp);
        });
    });

    describe('Tests of "genesisMint"', async function () {
        it("Should revert if caller is not genesisDNA", async function () {
            await expect(
                layer0.connect(addr1).genesisMint(1, addr1.address)
            ).to.be.revertedWith("RegensZero: Caller must be Genesis DNA.");
        });

        it("Should not mint if amount equals 0", async function () {
            await layer0.connect(traitsSigner).genesisMint(0, addr1.address);
            await expect(
                await layer0.connect(addr2).balanceOf(addr1.address)
            ).to.equal(0);
            await expect(
                await layer0.genesisSupply()
            ).to.equal(0)
        });

        it("Should let mint 1 token", async function () {
            await layer0.connect(traitsSigner).genesisMint(1, addr2.address);
            const lastBlockNumber = await ethers.provider.getBlockNumber();
            const lastBlock = await ethers.provider.getBlock(lastBlockNumber);
            const lastTimestamp = lastBlock.timestamp;
            await expect(
                await layer0.connect(addr2).balanceOf(addr2.address)
            ).to.equal(1);
            await expect(
                await layer0.ownerOf(1)
            ).to.equal(addr2.address);
            await expect(
                await layer0.holderSince(1)
            ).to.equal(lastTimestamp);
            await expect(
                await layer0.ownerSince(1)
            ).to.equal(lastTimestamp);
            await expect(
                await layer0.tokenIdDNA(1)
            ).to.equal(traitVault.address);
            await expect(
                await layer0.genesisSupply()
            ).to.equal(1)
        });

        it("Should let mint 2 tokens", async function () {
            await layer0.connect(traitsSigner).genesisMint(2, addr2.address);
            const lastBlockNumber = await ethers.provider.getBlockNumber();
            const lastBlock = await ethers.provider.getBlock(lastBlockNumber);
            const lastTimestamp = lastBlock.timestamp;
            await expect(
                await layer0.connect(addr2).balanceOf(addr2.address)
            ).to.equal(2);
            await expect(
                await layer0.ownerOf(1)
            ).to.equal(addr2.address);
            await expect(
                await layer0.ownerOf(2)
            ).to.equal(addr2.address);
            await expect(
                await layer0.holderSince(1)
            ).to.equal(lastTimestamp);
            await expect(
                await layer0.ownerSince(1)
            ).to.equal(lastTimestamp);
            await expect(
                await layer0.holderSince(2)
            ).to.equal(lastTimestamp);
            await expect(
                await layer0.ownerSince(2)
            ).to.equal(lastTimestamp);
            await expect(
                await layer0.tokenIdDNA(1)
            ).to.equal(traitVault.address);
            await expect(
                await layer0.tokenIdDNA(2)
            ).to.equal(traitVault.address);
            await expect(
                await layer0.genesisSupply()
            ).to.equal(2)
        });

        it("Should let mint 15 tokens", async function () {
            advanceBlocks(3000);
            await layer0.connect(traitsSigner).genesisMint(15, addr2.address);
            const lastBlockNumber = await ethers.provider.getBlockNumber();
            const lastBlock = await ethers.provider.getBlock(lastBlockNumber);
            const lastTimestamp = lastBlock.timestamp;
            await expect(
                await layer0.connect(addr2).balanceOf(addr2.address)
            ).to.be.equal(15);
            for (i = 1; i <= 15; i++) {
                await expect(
                    await layer0.ownerOf(i)
                ).to.equal(addr2.address);
                await expect(
                    await layer0.holderSince(i)
                ).to.equal(lastTimestamp);
                await expect(
                    await layer0.ownerSince(i)
                ).to.equal(lastTimestamp);
                await expect(
                    await layer0.tokenIdDNA(i)
                ).to.equal(traitVault.address);
            }
            await expect(
                await layer0.genesisSupply()
            ).to.equal(15)
        });
    });

    describe('Tests of "postGenesisMint"', async function () {
        it("Should revert if caller is not DNA", async function () {
            await expect(
                layer0.connect(addr2).postGenesisMint(1, addr1.address)
            ).to.be.revertedWith("RegensZero: Caller must be DNA.");
        });

        it("Should not mint if amount equals 0", async function () {
            await layer0.connect(owner).setNewDNA(addr1.address);
            await layer0.connect(addr1).postGenesisMint(0, addr2.address);
            await expect(
                await layer0.connect(addr2).balanceOf(addr2.address)
            ).to.equal(0);
            await expect(
                await layer0.getPostGenesisSupply()
            ).to.equal(0)
        });

        it("Should let mint 1 token", async function () {
            await layer0.connect(owner).setNewDNA(addr1.address);
            await layer0.connect(addr1).postGenesisMint(1, addr2.address);
            const lastBlockNumber = await ethers.provider.getBlockNumber();
            const lastBlock = await ethers.provider.getBlock(lastBlockNumber);
            const lastTimestamp = lastBlock.timestamp;
            await expect(
                await layer0.connect(addr2).balanceOf(addr2.address)
            ).to.equal(1);
            await expect(
                await layer0.ownerOf(10001)
            ).to.equal(addr2.address);
            await expect(
                await layer0.holderSince(10001)
            ).to.equal(lastTimestamp);
            await expect(
                await layer0.ownerSince(10001)
            ).to.equal(lastTimestamp);
            await expect(
                await layer0.tokenIdDNA(10001)
            ).to.equal(addr1.address);
            await expect(
                await layer0.getPostGenesisSupply()
            ).to.equal(1)
        });

        it("Should let mint 2 tokens", async function () {
            await layer0.connect(owner).setNewDNA(addr1.address);
            await layer0.connect(addr1).postGenesisMint(2, addr2.address);
            const lastBlockNumber = await ethers.provider.getBlockNumber();
            const lastBlock = await ethers.provider.getBlock(lastBlockNumber);
            const lastTimestamp = lastBlock.timestamp;
            await expect(
                await layer0.connect(addr2).balanceOf(addr2.address)
            ).to.equal(2);
            await expect(
                await layer0.ownerOf(10001)
            ).to.equal(addr2.address);
            await expect(
                await layer0.ownerOf(10002)
            ).to.equal(addr2.address);
            await expect(
                await layer0.holderSince(10001)
            ).to.equal(lastTimestamp);
            await expect(
                await layer0.ownerSince(10001)
            ).to.equal(lastTimestamp);
            await expect(
                await layer0.holderSince(10002)
            ).to.equal(lastTimestamp);
            await expect(
                await layer0.ownerSince(10002)
            ).to.equal(lastTimestamp);
            await expect(
                await layer0.tokenIdDNA(10001)
            ).to.equal(addr1.address);
            await expect(
                await layer0.tokenIdDNA(10002)
            ).to.equal(addr1.address);
            await expect(
                await layer0.getPostGenesisSupply()
            ).to.equal(2)
        });

        it("Should let mint 15 tokens", async function () {
            advanceBlocks(3000);
            await layer0.connect(owner).setNewDNA(addr1.address);
            await layer0.connect(traitsSigner).genesisMint(15, addr3.address);
            const lastBlockNumber1 = await ethers.provider.getBlockNumber();
            const lastBlock1 = await ethers.provider.getBlock(lastBlockNumber1);
            const lastTimestamp1 = lastBlock1.timestamp;
            await layer0.connect(addr1).postGenesisMint(15, addr2.address);
            const lastBlockNumber = await ethers.provider.getBlockNumber();
            const lastBlock = await ethers.provider.getBlock(lastBlockNumber);
            const lastTimestamp = lastBlock.timestamp;
            await expect(
                await layer0.connect(addr2).balanceOf(addr2.address)
            ).to.be.equal(15);
            for (i = 1; i <= 15; i++) {
                await expect(
                    await layer0.ownerOf(10000 + i)
                ).to.equal(addr2.address);
                await expect(
                    await layer0.holderSince(10000 + i)
                ).to.equal(lastTimestamp);
                await expect(
                    await layer0.ownerSince(10000 + i)
                ).to.equal(lastTimestamp);
                await expect(
                    await layer0.tokenIdDNA(10000 + i)
                ).to.equal(addr1.address);
                await expect(
                    await layer0.ownerOf(i)
                ).to.equal(addr3.address);
                await expect(
                    await layer0.holderSince(i)
                ).to.equal(lastTimestamp1);
                await expect(
                    await layer0.ownerSince(i)
                ).to.equal(lastTimestamp1);
                await expect(
                    await layer0.tokenIdDNA(i)
                ).to.equal(traitVault.address);
            }
            await expect(
                await layer0.getPostGenesisSupply()
            ).to.equal(15)
        });
    });

    describe('Tests of "transferFrom" and "safeTransferFrom"', async function () {
        it("transferFrom: Should correctly reset controller and signer after transfer", async function () {
            advanceBlocks(3000);
            await layer0.connect(traitsSigner).genesisMint(1, addr2.address);
            await layer0.connect(addr2).setSigner(1, addr4.address);
            await layer0.connect(addr2).setController(1, addr4.address);
            await expect(
                layer0.connect(addr2).transferFrom(addr2.address, addr3.address, BigNumber.from(1))
            ).not.to.be.reverted;
            await expect(
                await layer0.ownerOf(1)
            ).to.be.equal(addr3.address);
            await expect(
                await layer0.getController(1)
            ).to.equal(ethers.constants.AddressZero);
            await expect(
                await layer0.getSigner(1)
            ).to.equal(ethers.constants.AddressZero);
        });

        it("transferFrom: Should correctly reset ownerSince and holderSince", async function () {
            advanceBlocks(3000);
            await layer0.connect(traitsSigner).genesisMint(1, addr2.address);
            await layer0.connect(addr2).setSigner(1, addr4.address);
            await layer0.connect(addr2).setController(1, addr4.address);
            await expect(
                layer0.connect(addr2).transferFrom(addr2.address, addr3.address, BigNumber.from(1))
            ).not.to.be.reverted;
            const lastBlockNumber = await ethers.provider.getBlockNumber();
            const lastBlock = await ethers.provider.getBlock(lastBlockNumber);
            const lastTimestamp = lastBlock.timestamp;
            await expect(
                await layer0.ownerOf(1)
            ).to.be.equal(addr3.address);
            await expect(
                await layer0.holderSince(1)
            ).to.equal(lastTimestamp);
            await expect(
                await layer0.ownerSince(1)
            ).to.equal(lastTimestamp);
        });

        it("safeTransferFrom: Should correctly reset controller and signer after transfer", async function () {
            advanceBlocks(3000);
            await layer0.connect(traitsSigner).genesisMint(1, addr2.address);
            await layer0.connect(addr2).setSigner(1, addr4.address);
            await layer0.connect(addr2).setController(1, addr4.address);
            await layer0.connect(addr2)['safeTransferFrom(address,address,uint256)'](
                addr2.address,
                addr3.address,
                1
            );
            await expect(
                await layer0.ownerOf(1)
            ).to.be.equal(addr3.address);
            await expect(
                await layer0.getController(1)
            ).to.equal(ethers.constants.AddressZero);
            await expect(
                await layer0.getSigner(1)
            ).to.equal(ethers.constants.AddressZero);
        });

        it("safeTransferFrom: Should correctly reset ownerSince and holderSince", async function () {
            advanceBlocks(3000);
            await layer0.connect(traitsSigner).genesisMint(1, addr2.address);
            await layer0.connect(addr2).setSigner(1, addr4.address);
            await layer0.connect(addr2).setController(1, addr4.address);
            await layer0.connect(addr2)['safeTransferFrom(address,address,uint256)'](
                addr2.address,
                addr3.address,
                1
            );
            const lastBlockNumber = await ethers.provider.getBlockNumber();
            const lastBlock = await ethers.provider.getBlock(lastBlockNumber);
            const lastTimestamp = lastBlock.timestamp;
            await expect(
                await layer0.ownerOf(1)
            ).to.be.equal(addr3.address);
            await expect(
                await layer0.holderSince(1)
            ).to.equal(lastTimestamp);
            await expect(
                await layer0.ownerSince(1)
            ).to.equal(lastTimestamp);
        });
    });

    describe('Tests of "transferHoldership"', async function () {
        it("Should not let transfer holdership through transfer approval", async function () {
            advanceBlocks(3000);
            await layer0.connect(traitsSigner).genesisMint(1, addr2.address);;
            await layer0.connect(addr2).approve(addr1.address, 1);
            await expect(
                layer0.connect(addr1).transferHoldership(addr2.address, addr3.address, BigNumber.from(1))
            ).to.be.revertedWith("RegensZero: Only token owner can transfer holdership");
            await expect(
                await layer0.ownerOf(1)
            ).to.be.equal(addr2.address);
        });

        it("Should not change signer and controller if holdership transfered", async function () {
            advanceBlocks(3000);
            await layer0.connect(traitsSigner).genesisMint(1, addr2.address);;
            await layer0.connect(addr2).setController(1, addr1.address);
            await layer0.connect(addr2).setSigner(1, addr3.address);
            await expect(
                layer0.connect(addr2).transferHoldership(addr2.address, addr3.address, BigNumber.from(1))
            ).not.to.be.reverted;
            await expect(
                await layer0.ownerOf(1)
            ).to.be.equal(addr3.address);
            await expect(
                await layer0.getController(1)
            ).to.equal(addr1.address);
            await expect(
                await layer0.getSigner(1)
            ).to.equal(addr3.address);
        });

        it("Should change ownerSince but not holderSince", async function () {
            advanceBlocks(3000);
            await layer0.connect(traitsSigner).genesisMint(1, addr2.address);;
            let hSince = await layer0.holderSince(1);
            await layer0.connect(addr2).transferHoldership(addr2.address, addr3.address, BigNumber.from(1));
            const lastBlockNumber = await ethers.provider.getBlockNumber();
            const lastBlock = await ethers.provider.getBlock(lastBlockNumber);
            const lastTimestamp = lastBlock.timestamp;
            await expect(
                await layer0.ownerOf(1)
            ).to.be.equal(addr3.address);
            await expect(
                await layer0.holderSince(1)
            ).to.equal(hSince);
            await expect(
                await layer0.ownerSince(1)
            ).to.equal(lastTimestamp);
        });
    });

    describe('Tests of "tokenURI"', async function () {
        it("Should revert if token does not exist", async function () {
            await expect(layer0.connect(addr1).tokenURI(1)).to.be.revertedWith("ERC721Metadata: URI query for nonexistent token.");
        });
    });

    describe('Tests of "royaltyInfo"', async function () {
        it("Should revert if token does not exist", async function () {
            await expect(layer0.connect(addr1).royaltyInfo(1, ethers.utils.parseEther("0.0853"))).to.be.revertedWith("RegensZero: RoyaltieInfo query for nonexistent token.");
        });

        it("Should return value", async function () {
            await layer0.connect(traitsSigner).genesisMint(1, addr2.address);
            value = await layer0.connect(addr1).royaltyInfo(1, ethers.utils.parseEther("0.0853"));
            await expect(value[0]).to.eq(ethers.constants.AddressZero);
            await expect(value[1]).to.eq(BigNumber.from(0))
        });
    });

    ////////////////////
    // Util functions //
    ////////////////////

    function advanceBlocks(number) {
        let _number = BigNumber.from(number);
        let mod = _number.mod(500).toNumber();
        let div = _number.div(500).toNumber();
        let param = hexFrom(500);
        for (let i = 0; i < div; i++) {
            network.provider.send("hardhat_mine", [param]);
            ethers.provider.getBlockNumber();
        }
        param = hexFrom(mod);
        network.provider.send("hardhat_mine", [param]);
        if (hre.__SOLIDITY_COVERAGE_RUNNING === true) {
            network.provider.send('hardhat_setNextBlockBaseFeePerGas', ['0x1']);
        }
    }

    function hexFrom(number) {
        return ("0x").concat(number.toString(16));
    }
});