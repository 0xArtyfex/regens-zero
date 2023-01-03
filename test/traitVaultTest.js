const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");

describe('"traitsVault" Testing', function () {
    let owner, addr1, addr2, addr3, addr4,
        addr5, addr6, addr7, addr8, addr9;
    let tokenUri, traits;
    let blockNum;
    let artyfex, publicGoods;

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

        artyfex = "0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa"
        publicGoods = "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB"


        layer0TokenFactory = await hre.ethers.getContractFactory("RegensZero");
        layer0 = await layer0TokenFactory.connect(owner).deploy();
        await layer0.deployed();


        layer1TokenFactory = await hre.ethers.getContractFactory("GenesisTraits");
        layer1 = await layer1TokenFactory.connect(owner).deploy([3, 3, 5, 5, 5, 5], [2, 8, 2, 3, 5, 20]);
        await layer1.deployed();


        traitVault = await hre.ethers.getContractFactory("GenesisDNA");
        traits = await traitVault.connect(owner).deploy(
            layer0.address,
            layer1.address,
            blockNum.add(BigNumber.from(3000)),
            ethers.utils.parseEther("0.0853"),
            artyfex,
            publicGoods);
        await traits.deployed();


        tokenUriTokenFactory = await hre.ethers.getContractFactory("GenesisDNATokenUri");
        tokenUri = await tokenUriTokenFactory.connect(owner).deploy(traits.address);
        await tokenUri.deployed();

        layer1PruebaTokenFactory = await hre.ethers.getContractFactory("Layer1Prueba");
        layer1Prueba = await layer1PruebaTokenFactory.connect(owner).deploy();
        await layer1Prueba.deployed();

        layer2PruebaTokenFactory = await hre.ethers.getContractFactory("Layer2Prueba");
        layer2Prueba = await layer2PruebaTokenFactory.connect(owner).deploy();
        await layer2Prueba.deployed();

        layer3PruebaTokenFactory = await hre.ethers.getContractFactory("Layer3Prueba");
        layer3Prueba = await layer3PruebaTokenFactory.connect(owner).deploy();
        await layer3Prueba.deployed();


        await layer1.connect(owner).setTraitsVault(traits.address);
        await layer1.connect(owner).setRegensZero(layer0.address);

        await layer0.connect(owner).setGenesisDNA(traits.address);
        await traits.connect(owner).setTokenUriContract(tokenUri.address);

        await layer1Prueba.connect(owner).setTraitsVault(traits.address);
        await layer1Prueba.connect(owner).setMintStart(blockNum.add(BigNumber.from("3000")));
        await layer2Prueba.connect(owner).setTraitsVault(traits.address);
        await layer3Prueba.connect(owner).setTraitsVault(traits.address);

        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [artyfex.toString()],
        });
        artyfexSigner = await ethers.getSigner(artyfex);
        tx = {
            to: artyfex,
            value: "0x1BC16D674EC80000"
        }
        await addr2.sendTransaction(tx);

        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [publicGoods.toString()],
        });
        publicGoodsSigner = await ethers.getSigner(publicGoods);
        tx = {
            to: publicGoods,
            value: "0x1BC16D674EC80000"
        }
        await addr2.sendTransaction(tx);
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
            await expect(await traits.regensZero()).to.equal(layer0.address);
            await expect(await traits.genesisTraits()).to.equal(layer1.address);
            await expect(await traits.mintStart()).to.equal(
                blockNum.add(BigNumber.from("3000"))
            );
            await expect(await traits.price()).to.equal(
                ethers.utils.parseEther("0.0853")
            );
            await expect(await traits.artyfex()).to.equal(
                artyfex
            );
            await expect(await traits.publicGoods()).to.equal(
                publicGoods
            );

            await expect(await traits.contractsArray("0")).to.equal(layer1.address);
            await expect(await traits.contractsMapping(layer1.address)).to.equal("1");
        });
    });

    describe('Tests of "getTraits"', async function () {
        it("Should revert if nft minted but traits not minted yet", async function () {
            advanceBlocks(3001);
            await traits.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await expect(
                traits.connect(addr1).getTraits(1)
            ).to.be.revertedWith(
                "DNA: Token has not minted traits, does not belong to genesisDNA or does not exist."
            )
        });

        it("Should revert if nft minted but does not belong to genesisDNA", async function () {
            await layer0.connect(owner).setNewDNA(addr1.address);
            await layer0.connect(addr1).postGenesisMint(1, addr2.address);
            await expect(
                traits.connect(addr1).getTraits(10001)
            ).to.be.revertedWith(
                "DNA: Token has not minted traits, does not belong to genesisDNA or does not exist."
            )
        });

        it("Should revert if nft does not exist", async function () {
            await layer0.connect(owner).setNewDNA(addr1.address);
            await layer0.connect(addr1).postGenesisMint(1, addr2.address);
            await expect(
                traits.connect(addr1).getTraits(1)
            ).to.be.revertedWith(
                "DNA: Token has not minted traits, does not belong to genesisDNA or does not exist."
            )
        });

        it("Should correctly return initialized array after minting traits", async function () {
            advanceBlocks(3001);
            await traits.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await traits.connect(addr1).mintTraits(1);
            let traitsList = await traits.connect(addr1).getTraits(1);
            for (i = 0; i < 11; i++) {
                if (i % 2 == 0 && i < 11) {
                    await expect(traitsList[i].layer1).to.equal(0)
                    await expect(traitsList[i].traitId).to.equal(BigNumber.from(i * 1000000 + 1))
                    await expect(await layer1.ownerOf(BigNumber.from(i * 1000000 + 1))).to.equal(traits.address);
                }
                else {
                    await expect(traitsList[i].layer1).to.equal(0)
                    await expect(traitsList[i].traitId).to.equal(0)
                }
            }
        });

        it("Should correctly reflect change after removing one trait", async function () {
            advanceBlocks(3001);
            await traits.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await traits.connect(addr1).mintTraits(1);
            await traits.connect(addr1).changeTraits(1, [6], [0], [0]);
            let traitsList = await traits.connect(addr1).getTraits(1);
            for (i = 0; i < 11; i++) {
                if (i % 2 == 0 && i < 11 && i != 6) {
                    await expect(traitsList[i].layer1).to.equal(0)
                    await expect(traitsList[i].traitId).to.equal(BigNumber.from(i * 1000000 + 1))
                    await expect(await layer1.ownerOf(BigNumber.from(i * 1000000 + 1))).to.equal(traits.address);
                }
                else {
                    await expect(traitsList[i].layer1).to.equal(0)
                    await expect(traitsList[i].traitId).to.equal(0)
                }
            }
        });

        it("Should correctly reflect change after removing more than one trait", async function () {
            advanceBlocks(3001);
            await traits.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await traits.connect(addr1).mintTraits(1);
            await traits.connect(addr1).changeTraits(
                1,
                [0, 6, 10],
                [0, 0, 0],
                [0, 0, 0]
            );
            let traitsList = await traits.connect(addr1).getTraits(1);
            for (i = 0; i < 11; i++) {
                if (i == 2 || i == 4 || i == 8) {
                    await expect(traitsList[i].layer1).to.equal(0)
                    await expect(traitsList[i].traitId).to.equal(BigNumber.from(i * 1000000 + 1))
                    await expect(await layer1.ownerOf(BigNumber.from(i * 1000000 + 1))).to.equal(traits.address);
                }
                else {
                    await expect(traitsList[i].layer1).to.equal(0)
                    await expect(traitsList[i].traitId).to.equal(0)
                }
            }
        });
    });

    describe('Tests of "hasMintedTraits"', async function () {
        it("Should be false when traits not minted", async function () {
            advanceBlocks(3001);
            await traits.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await expect(
                await traits.hasMintedTraits(1)
            ).to.be.false
        });

        it("Should be true when traits minted", async function () {
            advanceBlocks(3001);
            await traits.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await traits.connect(addr1).mintTraits(1)
            await expect(
                await traits.hasMintedTraits(1)
            ).to.be.true
        });
    });

    describe('Tests of "setDNAImageUri"', async function () {
        it("Should let retrieve DNAImageUri", async function () {
            advanceBlocks(3000);
            await expect(await traits.connect(addr1).DNAImageUri()).to.equal("");
        });

        it("Should let owner set DNAImageUri", async function () {
            advanceBlocks(3000);
            await traits.connect(owner).setDNAImageUri("uriNueva");
            await expect(await traits.connect(addr2).DNAImageUri()).to.equal("uriNueva");
        });

        it("Should only let owner set token uri", async function () {
            advanceBlocks(3000);
            await expect(traits.connect(addr1).setDNAImageUri("uriNueva")).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe('Tests of "setPreviewImageUri"', async function () {
        it("Should let retrieve previewImageUri", async function () {
            advanceBlocks(3000);
            await expect(await traits.connect(addr1).previewImageUri()).to.equal("");
        });

        it("Should let owner setPreviewImageUri", async function () {
            advanceBlocks(3000);
            await traits.connect(owner).setPreviewImageUri("uriNueva");
            await expect(await traits.connect(addr2).previewImageUri()).to.equal("uriNueva");
        });

        it("Should only let owner set token uri", async function () {
            advanceBlocks(3000);
            await expect(traits.connect(addr1).setPreviewImageUri("uriNueva")).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe('Tests of "artyfex"', async function () {
        it("Should let retrieve artyfex", async function () {
            advanceBlocks(3000);
            await expect(await traits.connect(addr1).artyfex()).to.equal(artyfex);
        });

        it("Should not let owner or rnadom address set artyfex", async function () {
            advanceBlocks(3000);
            await expect(traits.connect(owner).setArtyfex(addr1.address)).to.be.revertedWith("DNA: Only Artyfex can call this function");;
            await expect(await traits.connect(addr2).artyfex()).to.equal(artyfex);
        });

        it("Should only let artyfex set artyfex", async function () {
            advanceBlocks(3000);

            await addr2.sendTransaction(tx);
            await traits.connect(artyfexSigner).setArtyfex(addr1.address);
            await expect(await traits.connect(addr2).artyfex()).to.equal(addr1.address);
        });
    });

    describe('Tests of "publicGoods"', async function () {
        it("Should let retrieve publicGoods", async function () {
            advanceBlocks(3000);
            await expect(await traits.connect(addr1).publicGoods()).to.equal(publicGoods);
        });

        it("Should not let owner or rnadom address set publicGoods", async function () {
            advanceBlocks(3000);
            await expect(traits.connect(owner).setPublicGoods(addr1.address)).to.be.revertedWith("DNA: Only Public Goods can call this function");;
            await expect(await traits.connect(addr2).publicGoods()).to.equal(publicGoods);
        });

        it("Should only let publicGoods set publicGoods", async function () {
            advanceBlocks(3000);

            await traits.connect(publicGoodsSigner).setPublicGoods(addr1.address);
            await expect(await traits.connect(addr2).publicGoods()).to.equal(addr1.address);
        });
    });

    describe('Tests of "getTokenIdSalt"', async function () {
        it("Should revert if tokenId does not exist", async function () {
            advanceBlocks(3000);
            await traits.connect(addr2).mint(2, { value: ethers.utils.parseEther("0.2") })
            await expect(traits.connect(addr2).getTokenIdSalt(3)).to.be.revertedWith("DNA: TokenId does not exist or does not belong to this DNA")
        });

        it("Should revert if tokenId equals 0", async function () {
            advanceBlocks(3000);
            await traits.connect(addr2).mint(2, { value: ethers.utils.parseEther("0.2") })
            await expect(traits.connect(addr2).getTokenIdSalt(0)).to.be.revertedWith("DNA: TokenId does not exist or does not belong to this DNA")
        });

        it("Should revert if tokenId belongs to different DNA", async function () {
            advanceBlocks(3000);
            await layer0.connect(owner).setNewDNA(addr2.address);
            await layer0.connect(addr2).postGenesisMint(1, addr2.address)
            await expect(
                await layer0.ownerOf(10001)
            ).to.equal(addr2.address);
            await expect(traits.connect(addr2).getTokenIdSalt(10001)).to.be.revertedWith("DNA: TokenId does not exist or does not belong to this DNA")
        });

        it("Should return correct value when minting one", async function () {
            advanceBlocks(3000);
            tx = await traits.connect(addr2).mint(1, { value: ethers.utils.parseEther("0.2") })
            const lastBlockNumber = await ethers.provider.getBlockNumber();
            const lastBlock = await ethers.provider.getBlock(lastBlockNumber);
            const lastTimestamp = lastBlock.timestamp;
            await expect(await traits.connect(addr2).getTokenIdSalt(1)).to.eq(lastTimestamp)
        });

        it("Should return correct value when minting more than one", async function () {
            advanceBlocks(3000);
            tx = await traits.connect(addr2).mint(10, { value: ethers.utils.parseEther("2") })
            const lastBlockNumber = await ethers.provider.getBlockNumber();
            const lastBlock = await ethers.provider.getBlock(lastBlockNumber);
            const lastTimestamp = lastBlock.timestamp;
            for (i = 0; i < 10; i++) {
                await expect(await traits.connect(addr2).getTokenIdSalt(i + 1)).to.eq(lastTimestamp)
            }
        });

        it("Should return correct value when minting more than one and then minting more", async function () {
            advanceBlocks(3000);
            tx = await traits.connect(addr2).mint(10, { value: ethers.utils.parseEther("2") })
            const lastBlockNumber = await ethers.provider.getBlockNumber();
            const lastBlock = await ethers.provider.getBlock(lastBlockNumber);
            const lastTimestamp = lastBlock.timestamp;
            for (i = 0; i < 10; i++) {
                await expect(await traits.connect(addr2).getTokenIdSalt(i + 1)).to.eq(lastTimestamp)
            }
            tx = await traits.connect(addr1).mint(5, { value: ethers.utils.parseEther("2") })
            const lastBlockNumber1 = await ethers.provider.getBlockNumber();
            const lastBlock1 = await ethers.provider.getBlock(lastBlockNumber1);
            const lastTimestamp1 = lastBlock1.timestamp;
            for (i = 0; i < 10; i++) {
                await expect(await traits.connect(addr1).getTokenIdSalt(i + 1)).to.eq(lastTimestamp)
            }
            for (i = 10; i < 15; i++) {
                await expect(await traits.connect(addr1).getTokenIdSalt(i + 1)).to.eq(lastTimestamp1)
            }
        });
    });

    describe('Tests of "addContractToAllowlist"', async function () {
        it("Should let owner add a contract to allowlist", async function () {
            await traits.connect(owner).addContractToAllowlist(addr1.address);
            await expect(await traits.contractsArray("1")).to.equal(addr1.address);
            await expect(await traits.contractsMapping(addr1.address)).to.equal("2");
        });

        it("Should let owner add a contract to allowlist, after removing one", async function () {
            await traits.connect(owner).addContractToAllowlist(addr4.address);
            await expect(await traits.contractsArray("1")).to.equal(addr4.address);
            await expect(await traits.contractsMapping(addr4.address)).to.equal("2");

            await traits.connect(owner).removeContractFromAllowlist(addr4.address);
            await expect(await traits.contractsArray("1")).to.equal(addr4.address);
            await expect(await traits.contractsMapping(addr4.address)).to.equal("0");

            await traits.connect(owner).addContractToAllowlist(addr5.address);
            await expect(await traits.contractsArray("2")).to.equal(addr5.address);
            await expect(await traits.contractsMapping(addr5.address)).to.equal("3");

            await expect(await traits.contractsArray("1")).to.equal(addr4.address);
            await expect(await traits.contractsMapping(addr4.address)).to.equal("0");
        });

        it("Should revert if caller not owner", async function () {
            await expect(
                traits.connect(addr2).addContractToAllowlist(addr1.address)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe('Tests of "removeContractFromAllowlist"', async function () {
        it("Should let owner remove a contract from allowlist", async function () {
            await traits.connect(owner).addContractToAllowlist(addr1.address);
            await traits.connect(owner).removeContractFromAllowlist(addr1.address);
            await expect(await traits.contractsArray("1")).to.equal(addr1.address);
            await expect(await traits.contractsMapping(addr1.address)).to.equal("0");
        });

        it("Should let owner remove a contract from allowlist, after adding two", async function () {
            await traits.connect(owner).addContractToAllowlist(addr1.address);
            await traits.connect(owner).addContractToAllowlist(addr2.address);
            await traits.connect(owner).removeContractFromAllowlist(addr1.address);
            await expect(await traits.contractsArray("1")).to.equal(addr1.address);
            await expect(await traits.contractsMapping(addr1.address)).to.equal("0");
        });

        it("Should revert if contract is GenesisTraits", async function () {
            await expect(
                traits.connect(owner).removeContractFromAllowlist(layer1.address)
            ).to.be.revertedWith("DNA: Cannot remove GenesisTraits");
        });

        it("Should revert if caller not owner", async function () {
            await expect(
                traits.connect(addr2).removeContractFromAllowlist(addr1.address)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe('Tests of "mintTraits"', async function () {
        it("Should revert if caller not owner of the token", async function () {
            advanceBlocks(3001);
            await traits.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await expect(
                traits.connect(addr2).mintTraits(1)
            ).to.be.revertedWith("DNA: Only token owner can mint traits.");
        });

        it("Should revert if token does not have the genesis DNA", async function () {
            advanceBlocks(3001);
            await layer0.connect(owner).setNewDNA(addr1.address);
            await layer0.connect(addr1).postGenesisMint(1, addr2.address);
            await expect(
                traits.connect(addr2).mintTraits(10001)
            ).to.be.revertedWith("DNA: The DNA does not correspond to this vault");
        });

        it("Should revert if token does not exist", async function () {
            advanceBlocks(3001);
            await layer0.connect(owner).setNewDNA(addr1.address);
            await layer0.connect(addr1).postGenesisMint(1, addr2.address);
            await expect(
                traits.connect(addr2).mintTraits(1)
            ).to.be.revertedWith("DNA: The DNA does not correspond to this vault");
        });

        it("Should revert if traits already minted", async function () {
            advanceBlocks(3001);
            await traits.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await traits.connect(addr1).mintTraits(1);
            await expect(
                traits.connect(addr1).mintTraits(1)
            ).to.be.revertedWith("DNA: Traits already minted");
        });

        it("Should let the token owner mint traits", async function () {
            advanceBlocks(3001);
            await traits.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") });
            await traits.connect(addr1).mintTraits(1);
            await expect(
                await traits.hasMintedTraits(1)
            ).to.be.true
            let traitsList = await traits.connect(addr1).getTraits(1);
            for (i = 0; i < 20; i++) {
                if (i % 2 == 0 && i < 11) {
                    await expect(traitsList[i].layer1).to.equal(0)
                    await expect(traitsList[i].traitId).to.equal(BigNumber.from(i * 1000000 + 1))
                    await expect(await layer1.ownerOf(BigNumber.from(i * 1000000 + 1))).to.equal(traits.address);
                }
                else {
                    await expect(traitsList[i].layer1).to.equal(0)
                    await expect(traitsList[i].traitId).to.equal(0)
                }
            }
        });

        it("Should let the token owner mint traits, 10 tokens", async function () {
            advanceBlocks(3001);
            await traits.connect(addr1).mint(10, { value: ethers.utils.parseEther("1.0") });
            for (j = 1; j <= 10; j++) {
                await traits.connect(addr1).mintTraits(j);
                await expect(
                    await traits.hasMintedTraits(j)
                ).to.be.true
                let traitsList = await traits.connect(addr1).getTraits(j);
                for (i = 0; i < 20; i++) {
                    if (i % 2 == 0 && i < 11) {
                        await expect(traitsList[i].layer1).to.equal(0)
                        await expect(traitsList[i].traitId).to.equal(BigNumber.from(i * 1000000 + j))
                        await expect(await layer1.ownerOf(BigNumber.from(i * 1000000 + j))).to.equal(traits.address);
                    }
                    else {
                        await expect(traitsList[i].layer1).to.equal(0)
                        await expect(traitsList[i].traitId).to.equal(0)
                    }
                }
            }
        });

        it("Should let the token owner mint traits, after getting it through transfer", async function () {
            advanceBlocks(3001);
            await traits.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") });
            await layer0.connect(addr1).transferFrom(addr1.address, addr2.address, 1);
            await traits.connect(addr2).mintTraits(1);
            await expect(
                await traits.hasMintedTraits(1)
            ).to.be.true
            let traitsList = await traits.connect(addr1).getTraits(1);
            for (i = 0; i < 20; i++) {
                if (i % 2 == 0 && i < 11) {
                    await expect(traitsList[i].layer1).to.equal(0)
                    await expect(traitsList[i].traitId).to.equal(BigNumber.from(i * 1000000 + 1))
                    await expect(await layer1.ownerOf(BigNumber.from(i * 1000000 + 1))).to.equal(traits.address);
                }
                else {
                    await expect(traitsList[i].layer1).to.equal(0)
                    await expect(traitsList[i].traitId).to.equal(0)
                }
            }
        });
    });

    describe('Tests of "mint"', async function () {
        it("Should not let mint if mint has not started", async function () {
            advanceBlocks(2900);
            await expect(
                traits.connect(addr2).mint(1, { value: ethers.utils.parseEther("0.0853") })
            ).to.be.revertedWith("DNA: Mint has not started.");
        });

        it("Should not let mint 0 tokens", async function () {
            advanceBlocks(3000);
            await expect(
                traits.connect(addr2).mint(0, { value: ethers.utils.parseEther("0.0853") })
            ).to.be.revertedWith("DNA: Cannot mint 0 tokens.");
        });

        it("Should not let mint if amount is less than necesary for one token", async function () {
            advanceBlocks(3000);
            await expect(
                traits.connect(addr2).mint(1, { value: ethers.utils.parseEther("0.0852") })
            ).to.be.revertedWith("DNA: Ether amount is not enough to mint.");
        });

        it("Should not let mint if amount is less than necesary for more than one token", async function () {
            advanceBlocks(3000);
            await expect(
                traits.connect(addr2).mint(5, { value: ethers.utils.parseEther("0.4264") })
            ).to.be.revertedWith("DNA: Ether amount is not enough to mint.");
        });

        //This test passes but it takes too much time to execute.
        /*
        it("Should not let mint more tokens than total supply", async function () {
            advanceBlocks(3000);
            for(i=0;i<1000;i++){
                let address = ethers.utils.getContractAddress(
                    {
                        from: "0x000000000000000000000000000000000000dEaD",
                        nonce: 1 + i
    
                    }
                );
                tx ={
                    to: address,
                    value: "0x1BC16D674EC80000"
                }
                await addr2.sendTransaction(tx);
                await hre.network.provider.request({
                    method: "hardhat_impersonateAccount",
                    params: [address.toString()],
                });
                const signer = await ethers.getSigner(address);
                await expect(traits.connect(signer).mint(10,{ value: ethers.utils.parseEther("0.853") })).not.to.be.reverted;
                await expect(await layer0.connect(addr1).totalSupply()).to.equal(10*(i+1));
            }
            
            await expect(
                traits.connect(addr2).mint(1,{ value: "8530000000000000000" })
            ).to.be.revertedWith("DNA: Amount exceeds available tokens for mint.");
        }); */

        it("Should not let address zero mint", async function () {
            advanceBlocks(3000);
            tx = {
                to: ethers.constants.AddressZero,
                value: "0x1BC16D674EC80000"
            }
            addr2.sendTransaction(tx);
            await hre.network.provider.request({
                method: "hardhat_impersonateAccount",
                params: [ethers.constants.AddressZero.toString()],
            });
            const signer = await ethers.getSigner(ethers.constants.AddressZero);

            await expect(traits.connect(signer).mint(1, { value: "853000000000000000" })).to.be.revertedWith("DNA: Buyer cannot be address zero.");
        });

        it("Should not let mint more than 15 tokens per call", async function () {
            advanceBlocks(3000);
            await expect(
                traits.connect(addr2).mint(16, { value: ethers.utils.parseEther("1.6") })
            ).to.be.revertedWith("DNA: You have exceeded mint limit per call.");
        });

        it("Should let mint 1 token", async function () {
            advanceBlocks(3000);
            await traits.connect(addr2).mint(1, { value: ethers.utils.parseEther("0.0853") })
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
        });

        it("Should let mint 2 tokens", async function () {
            advanceBlocks(3000);
            await traits.connect(addr2).mint(2, { value: ethers.utils.parseEther("0.2") })
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
        });

        it("Should let mint 15 tokens", async function () {
            advanceBlocks(3000);
            await traits.connect(addr2).mint(15, { value: ethers.utils.parseEther("1.5") })
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
            }
        });
    });

    describe('Tests of "changeTraits"', async function () {
        it("Should revert if token locked", async function () {
            advanceBlocks(3001);
            await traits.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await traits.connect(addr1).mintTraits(1);
            await layer0.connect(addr1).lockToken(1);
            await expect(
                traits.connect(addr1).changeTraits(1, [0], [0], [0])
            ).to.be.revertedWith("DNA: Token is locked.");
        });

        it("Should revert if traits not minted", async function () {
            advanceBlocks(3001);
            await traits.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await expect(
                traits.connect(addr1).changeTraits(1, [1], [0], [1])
            ).to.be.revertedWith("DNA: Traits not minted yet.");
        });

        it("Should revert if not the owner of the token, when no controller assigned", async function () {
            advanceBlocks(3001);
            await traits.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await traits.connect(addr2).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await traits.connect(addr1).mintTraits(1);
            await traits.connect(addr2).mintTraits(2);
            await expect(
                traits.connect(addr1).changeTraits(2, [0], [0], [0])
            ).to.be.revertedWith("DNA: Only token owner or controller can change traits.");
        });

        it("Should revert if not correct DNA", async function () {
            advanceBlocks(3001);
            await layer0.connect(owner).setNewDNA(addr1.address);
            await layer0.connect(addr1).postGenesisMint(0, addr2.address);
            await expect(
                traits.connect(addr1).changeTraits(10001, [0], [0], [0])
            ).to.be.revertedWith("DNA: The DNA does not correspond to this vault");
        });

        it("Should revert if not controller of the token, when controller assigned", async function () {
            advanceBlocks(3001);
            await traits.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await traits.connect(addr2).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await traits.connect(addr1).mintTraits(1);
            await traits.connect(addr2).mintTraits(2);
            await layer0.connect(addr1).setController(1, addr3.address)
            await expect(
                traits.connect(addr2).changeTraits(1, [0], [0], [0])
            ).to.be.revertedWith("DNA: Only token owner or controller can change traits.");
        });

        it("Should revert if contract array parameter size is different than layers array", async function () {
            advanceBlocks(3001);
            await traits.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await traits.connect(addr1).mintTraits(1);
            let array = [];
            for (i = 0; i < 10; i++) {
                array.push(1)
            }
            await expect(
                traits.connect(addr1).changeTraits(1, [0], array, [0])
            ).to.be.revertedWith("DNA: Contracts amount does not equal layers amount.");
        });

        it("Should revert if traits array parameter size is different than layers array", async function () {
            advanceBlocks(3001);
            await traits.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await traits.connect(addr1).mintTraits(1);
            let array = [];
            for (i = 0; i < 21; i++) {
                array.push(1)
            }
            await expect(
                traits.connect(addr1).changeTraits(1, [0], [0], array)
            ).to.be.revertedWith("DNA: Traits amount does not equal layers amount.");
        });

        it("Should revert if all parameter arrays size exceed max traits amount", async function () {
            advanceBlocks(3001);
            await traits.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await traits.connect(addr1).mintTraits(1);
            let array = [];
            for (i = 0; i < 21; i++) {
                array.push(1)
            }
            await expect(
                traits.connect(addr1).changeTraits(1, array, array, array)
            ).to.be.revertedWith("DNA: Layers amount exceeds max layers.");
        });

        it("Should not revert if token is unlocked", async function () {
            advanceBlocks(3001);
            await traits.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await traits.connect(addr1).mintTraits(1);
            await layer0.connect(addr1).lockToken(1);
            await layer0.connect(addr1).unlockToken(1);
            await network.provider.send("evm_increaseTime", [604801]);
            await network.provider.send("evm_mine", []);
            await expect(traits.connect(addr1).changeTraits(1, [0], [0], [0])).not.to.be.reverted;
            await expect(await layer1.ownerOf(1)).to.equal(addr1.address);
            for (i = 2; i < 11; i++) {
                if (i % 2 == 0) {
                    await expect(await layer1.ownerOf(BigNumber.from(i * 1000000 + 1))).to.equal(traits.address);
                }
            }
        });

        it("Should not change trait if not the owner of the trait", async function () {
            advanceBlocks(3001);
            await traits.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await traits.connect(addr2).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await traits.connect(addr1).mintTraits(1);
            await traits.connect(addr2).mintTraits(2);
            await traits.connect(addr1).changeTraits(1, [0], [0], [2])
            traits1 = await traits.connect(addr1).getTraits(1);
            for (i = 2; i < 11; i++) {
                if (i % 2 == 0) {
                    await expect(traits1[i].layer1).to.equal(0)
                    await expect(traits1[i].traitId).to.equal(BigNumber.from(i * 1000000 + 1))
                    await expect(await layer1.ownerOf(BigNumber.from(i * 1000000 + 1))).to.equal(traits.address);
                }
            }
        });

        it("Should not change trait if not the owner of the trait, more than one trait", async function () {
            advanceBlocks(3001);
            await traits.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await traits.connect(addr2).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await traits.connect(addr1).mintTraits(1);
            await traits.connect(addr2).mintTraits(2);
            await traits.connect(addr1).changeTraits(1, [0, 2], [0, 0], [0, 2])
            traits1 = await traits.connect(addr1).getTraits(1);
            await expect(traits1[0].layer1).to.equal(0)
            await expect(traits1[0].traitId).to.equal(0)
            for (i = 2; i < 11; i++) {
                if (i % 2 == 0) {
                    await expect(traits1[i].layer1).to.equal(0)
                    await expect(traits1[i].traitId).to.equal(BigNumber.from(i * 1000000 + 1))
                    await expect(await layer1.ownerOf(BigNumber.from(i * 1000000 + 1))).to.equal(traits.address);
                }
            }
        });

        it("Should not change trait if contract not allowlisted, contract number out of array bounds", async function () {
            advanceBlocks(3001);
            await traits.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await traits.connect(addr2).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await traits.connect(addr1).mintTraits(1);
            await traits.connect(addr2).mintTraits(2);
            await traits.connect(addr1).changeTraits(1, [0], [1], [1])
            traits1 = await traits.connect(addr1).getTraits(1);
            for (i = 2; i < 11; i++) {
                if (i % 2 == 0) {
                    await expect(traits1[i].layer1).to.equal(0)
                    await expect(traits1[i].traitId).to.equal(BigNumber.from(i * 1000000 + 1))
                    await expect(await layer1.ownerOf(BigNumber.from(i * 1000000 + 1))).to.equal(traits.address);
                }
            }
        });

        it("Should not change trait if contract not allowlisted, more than one trait", async function () {
            advanceBlocks(3001);
            await traits.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await traits.connect(addr2).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await traits.connect(addr1).mintTraits(1);
            await traits.connect(addr2).mintTraits(2);
            await traits.connect(addr1).changeTraits(1, [0, 2], [0, 1], [0, 0])
            traits1 = await traits.connect(addr1).getTraits(1);
            await expect(traits1[0].layer1).to.equal(0)
            await expect(traits1[0].traitId).to.equal(0)
            for (i = 2; i < 11; i++) {
                if (i % 2 == 0) {
                    await expect(traits1[i].layer1).to.equal(0)
                    await expect(traits1[i].traitId).to.equal(BigNumber.from(i * 1000000 + 1))
                    await expect(await layer1.ownerOf(BigNumber.from(i * 1000000 + 1))).to.equal(traits.address);
                }
            }
        });

        it("Should transfer traits to user if everything in array is 0", async function () {
            advanceBlocks(3001);
            await traits.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await traits.connect(addr2).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await traits.connect(addr1).mintTraits(1);
            await traits.connect(addr2).mintTraits(2);
            await traits.connect(addr1).changeTraits(1, [0], [0], [0])
            await expect(await layer1.ownerOf(1)).to.equal(addr1.address);
            for (i = 2; i < 11; i++) {
                if (i % 2 == 0) {
                    await expect(await layer1.ownerOf(BigNumber.from(i * 1000000 + 1))).to.equal(traits.address);
                }
            }
        });

        it("Should transfer traits to user if everything in array is 0, more than one trait", async function () {
            advanceBlocks(3001);
            await traits.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await traits.connect(addr2).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await traits.connect(addr1).mintTraits(1);
            await traits.connect(addr2).mintTraits(2);
            await traits.connect(addr1).changeTraits(1, [0, 2], [0, 0], [0, 0])
            await expect(await layer1.ownerOf(1)).to.equal(addr1.address);
            await expect(await layer1.ownerOf(BigNumber.from(2 * 1000000 + 1))).to.equal(addr1.address);
            for (i = 1; i < 11; i++) {
                if (i % 2 == 0 && i != 2) {
                    await expect(await layer1.ownerOf(BigNumber.from(i * 1000000 + 1))).to.equal(traits.address);
                }
            }
        });

        it("Should not change trait if layer does not match with trait", async function () {
            advanceBlocks(3001);
            await traits.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await traits.connect(addr2).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await traits.connect(addr1).mintTraits(1);
            await traits.connect(addr2).mintTraits(2);
            await traits.connect(addr1).changeTraits(1, [0], [0], [0])
            await traits.connect(addr1).changeTraits(1, [6], [0], [1])
            await expect(await layer1.ownerOf(BigNumber.from(6 * 1000000 + 1))).to.equal(traits.address);
            traits1 = await traits.connect(addr1).getTraits(1);
            await expect(traits1[6].layer1).to.equal(0)
            await expect(traits1[6].traitId).to.equal(BigNumber.from(6 * 1000000 + 1))
        });

        it("Should corectly change traits when owner calls", async function () {
            advanceBlocks(3001);
            await traits.connect(addr1).mint(2, { value: ethers.utils.parseEther("0.2") });
            await traits.connect(addr1).mintTraits(1);
            traits1 = await traits.connect(addr1).getTraits(1);
            for (i = 0; i < 11; i++) {
                if (i % 2 == 0 && i < 11) {
                    await expect(traits1[i].layer1).to.equal(0)
                    await expect(traits1[i].traitId).to.equal(BigNumber.from(i * 1000000 + 1))
                    await expect(await layer1.ownerOf(BigNumber.from(i * 1000000 + 1))).to.equal(traits.address);
                }
            }

            await traits.connect(addr1).mintTraits(2);
            traits1 = await traits.connect(addr1).getTraits(2);
            for (i = 0; i < 11; i++) {
                if (i % 2 == 0 && i < 11) {
                    await expect(traits1[i].layer1).to.equal(0)
                    await expect(traits1[i].traitId).to.equal(BigNumber.from(i * 1000000 + 2))
                    await expect(await layer1.ownerOf(BigNumber.from(i * 1000000 + 2))).to.equal(traits.address);
                }
            }

            await traits.connect(addr1).changeTraits(1, [0, 2, 4, 6, 8, 10], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0])

            traits1 = await traits.connect(addr1).getTraits(1);
            array = [];
            for (i = 0; i < 11; i++) {
                if (i % 2 == 0) {
                    await expect(traits1[i].layer1).to.equal(0);
                    await expect(traits1[i].traitId).to.equal(0);
                    await expect(await layer1.ownerOf(BigNumber.from(i * 1000000 + 1))).to.equal(addr1.address);
                    array.push(BigNumber.from(i * 1000000 + 1));
                }
            }

            await traits.connect(addr1).changeTraits(2, [0, 2, 4, 6, 8, 10], [0, 0, 0, 0, 0, 0], array)
            traits2 = await traits.connect(addr1).getTraits(2);
            for (i = 0; i < 11; i++) {
                if (i % 2 == 0 && i < 11) {
                    await expect(traits2[i].layer1).to.equal(0)
                    await expect(traits2[i].traitId).to.equal(BigNumber.from(i * 1000000 + 1))
                    await expect(
                        await layer1.ownerOf(BigNumber.from(i * 1000000 + 1))
                    ).to.equal(traits.address);
                    await expect(
                        await layer1.ownerOf(BigNumber.from(i * 1000000 + 2))
                    ).to.equal(addr1.address);
                }
            }
        });

        it("Should corectly remove traits from one token and let equip them to other", async function () {
            advanceBlocks(3001);
            await traits.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await traits.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await traits.connect(addr1).mintTraits(1);

            await layer0.connect(addr1).setController(1, addr3.address)
            await layer0.connect(addr1).setController(2, addr3.address)

            traits1 = await traits.connect(addr1).getTraits(1);
            for (i = 0; i < 11; i++) {
                if (i % 2 == 0 && i < 11) {
                    await expect(traits1[i].layer1).to.equal(0)
                    await expect(traits1[i].traitId).to.equal(BigNumber.from(i * 1000000 + 1))
                    await expect(await layer1.ownerOf(BigNumber.from(i * 1000000 + 1))).to.equal(traits.address);
                }
            }

            await traits.connect(addr1).mintTraits(2);
            traits1 = await traits.connect(addr1).getTraits(2);
            for (i = 0; i < 11; i++) {
                if (i % 2 == 0 && i < 11) {
                    await expect(traits1[i].layer1).to.equal(0)
                    await expect(traits1[i].traitId).to.equal(BigNumber.from(i * 1000000 + 2))
                    await expect(await layer1.ownerOf(BigNumber.from(i * 1000000 + 2))).to.equal(traits.address);
                }
            }

            await traits.connect(addr3).changeTraits(1, [0, 2, 4, 6, 8, 10], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0])

            traits1 = await traits.connect(addr3).getTraits(1);
            array = [];

            for (i = 0; i < 11; i++) {
                if (i % 2 == 0) {
                    await expect(traits1[i].layer1).to.equal(0);
                    await expect(traits1[i].traitId).to.equal(0);
                    await expect(await layer1.ownerOf(BigNumber.from(i * 1000000 + 1))).to.equal(addr1.address);
                    array.push(BigNumber.from(i * 1000000 + 1));
                }
            }

            await traits.connect(addr3).changeTraits(2, [0, 2, 4, 6, 8, 10], [0, 0, 0, 0, 0, 0], array)
            traits2 = await traits.connect(addr3).getTraits(2);
            for (i = 0; i < 11; i++) {
                if (i % 2 == 0 && i < 11) {
                    await expect(traits2[i].layer1).to.equal(0)
                    await expect(traits2[i].traitId).to.equal(BigNumber.from(i * 1000000 + 1))
                    await expect(await layer1.ownerOf(BigNumber.from(i * 1000000 + 1))).to.equal(traits.address);
                    await expect(await layer1.ownerOf(BigNumber.from(i * 1000000 + 2))).to.equal(addr1.address);
                }
            }
        });

        it("Should corectly change traits, all layers same time, multiple collections", async function () {
            advanceBlocks(3001);
            await traits.connect(addr1).mint(2, { value: ethers.utils.parseEther("0.2") });
            await traits.connect(addr1).mintTraits(1);
            await traits.connect(addr1).mintTraits(2);
            await traits.connect(owner).addContractToAllowlist(layer1Prueba.address);
            await expect(await traits.contractsMapping(layer1Prueba.address)).to.equal(BigNumber.from("2"));
            for (i = 0; i < 20; i++) {
                await layer1Prueba.connect(addr1).mint(3, i);
                await expect(await layer1Prueba.ownerOf(BigNumber.from(i * 1000000 + 3))).to.equal(addr1.address);
            }
            await traits.connect(addr1).changeTraits(1, [0, 2, 4, 6, 8, 10], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0]);
            let newTraits = [];
            let contracts = [];
            let layers = [];
            for (i = 0; i < 20; i++) {
                if (i % 2 != 0 || i > 10) {
                    newTraits.push(BigNumber.from(i * 1000000 + 3));
                    contracts.push(1)
                }
                else {
                    newTraits.push(BigNumber.from(i * 1000000 + 1));
                    contracts.push(0)
                }
                layers.push(i);
            }
            await traits.connect(addr1).changeTraits(2, layers, contracts, newTraits)
            traits2 = await traits.connect(addr1).getTraits(2);

            for (i = 0; i < 20; i++) {
                if (i % 2 == 0 && i < 11) {
                    await expect(traits2[i].layer1).to.equal(0)
                    await expect(traits2[i].traitId).to.equal(BigNumber.from(i * 1000000 + 1))
                    await expect(await layer1.ownerOf(BigNumber.from(i * 1000000 + 1))).to.equal(traits.address);
                    await expect(await layer1.ownerOf(BigNumber.from(i * 1000000 + 2))).to.equal(addr1.address);
                }
                else {
                    await expect(traits2[i].layer1).to.equal(1)
                    await expect(traits2[i].traitId).to.equal(BigNumber.from(i * 1000000 + 3))
                    await expect(await layer1Prueba.ownerOf(BigNumber.from(i * 1000000 + 3))).to.equal(traits.address);
                }
            }
        });

        it("Should correctly change all layers at once with traits from new contract", async function () {
            advanceBlocks(3001);
            await traits.connect(addr1).mint(2, { value: ethers.utils.parseEther("0.2") });
            await traits.connect(addr1).mintTraits(1);
            await traits.connect(addr1).mintTraits(2);
            await traits.connect(owner).addContractToAllowlist(layer1Prueba.address);
            await expect(await traits.contractsMapping(layer1Prueba.address)).to.equal(BigNumber.from("2"));
            for (i = 0; i < 20; i++) {
                await layer1Prueba.connect(addr1).mint(3, i);
                await expect(await layer1Prueba.ownerOf(BigNumber.from(i * 1000000 + 3))).to.equal(addr1.address);
            }
            await traits.connect(addr1).changeTraits(1, [0, 2, 4, 6, 8, 10], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0])
            let newTraits = [];
            let contracts = [];
            let layers = [];
            for (i = 0; i < 20; i++) {
                newTraits.push(BigNumber.from(i * 1000000 + 3));
                contracts.push(1)
                layers.push(i);
            }
            await traits.connect(addr1).changeTraits(2, layers, contracts, newTraits)
            traits2 = await traits.connect(addr1).getTraits(2);

            for (i = 0; i < 20; i++) {
                await expect(traits2[i].layer1).to.equal(1)
                await expect(traits2[i].traitId).to.equal(BigNumber.from(i * 1000000 + 3))
                await expect(await layer1Prueba.ownerOf(BigNumber.from(i * 1000000 + 3))).to.equal(traits.address);
            }
            for (i = 0; i < 11; i++) {
                if (i % 2 == 0) {
                    await expect(await layer1.ownerOf(BigNumber.from(i * 1000000 + 1))).to.equal(addr1.address);
                }
            }
        });

        it("Should corectly change traits, all layers same time, not change the ones that are not correct", async function () {
            advanceBlocks(3001);

            await traits.connect(addr1).mint(2, { value: ethers.utils.parseEther("0.2") });
            await traits.connect(addr1).mintTraits(1);
            await traits.connect(addr1).mintTraits(2);

            await traits.connect(owner).addContractToAllowlist(layer1Prueba.address);
            await expect(await traits.contractsMapping(layer1Prueba.address)).to.equal(BigNumber.from("2"));

            for (i = 0; i < 20; i++) {
                await layer1Prueba.connect(addr2).mint(3, i);
                await expect(await layer1Prueba.ownerOf(BigNumber.from(i * 1000000 + 3))).to.equal(addr2.address);
            }

            await traits.connect(addr1).changeTraits(1, [0, 2, 4, 6, 8, 10], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0])
            let newTraits = [];
            let contracts = [];
            let layers = [];
            for (i = 0; i < 20; i++) {
                if (i % 2 != 0 || i > 10) {
                    newTraits.push(BigNumber.from(i * 1000000 + 3));
                    contracts.push(1)
                }
                else {
                    newTraits.push(BigNumber.from(i * 1000000 + 1));
                    contracts.push(0)
                }
                layers.push(i);
            }
            await traits.connect(addr1).changeTraits(2, layers, contracts, newTraits)
            traits2 = await traits.connect(addr1).getTraits(2);

            for (i = 0; i < 20; i++) {
                if (i % 2 == 0 && i < 11) {
                    await expect(traits2[i].layer1).to.equal(0)
                    await expect(traits2[i].traitId).to.equal(BigNumber.from(i * 1000000 + 1))
                    await expect(await layer1.ownerOf(BigNumber.from(i * 1000000 + 1))).to.equal(traits.address);
                    await expect(await layer1.ownerOf(BigNumber.from(i * 1000000 + 2))).to.equal(addr1.address);
                }
                else {
                    await expect(traits2[i].layer1).to.equal(0)
                    await expect(traits2[i].traitId).to.equal(0)
                    await expect(await layer1Prueba.ownerOf(BigNumber.from(i * 1000000 + 3))).to.equal(addr2.address);
                }
            }
        });

        it("Should allow to add a trait from a new contract", async function () {
            advanceBlocks(3001);

            await traits.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await traits.connect(addr1).mintTraits(1);

            await traits.connect(addr2).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await traits.connect(addr2).mintTraits(2);

            await traits.connect(owner).addContractToAllowlist(layer1Prueba.address);
            await expect(await traits.contractsMapping(layer1Prueba.address)).to.equal(BigNumber.from("2"));

            await layer1Prueba.connect(addr2).mint(4, 0);
            await layer1Prueba.connect(addr2).mint(4, 5);
            await layer1Prueba.connect(addr2).mint(4, 11);
            await traits.connect(addr2).changeTraits(2, [0], [1], [4]);
            traits1 = await traits.connect(addr1).getTraits(2);
            await expect(traits1[0].layer1).to.equal(1)
            await expect(traits1[0].traitId).to.equal(BigNumber.from(4))
            await expect(await layer1Prueba.ownerOf(4)).to.equal(traits.address);

            for (i = 1; i < 15; i++) {
                if (i % 2 == 0 && i < 11) {
                    await expect(traits1[i].layer1).to.equal(0)
                    await expect(traits1[i].traitId).to.equal(BigNumber.from(i * 1000000 + 2))
                    await expect(await layer1.ownerOf(BigNumber.from(i * 1000000 + 1))).to.equal(traits.address);
                }
                else {
                    await expect(traits1[i].layer1).to.equal(0)
                    await expect(traits1[i].traitId).to.equal(0)
                }
            }
            await expect(await layer1.ownerOf(2)).to.equal(addr2.address);
            await expect(await layer1Prueba.ownerOf(4)).to.equal(traits.address);
        });

        it("Should allow to withdraw traits but not add if a contract is removed", async function () {
            advanceBlocks(3001);

            await traits.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await traits.connect(addr1).mintTraits(1);

            await traits.connect(addr2).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await traits.connect(addr2).mintTraits(2);

            await traits.connect(owner).addContractToAllowlist(layer1Prueba.address);
            await expect(await traits.contractsMapping(layer1Prueba.address)).to.equal(2);

            await layer1Prueba.connect(addr2).mint(4, 0);
            await layer1Prueba.connect(addr2).mint(4, 5);
            await layer1Prueba.connect(addr2).mint(4, 11);
            await traits.connect(addr2).changeTraits(2, [0], [1], [4]);
            traits1 = await traits.connect(addr1).getTraits(2);
            await expect(traits1[0].layer1).to.equal(1)
            await expect(traits1[0].traitId).to.equal(BigNumber.from(4))
            await expect(await layer1Prueba.ownerOf(4)).to.equal(traits.address);

            for (i = 1; i < 15; i++) {
                if (i % 2 == 0 && i < 11) {
                    await expect(traits1[i].layer1).to.equal(0)
                    await expect(traits1[i].traitId).to.equal(BigNumber.from(i * 1000000 + 2))
                    await expect(await layer1.ownerOf(BigNumber.from(i * 1000000 + 1))).to.equal(traits.address);
                }
                else {
                    await expect(traits1[i].layer1).to.equal(0)
                    await expect(traits1[i].traitId).to.equal(0)
                }
            }
            await traits.connect(owner).removeContractFromAllowlist(layer1Prueba.address);

            await traits.connect(addr2).changeTraits(2, [0], [0], [0]);
            traits1 = await traits.connect(addr2).getTraits(2);
            await expect(traits1[0].layer1).to.equal(0)
            await expect(traits1[0].traitId).to.equal(0)
            await expect(await layer1Prueba.ownerOf(BigNumber.from(4))).to.equal(addr2.address);
            await traits.connect(addr2).changeTraits(2, [0], [1], [4]);

            traits1 = await traits.connect(addr2).getTraits(2);
            await expect(traits1[0].layer1).to.equal(0)
            await expect(traits1[0].traitId).to.equal(0)
        });

        it("Should correctly change traits, traits from 2 new collections", async function () {
            advanceBlocks(3001);

            await traits.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await traits.connect(addr1).mintTraits(1);

            await traits.connect(addr2).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await traits.connect(addr2).mintTraits(2);

            await traits.connect(owner).addContractToAllowlist(layer1Prueba.address);
            await traits.connect(owner).addContractToAllowlist(layer2Prueba.address);
            await expect(await traits.contractsMapping(layer2Prueba.address)).to.equal(BigNumber.from(3));
            await layer1Prueba.connect(addr2).mint(4, 0);
            await layer2Prueba.connect(addr2).mint(4, 5);
            await layer2Prueba.connect(addr2).mint(4, 11);

            await traits.connect(addr2).changeTraits(2, [0, 11, 5], [1, 2, 2], [4, 11000003, 5000002]);
            traits1 = await traits.connect(addr1).getTraits(2);
            await expect(traits1[0].layer1).to.equal(1)
            await expect(traits1[0].traitId).to.equal(BigNumber.from(4))
            await expect(await layer1Prueba.ownerOf(4)).to.equal(traits.address);
            await expect(traits1[11].layer1).to.equal(2)
            await expect(traits1[11].traitId).to.equal(BigNumber.from(11000003))
            await expect(await layer2Prueba.ownerOf(11000003)).to.equal(traits.address);
            await expect(traits1[5].layer1).to.equal(2)
            await expect(traits1[5].traitId).to.equal(BigNumber.from(5000002))
            await expect(await layer2Prueba.ownerOf(5000002)).to.equal(traits.address);
            await expect(await layer1Prueba.ownerOf(BigNumber.from(4))).to.equal(traits.address);
            for (i = 1; i < 20; i++) {
                if (i % 2 == 0 && i < 11) {
                    await expect(traits1[i].layer1).to.equal(0)
                    await expect(traits1[i].traitId).to.equal(BigNumber.from(i * 1000000 + 2))
                    await expect(await layer1.ownerOf(BigNumber.from(i * 1000000 + 1))).to.equal(traits.address);
                }
                else if (i != 5 && i != 11) {
                    await expect(traits1[i].layer1).to.equal(0)
                    await expect(traits1[i].traitId).to.equal(0)
                }
            }
            await traits.connect(owner).removeContractFromAllowlist(layer2Prueba.address);

            await traits.connect(addr2).changeTraits(2, [11], [0], [0]);

            await expect(await layer2Prueba.ownerOf(11000003)).to.equal(addr2.address);

            await traits.connect(addr2).changeTraits(2, [0, 5, 11], [1, 0, 2], [2, 0, 11000003]);

            traits1 = await traits.connect(addr2).getTraits(2);
            await expect(traits1[0].layer1).to.equal(1)
            await expect(traits1[0].traitId).to.equal(2)
            await expect(await layer1Prueba.ownerOf(4)).to.equal(addr2.address);
            await expect(await layer1Prueba.ownerOf(2)).to.equal(traits.address);
            await expect(traits1[11].layer1).to.equal(0)
            await expect(traits1[11].traitId).to.equal(0)
            await expect(await layer2Prueba.ownerOf(11000003)).to.equal(addr2.address);
            await expect(traits1[5].layer1).to.equal(0)
            await expect(traits1[5].traitId).to.equal(0)
            await expect(await layer2Prueba.ownerOf(5000002)).to.equal(addr2.address);
        });

        it("Should correctly change traits, border cases for all positions", async function () {
            advanceBlocks(3001);
            await traits.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await traits.connect(addr1).mintTraits(1);
            await traits.connect(owner).addContractToAllowlist(layer3Prueba.address);
            await expect(await traits.contractsMapping(layer3Prueba.address)).to.equal(2);
            await traits.connect(addr1).changeTraits(1, [0, 2, 4, 6, 8, 10], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0]);
            traits1 = await traits.connect(addr1).getTraits(1);
            
            for (i = 0; i < 20; i++) {
                await expect(traits1[i].layer1).to.equal(0);
                await expect(traits1[i].traitId).to.equal(0);
            }
            for (i = 0; i <= 20; i++) {
                await layer3Prueba.connect(addr1).mint(i * 1000000)
                if (i > 0) {
                    await layer3Prueba.connect(addr1).mint(i * 1000000 - 1)
                }
                await layer3Prueba.connect(addr1).mint(i * 1000000 + 1)
            }
            
            for (i = 0; i < 20; i++) {
                //not able to add i*1000000 in position i (0,1.000.000,...,19.000.000)
                await traits.connect(addr1).changeTraits(1, [i], [1], [i * 1000000]);
                traits1 = await traits.connect(addr1).getTraits(1);
                await expect(traits1[i].layer1).to.equal(0);
                await expect(traits1[i].traitId).to.equal(0);

                //not able to add (i+1)*1000000 (1.000.000,2.000.000,...,20.000.000)
                await traits.connect(addr1).changeTraits(1, [i], [1], [(i + 1) * 1000000]);
                traits1 = await traits.connect(addr1).getTraits(1);
                await expect(traits1[i].layer1).to.equal(0);
                await expect(traits1[i].traitId).to.equal(0);

                //not able to add (i+1)*1000000+1 (1.000.001,2.000.001,...,20.000.001)
                await traits.connect(addr1).changeTraits(1, [i], [1], [(i + 1) * 1000000 + 1]);
                traits1 = await traits.connect(addr1).getTraits(1);
                await expect(traits1[i].layer1).to.equal(0);
                await expect(traits1[i].traitId).to.equal(0);

                //able to add (i+1)*1000000-1 (999.999,1.999.999,...,19.999.999)
                await traits.connect(addr1).changeTraits(1, [i], [1], [(i + 1) * 1000000 - 1]);
                traits1 = await traits.connect(addr1).getTraits(1);
                await expect(traits1[i].layer1).to.equal(1);
                await expect(traits1[i].traitId).to.equal((i + 1) * 1000000 - 1);

                //reset
                await traits.connect(addr1).changeTraits(1, [i], [0], [0]);

                //able to add i*1000000+1 (1,1.000.001,...,19.000.001)
                await traits.connect(addr1).changeTraits(1, [i], [1], [i * 1000000 + 1]);
                traits1 = await traits.connect(addr1).getTraits(1);
                await expect(traits1[i].layer1).to.equal(1);
                await expect(traits1[i].traitId).to.equal(i * 1000000 + 1);

                //reset
                await traits.connect(addr1).changeTraits(1, [i], [0], [0]);
            }
        });

        it("Should work when removing collection and then adding it again", async function () {
            advanceBlocks(3001);

            await traits.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await traits.connect(addr1).mintTraits(1);

            await traits.connect(addr2).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await traits.connect(addr2).mintTraits(2);

            await traits.connect(owner).addContractToAllowlist(layer1Prueba.address);
            await expect(await traits.contractsMapping(layer1Prueba.address)).to.equal(2);

            await layer1Prueba.connect(addr2).mint(4, 0);
            await layer1Prueba.connect(addr2).mint(4, 5);
            await layer1Prueba.connect(addr2).mint(4, 11);
            await traits.connect(addr2).changeTraits(2, [0, 5, 11], [1, 1, 1], [4, 5000002, 11000002]);
            traits1 = await traits.connect(addr1).getTraits(2);
            await expect(traits1[0].layer1).to.equal(1)
            await expect(traits1[0].traitId).to.equal(BigNumber.from(4))
            await expect(await layer1Prueba.ownerOf(4)).to.equal(traits.address);

            for (i = 1; i < 15; i++) {
                if (i % 2 == 0 && i < 11) {
                    await expect(traits1[i].layer1).to.equal(0)
                    await expect(traits1[i].traitId).to.equal(BigNumber.from(i * 1000000 + 2))
                    await expect(await layer1.ownerOf(BigNumber.from(i * 1000000 + 1))).to.equal(traits.address);
                }
                else if (i == 5 || i == 11) {
                    await expect(traits1[i].layer1).to.equal(1)
                    await expect(traits1[i].traitId).to.equal(BigNumber.from(i * 1000000 + 2))
                    await expect(await layer1Prueba.ownerOf(4)).to.equal(traits.address);
                }
                else {
                    await expect(traits1[i].layer1).to.equal(0)
                    await expect(traits1[i].traitId).to.equal(0)
                }
            }
            await traits.connect(owner).removeContractFromAllowlist(layer1Prueba.address);

            await traits.connect(owner).addContractToAllowlist(layer1Prueba.address);
            await expect(await traits.contractsMapping(layer1Prueba.address)).to.equal(3);

            await expect(traits.connect(addr2).changeTraits(2, [0, 5, 11], [0, 0, 2], [2, 0, 11000003])).not.to.be.reverted;
            traits2 = await traits.connect(addr1).getTraits(2);
            await expect(traits2[0].layer1).to.equal(0)
            await expect(traits2[0].traitId).to.equal(2)
            await expect(await layer1.ownerOf(2)).to.equal(traits.address);
            
            await expect(await layer1Prueba.ownerOf(4)).to.equal(addr2.address);
            for (i = 1; i < 15; i++) {
                if (i % 2 == 0 && i < 11) {
                    await expect(traits2[i].layer1).to.equal(0)
                    await expect(traits2[i].traitId).to.equal(BigNumber.from(i * 1000000 + 2))
                    await expect(await layer1.ownerOf(BigNumber.from(i * 1000000 + 1))).to.equal(traits.address);
                }
                else if (i == 11) {
                    await expect(traits2[i].layer1).to.equal(2)
                    await expect(traits2[i].traitId).to.equal(BigNumber.from(i * 1000000 + 3))

                    await expect(await layer1Prueba.ownerOf(BigNumber.from(i * 1000000 + 3))).to.equal(traits.address);
                    await expect(await layer1Prueba.ownerOf(BigNumber.from(i * 1000000 + 2))).to.equal(addr2.address);
                }
                else {
                    await expect(traits2[i].layer1).to.equal(0)
                    await expect(traits2[i].traitId).to.equal(0)
                }
                await expect(await layer1Prueba.ownerOf(BigNumber.from(5 * 1000000 + 2))).to.equal(addr2.address);
            }
        });

        it("Should work when removing collection and then adding it again, shoud work when using old number", async function () {
            advanceBlocks(3001);

            await traits.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await traits.connect(addr1).mintTraits(1);

            await traits.connect(addr2).mint(1, { value: ethers.utils.parseEther("0.0853") })
            await traits.connect(addr2).mintTraits(2);

            await traits.connect(owner).addContractToAllowlist(layer1Prueba.address);
            await expect(await traits.contractsMapping(layer1Prueba.address)).to.equal(2);

            await layer1Prueba.connect(addr2).mint(4, 0);
            await layer1Prueba.connect(addr2).mint(4, 5);
            await layer1Prueba.connect(addr2).mint(4, 11);
            await traits.connect(addr2).changeTraits(2, [0, 5, 11], [1, 1, 1], [4, 5000002, 11000002]);
            traits1 = await traits.connect(addr1).getTraits(2);
            await expect(traits1[0].layer1).to.equal(1)
            await expect(traits1[0].traitId).to.equal(BigNumber.from(4))
            await expect(await layer1Prueba.ownerOf(4)).to.equal(traits.address);

            for (i = 1; i < 15; i++) {
                if (i % 2 == 0 && i < 11) {
                    await expect(traits1[i].layer1).to.equal(0)
                    await expect(traits1[i].traitId).to.equal(BigNumber.from(i * 1000000 + 2))
                    await expect(await layer1.ownerOf(BigNumber.from(i * 1000000 + 1))).to.equal(traits.address);
                }
                else if (i == 5 || i == 11) {
                    await expect(traits1[i].layer1).to.equal(1)
                    await expect(traits1[i].traitId).to.equal(BigNumber.from(i * 1000000 + 2))
                    await expect(await layer1Prueba.ownerOf(4)).to.equal(traits.address);
                }
                else {
                    await expect(traits1[i].layer1).to.equal(0)
                    await expect(traits1[i].traitId).to.equal(0)
                }
            }
            await traits.connect(owner).removeContractFromAllowlist(layer1Prueba.address);

            await traits.connect(owner).addContractToAllowlist(layer1Prueba.address);
            await expect(await traits.contractsMapping(layer1Prueba.address)).to.equal(3);

            await expect(traits.connect(addr2).changeTraits(2, [0, 5, 11], [0, 0, 2], [2, 0, 11000003])).not.to.be.reverted;
            traits2 = await traits.connect(addr1).getTraits(2);
            await expect(traits2[0].layer1).to.equal(0)
            await expect(traits2[0].traitId).to.equal(2)
            await expect(await layer1.ownerOf(2)).to.equal(traits.address);

            await expect(await layer1Prueba.ownerOf(4)).to.equal(addr2.address);
            for (i = 1; i < 15; i++) {
                if (i % 2 == 0 && i < 11) {
                    await expect(traits2[i].layer1).to.equal(0)
                    await expect(traits2[i].traitId).to.equal(BigNumber.from(i * 1000000 + 2))
                    await expect(await layer1.ownerOf(BigNumber.from(i * 1000000 + 1))).to.equal(traits.address);
                }
                else if (i == 11) {

                    await expect(traits2[i].layer1).to.equal(2)
                    await expect(traits2[i].traitId).to.equal(BigNumber.from(i * 1000000 + 3))

                    await expect(await layer1Prueba.ownerOf(BigNumber.from(i * 1000000 + 3))).to.equal(traits.address);
                    await expect(await layer1Prueba.ownerOf(BigNumber.from(i * 1000000 + 2))).to.equal(addr2.address);
                }
                else {
                    await expect(traits2[i].layer1).to.equal(0)
                    await expect(traits2[i].traitId).to.equal(0)
                }
                await expect(await layer1Prueba.ownerOf(BigNumber.from(5 * 1000000 + 2))).to.equal(addr2.address);
            }
        });
    });

    describe('Tests of "withdraw"', async function () {
        it("Should let owner withdraw contract balance", async function () {
            await expect(traits.connect(owner).withdraw()).not.to.be.reverted;
        });

        it("Should let artyfex withdraw contract balance", async function () {
            await expect(traits.connect(artyfexSigner).withdraw()).not.to.be.reverted;
        });

        it("Should let publicGoods withdraw contract balance", async function () {
            await expect(traits.connect(publicGoodsSigner).withdraw()).not.to.be.reverted;
        });

        it("Should not let random address to withdraw contract balance", async function () {
            await expect(traits.connect(addr1).withdraw()).to.be.revertedWith("DNA: Sender is not allowed to call this function");
        });

        it("Should let owner withdraw contract balance if its more than zero and distribute amounts correctly", async function () {
            advanceBlocks(3000);
            await traits.connect(addr1).mint(5, { value: ethers.utils.parseEther("0.4265") });
            let contractBalance     = await ethers.provider.getBalance(traits.address);
            let publicGoodsBalance  = (await ethers.provider.getBalance(publicGoods)).add(contractBalance.mul(4).div(5));
            let artyfexBalance      = (await ethers.provider.getBalance(artyfex)).add(contractBalance.sub(contractBalance.mul(4).div(5)));
            
            await traits.connect(owner).withdraw();

            await expect(
                (await ethers.provider.getBalance(publicGoods)).toString()
            ).to.be.equal(publicGoodsBalance.toString());
            
            await expect(
                (await ethers.provider.getBalance(artyfex)).toString()
            ).to.be.equal(artyfexBalance.toString());

            await expect(
                (await ethers.provider.getBalance(traits.address)).toString()
            ).to.be.equal(BigNumber.from(0).toString());
        });
    });

    describe('Tests of "reserve"', async function () {
        it("Should revert if sender is not artyfex", async function () {
            await expect(traits.connect(owner).reserve(1)).to.be.revertedWith("DNA: Sender is not Artyfex");
        });

        it("Should revert if minted+amount bigger than 140", async function () {
            await expect(traits.connect(artyfexSigner).reserve(141)).to.be.revertedWith("DNA: Reserved claimed plus amount exceeds amount reserved");
        });

        it("Should let artyfex mint 10 correctly", async function () {
            advanceBlocks(3000)
            await traits.connect(artyfexSigner).reserve(10);
            const lastBlockNumber1 = await ethers.provider.getBlockNumber();
            const lastBlock1 = await ethers.provider.getBlock(lastBlockNumber1);
            const lastTimestamp1 = lastBlock1.timestamp;
            await expect(await layer0.balanceOf(artyfex)).to.eq(BigNumber.from(10))
            for (i = 1; i <= 10; i++) {
                await expect(
                    await layer0.ownerOf(i)
                ).to.equal(artyfex);
                await expect(
                    await layer0.holderSince(i)
                ).to.equal(lastTimestamp1);
                await expect(
                    await layer0.ownerSince(i)
                ).to.equal(lastTimestamp1);
                await expect(
                    await layer0.tokenIdDNA(i)
                ).to.equal(traits.address);
                await expect(await traits.connect(addr1).getTokenIdSalt(i)).to.eq(lastTimestamp1)
            }
        });

        it("Should let artyfex mint 10 correctly after some tokens where already minted", async function () {
            advanceBlocks(3000)
            await traits.connect(artyfexSigner).reserve(10);
            const lastBlockNumber1 = await ethers.provider.getBlockNumber();
            const lastBlock1 = await ethers.provider.getBlock(lastBlockNumber1);
            const lastTimestamp1 = lastBlock1.timestamp;
            await expect(await layer0.balanceOf(artyfex)).to.eq(BigNumber.from(10))
            for (i = 1; i <= 10; i++) {
                await expect(
                    await layer0.ownerOf(i)
                ).to.equal(artyfex);
                await expect(
                    await layer0.holderSince(i)
                ).to.equal(lastTimestamp1);
                await expect(
                    await layer0.ownerSince(i)
                ).to.equal(lastTimestamp1);
                await expect(
                    await layer0.tokenIdDNA(i)
                ).to.equal(traits.address);
                await expect(await traits.connect(addr1).getTokenIdSalt(i)).to.eq(lastTimestamp1)
            }
            await traits.connect(artyfexSigner).reserve(10);
            const lastBlockNumber2 = await ethers.provider.getBlockNumber();
            const lastBlock2 = await ethers.provider.getBlock(lastBlockNumber2);
            const lastTimestamp2 = lastBlock2.timestamp;
            await expect(await layer0.balanceOf(artyfex)).to.eq(BigNumber.from(20))
            for (i = 11; i <= 20; i++) {
                await expect(
                    await layer0.ownerOf(i)
                ).to.equal(artyfex);
                await expect(
                    await layer0.holderSince(i)
                ).to.equal(lastTimestamp2);
                await expect(
                    await layer0.ownerSince(i)
                ).to.equal(lastTimestamp2);
                await expect(
                    await layer0.tokenIdDNA(i)
                ).to.equal(traits.address);
                await expect(await traits.connect(addr1).getTokenIdSalt(i)).to.eq(lastTimestamp2)
            }
        });

        it("Should let artyfex mint 140 correctly", async function () {
            advanceBlocks(3000)
            await traits.connect(artyfexSigner).reserve(140);
            const lastBlockNumber1 = await ethers.provider.getBlockNumber();
            const lastBlock1 = await ethers.provider.getBlock(lastBlockNumber1);
            const lastTimestamp1 = lastBlock1.timestamp;
            await expect(await layer0.balanceOf(artyfex)).to.eq(BigNumber.from(140))
            for (i = 1; i <= 140; i++) {
                await expect(
                    await layer0.ownerOf(i)
                ).to.equal(artyfex);
                await expect(
                    await layer0.holderSince(i)
                ).to.equal(lastTimestamp1);
                await expect(
                    await layer0.ownerSince(i)
                ).to.equal(lastTimestamp1);
                await expect(
                    await layer0.tokenIdDNA(i)
                ).to.equal(traits.address);
                await expect(await traits.connect(addr1).getTokenIdSalt(i)).to.eq(lastTimestamp1)
            }
        });

        it("Should let artyfex mint 10 correctly after genesisMint started", async function () {
            advanceBlocks(3000)
            await traits.connect(addr2).mint(10, { value: ethers.utils.parseEther("0.853") })
            await traits.connect(artyfexSigner).reserve(10);
            const lastBlockNumber1 = await ethers.provider.getBlockNumber();
            const lastBlock1 = await ethers.provider.getBlock(lastBlockNumber1);
            const lastTimestamp1 = lastBlock1.timestamp;
            await expect(await layer0.balanceOf(artyfex)).to.eq(BigNumber.from(10))
            for (i = 11; i <= 20; i++) {
                await expect(
                    await layer0.ownerOf(i)
                ).to.equal(artyfex);
                await expect(
                    await layer0.holderSince(i)
                ).to.equal(lastTimestamp1);
                await expect(
                    await layer0.ownerSince(i)
                ).to.equal(lastTimestamp1);
                await expect(
                    await layer0.tokenIdDNA(i)
                ).to.equal(traits.address);
                await expect(await traits.connect(addr1).getTokenIdSalt(i)).to.eq(lastTimestamp1)

            }
        });
        //This test passes but it takes too much time to execute.
        /* it("Should not let call reserve if ends up minting more tokens than total supply", async function () {
            advanceBlocks(3000);
            for(i=0;i<1000;i++){
                let address = ethers.utils.getContractAddress(
                    {
                        from: "0x000000000000000000000000000000000000dEaD",
                        nonce: 1 + i
    
                    }
                );
                tx ={
                    to: address,
                    value: "0x1BC16D674EC80000"
                }
                await addr2.sendTransaction(tx);
                await hre.network.provider.request({
                    method: "hardhat_impersonateAccount",
                    params: [address.toString()],
                });
                const signer = await ethers.getSigner(address);
                await expect(traits.connect(signer).mint(10,{ value: ethers.utils.parseEther("0.853") })).not.to.be.reverted;
                await expect(await layer0.connect(addr1).totalSupply()).to.equal(10*(i+1));
            }
            
            await expect(
                traits.connect(artyfexSigner).reserve(1)
            ).to.be.revertedWith("DNA: Amount exceeds available tokens for mint.");
        }); */
        
    });

    describe('Tests of "tokenUri"', async function () {
        it("Should revert if tokenId does not exist", async function () {
            advanceBlocks(3000);
            await traits.connect(addr2).mint(2, { value: ethers.utils.parseEther("0.2") })
            await expect(traits.connect(addr2).tokenURI(3)).to.be.revertedWith("DNA: TokenId does not exist or does not belong to this DNA")
        });

        it("Should revert if tokenId equals 0", async function () {
            advanceBlocks(3000);
            await traits.connect(addr2).mint(2, { value: ethers.utils.parseEther("0.2") })
            await expect(traits.connect(addr2).tokenURI(0)).to.be.revertedWith("DNA: TokenId does not exist or does not belong to this DNA")
        });

        it("Should revert if tokenId belongs to different DNA", async function () {
            advanceBlocks(3000);
            await layer0.connect(owner).setNewDNA(addr2.address);
            await layer0.connect(addr2).postGenesisMint(1, addr2.address)
            await expect(
                await layer0.ownerOf(10001)
            ).to.equal(addr2.address);
            await expect(traits.connect(addr2).tokenURI(10001)).to.be.revertedWith("DNA: TokenId does not exist or does not belong to this DNA")
        });
    })

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
