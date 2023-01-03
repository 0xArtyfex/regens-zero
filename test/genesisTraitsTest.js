const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");

describe('"GenesisTraits" Testing', function () {
    let owner, addr1, addr2, addr3, addr4,
        addr5, addr6, addr7, addr8, addr9;
    let layer0, layer1, tokenUri, traitVault;
    let blockNum;
    let cap, percentage;

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
            addr10,
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
        cap = [3, 3, 5, 5, 5, 5];
        percentage = [2, 8, 2, 3, 5, 20];
        layer1 = await layer1TokenFactory.connect(owner).deploy(cap, percentage);
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
            for (i = 0; i < 6; i++) {
                await expect(await layer1.positionsNextToken(i * 2)).to.equal(1000000 * i * 2 + 10000);
            }
            await expect(await layer1.collectionName()).to.equal("GenesisTraits");

            // Setted in beforeEach
            await expect(await layer1.regensZero()).to.equal(layer0.address);

            for (i = 0; i < 6; i++) {
                await expect(await layer1.traitCap(i * 2)).to.equal(cap[i]);
                await expect(await layer1.traitPercentage(i * 2)).to.equal(percentage[i]);
            }
        });
    });

    describe('Tests of "setImageURI"', async function () {
        it("Should correctly set image uri when called by owner", async function () {
            await expect(layer1.connect(owner).setImageURI("test_image_uri/")).not.to.be.reverted;
        });

        it("Should correctly return tokenImage after reveal, after image uri change", async function () {
            advanceBlocks(3000);

            await network.provider.send("evm_setNextBlockTimestamp", [1904083200]);
            await traitVault.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.1") });
            await traitVault.connect(addr1).mintTraits(1);

            await network.provider.send("evm_setNextBlockTimestamp", [2061849600]);
            await reveal()

            await expect(await layer1.tokenImage(1)).to.equal("genesis-traits/image-uri/2.png");

            await layer1.connect(owner).setImageURI("test_image_uri/");
            await expect(await layer1.tokenImage(1)).to.equal("test_image_uri/2.png");
        });

        it("Should revert when called by non-owner", async function () {
            await expect(layer1.connect(addr1).setImageURI("test_image_uri/")).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe('Tests of "setBaseURI"', async function () {
        it("Should correctly set base uri when called by owner", async function () {
            await expect(layer1.connect(owner).setBaseURI("test_base_uri/")).not.to.be.reverted;
        });

        it("Should correctly return tokenUri after reveal, after base uri change", async function () {
            advanceBlocks(3000);

            await network.provider.send("evm_setNextBlockTimestamp", [1904083200]);
            await traitVault.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.1") });
            await traitVault.connect(addr1).mintTraits(1);

            await network.provider.send("evm_setNextBlockTimestamp", [2061849600]);
            await reveal()

            await expect(await layer1.tokenURI(1)).to.equal("genesis-traits/base-uri/2.json");

            await layer1.connect(owner).setBaseURI("test_base_uri/");
            await expect(await layer1.tokenURI(1)).to.equal("test_base_uri/2.json");
        });

        it("Should revert when called by non-owner", async function () {
            await expect(layer1.connect(addr1).setBaseURI("test_base_uri/")).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe('Tests of "setPreRevealUri"', async function () {
        it("Should correctly set pre-reveal uri when called by owner", async function () {
            await expect(layer1.connect(owner).setPreRevealUri("test_pre_reveal_uri/")).not.to.be.reverted;
        });

        it("Should correctly return tokenUri before reveal, after pre reveal uri change", async function () {
            advanceBlocks(3000);

            await traitVault.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.1") });
            await traitVault.connect(addr1).mintTraits(1);

            await expect(await layer1.tokenURI(1)).to.equal("genesis-traits/pre-reveal-uri");

            await layer1.connect(owner).setPreRevealUri("test_pre_reveal_uri/");
            await expect(await layer1.tokenURI(1)).to.equal("test_pre_reveal_uri/");
        });

        it("Should revert when called by non-owner", async function () {
            await expect(layer1.connect(addr1).setPreRevealUri("test_pre_reveal_uri/")).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe('Tests of "setTraitsVault"', async function () {
        it("Should only let owner set traitVault once", async function () {
            await expect(layer1.connect(owner).setTraitsVault(addr3.address)).to.be.revertedWith("GenesisTraits: traitVault can only be set once");
            await expect(await layer1.traitVault()).to.equal(traitVault.address);
        });

        it("Should only let owner set traitsVault", async function () {
            advanceBlocks(3000);
            await expect(layer1.connect(addr1).setTraitsVault(traitVault.address)).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe('Tests of "setRegensZero"', async function () {
        it("Should only let owner set regensZero once", async function () {
            await expect(layer1.connect(owner).setRegensZero(addr3.address)).to.be.revertedWith("GenesisTraits: regensZero can only be set once");
            await expect(await layer1.regensZero()).to.equal(layer0.address);
        });

        it("Should only let owner set regensZero", async function () {
            advanceBlocks(3000);
            await expect(layer1.connect(addr1).setRegensZero(layer0.address)).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe('Test of "setTraitName"', async function () {
        it("Should not let owner set trait name 0", async function () {
            await expect(layer1.connect(owner).setTraitName("test_trait_name", 0)).to.be.revertedWith("GenesisTraits: traitNameId must be greater than 0");
        });

        it("Should not let owner set an empty trait name", async function () {
            await expect(layer1.connect(owner).setTraitName("", 1)).to.be.revertedWith("GenesisTraits: Trait name cannot be empty");
        });

        it("Should let owner set a trait name", async function () {
            advanceBlocks(3000);

            await network.provider.send("evm_setNextBlockTimestamp", [1904083200]);
            await layer1.connect(owner).reveal(
                [
                    "test_name_1",
                    "test_name_2",
                    "test_name_3"
                ]
            );

            await network.provider.send("evm_setNextBlockTimestamp", [2061849601]);
            await traitVault.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.1") });
            await traitVault.connect(addr1).mintTraits(1);

            await expect(await layer1.traitName(1)).to.equal("test_name_1");

            await network.provider.send("evm_setNextBlockTimestamp", [2061859601]);
            await traitVault.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.1") });
            await traitVault.connect(addr1).mintTraits(2);

            await expect(await layer1.traitName(2)).to.equal("test_name_2");

            await network.provider.send("evm_setNextBlockTimestamp", [2061869607]);
            await traitVault.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.1") });
            await traitVault.connect(addr1).mintTraits(3);

            await expect(await layer1.traitName(3)).to.equal("test_name_3");

            await expect(layer1.connect(owner).setTraitName("test_new_name1", 1)).not.to.be.reverted;
            await expect(await layer1.traitName(1)).to.equal("test_new_name1");

            await expect(layer1.connect(owner).setTraitName("test_new_name2", 2)).not.to.be.reverted;
            await expect(await layer1.traitName(2)).to.equal("test_new_name2");

            await expect(layer1.connect(owner).setTraitName("test_new_name3", 3)).not.to.be.reverted;
            await expect(await layer1.traitName(3)).to.equal("test_new_name3");
        });

        it("Should only let owner set trait name", async function () {
            await expect(layer1.connect(addr1).setTraitName("test_trait_name", 1)).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe('Test of "reveal"', async function () {
        it("Should let owner call function", async function () {
            await expect(layer1.connect(owner).reveal([])).not.to.be.reverted;
        });

        it("Should correctly set generalSalt", async function () {
            await network.provider.send("evm_setNextBlockTimestamp", [1904083200]);
            await layer1.connect(owner).reveal([]);
            await expect(await layer1.generalSalt()).to.equal(1904083200);
        });

        it("Should correctly set revealed names", async function () {
            advanceBlocks(3000);

            await network.provider.send("evm_setNextBlockTimestamp", [1904083200]);
            await layer1.connect(owner).reveal(
                [
                    "test_name_1",
                    "test_name_2",
                    "test_name_3"
                ]
            );

            await network.provider.send("evm_setNextBlockTimestamp", [2061849601]);
            await traitVault.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.1") });
            await traitVault.connect(addr1).mintTraits(1);

            await expect(await layer1.traitName(1)).to.equal("test_name_1");

            await network.provider.send("evm_setNextBlockTimestamp", [2061859601]);
            await traitVault.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.1") });
            await traitVault.connect(addr1).mintTraits(2);

            await expect(await layer1.traitName(2)).to.equal("test_name_2");

            await network.provider.send("evm_setNextBlockTimestamp", [2061869607]);
            await traitVault.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.1") });
            await traitVault.connect(addr1).mintTraits(3);

            await expect(await layer1.traitName(3)).to.equal("test_name_3");
        });
    });

    describe('Tests of "tokenUri"', async function () {
        it("Should revert if token does not exist", async function () {
            await expect(layer1.connect(addr1).tokenURI(BigNumber.from(1))).to.be.revertedWith("ERC721Metadata: URI query for nonexistent token");
        });

        it("Should let retrieve token uri for an existing token", async function () {
            advanceBlocks(3000);
            await traitVault.connect(addr2).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await traitVault.connect(addr2).mintTraits(1);
            await expect(await layer1.connect(addr1).tokenURI(BigNumber.from(1))).to.eq("genesis-traits/pre-reveal-uri");
        });

        it("Should let owner set token uri", async function () {
            advanceBlocks(3000);
            await expect(layer1.connect(owner).setBaseURI("uriNueva")).not.to.be.reverted;
        });

        it("Should return 'initial_pre_reveal_uri' if salt = 0", async function () {
            advanceBlocks(3000);
            await traitVault.connect(addr2).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await traitVault.connect(addr2).mintTraits(1);
            await expect(await layer1.connect(addr2).tokenURI(1)).to.eq("genesis-traits/pre-reveal-uri");
        });

        it("Should return 'initial_pre_reveal_uri' if salt = 0, even when setting baseURI", async function () {
            advanceBlocks(3000);
            await layer1.connect(owner).setBaseURI("uriNueva");
            await traitVault.connect(addr2).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await traitVault.connect(addr2).mintTraits(1);
            await expect(await layer1.connect(addr2).tokenURI(1)).to.eq("genesis-traits/pre-reveal-uri");
        });

        it("Should only let owner set token uri", async function () {
            advanceBlocks(3000);
            await expect(layer1.connect(addr1).setBaseURI("uriNueva")).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe('Tests of "tokenImage"', async function () {
        it("Should let retrieve token image for an existing token", async function () {
            advanceBlocks(3000);
            await traitVault.connect(addr2).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await traitVault.connect(addr2).mintTraits(1);
            await expect(await layer1.connect(addr1).tokenImage(BigNumber.from(1))).to.eq("");
        });

        it("Should let owner set image uri", async function () {
            advanceBlocks(3000);
            await expect(layer1.connect(owner).setImageURI("uriNueva")).not.to.be.reverted;
        });

        it("Should return '' if salt = 0", async function () {
            advanceBlocks(3000);
            await traitVault.connect(addr2).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await traitVault.connect(addr2).mintTraits(1);
            await expect(await layer1.connect(addr2).tokenImage(1)).to.eq('');
        });

        it("Should return '' if salt = 0, even when setting baseURI", async function () {
            advanceBlocks(3000);
            await layer1.connect(owner).setImageURI("uriNueva");
            await traitVault.connect(addr2).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await traitVault.connect(addr2).mintTraits(1);
            await expect(await layer1.connect(addr2).tokenImage(1)).to.eq('');
        });

        it("Should only let owner set image uri", async function () {
            advanceBlocks(3000);
            await expect(layer1.connect(addr1).setImageURI("uriNueva")).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe('Tests of "transferSpecial"', async function () {
        it("Should not let address different than traitsVault use transferSpecial, owner makes transfer", async function () {
            advanceBlocks(3000);
            await traitVault.connect(addr2).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await traitVault.connect(addr2).mintTraits(1);
            await expect(layer1.connect(addr2).transferSpecial(1, addr2.address)).to.be.revertedWith("GenesisTraits: Sender can only be traitsVault.");

        });

        it("Should not let address different than traitsVault use transferSpecial, random address tries to use it", async function () {
            advanceBlocks(3000);
            await traitVault.connect(addr2).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await traitVault.connect(addr2).mintTraits(1);
            await expect(layer1.connect(addr5).transferSpecial(1, addr2.address)).to.be.revertedWith("GenesisTraits: Sender can only be traitsVault.");

        });
    });

    describe('Tests of "mintTraits"', async function () {
        it("Should not let address different than traitsVault use mintTraits, owner makes transfer", async function () {
            advanceBlocks(3000);
            await traitVault.connect(addr2).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await expect(layer1.connect(addr5).mintTraits(1)).to.be.revertedWith("GenesisTraits: Sender can only be traitsVault.");
        });

        it("Should not let address different than traitsVault use mintTraits, random address tries to use it", async function () {
            advanceBlocks(3000);
            await traitVault.connect(addr2).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await expect(layer1.connect(addr5).mintTraits(1)).to.be.revertedWith("GenesisTraits: Sender can only be traitsVault.");
        });
    });

    describe('Tests of "supportsInterface"', async function () {
        it("Should support IERC721 interface", async function () {
            await expect(await layer1.connect(addr1).supportsInterface(0x5b5e139f)).to.be.true;
        });

        it("Should support IERC721Metadata interface", async function () {
            await expect(await layer1.connect(addr1).supportsInterface(0x80ac58cd)).to.be.true;
        });

        it("Should support IERC721Enumerable interface", async function () {
            await expect(await layer1.connect(addr1).supportsInterface(0x780e9d63)).to.be.true;

        });

        it("Should support IERC165 interface", async function () {
            await expect(await layer1.connect(addr1).supportsInterface(0x01ffc9a7)).to.be.true;
        });

        it("Should support ITraitCollection interface", async function () {
            await expect(await layer1.connect(addr1).supportsInterface(0x9a311939)).to.be.true;
        });

        it("Should support IGenesisCollection interface", async function () {
            await expect(await layer1.connect(addr1).supportsInterface(0x67ca90af)).to.be.true;
        });

        it("Should be false for interface 0xffffffff", async function () {
            await expect(await layer1.connect(addr1).supportsInterface(0xffffffff)).to.be.false;
        });

        it("Should be false for any other interface", async function () {
            await expect(await layer1.connect(addr1).supportsInterface(0xab2721cd)).to.be.false;
        });
    });

    describe('Tests of "claimBackground"', async function () {
        it("Should revert if token not from genesisDNA", async function () {
            advanceBlocks(3000);
            await layer0.connect(owner).setNewDNA(addr1.address);
            await layer0.connect(addr1).postGenesisMint(1, addr2.address);
            await expect(layer1.connect(addr2).claimBackground(10001)).to.be.revertedWith("GenesisTraits: This tokenId does not have genesisDNA")
        });

        it("Should only let owner or controller claim for tokenId", async function () {
            advanceBlocks(3000);
            await traitVault.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await traitVault.connect(addr2).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await expect(layer1.connect(addr2).claimBackground(1)).to.be.revertedWith("GenesisTraits: Sender can only be owner or controller of tokenId.")
        });

        it("Should revert if tokens already claimed", async function () {
            advanceBlocks(3000);
            await traitVault.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })
            for (i = 0; i < 4; i++) {
                layer1.connect(addr1).claimBackground(1)
            }
            await expect(layer1.connect(addr1).claimBackground(1))
                .to.be.revertedWith("GenesisTraits: This tokenId has no more claiming tokens")
        });

        it("Should correctly mint tokens (mints correct number and tokensClaimed increases by one) when owner calls", async function () {
            advanceBlocks(3000);
            await traitVault.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await layer1.connect(addr1).claimBackground(1)
            await expect((await layer1.positionsNextToken(0))).to.equal(BigNumber.from(10001));
            await expect((await layer1.tokensClaimed(1))).to.equal(BigNumber.from(1));
            await expect(await layer1.ownerOf(10001)).to.eq(addr1.address);
            await expect(await layer1.balanceOf(addr1.address)).to.eq(1);
        });

        it("Should correctly mint tokens (mints correct number and tokensClaimed increases by one) when controller calls", async function () {
            advanceBlocks(3000);
            await traitVault.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await layer0.connect(addr1).setController(1, addr2.address)
            await expect(layer1.connect(addr2).claimBackground(1)).not.to.be.reverted;
            await expect((await layer1.positionsNextToken(0))).to.equal(BigNumber.from(10001));
            await expect((await layer1.tokensClaimed(1))).to.equal(BigNumber.from(1));
            await expect(await layer1.ownerOf(10001)).to.eq(addr1.address);
            await expect(await layer1.balanceOf(addr1.address)).to.eq(1);
        });

        it("Should correctly mint tokens more than one token", async function () {
            advanceBlocks(3000);
            for (i = 1; i < 10; i++) {
                let address = ethers.utils.getContractAddress(
                    {
                        from: "0x000000000000000000000000000000000000dEaD",
                        nonce: 1 + i

                    }
                );
                tx = {
                    to: address,
                    value: "0x1BC16D674EC80000"
                }
                await addr2.sendTransaction(tx);
                await hre.network.provider.request({
                    method: "hardhat_impersonateAccount",
                    params: [address.toString()],
                });
                const signer = await ethers.getSigner(address);
                await expect(traitVault.connect(signer).mint(1, { value: ethers.utils.parseEther("0.0853") })).not.to.be.reverted;
                await expect(layer1.connect(signer).claimBackground(i)).not.to.be.reverted;
                await expect((await layer1.connect(signer).positionsNextToken(0))).to.equal(BigNumber.from(10000 + i));
                await expect((await layer1.connect(signer).tokensClaimed(i))).to.equal(1);
                await expect(await layer1.connect(signer).ownerOf(10000 + i)).to.eq(signer.address);
                await expect(await layer1.connect(signer).balanceOf(signer.address)).to.eq(1);
            }
        });

        it("Minted attribute should be of correct layer", async function () {
            advanceBlocks(3000);

            await network.provider.send("evm_setNextBlockTimestamp", [1904083200]);
            await traitVault.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })

            await reveal();

            await network.provider.send("evm_setNextBlockTimestamp", [2061849601]);
            await layer1.connect(addr1).claimBackground(1);
            await expect(await layer1.traitName(10001)).to.eq("fondo2");
        });
    });

    describe('Tests of "claimSkin"', async function () {
        it("Should revert if token not from genesisDNA", async function () {
            advanceBlocks(3000);
            await layer0.connect(owner).setNewDNA(addr1.address);
            await layer0.connect(addr1).postGenesisMint(1, addr2.address);
            await expect(layer1.connect(addr2).claimSkin(10001)).to.be.revertedWith("GenesisTraits: This tokenId does not have genesisDNA")
        });

        it("Should only let owner or controller claim for tokenId", async function () {
            advanceBlocks(3000);
            await traitVault.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await traitVault.connect(addr2).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await expect(layer1.connect(addr2).claimSkin(1)).to.be.revertedWith("GenesisTraits: Sender can only be owner or controller of tokenId.")
        });

        it("Should revert if tokens already claimed", async function () {
            advanceBlocks(3000);
            await traitVault.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })
            for (i = 0; i < 4; i++) {
                layer1.connect(addr1).claimSkin(1)
            }
            await expect(layer1.connect(addr1).claimSkin(1))
                .to.be.revertedWith("GenesisTraits: This tokenId has no more claiming tokens")
        });

        it("Should correctly mint tokens (mints correct number and tokensClaimed increases by one) when owner calls", async function () {
            advanceBlocks(3000);
            await traitVault.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await layer1.connect(addr1).claimSkin(1)
            await expect((await layer1.positionsNextToken(2))).to.equal(BigNumber.from(2010001));
            await expect((await layer1.tokensClaimed(1))).to.equal(BigNumber.from(1));
            await expect(await layer1.ownerOf(2010001)).to.eq(addr1.address);
            await expect(await layer1.balanceOf(addr1.address)).to.eq(1);
        });

        it("Should correctly mint tokens (mints correct number and tokensClaimed increases by one) when controller calls", async function () {
            advanceBlocks(3000);
            await traitVault.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await layer0.connect(addr1).setController(1, addr2.address)
            await expect(layer1.connect(addr2).claimSkin(1)).not.to.be.reverted;
            await expect((await layer1.positionsNextToken(2))).to.equal(BigNumber.from(2010001));
            await expect((await layer1.tokensClaimed(1))).to.equal(BigNumber.from(1));
            await expect(await layer1.ownerOf(2010001)).to.eq(addr1.address);
            await expect(await layer1.balanceOf(addr1.address)).to.eq(1);
        });

        it("Should correctly minttraits.connect(signer) tokens more than one token", async function () {
            advanceBlocks(3000);
            for (i = 1; i < 10; i++) {
                let address = ethers.utils.getContractAddress(
                    {
                        from: "0x000000000000000000000000000000000000dEaD",
                        nonce: 1 + i

                    }
                );
                tx = {
                    to: address,
                    value: "0x1BC16D674EC80000"
                }
                await addr2.sendTransaction(tx);
                await hre.network.provider.request({
                    method: "hardhat_impersonateAccount",
                    params: [address.toString()],
                });
                const signer = await ethers.getSigner(address);
                await expect(traitVault.connect(signer).mint(1, { value: ethers.utils.parseEther("0.0853") })).not.to.be.reverted;
                await expect(layer1.connect(signer).claimSkin(i)).not.to.be.reverted;
                await expect((await layer1.connect(signer).positionsNextToken(2))).to.equal(BigNumber.from(2010000 + i));
                await expect((await layer1.connect(signer).tokensClaimed(i))).to.equal(1);
                await expect(await layer1.connect(signer).ownerOf(2010000 + i)).to.eq(signer.address);
                await expect(await layer1.connect(signer).balanceOf(signer.address)).to.eq(1);
            }
        });

        it("Minted attribute should be of correct layer", async function () {
            advanceBlocks(3000);

            await network.provider.send("evm_setNextBlockTimestamp", [1904083200]);
            await traitVault.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })

            await reveal();

            await network.provider.send("evm_setNextBlockTimestamp", [2061849601]);
            await layer1.connect(addr1).claimSkin(1);
            await expect(await layer1.traitName(2010001)).to.eq("skin2");
        });
    });

    describe('Tests of "claimEyes"', async function () {
        it("Should revert if token not from genesisDNA", async function () {
            advanceBlocks(3000);
            await layer0.connect(owner).setNewDNA(addr1.address);
            await layer0.connect(addr1).postGenesisMint(1, addr2.address);
            await expect(layer1.connect(addr2).claimEyes(10001)).to.be.revertedWith("GenesisTraits: This tokenId does not have genesisDNA")
        });

        it("Should only let owner or controller claim for tokenId", async function () {
            advanceBlocks(3000);
            await traitVault.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await traitVault.connect(addr2).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await expect(layer1.connect(addr2).claimEyes(1)).to.be.revertedWith("GenesisTraits: Sender can only be owner or controller of tokenId.")
        });

        it("Should revert if tokens already claimed", async function () {
            advanceBlocks(3000);
            await traitVault.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })
            for (i = 0; i < 4; i++) {
                layer1.connect(addr1).claimEyes(1)
            }
            await expect(layer1.connect(addr1).claimEyes(1))
                .to.be.revertedWith("GenesisTraits: This tokenId has no more claiming tokens")
        });

        it("Should correctly mint tokens (mints correct number and tokensClaimed increases by one) when owner calls", async function () {
            advanceBlocks(3000);
            await traitVault.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await layer1.connect(addr1).claimEyes(1)
            await expect((await layer1.positionsNextToken(4))).to.equal(BigNumber.from(4010001));
            await expect((await layer1.tokensClaimed(1))).to.equal(BigNumber.from(1));
            await expect(await layer1.ownerOf(4010001)).to.eq(addr1.address);
            await expect(await layer1.balanceOf(addr1.address)).to.eq(1);
        });

        it("Should correctly mint tokens (mints correct number and tokensClaimed increases by one) when controller calls", async function () {
            advanceBlocks(3000);
            await traitVault.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await layer0.connect(addr1).setController(1, addr2.address)
            await expect(layer1.connect(addr2).claimEyes(1)).not.to.be.reverted;
            await expect((await layer1.positionsNextToken(4))).to.equal(BigNumber.from(4010001));
            await expect((await layer1.tokensClaimed(1))).to.equal(BigNumber.from(1));
            await expect(await layer1.ownerOf(4010001)).to.eq(addr1.address);
            await expect(await layer1.balanceOf(addr1.address)).to.eq(1);
        });

        it("Should correctly mint tokens more than one token", async function () {
            advanceBlocks(3000);
            for (i = 1; i < 10; i++) {
                let address = ethers.utils.getContractAddress(
                    {
                        from: "0x000000000000000000000000000000000000dEaD",
                        nonce: 1 + i

                    }
                );
                tx = {
                    to: address,
                    value: "0x1BC16D674EC80000"
                }
                await addr2.sendTransaction(tx);
                await hre.network.provider.request({
                    method: "hardhat_impersonateAccount",
                    params: [address.toString()],
                });
                const signer = await ethers.getSigner(address);
                await expect(traitVault.connect(signer).mint(1, { value: ethers.utils.parseEther("0.0853") })).not.to.be.reverted;
                await expect(layer1.connect(signer).claimEyes(i)).not.to.be.reverted;
                await expect((await layer1.connect(signer).positionsNextToken(4))).to.equal(BigNumber.from(4010000 + i));
                await expect((await layer1.connect(signer).tokensClaimed(i))).to.equal(1);
                await expect(await layer1.connect(signer).ownerOf(4010000 + i)).to.eq(signer.address);
                await expect(await layer1.connect(signer).balanceOf(signer.address)).to.eq(1);
            }
        });

        it("Minted attribute should be of correct layer", async function () {
            advanceBlocks(3000);

            await network.provider.send("evm_setNextBlockTimestamp", [1904083200]);
            await traitVault.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })

            await reveal();

            await network.provider.send("evm_setNextBlockTimestamp", [2061849601]);
            await layer1.connect(addr1).claimEyes(1);
            await expect(await layer1.traitName(4010001)).to.eq("eyes1");
        });
    });

    describe('Tests of "claimHead"', async function () {
        it("Should revert if token not from genesisDNA", async function () {
            advanceBlocks(3000);
            await layer0.connect(owner).setNewDNA(addr1.address);
            await layer0.connect(addr1).postGenesisMint(1, addr2.address);
            await expect(layer1.connect(addr2).claimHead(10001)).to.be.revertedWith("GenesisTraits: This tokenId does not have genesisDNA")
        });

        it("Should only let owner or controller claim for tokenId", async function () {
            advanceBlocks(3000);
            await traitVault.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await traitVault.connect(addr2).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await expect(layer1.connect(addr2).claimHead(1)).to.be.revertedWith("GenesisTraits: Sender can only be owner or controller of tokenId.")
        });

        it("Should revert if tokens already claimed", async function () {
            advanceBlocks(3000);
            await traitVault.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })
            for (i = 0; i < 4; i++) {
                layer1.connect(addr1).claimHead(1)
            }
            await expect(layer1.connect(addr1).claimHead(1))
                .to.be.revertedWith("GenesisTraits: This tokenId has no more claiming tokens")
        });

        it("Should correctly mint tokens (mints correct number and tokensClaimed increases by one) when owner calls", async function () {
            advanceBlocks(3000);
            await traitVault.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await layer1.connect(addr1).claimHead(1)
            await expect((await layer1.positionsNextToken(6))).to.equal(BigNumber.from(6010001));
            await expect((await layer1.tokensClaimed(1))).to.equal(BigNumber.from(1));
            await expect(await layer1.ownerOf(6010001)).to.eq(addr1.address);
            await expect(await layer1.balanceOf(addr1.address)).to.eq(1);
        });

        it("Should correctly mint tokens (mints correct number and tokensClaimed increases by one) when controller calls", async function () {
            advanceBlocks(3000);
            await traitVault.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await layer0.connect(addr1).setController(1, addr2.address)
            await expect(layer1.connect(addr2).claimHead(1)).not.to.be.reverted;
            await expect((await layer1.positionsNextToken(6))).to.equal(BigNumber.from(6010001));
            await expect((await layer1.tokensClaimed(1))).to.equal(BigNumber.from(1));
            await expect(await layer1.ownerOf(6010001)).to.eq(addr1.address);
            await expect(await layer1.balanceOf(addr1.address)).to.eq(1);
        });

        it("Should correctly mint tokens more than one token", async function () {
            advanceBlocks(3000);
            for (i = 1; i < 10; i++) {
                let address = ethers.utils.getContractAddress(
                    {
                        from: "0x000000000000000000000000000000000000dEaD",
                        nonce: 1 + i

                    }
                );
                tx = {
                    to: address,
                    value: "0x1BC16D674EC80000"
                }
                await addr2.sendTransaction(tx);
                await hre.network.provider.request({
                    method: "hardhat_impersonateAccount",
                    params: [address.toString()],
                });
                const signer = await ethers.getSigner(address);
                await expect(traitVault.connect(signer).mint(1, { value: ethers.utils.parseEther("0.0853") })).not.to.be.reverted;
                await expect(layer1.connect(signer).claimHead(i)).not.to.be.reverted;
                await expect((await layer1.connect(signer).positionsNextToken(6))).to.equal(BigNumber.from(6010000 + i));
                await expect((await layer1.connect(signer).tokensClaimed(i))).to.equal(1);
                await expect(await layer1.connect(signer).ownerOf(6010000 + i)).to.eq(signer.address);
                await expect(await layer1.connect(signer).balanceOf(signer.address)).to.eq(1);
            }
        });

        it("Minted attribute should be of correct layer", async function () {
            advanceBlocks(3000);

            await network.provider.send("evm_setNextBlockTimestamp", [1904083200]);
            await traitVault.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })

            await reveal();

            await network.provider.send("evm_setNextBlockTimestamp", [2061849601]);
            await layer1.connect(addr1).claimHead(1);
            await expect(await layer1.traitName(6010001)).to.eq("head1");
        });
    });

    describe('Tests of "claimClothing"', async function () {
        it("Should revert if token not from genesisDNA", async function () {
            advanceBlocks(3000);
            await layer0.connect(owner).setNewDNA(addr1.address);
            await layer0.connect(addr1).postGenesisMint(1, addr2.address);
            await expect(layer1.connect(addr2).claimClothing(10001)).to.be.revertedWith("GenesisTraits: This tokenId does not have genesisDNA")
        });

        it("Should only let owner or controller claim for tokenId", async function () {
            advanceBlocks(3000);
            await traitVault.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await traitVault.connect(addr2).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await expect(layer1.connect(addr2).claimClothing(1)).to.be.revertedWith("GenesisTraits: Sender can only be owner or controller of tokenId.")
        });

        it("Should revert if tokens already claimed", async function () {
            advanceBlocks(3000);
            await traitVault.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })
            for (i = 0; i < 4; i++) {
                layer1.connect(addr1).claimClothing(1)
            }
            await expect(layer1.connect(addr1).claimClothing(1))
                .to.be.revertedWith("GenesisTraits: This tokenId has no more claiming tokens")
        });

        it("Should correctly mint tokens (mints correct number and tokensClaimed increases by one) when owner calls", async function () {
            advanceBlocks(3000);
            await traitVault.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await layer1.connect(addr1).claimClothing(1)
            await expect((await layer1.positionsNextToken(8))).to.equal(BigNumber.from(8010001));
            await expect((await layer1.tokensClaimed(1))).to.equal(BigNumber.from(1));
            await expect(await layer1.ownerOf(8010001)).to.eq(addr1.address);
            await expect(await layer1.balanceOf(addr1.address)).to.eq(1);
        });

        it("Should correctly mint tokens (mints correct number and tokensClaimed increases by one) when controller calls", async function () {
            advanceBlocks(3000);
            await traitVault.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await layer0.connect(addr1).setController(1, addr2.address)
            await expect(layer1.connect(addr2).claimClothing(1)).not.to.be.reverted;
            await expect((await layer1.positionsNextToken(8))).to.equal(BigNumber.from(8010001));
            await expect((await layer1.tokensClaimed(1))).to.equal(BigNumber.from(1));
            await expect(await layer1.ownerOf(8010001)).to.eq(addr1.address);
            await expect(await layer1.balanceOf(addr1.address)).to.eq(1);
        });

        it("Should correctly mint tokens more than one token", async function () {
            advanceBlocks(3000);
            for (i = 1; i < 10; i++) {
                let address = ethers.utils.getContractAddress(
                    {
                        from: "0x000000000000000000000000000000000000dEaD",
                        nonce: 1 + i

                    }
                );
                tx = {
                    to: address,
                    value: "0x1BC16D674EC80000"
                }
                await addr2.sendTransaction(tx);
                await hre.network.provider.request({
                    method: "hardhat_impersonateAccount",
                    params: [address.toString()],
                });
                const signer = await ethers.getSigner(address);
                await expect(traitVault.connect(signer).mint(1, { value: ethers.utils.parseEther("0.0853") })).not.to.be.reverted;
                await expect(layer1.connect(signer).claimClothing(i)).not.to.be.reverted;
                await expect((await layer1.connect(signer).positionsNextToken(8))).to.equal(BigNumber.from(8010000 + i));
                await expect((await layer1.connect(signer).tokensClaimed(i))).to.equal(1);
                await expect(await layer1.connect(signer).ownerOf(8010000 + i)).to.eq(signer.address);
                await expect(await layer1.connect(signer).balanceOf(signer.address)).to.eq(1);
            }
        });

        it("Minted attribute should be of correct layer", async function () {
            advanceBlocks(3000);

            await network.provider.send("evm_setNextBlockTimestamp", [1904083200]);
            await traitVault.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })

            await reveal();

            await network.provider.send("evm_setNextBlockTimestamp", [2061849601]);
            await layer1.connect(addr1).claimClothing(1);
            await expect(await layer1.traitName(8010001)).to.eq("ropa1");
        });
    });

    describe('Tests of "claimMouthAndNose"', async function () {
        it("Should revert if token not from genesisDNA", async function () {
            advanceBlocks(3000);
            await layer0.connect(owner).setNewDNA(addr1.address);
            await layer0.connect(addr1).postGenesisMint(1, addr2.address);
            await expect(layer1.connect(addr2).claimMouthAndNose(10001)).to.be.revertedWith("GenesisTraits: This tokenId does not have genesisDNA")
        });

        it("Should only let owner or controller claim for tokenId", async function () {
            advanceBlocks(3000);
            await traitVault.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await traitVault.connect(addr2).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await expect(layer1.connect(addr2).claimMouthAndNose(1)).to.be.revertedWith("GenesisTraits: Sender can only be owner or controller of tokenId.")
        });

        it("Should revert if tokens already claimed", async function () {
            advanceBlocks(3000);
            await traitVault.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })
            for (i = 0; i < 4; i++) {
                layer1.connect(addr1).claimMouthAndNose(1)
            }
            await expect(layer1.connect(addr1).claimMouthAndNose(1))
                .to.be.revertedWith("GenesisTraits: This tokenId has no more claiming tokens")
        });

        it("Should correctly mint tokens (mints correct number and tokensClaimed increases by one) when owner calls", async function () {
            advanceBlocks(3000);
            await traitVault.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await layer1.connect(addr1).claimMouthAndNose(1)
            await expect((await layer1.positionsNextToken(10))).to.equal(BigNumber.from(10010001));
            await expect((await layer1.tokensClaimed(1))).to.equal(BigNumber.from(1));
            await expect(await layer1.ownerOf(10010001)).to.eq(addr1.address);
            await expect(await layer1.balanceOf(addr1.address)).to.eq(1);
        });

        it("Should correctly mint tokens (mints correct number and tokensClaimed increases by one) when controller calls", async function () {
            advanceBlocks(3000);
            await traitVault.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await layer0.connect(addr1).setController(1, addr2.address)
            await expect(layer1.connect(addr2).claimMouthAndNose(1)).not.to.be.reverted;
            await expect((await layer1.positionsNextToken(10))).to.equal(BigNumber.from(10010001));
            await expect((await layer1.tokensClaimed(1))).to.equal(BigNumber.from(1));
            await expect(await layer1.ownerOf(10010001)).to.eq(addr1.address);
            await expect(await layer1.balanceOf(addr1.address)).to.eq(1);
        });

        it("Should correctly mint tokens more than one token", async function () {
            advanceBlocks(3000);
            for (i = 1; i < 10; i++) {
                let address = ethers.utils.getContractAddress(
                    {
                        from: "0x000000000000000000000000000000000000dEaD",
                        nonce: 1 + i
                    }
                );
                tx = {
                    to: address,
                    value: "0x1BC16D674EC80000"
                }
                await addr2.sendTransaction(tx);
                await hre.network.provider.request({
                    method: "hardhat_impersonateAccount",
                    params: [address.toString()],
                });
                const signer = await ethers.getSigner(address);
                await expect(traitVault.connect(signer).mint(1, { value: ethers.utils.parseEther("0.0853") })).not.to.be.reverted;
                await expect(layer1.connect(signer).claimMouthAndNose(i)).not.to.be.reverted;
                await expect((await layer1.connect(signer).positionsNextToken(10))).to.equal(BigNumber.from(10010000 + i));
                await expect((await layer1.connect(signer).tokensClaimed(i))).to.equal(1);
                await expect(await layer1.connect(signer).ownerOf(10010000 + i)).to.eq(signer.address);
                await expect(await layer1.connect(signer).balanceOf(signer.address)).to.eq(1);
            }
        });

        it("Minted attribute should be of correct layer", async function () {
            advanceBlocks(3000);

            await network.provider.send("evm_setNextBlockTimestamp", [1904083200]);
            await traitVault.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })

            await reveal();

            await network.provider.send("evm_setNextBlockTimestamp", [2061849601]);
            await layer1.connect(addr1).claimMouthAndNose(1);
            await expect(await layer1.traitName(10010001)).to.eq("mouth4");
        });
    });

    describe('Tests of claim, mix stuff', async function () {
        it("Should correctly mint tokens and revert when no tokens left", async function () {
            advanceBlocks(3000);
            await traitVault.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await layer1.connect(addr1).claimMouthAndNose(1)
            await layer1.connect(addr1).claimSkin(1)
            await layer1.connect(addr1).claimBackground(1)
            await layer1.connect(addr1).claimEyes(1)
            await expect(layer1.connect(addr1).claimMouthAndNose(1))
                .to.be.revertedWith("GenesisTraits: This tokenId has no more claiming tokens")
            await expect(layer1.connect(addr1).claimEyes(1))
                .to.be.revertedWith("GenesisTraits: This tokenId has no more claiming tokens")
            await expect(layer1.connect(addr1).claimSkin(1))
                .to.be.revertedWith("GenesisTraits: This tokenId has no more claiming tokens")
            await expect(layer1.connect(addr1).claimBackground(1))
                .to.be.revertedWith("GenesisTraits: This tokenId has no more claiming tokens")
            await expect(layer1.connect(addr1).claimHead(1))
                .to.be.revertedWith("GenesisTraits: This tokenId has no more claiming tokens")
            await expect(layer1.connect(addr1).claimClothing(1))
                .to.be.revertedWith("GenesisTraits: This tokenId has no more claiming tokens")
        });
    });

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

    async function reveal() {
        await layer1.connect(owner).reveal(
            [
                'fondo1',
                'fondo2',
                'fondo3',
                'skin1',
                'skin2',
                'skin3',
                'eyes1',
                'eyes2',
                'eyes3',
                'eyes4',
                'eyes5',
                'head1',
                'head2',
                'head3',
                'head4',
                'head5',
                'ropa1',
                'ropa2',
                'ropa3',
                'ropa4',
                'ropa5',
                'mouth1',
                'mouth2',
                'mouth3',
                'mouth4',
                'mouth5'
            ]
        )
    }
});