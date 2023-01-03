const { expect, assert } = require("chai");
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");

describe('"rzTokenUri" Testing', function () {
    let owner, addr1, addr2, addr3, addr4,
        addr5, addr6, addr7, addr8, addr9;
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
        layer1 = await layer1TokenFactory.connect(owner).deploy(
            [3, 3, 5, 5, 5, 5],
            [2, 8, 2, 3, 5, 20]);
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

        layer1PruebaFactory = await hre.ethers.getContractFactory("Layer1Prueba");
        layer1Prueba = await layer1PruebaFactory.connect(owner).deploy();
        await layer1Prueba.deployed();

        await layer1Prueba.connect(owner).setMintStart(1)
        await layer1Prueba.connect(owner).setTraitsVault(traitVault.address)
        await layer1Prueba.connect(owner).setBaseURI("layer1-prueba/uri/")
        await layer1Prueba.connect(owner).setImageURI("layer1-prueba/image/")


        await layer1.connect(owner).setTraitsVault(traitVault.address);
        await layer1.connect(owner).setRegensZero(layer0.address);
        await layer0.connect(owner).setGenesisDNA(traitVault.address);
        await traitVault.connect(owner).setTokenUriContract(tokenUri.address);

        await traitVault.connect(owner).setDNAImageUri("regens-zero/dna-image-uri.png")
        await traitVault.connect(owner).setPreviewImageUri("regens-zero/preview-image/")
        await layer1.connect(owner).setImageURI("genesis-traits/image-uri/");
        await layer1.connect(owner).setBaseURI("genesis-traits/base-uri/");
        await layer1.connect(owner).setPreRevealUri("genesis-traits/pre-reveal-uri");
        await tokenUri.connect(owner).setPreRevealUri('regens-zero/pre-reveal-uri')

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

    describe('Tests of "constructor"', async function () {
        it("Should correctly set contract parameters on deployment", async function () {
            await expect(await tokenUri.genesisVault()).to.equal(traitVault.address);

            await expect(await tokenUri.preRevealUri()).to.equal("regens-zero/pre-reveal-uri");
        });
    });

    describe('Tests of "setPreRevealUri"', async function () {
        it("Should let owner set pre-reveal uri", async function () {
            await tokenUri.connect(owner).setPreRevealUri('nueva_uri/');
            await expect(await tokenUri.preRevealUri()).to.equal('nueva_uri/');
        });

        it("Should revert if caller is not owner", async function () {
            await expect(
                tokenUri.connect(addr3).setPreRevealUri('nueva_uri/')
            ).to.be.revertedWith('Ownable: caller is not the owner');
            await expect(await tokenUri.preRevealUri()).to.equal("regens-zero/pre-reveal-uri");
        });
    });

    describe('Tests of "tokenURI"', async function () {
        it("Should return pre-reveal uri before reveal", async function () {
            advanceBlocks(3000);
            await traitVault.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.1") });

            await expect(await layer0.tokenURI(1)).to.be.equal('regens-zero/pre-reveal-uri');
        });

        it("Should return onchain token uri, post reveal, traits not minted", async function () {
            advanceBlocks(3000);

            await network.provider.send("evm_setNextBlockTimestamp", [1904083200]);
            await traitVault.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.1") });

            await network.provider.send("evm_setNextBlockTimestamp", [2061849600]);
            await reveal()

            await expect(await layer0.tokenURI(1)).to.be.equal(
                'data:application/json;base64,eyJuYW1lIjogIlJlZ2VuICMxIiwiZGVzY3JpcHRpb24iOiAiVGhlIGZpcnN0IG9wZW4sIGRlY2VudHJhbGl6ZWQgYW5kIGluZmluaXRlbHktZXh0ZW5zaWJsZSBtZXRhLWNvbGxlY3Rpb24sIHBvd2VyZWQgYnkgZHluYW1pYyBhbmQgY29tcG9zYWJsZSBORlRzLiIsImltYWdlIjogInJlZ2Vucy16ZXJvL3ByZXZpZXctaW1hZ2UvMS5wbmciLCJhbmltYXRpb25fdXJsIjogImRhdGE6aW1hZ2Uvc3ZnK3htbDtiYXNlNjQsUEhOMlp5QjRiV3h1Y3owaWFIUjBjRG92TDNkM2R5NTNNeTV2Y21jdk1qQXdNQzl6ZG1jaUlIQnlaWE5sY25abFFYTndaV04wVW1GMGFXODlJbmhOYVc1WlRXbHVJRzFsWlhRaUlIWnBaWGRDYjNnOUlqQWdNQ0F6TURBd0lETXdNREFpSUhkcFpIUm9QU0kxTURndU16TXpJaUJvWldsbmFIUTlJalV3T0M0ek16TWlQanhwYldGblpTQm9jbVZtUFNBaVoyVnVaWE5wY3kxMGNtRnBkSE12YVcxaFoyVXRkWEpwTHpJdWNHNW5JaTgrUEdsdFlXZGxJR2h5WldZOUlDSm5aVzVsYzJsekxYUnlZV2wwY3k5cGJXRm5aUzExY21rdk5TNXdibWNpTHo0OGFXMWhaMlVnYUhKbFpqMGdJbkpsWjJWdWN5MTZaWEp2TDJSdVlTMXBiV0ZuWlMxMWNta3VjRzVuSWk4K1BHbHRZV2RsSUdoeVpXWTlJQ0puWlc1bGMybHpMWFJ5WVdsMGN5OXBiV0ZuWlMxMWNta3ZPUzV3Ym1jaUx6NDhhVzFoWjJVZ2FISmxaajBnSW1kbGJtVnphWE10ZEhKaGFYUnpMMmx0WVdkbExYVnlhUzh4TlM1d2JtY2lMejQ4YVcxaFoyVWdhSEpsWmowZ0ltZGxibVZ6YVhNdGRISmhhWFJ6TDJsdFlXZGxMWFZ5YVM4eE9DNXdibWNpTHo0OGFXMWhaMlVnYUhKbFpqMGdJbWRsYm1WemFYTXRkSEpoYVhSekwybHRZV2RsTFhWeWFTOHlOUzV3Ym1jaUx6NDhMM04yWno0PSIsImF0dHJpYnV0ZXMiOiBbeyJ0cmFpdF90eXBlIjogIkROQSIsInZhbHVlIjogIkdlbmVzaXNETkEiLCJjb250cmFjdCI6ICIweDlmZTQ2NzM2Njc5ZDJkOWE2NWYwOTkyZjIyNzJkZTlmM2M3ZmE2ZTAifSx7InRyYWl0X3R5cGUiOiAiTGF5ZXIgMCIsInZhbHVlIjogImZvbmRvMiIsIm1ldGFkYXRhIjogIkVxdWlwcGVkIHRyYWl0cyBub3QgbWludGVkIHlldC4iLCJjb250cmFjdCI6ICIweGU3ZjE3MjVlNzczNGNlMjg4ZjgzNjdlMWJiMTQzZTkwYmIzZjA1MTIiLCJ0b2tlbklkIjogIiJ9LHsidHJhaXRfdHlwZSI6ICJMYXllciAyIiwidmFsdWUiOiAic2tpbjIiLCJtZXRhZGF0YSI6ICJFcXVpcHBlZCB0cmFpdHMgbm90IG1pbnRlZCB5ZXQuIiwiY29udHJhY3QiOiAiMHhlN2YxNzI1ZTc3MzRjZTI4OGY4MzY3ZTFiYjE0M2U5MGJiM2YwNTEyIiwidG9rZW5JZCI6ICIifSx7InRyYWl0X3R5cGUiOiAiTGF5ZXIgNCIsInZhbHVlIjogImV5ZXMzIiwibWV0YWRhdGEiOiAiRXF1aXBwZWQgdHJhaXRzIG5vdCBtaW50ZWQgeWV0LiIsImNvbnRyYWN0IjogIjB4ZTdmMTcyNWU3NzM0Y2UyODhmODM2N2UxYmIxNDNlOTBiYjNmMDUxMiIsInRva2VuSWQiOiAiIn0seyJ0cmFpdF90eXBlIjogIkxheWVyIDYiLCJ2YWx1ZSI6ICJoZWFkNCIsIm1ldGFkYXRhIjogIkVxdWlwcGVkIHRyYWl0cyBub3QgbWludGVkIHlldC4iLCJjb250cmFjdCI6ICIweGU3ZjE3MjVlNzczNGNlMjg4ZjgzNjdlMWJiMTQzZTkwYmIzZjA1MTIiLCJ0b2tlbklkIjogIiJ9LHsidHJhaXRfdHlwZSI6ICJMYXllciA4IiwidmFsdWUiOiAicm9wYTIiLCJtZXRhZGF0YSI6ICJFcXVpcHBlZCB0cmFpdHMgbm90IG1pbnRlZCB5ZXQuIiwiY29udHJhY3QiOiAiMHhlN2YxNzI1ZTc3MzRjZTI4OGY4MzY3ZTFiYjE0M2U5MGJiM2YwNTEyIiwidG9rZW5JZCI6ICIifSx7InRyYWl0X3R5cGUiOiAiTGF5ZXIgMTAiLCJ2YWx1ZSI6ICJtb3V0aDQiLCJtZXRhZGF0YSI6ICJFcXVpcHBlZCB0cmFpdHMgbm90IG1pbnRlZCB5ZXQuIiwiY29udHJhY3QiOiAiMHhlN2YxNzI1ZTc3MzRjZTI4OGY4MzY3ZTFiYjE0M2U5MGJiM2YwNTEyIiwidG9rZW5JZCI6ICIifV19'
            );
        });

        it("Should return onchain token uri, post reveal, traits minted", async function () {
            advanceBlocks(3000);

            await network.provider.send("evm_setNextBlockTimestamp", [1904083201]);
            await traitVault.connect(addr1).mint(1, { value: ethers.utils.parseEther("0.1") });
            await traitVault.connect(addr1).mintTraits(1);

            await network.provider.send("evm_setNextBlockTimestamp", [2061849601]);
            await reveal()

            await expect(await layer0.tokenURI(1)).to.be.equal(
                'data:application/json;base64,eyJuYW1lIjogIlJlZ2VuICMxIiwiZGVzY3JpcHRpb24iOiAiVGhlIGZpcnN0IG9wZW4sIGRlY2VudHJhbGl6ZWQgYW5kIGluZmluaXRlbHktZXh0ZW5zaWJsZSBtZXRhLWNvbGxlY3Rpb24sIHBvd2VyZWQgYnkgZHluYW1pYyBhbmQgY29tcG9zYWJsZSBORlRzLiIsImltYWdlIjogInJlZ2Vucy16ZXJvL3ByZXZpZXctaW1hZ2UvMS5wbmciLCJhbmltYXRpb25fdXJsIjogImRhdGE6aW1hZ2Uvc3ZnK3htbDtiYXNlNjQsUEhOMlp5QjRiV3h1Y3owaWFIUjBjRG92TDNkM2R5NTNNeTV2Y21jdk1qQXdNQzl6ZG1jaUlIQnlaWE5sY25abFFYTndaV04wVW1GMGFXODlJbmhOYVc1WlRXbHVJRzFsWlhRaUlIWnBaWGRDYjNnOUlqQWdNQ0F6TURBd0lETXdNREFpSUhkcFpIUm9QU0kxTURndU16TXpJaUJvWldsbmFIUTlJalV3T0M0ek16TWlQanhwYldGblpTQm9jbVZtUFNBaVoyVnVaWE5wY3kxMGNtRnBkSE12YVcxaFoyVXRkWEpwTHpFdWNHNW5JaTgrUEdsdFlXZGxJR2h5WldZOUlDSm5aVzVsYzJsekxYUnlZV2wwY3k5cGJXRm5aUzExY21rdk5pNXdibWNpTHo0OGFXMWhaMlVnYUhKbFpqMGdJbkpsWjJWdWN5MTZaWEp2TDJSdVlTMXBiV0ZuWlMxMWNta3VjRzVuSWk4K1BHbHRZV2RsSUdoeVpXWTlJQ0puWlc1bGMybHpMWFJ5WVdsMGN5OXBiV0ZuWlMxMWNta3ZOeTV3Ym1jaUx6NDhhVzFoWjJVZ2FISmxaajBnSW1kbGJtVnphWE10ZEhKaGFYUnpMMmx0WVdkbExYVnlhUzh4TWk1d2JtY2lMejQ4YVcxaFoyVWdhSEpsWmowZ0ltZGxibVZ6YVhNdGRISmhhWFJ6TDJsdFlXZGxMWFZ5YVM4eU1DNXdibWNpTHo0OGFXMWhaMlVnYUhKbFpqMGdJbWRsYm1WemFYTXRkSEpoYVhSekwybHRZV2RsTFhWeWFTOHlOUzV3Ym1jaUx6NDhMM04yWno0PSIsImF0dHJpYnV0ZXMiOiBbeyJ0cmFpdF90eXBlIjogIkROQSIsInZhbHVlIjogIkdlbmVzaXNETkEiLCJjb250cmFjdCI6ICIweDlmZTQ2NzM2Njc5ZDJkOWE2NWYwOTkyZjIyNzJkZTlmM2M3ZmE2ZTAifSx7InRyYWl0X3R5cGUiOiAiTGF5ZXIgMCIsInZhbHVlIjogImZvbmRvMSIsIm1ldGFkYXRhIjogImdlbmVzaXMtdHJhaXRzL2Jhc2UtdXJpLzEuanNvbiIsImNvbnRyYWN0IjogIjB4ZTdmMTcyNWU3NzM0Y2UyODhmODM2N2UxYmIxNDNlOTBiYjNmMDUxMiIsInRva2VuSWQiOiAiMSJ9LHsidHJhaXRfdHlwZSI6ICJMYXllciAyIiwidmFsdWUiOiAic2tpbjMiLCJtZXRhZGF0YSI6ICJnZW5lc2lzLXRyYWl0cy9iYXNlLXVyaS82Lmpzb24iLCJjb250cmFjdCI6ICIweGU3ZjE3MjVlNzczNGNlMjg4ZjgzNjdlMWJiMTQzZTkwYmIzZjA1MTIiLCJ0b2tlbklkIjogIjIwMDAwMDEifSx7InRyYWl0X3R5cGUiOiAiTGF5ZXIgNCIsInZhbHVlIjogImV5ZXMxIiwibWV0YWRhdGEiOiAiZ2VuZXNpcy10cmFpdHMvYmFzZS11cmkvNy5qc29uIiwiY29udHJhY3QiOiAiMHhlN2YxNzI1ZTc3MzRjZTI4OGY4MzY3ZTFiYjE0M2U5MGJiM2YwNTEyIiwidG9rZW5JZCI6ICI0MDAwMDAxIn0seyJ0cmFpdF90eXBlIjogIkxheWVyIDYiLCJ2YWx1ZSI6ICJoZWFkMSIsIm1ldGFkYXRhIjogImdlbmVzaXMtdHJhaXRzL2Jhc2UtdXJpLzEyLmpzb24iLCJjb250cmFjdCI6ICIweGU3ZjE3MjVlNzczNGNlMjg4ZjgzNjdlMWJiMTQzZTkwYmIzZjA1MTIiLCJ0b2tlbklkIjogIjYwMDAwMDEifSx7InRyYWl0X3R5cGUiOiAiTGF5ZXIgOCIsInZhbHVlIjogInJvcGE0IiwibWV0YWRhdGEiOiAiZ2VuZXNpcy10cmFpdHMvYmFzZS11cmkvMjAuanNvbiIsImNvbnRyYWN0IjogIjB4ZTdmMTcyNWU3NzM0Y2UyODhmODM2N2UxYmIxNDNlOTBiYjNmMDUxMiIsInRva2VuSWQiOiAiODAwMDAwMSJ9LHsidHJhaXRfdHlwZSI6ICJMYXllciAxMCIsInZhbHVlIjogIm1vdXRoNCIsIm1ldGFkYXRhIjogImdlbmVzaXMtdHJhaXRzL2Jhc2UtdXJpLzI1Lmpzb24iLCJjb250cmFjdCI6ICIweGU3ZjE3MjVlNzczNGNlMjg4ZjgzNjdlMWJiMTQzZTkwYmIzZjA1MTIiLCJ0b2tlbklkIjogIjEwMDAwMDAxIn1dfQ=='
            );
        });

        it("Should return onchain token uri, post reveal, traits minted, traits changed", async function () {
            advanceBlocks(3000);

            await network.provider.send("evm_setNextBlockTimestamp", [1904083202]);
            await traitVault.connect(addr1).mint(2, { value: ethers.utils.parseEther("0.2") });

            await network.provider.send("evm_setNextBlockTimestamp", [2061849602]);
            await reveal()

            await traitVault.connect(addr1).mintTraits(1);
            await traitVault.connect(addr1).mintTraits(2);
            await traitVault.connect(owner).addContractToAllowlist(layer1Prueba.address);
            for (i = 0; i < 20; i++) {
                await layer1Prueba.connect(addr1).mint(3, i);
            }
            await traitVault.connect(addr1).changeTraits(1, [0, 2, 4, 6, 8, 10], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0]);
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
            await traitVault.connect(addr1).changeTraits(2, layers, contracts, newTraits)

            await expect(await layer0.tokenURI(2)).to.be.equal(
                'data:application/json;base64,eyJuYW1lIjogIlJlZ2VuICMyIiwiZGVzY3JpcHRpb24iOiAiVGhlIGZpcnN0IG9wZW4sIGRlY2VudHJhbGl6ZWQgYW5kIGluZmluaXRlbHktZXh0ZW5zaWJsZSBtZXRhLWNvbGxlY3Rpb24sIHBvd2VyZWQgYnkgZHluYW1pYyBhbmQgY29tcG9zYWJsZSBORlRzLiIsImltYWdlIjogInJlZ2Vucy16ZXJvL3ByZXZpZXctaW1hZ2UvMi5wbmciLCJhbmltYXRpb25fdXJsIjogImRhdGE6aW1hZ2Uvc3ZnK3htbDtiYXNlNjQsUEhOMlp5QjRiV3h1Y3owaWFIUjBjRG92TDNkM2R5NTNNeTV2Y21jdk1qQXdNQzl6ZG1jaUlIQnlaWE5sY25abFFYTndaV04wVW1GMGFXODlJbmhOYVc1WlRXbHVJRzFsWlhRaUlIWnBaWGRDYjNnOUlqQWdNQ0F6TURBd0lETXdNREFpSUhkcFpIUm9QU0kxTURndU16TXpJaUJvWldsbmFIUTlJalV3T0M0ek16TWlQanhwYldGblpTQm9jbVZtUFNBaVoyVnVaWE5wY3kxMGNtRnBkSE12YVcxaFoyVXRkWEpwTHpNdWNHNW5JaTgrUEdsdFlXZGxJR2h5WldZOUlDSnNZWGxsY2pFdGNISjFaV0poTDJsdFlXZGxMekV3TURBd01ETXVjRzVuSWk4K1BHbHRZV2RsSUdoeVpXWTlJQ0puWlc1bGMybHpMWFJ5WVdsMGN5OXBiV0ZuWlMxMWNta3ZOaTV3Ym1jaUx6NDhhVzFoWjJVZ2FISmxaajBnSW5KbFoyVnVjeTE2WlhKdkwyUnVZUzFwYldGblpTMTFjbWt1Y0c1bklpOCtQR2x0WVdkbElHaHlaV1k5SUNKc1lYbGxjakV0Y0hKMVpXSmhMMmx0WVdkbEx6TXdNREF3TURNdWNHNW5JaTgrUEdsdFlXZGxJR2h5WldZOUlDSm5aVzVsYzJsekxYUnlZV2wwY3k5cGJXRm5aUzExY21rdk55NXdibWNpTHo0OGFXMWhaMlVnYUhKbFpqMGdJbXhoZVdWeU1TMXdjblZsWW1FdmFXMWhaMlV2TlRBd01EQXdNeTV3Ym1jaUx6NDhhVzFoWjJVZ2FISmxaajBnSW1kbGJtVnphWE10ZEhKaGFYUnpMMmx0WVdkbExYVnlhUzh4TXk1d2JtY2lMejQ4YVcxaFoyVWdhSEpsWmowZ0lteGhlV1Z5TVMxd2NuVmxZbUV2YVcxaFoyVXZOekF3TURBd015NXdibWNpTHo0OGFXMWhaMlVnYUhKbFpqMGdJbWRsYm1WemFYTXRkSEpoYVhSekwybHRZV2RsTFhWeWFTOHhPQzV3Ym1jaUx6NDhhVzFoWjJVZ2FISmxaajBnSW14aGVXVnlNUzF3Y25WbFltRXZhVzFoWjJVdk9UQXdNREF3TXk1d2JtY2lMejQ4YVcxaFoyVWdhSEpsWmowZ0ltZGxibVZ6YVhNdGRISmhhWFJ6TDJsdFlXZGxMWFZ5YVM4eU5DNXdibWNpTHo0OGFXMWhaMlVnYUhKbFpqMGdJbXhoZVdWeU1TMXdjblZsWW1FdmFXMWhaMlV2TVRFd01EQXdNRE11Y0c1bklpOCtQR2x0WVdkbElHaHlaV1k5SUNKc1lYbGxjakV0Y0hKMVpXSmhMMmx0WVdkbEx6RXlNREF3TURBekxuQnVaeUl2UGp4cGJXRm5aU0JvY21WbVBTQWliR0Y1WlhJeExYQnlkV1ZpWVM5cGJXRm5aUzh4TXpBd01EQXdNeTV3Ym1jaUx6NDhhVzFoWjJVZ2FISmxaajBnSW14aGVXVnlNUzF3Y25WbFltRXZhVzFoWjJVdk1UUXdNREF3TURNdWNHNW5JaTgrUEdsdFlXZGxJR2h5WldZOUlDSnNZWGxsY2pFdGNISjFaV0poTDJsdFlXZGxMekUxTURBd01EQXpMbkJ1WnlJdlBqeHBiV0ZuWlNCb2NtVm1QU0FpYkdGNVpYSXhMWEJ5ZFdWaVlTOXBiV0ZuWlM4eE5qQXdNREF3TXk1d2JtY2lMejQ4YVcxaFoyVWdhSEpsWmowZ0lteGhlV1Z5TVMxd2NuVmxZbUV2YVcxaFoyVXZNVGN3TURBd01ETXVjRzVuSWk4K1BHbHRZV2RsSUdoeVpXWTlJQ0pzWVhsbGNqRXRjSEoxWldKaEwybHRZV2RsTHpFNE1EQXdNREF6TG5CdVp5SXZQanhwYldGblpTQm9jbVZtUFNBaWJHRjVaWEl4TFhCeWRXVmlZUzlwYldGblpTOHhPVEF3TURBd015NXdibWNpTHo0OEwzTjJaejQ9IiwiYXR0cmlidXRlcyI6IFt7InRyYWl0X3R5cGUiOiAiRE5BIiwidmFsdWUiOiAiR2VuZXNpc0ROQSIsImNvbnRyYWN0IjogIjB4OWZlNDY3MzY2NzlkMmQ5YTY1ZjA5OTJmMjI3MmRlOWYzYzdmYTZlMCJ9LHsidHJhaXRfdHlwZSI6ICJMYXllciAwIiwidmFsdWUiOiAiZm9uZG8zIiwibWV0YWRhdGEiOiAiZ2VuZXNpcy10cmFpdHMvYmFzZS11cmkvMy5qc29uIiwiY29udHJhY3QiOiAiMHhlN2YxNzI1ZTc3MzRjZTI4OGY4MzY3ZTFiYjE0M2U5MGJiM2YwNTEyIiwidG9rZW5JZCI6ICIxIn0seyJ0cmFpdF90eXBlIjogIkxheWVyIDEiLCJ2YWx1ZSI6ICJUb2tlbiBkZSBsYXllcjFQcnVlYmEgdGlwbyA0IiwibWV0YWRhdGEiOiAibGF5ZXIxLXBydWViYS91cmkvMTAwMDAwMyIsImNvbnRyYWN0IjogIjB4ZGM2NGExNDBhYTNlOTgxMTAwYTliZWNhNGU2ODVmOTYyZjBjZjZjOSIsInRva2VuSWQiOiAiMTAwMDAwMyJ9LHsidHJhaXRfdHlwZSI6ICJMYXllciAyIiwidmFsdWUiOiAic2tpbjMiLCJtZXRhZGF0YSI6ICJnZW5lc2lzLXRyYWl0cy9iYXNlLXVyaS82Lmpzb24iLCJjb250cmFjdCI6ICIweGU3ZjE3MjVlNzczNGNlMjg4ZjgzNjdlMWJiMTQzZTkwYmIzZjA1MTIiLCJ0b2tlbklkIjogIjIwMDAwMDEifSx7InRyYWl0X3R5cGUiOiAiTGF5ZXIgMyIsInZhbHVlIjogIlRva2VuIGRlIGxheWVyMVBydWViYSB0aXBvIDYiLCJtZXRhZGF0YSI6ICJsYXllcjEtcHJ1ZWJhL3VyaS8zMDAwMDAzIiwiY29udHJhY3QiOiAiMHhkYzY0YTE0MGFhM2U5ODExMDBhOWJlY2E0ZTY4NWY5NjJmMGNmNmM5IiwidG9rZW5JZCI6ICIzMDAwMDAzIn0seyJ0cmFpdF90eXBlIjogIkxheWVyIDQiLCJ2YWx1ZSI6ICJleWVzMSIsIm1ldGFkYXRhIjogImdlbmVzaXMtdHJhaXRzL2Jhc2UtdXJpLzcuanNvbiIsImNvbnRyYWN0IjogIjB4ZTdmMTcyNWU3NzM0Y2UyODhmODM2N2UxYmIxNDNlOTBiYjNmMDUxMiIsInRva2VuSWQiOiAiNDAwMDAwMSJ9LHsidHJhaXRfdHlwZSI6ICJMYXllciA1IiwidmFsdWUiOiAiVG9rZW4gZGUgbGF5ZXIxUHJ1ZWJhIHRpcG8gMSIsIm1ldGFkYXRhIjogImxheWVyMS1wcnVlYmEvdXJpLzUwMDAwMDMiLCJjb250cmFjdCI6ICIweGRjNjRhMTQwYWEzZTk4MTEwMGE5YmVjYTRlNjg1Zjk2MmYwY2Y2YzkiLCJ0b2tlbklkIjogIjUwMDAwMDMifSx7InRyYWl0X3R5cGUiOiAiTGF5ZXIgNiIsInZhbHVlIjogImhlYWQyIiwibWV0YWRhdGEiOiAiZ2VuZXNpcy10cmFpdHMvYmFzZS11cmkvMTMuanNvbiIsImNvbnRyYWN0IjogIjB4ZTdmMTcyNWU3NzM0Y2UyODhmODM2N2UxYmIxNDNlOTBiYjNmMDUxMiIsInRva2VuSWQiOiAiNjAwMDAwMSJ9LHsidHJhaXRfdHlwZSI6ICJMYXllciA3IiwidmFsdWUiOiAiVG9rZW4gZGUgbGF5ZXIxUHJ1ZWJhIHRpcG8gMyIsIm1ldGFkYXRhIjogImxheWVyMS1wcnVlYmEvdXJpLzcwMDAwMDMiLCJjb250cmFjdCI6ICIweGRjNjRhMTQwYWEzZTk4MTEwMGE5YmVjYTRlNjg1Zjk2MmYwY2Y2YzkiLCJ0b2tlbklkIjogIjcwMDAwMDMifSx7InRyYWl0X3R5cGUiOiAiTGF5ZXIgOCIsInZhbHVlIjogInJvcGEyIiwibWV0YWRhdGEiOiAiZ2VuZXNpcy10cmFpdHMvYmFzZS11cmkvMTguanNvbiIsImNvbnRyYWN0IjogIjB4ZTdmMTcyNWU3NzM0Y2UyODhmODM2N2UxYmIxNDNlOTBiYjNmMDUxMiIsInRva2VuSWQiOiAiODAwMDAwMSJ9LHsidHJhaXRfdHlwZSI6ICJMYXllciA5IiwidmFsdWUiOiAiVG9rZW4gZGUgbGF5ZXIxUHJ1ZWJhIHRpcG8gNSIsIm1ldGFkYXRhIjogImxheWVyMS1wcnVlYmEvdXJpLzkwMDAwMDMiLCJjb250cmFjdCI6ICIweGRjNjRhMTQwYWEzZTk4MTEwMGE5YmVjYTRlNjg1Zjk2MmYwY2Y2YzkiLCJ0b2tlbklkIjogIjkwMDAwMDMifSx7InRyYWl0X3R5cGUiOiAiTGF5ZXIgMTAiLCJ2YWx1ZSI6ICJtb3V0aDMiLCJtZXRhZGF0YSI6ICJnZW5lc2lzLXRyYWl0cy9iYXNlLXVyaS8yNC5qc29uIiwiY29udHJhY3QiOiAiMHhlN2YxNzI1ZTc3MzRjZTI4OGY4MzY3ZTFiYjE0M2U5MGJiM2YwNTEyIiwidG9rZW5JZCI6ICIxMDAwMDAwMSJ9LHsidHJhaXRfdHlwZSI6ICJMYXllciAxMSIsInZhbHVlIjogIlRva2VuIGRlIGxheWVyMVBydWViYSB0aXBvIDAiLCJtZXRhZGF0YSI6ICJsYXllcjEtcHJ1ZWJhL3VyaS8xMTAwMDAwMyIsImNvbnRyYWN0IjogIjB4ZGM2NGExNDBhYTNlOTgxMTAwYTliZWNhNGU2ODVmOTYyZjBjZjZjOSIsInRva2VuSWQiOiAiMTEwMDAwMDMifSx7InRyYWl0X3R5cGUiOiAiTGF5ZXIgMTIiLCJ2YWx1ZSI6ICJUb2tlbiBkZSBsYXllcjFQcnVlYmEgdGlwbyAxIiwibWV0YWRhdGEiOiAibGF5ZXIxLXBydWViYS91cmkvMTIwMDAwMDMiLCJjb250cmFjdCI6ICIweGRjNjRhMTQwYWEzZTk4MTEwMGE5YmVjYTRlNjg1Zjk2MmYwY2Y2YzkiLCJ0b2tlbklkIjogIjEyMDAwMDAzIn0seyJ0cmFpdF90eXBlIjogIkxheWVyIDEzIiwidmFsdWUiOiAiVG9rZW4gZGUgbGF5ZXIxUHJ1ZWJhIHRpcG8gMiIsIm1ldGFkYXRhIjogImxheWVyMS1wcnVlYmEvdXJpLzEzMDAwMDAzIiwiY29udHJhY3QiOiAiMHhkYzY0YTE0MGFhM2U5ODExMDBhOWJlY2E0ZTY4NWY5NjJmMGNmNmM5IiwidG9rZW5JZCI6ICIxMzAwMDAwMyJ9LHsidHJhaXRfdHlwZSI6ICJMYXllciAxNCIsInZhbHVlIjogIlRva2VuIGRlIGxheWVyMVBydWViYSB0aXBvIDMiLCJtZXRhZGF0YSI6ICJsYXllcjEtcHJ1ZWJhL3VyaS8xNDAwMDAwMyIsImNvbnRyYWN0IjogIjB4ZGM2NGExNDBhYTNlOTgxMTAwYTliZWNhNGU2ODVmOTYyZjBjZjZjOSIsInRva2VuSWQiOiAiMTQwMDAwMDMifSx7InRyYWl0X3R5cGUiOiAiTGF5ZXIgMTUiLCJ2YWx1ZSI6ICJUb2tlbiBkZSBsYXllcjFQcnVlYmEgdGlwbyA0IiwibWV0YWRhdGEiOiAibGF5ZXIxLXBydWViYS91cmkvMTUwMDAwMDMiLCJjb250cmFjdCI6ICIweGRjNjRhMTQwYWEzZTk4MTEwMGE5YmVjYTRlNjg1Zjk2MmYwY2Y2YzkiLCJ0b2tlbklkIjogIjE1MDAwMDAzIn0seyJ0cmFpdF90eXBlIjogIkxheWVyIDE2IiwidmFsdWUiOiAiVG9rZW4gZGUgbGF5ZXIxUHJ1ZWJhIHRpcG8gNSIsIm1ldGFkYXRhIjogImxheWVyMS1wcnVlYmEvdXJpLzE2MDAwMDAzIiwiY29udHJhY3QiOiAiMHhkYzY0YTE0MGFhM2U5ODExMDBhOWJlY2E0ZTY4NWY5NjJmMGNmNmM5IiwidG9rZW5JZCI6ICIxNjAwMDAwMyJ9LHsidHJhaXRfdHlwZSI6ICJMYXllciAxNyIsInZhbHVlIjogIlRva2VuIGRlIGxheWVyMVBydWViYSB0aXBvIDYiLCJtZXRhZGF0YSI6ICJsYXllcjEtcHJ1ZWJhL3VyaS8xNzAwMDAwMyIsImNvbnRyYWN0IjogIjB4ZGM2NGExNDBhYTNlOTgxMTAwYTliZWNhNGU2ODVmOTYyZjBjZjZjOSIsInRva2VuSWQiOiAiMTcwMDAwMDMifSx7InRyYWl0X3R5cGUiOiAiTGF5ZXIgMTgiLCJ2YWx1ZSI6ICJUb2tlbiBkZSBsYXllcjFQcnVlYmEgdGlwbyAwIiwibWV0YWRhdGEiOiAibGF5ZXIxLXBydWViYS91cmkvMTgwMDAwMDMiLCJjb250cmFjdCI6ICIweGRjNjRhMTQwYWEzZTk4MTEwMGE5YmVjYTRlNjg1Zjk2MmYwY2Y2YzkiLCJ0b2tlbklkIjogIjE4MDAwMDAzIn0seyJ0cmFpdF90eXBlIjogIkxheWVyIDE5IiwidmFsdWUiOiAiVG9rZW4gZGUgbGF5ZXIxUHJ1ZWJhIHRpcG8gMSIsIm1ldGFkYXRhIjogImxheWVyMS1wcnVlYmEvdXJpLzE5MDAwMDAzIiwiY29udHJhY3QiOiAiMHhkYzY0YTE0MGFhM2U5ODExMDBhOWJlY2E0ZTY4NWY5NjJmMGNmNmM5IiwidG9rZW5JZCI6ICIxOTAwMDAwMyJ9XX0='
            );
        });

        it("Should return onchain token uri, post reveal, traits minted, no traits", async function () {
            advanceBlocks(3000);

            await network.provider.send("evm_setNextBlockTimestamp", [1904083203]);
            await traitVault.connect(addr1).mint(2, { value: ethers.utils.parseEther("0.2") });
            await traitVault.connect(addr1).mintTraits(2);
            await traitVault.connect(addr1).changeTraits(2, [0, 2, 4, 6, 8, 10], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0]);

            await network.provider.send("evm_setNextBlockTimestamp", [2061849603]);
            await reveal()

            await expect(await layer0.tokenURI(2)).to.be.equal(
                'data:application/json;base64,eyJuYW1lIjogIlJlZ2VuICMyIiwiZGVzY3JpcHRpb24iOiAiVGhlIGZpcnN0IG9wZW4sIGRlY2VudHJhbGl6ZWQgYW5kIGluZmluaXRlbHktZXh0ZW5zaWJsZSBtZXRhLWNvbGxlY3Rpb24sIHBvd2VyZWQgYnkgZHluYW1pYyBhbmQgY29tcG9zYWJsZSBORlRzLiIsImltYWdlIjogInJlZ2Vucy16ZXJvL3ByZXZpZXctaW1hZ2UvMi5wbmciLCJhbmltYXRpb25fdXJsIjogImRhdGE6aW1hZ2Uvc3ZnK3htbDtiYXNlNjQsUEhOMlp5QjRiV3h1Y3owaWFIUjBjRG92TDNkM2R5NTNNeTV2Y21jdk1qQXdNQzl6ZG1jaUlIQnlaWE5sY25abFFYTndaV04wVW1GMGFXODlJbmhOYVc1WlRXbHVJRzFsWlhRaUlIWnBaWGRDYjNnOUlqQWdNQ0F6TURBd0lETXdNREFpSUhkcFpIUm9QU0kxTURndU16TXpJaUJvWldsbmFIUTlJalV3T0M0ek16TWlQanhwYldGblpTQm9jbVZtUFNBaWNtVm5aVzV6TFhwbGNtOHZaRzVoTFdsdFlXZGxMWFZ5YVM1d2JtY2lMejQ4TDNOMlp6ND0iLCJhdHRyaWJ1dGVzIjogW3sidHJhaXRfdHlwZSI6ICJETkEiLCJ2YWx1ZSI6ICJHZW5lc2lzRE5BIiwiY29udHJhY3QiOiAiMHg5ZmU0NjczNjY3OWQyZDlhNjVmMDk5MmYyMjcyZGU5ZjNjN2ZhNmUwIn1dfQ=='
            );
        });

        it("Should return onchain token uri, post reveal, no position 0", async function () {
            advanceBlocks(3000);

            await network.provider.send("evm_setNextBlockTimestamp", [1904083204]);
            await traitVault.connect(addr1).mint(2, { value: ethers.utils.parseEther("0.2") });
            await traitVault.connect(addr1).mintTraits(1);
            await traitVault.connect(addr1).mintTraits(2);
            await traitVault.connect(owner).addContractToAllowlist(layer1Prueba.address);

            for (i = 0; i < 20; i++) {
                await layer1Prueba.connect(addr1).mint(3, i);
            }

            await traitVault.connect(addr1).changeTraits(1, [0, 2, 4, 6, 8, 10], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0]);
            await traitVault.connect(addr1).changeTraits(2, [0], [0], [0]);

            let newTraits = [];
            let contracts = [];
            let layers = [];
            for (i = 1; i < 20; i++) {
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
            await traitVault.connect(addr1).changeTraits(2, layers, contracts, newTraits)

            await network.provider.send("evm_setNextBlockTimestamp", [2061849604]);
            await reveal()

            await expect(await layer0.tokenURI(2)).to.be.equal(
                'data:application/json;base64,eyJuYW1lIjogIlJlZ2VuICMyIiwiZGVzY3JpcHRpb24iOiAiVGhlIGZpcnN0IG9wZW4sIGRlY2VudHJhbGl6ZWQgYW5kIGluZmluaXRlbHktZXh0ZW5zaWJsZSBtZXRhLWNvbGxlY3Rpb24sIHBvd2VyZWQgYnkgZHluYW1pYyBhbmQgY29tcG9zYWJsZSBORlRzLiIsImltYWdlIjogInJlZ2Vucy16ZXJvL3ByZXZpZXctaW1hZ2UvMi5wbmciLCJhbmltYXRpb25fdXJsIjogImRhdGE6aW1hZ2Uvc3ZnK3htbDtiYXNlNjQsUEhOMlp5QjRiV3h1Y3owaWFIUjBjRG92TDNkM2R5NTNNeTV2Y21jdk1qQXdNQzl6ZG1jaUlIQnlaWE5sY25abFFYTndaV04wVW1GMGFXODlJbmhOYVc1WlRXbHVJRzFsWlhRaUlIWnBaWGRDYjNnOUlqQWdNQ0F6TURBd0lETXdNREFpSUhkcFpIUm9QU0kxTURndU16TXpJaUJvWldsbmFIUTlJalV3T0M0ek16TWlQanhwYldGblpTQm9jbVZtUFNBaWJHRjVaWEl4TFhCeWRXVmlZUzlwYldGblpTOHhNREF3TURBekxuQnVaeUl2UGp4cGJXRm5aU0JvY21WbVBTQWlaMlZ1WlhOcGN5MTBjbUZwZEhNdmFXMWhaMlV0ZFhKcEx6UXVjRzVuSWk4K1BHbHRZV2RsSUdoeVpXWTlJQ0p5WldkbGJuTXRlbVZ5Ynk5a2JtRXRhVzFoWjJVdGRYSnBMbkJ1WnlJdlBqeHBiV0ZuWlNCb2NtVm1QU0FpYkdGNVpYSXhMWEJ5ZFdWaVlTOXBiV0ZuWlM4ek1EQXdNREF6TG5CdVp5SXZQanhwYldGblpTQm9jbVZtUFNBaVoyVnVaWE5wY3kxMGNtRnBkSE12YVcxaFoyVXRkWEpwTHprdWNHNW5JaTgrUEdsdFlXZGxJR2h5WldZOUlDSnNZWGxsY2pFdGNISjFaV0poTDJsdFlXZGxMelV3TURBd01ETXVjRzVuSWk4K1BHbHRZV2RsSUdoeVpXWTlJQ0puWlc1bGMybHpMWFJ5WVdsMGN5OXBiV0ZuWlMxMWNta3ZNVEl1Y0c1bklpOCtQR2x0WVdkbElHaHlaV1k5SUNKc1lYbGxjakV0Y0hKMVpXSmhMMmx0WVdkbEx6Y3dNREF3TURNdWNHNW5JaTgrUEdsdFlXZGxJR2h5WldZOUlDSm5aVzVsYzJsekxYUnlZV2wwY3k5cGJXRm5aUzExY21rdk1UZ3VjRzVuSWk4K1BHbHRZV2RsSUdoeVpXWTlJQ0pzWVhsbGNqRXRjSEoxWldKaEwybHRZV2RsTHprd01EQXdNRE11Y0c1bklpOCtQR2x0WVdkbElHaHlaV1k5SUNKblpXNWxjMmx6TFhSeVlXbDBjeTlwYldGblpTMTFjbWt2TWpNdWNHNW5JaTgrUEdsdFlXZGxJR2h5WldZOUlDSnNZWGxsY2pFdGNISjFaV0poTDJsdFlXZGxMekV4TURBd01EQXpMbkJ1WnlJdlBqeHBiV0ZuWlNCb2NtVm1QU0FpYkdGNVpYSXhMWEJ5ZFdWaVlTOXBiV0ZuWlM4eE1qQXdNREF3TXk1d2JtY2lMejQ4YVcxaFoyVWdhSEpsWmowZ0lteGhlV1Z5TVMxd2NuVmxZbUV2YVcxaFoyVXZNVE13TURBd01ETXVjRzVuSWk4K1BHbHRZV2RsSUdoeVpXWTlJQ0pzWVhsbGNqRXRjSEoxWldKaEwybHRZV2RsTHpFME1EQXdNREF6TG5CdVp5SXZQanhwYldGblpTQm9jbVZtUFNBaWJHRjVaWEl4TFhCeWRXVmlZUzlwYldGblpTOHhOVEF3TURBd015NXdibWNpTHo0OGFXMWhaMlVnYUhKbFpqMGdJbXhoZVdWeU1TMXdjblZsWW1FdmFXMWhaMlV2TVRZd01EQXdNRE11Y0c1bklpOCtQR2x0WVdkbElHaHlaV1k5SUNKc1lYbGxjakV0Y0hKMVpXSmhMMmx0WVdkbEx6RTNNREF3TURBekxuQnVaeUl2UGp4cGJXRm5aU0JvY21WbVBTQWliR0Y1WlhJeExYQnlkV1ZpWVM5cGJXRm5aUzh4T0RBd01EQXdNeTV3Ym1jaUx6NDhhVzFoWjJVZ2FISmxaajBnSW14aGVXVnlNUzF3Y25WbFltRXZhVzFoWjJVdk1Ua3dNREF3TURNdWNHNW5JaTgrUEM5emRtYysiLCJhdHRyaWJ1dGVzIjogW3sidHJhaXRfdHlwZSI6ICJETkEiLCJ2YWx1ZSI6ICJHZW5lc2lzRE5BIiwiY29udHJhY3QiOiAiMHg5ZmU0NjczNjY3OWQyZDlhNjVmMDk5MmYyMjcyZGU5ZjNjN2ZhNmUwIn0seyJ0cmFpdF90eXBlIjogIkxheWVyIDEiLCJ2YWx1ZSI6ICJUb2tlbiBkZSBsYXllcjFQcnVlYmEgdGlwbyA0IiwibWV0YWRhdGEiOiAibGF5ZXIxLXBydWViYS91cmkvMTAwMDAwMyIsImNvbnRyYWN0IjogIjB4ZGM2NGExNDBhYTNlOTgxMTAwYTliZWNhNGU2ODVmOTYyZjBjZjZjOSIsInRva2VuSWQiOiAiMTAwMDAwMyJ9LHsidHJhaXRfdHlwZSI6ICJMYXllciAyIiwidmFsdWUiOiAic2tpbjEiLCJtZXRhZGF0YSI6ICJnZW5lc2lzLXRyYWl0cy9iYXNlLXVyaS80Lmpzb24iLCJjb250cmFjdCI6ICIweGU3ZjE3MjVlNzczNGNlMjg4ZjgzNjdlMWJiMTQzZTkwYmIzZjA1MTIiLCJ0b2tlbklkIjogIjIwMDAwMDEifSx7InRyYWl0X3R5cGUiOiAiTGF5ZXIgMyIsInZhbHVlIjogIlRva2VuIGRlIGxheWVyMVBydWViYSB0aXBvIDYiLCJtZXRhZGF0YSI6ICJsYXllcjEtcHJ1ZWJhL3VyaS8zMDAwMDAzIiwiY29udHJhY3QiOiAiMHhkYzY0YTE0MGFhM2U5ODExMDBhOWJlY2E0ZTY4NWY5NjJmMGNmNmM5IiwidG9rZW5JZCI6ICIzMDAwMDAzIn0seyJ0cmFpdF90eXBlIjogIkxheWVyIDQiLCJ2YWx1ZSI6ICJleWVzMyIsIm1ldGFkYXRhIjogImdlbmVzaXMtdHJhaXRzL2Jhc2UtdXJpLzkuanNvbiIsImNvbnRyYWN0IjogIjB4ZTdmMTcyNWU3NzM0Y2UyODhmODM2N2UxYmIxNDNlOTBiYjNmMDUxMiIsInRva2VuSWQiOiAiNDAwMDAwMSJ9LHsidHJhaXRfdHlwZSI6ICJMYXllciA1IiwidmFsdWUiOiAiVG9rZW4gZGUgbGF5ZXIxUHJ1ZWJhIHRpcG8gMSIsIm1ldGFkYXRhIjogImxheWVyMS1wcnVlYmEvdXJpLzUwMDAwMDMiLCJjb250cmFjdCI6ICIweGRjNjRhMTQwYWEzZTk4MTEwMGE5YmVjYTRlNjg1Zjk2MmYwY2Y2YzkiLCJ0b2tlbklkIjogIjUwMDAwMDMifSx7InRyYWl0X3R5cGUiOiAiTGF5ZXIgNiIsInZhbHVlIjogImhlYWQxIiwibWV0YWRhdGEiOiAiZ2VuZXNpcy10cmFpdHMvYmFzZS11cmkvMTIuanNvbiIsImNvbnRyYWN0IjogIjB4ZTdmMTcyNWU3NzM0Y2UyODhmODM2N2UxYmIxNDNlOTBiYjNmMDUxMiIsInRva2VuSWQiOiAiNjAwMDAwMSJ9LHsidHJhaXRfdHlwZSI6ICJMYXllciA3IiwidmFsdWUiOiAiVG9rZW4gZGUgbGF5ZXIxUHJ1ZWJhIHRpcG8gMyIsIm1ldGFkYXRhIjogImxheWVyMS1wcnVlYmEvdXJpLzcwMDAwMDMiLCJjb250cmFjdCI6ICIweGRjNjRhMTQwYWEzZTk4MTEwMGE5YmVjYTRlNjg1Zjk2MmYwY2Y2YzkiLCJ0b2tlbklkIjogIjcwMDAwMDMifSx7InRyYWl0X3R5cGUiOiAiTGF5ZXIgOCIsInZhbHVlIjogInJvcGEyIiwibWV0YWRhdGEiOiAiZ2VuZXNpcy10cmFpdHMvYmFzZS11cmkvMTguanNvbiIsImNvbnRyYWN0IjogIjB4ZTdmMTcyNWU3NzM0Y2UyODhmODM2N2UxYmIxNDNlOTBiYjNmMDUxMiIsInRva2VuSWQiOiAiODAwMDAwMSJ9LHsidHJhaXRfdHlwZSI6ICJMYXllciA5IiwidmFsdWUiOiAiVG9rZW4gZGUgbGF5ZXIxUHJ1ZWJhIHRpcG8gNSIsIm1ldGFkYXRhIjogImxheWVyMS1wcnVlYmEvdXJpLzkwMDAwMDMiLCJjb250cmFjdCI6ICIweGRjNjRhMTQwYWEzZTk4MTEwMGE5YmVjYTRlNjg1Zjk2MmYwY2Y2YzkiLCJ0b2tlbklkIjogIjkwMDAwMDMifSx7InRyYWl0X3R5cGUiOiAiTGF5ZXIgMTAiLCJ2YWx1ZSI6ICJtb3V0aDIiLCJtZXRhZGF0YSI6ICJnZW5lc2lzLXRyYWl0cy9iYXNlLXVyaS8yMy5qc29uIiwiY29udHJhY3QiOiAiMHhlN2YxNzI1ZTc3MzRjZTI4OGY4MzY3ZTFiYjE0M2U5MGJiM2YwNTEyIiwidG9rZW5JZCI6ICIxMDAwMDAwMSJ9LHsidHJhaXRfdHlwZSI6ICJMYXllciAxMSIsInZhbHVlIjogIlRva2VuIGRlIGxheWVyMVBydWViYSB0aXBvIDAiLCJtZXRhZGF0YSI6ICJsYXllcjEtcHJ1ZWJhL3VyaS8xMTAwMDAwMyIsImNvbnRyYWN0IjogIjB4ZGM2NGExNDBhYTNlOTgxMTAwYTliZWNhNGU2ODVmOTYyZjBjZjZjOSIsInRva2VuSWQiOiAiMTEwMDAwMDMifSx7InRyYWl0X3R5cGUiOiAiTGF5ZXIgMTIiLCJ2YWx1ZSI6ICJUb2tlbiBkZSBsYXllcjFQcnVlYmEgdGlwbyAxIiwibWV0YWRhdGEiOiAibGF5ZXIxLXBydWViYS91cmkvMTIwMDAwMDMiLCJjb250cmFjdCI6ICIweGRjNjRhMTQwYWEzZTk4MTEwMGE5YmVjYTRlNjg1Zjk2MmYwY2Y2YzkiLCJ0b2tlbklkIjogIjEyMDAwMDAzIn0seyJ0cmFpdF90eXBlIjogIkxheWVyIDEzIiwidmFsdWUiOiAiVG9rZW4gZGUgbGF5ZXIxUHJ1ZWJhIHRpcG8gMiIsIm1ldGFkYXRhIjogImxheWVyMS1wcnVlYmEvdXJpLzEzMDAwMDAzIiwiY29udHJhY3QiOiAiMHhkYzY0YTE0MGFhM2U5ODExMDBhOWJlY2E0ZTY4NWY5NjJmMGNmNmM5IiwidG9rZW5JZCI6ICIxMzAwMDAwMyJ9LHsidHJhaXRfdHlwZSI6ICJMYXllciAxNCIsInZhbHVlIjogIlRva2VuIGRlIGxheWVyMVBydWViYSB0aXBvIDMiLCJtZXRhZGF0YSI6ICJsYXllcjEtcHJ1ZWJhL3VyaS8xNDAwMDAwMyIsImNvbnRyYWN0IjogIjB4ZGM2NGExNDBhYTNlOTgxMTAwYTliZWNhNGU2ODVmOTYyZjBjZjZjOSIsInRva2VuSWQiOiAiMTQwMDAwMDMifSx7InRyYWl0X3R5cGUiOiAiTGF5ZXIgMTUiLCJ2YWx1ZSI6ICJUb2tlbiBkZSBsYXllcjFQcnVlYmEgdGlwbyA0IiwibWV0YWRhdGEiOiAibGF5ZXIxLXBydWViYS91cmkvMTUwMDAwMDMiLCJjb250cmFjdCI6ICIweGRjNjRhMTQwYWEzZTk4MTEwMGE5YmVjYTRlNjg1Zjk2MmYwY2Y2YzkiLCJ0b2tlbklkIjogIjE1MDAwMDAzIn0seyJ0cmFpdF90eXBlIjogIkxheWVyIDE2IiwidmFsdWUiOiAiVG9rZW4gZGUgbGF5ZXIxUHJ1ZWJhIHRpcG8gNSIsIm1ldGFkYXRhIjogImxheWVyMS1wcnVlYmEvdXJpLzE2MDAwMDAzIiwiY29udHJhY3QiOiAiMHhkYzY0YTE0MGFhM2U5ODExMDBhOWJlY2E0ZTY4NWY5NjJmMGNmNmM5IiwidG9rZW5JZCI6ICIxNjAwMDAwMyJ9LHsidHJhaXRfdHlwZSI6ICJMYXllciAxNyIsInZhbHVlIjogIlRva2VuIGRlIGxheWVyMVBydWViYSB0aXBvIDYiLCJtZXRhZGF0YSI6ICJsYXllcjEtcHJ1ZWJhL3VyaS8xNzAwMDAwMyIsImNvbnRyYWN0IjogIjB4ZGM2NGExNDBhYTNlOTgxMTAwYTliZWNhNGU2ODVmOTYyZjBjZjZjOSIsInRva2VuSWQiOiAiMTcwMDAwMDMifSx7InRyYWl0X3R5cGUiOiAiTGF5ZXIgMTgiLCJ2YWx1ZSI6ICJUb2tlbiBkZSBsYXllcjFQcnVlYmEgdGlwbyAwIiwibWV0YWRhdGEiOiAibGF5ZXIxLXBydWViYS91cmkvMTgwMDAwMDMiLCJjb250cmFjdCI6ICIweGRjNjRhMTQwYWEzZTk4MTEwMGE5YmVjYTRlNjg1Zjk2MmYwY2Y2YzkiLCJ0b2tlbklkIjogIjE4MDAwMDAzIn0seyJ0cmFpdF90eXBlIjogIkxheWVyIDE5IiwidmFsdWUiOiAiVG9rZW4gZGUgbGF5ZXIxUHJ1ZWJhIHRpcG8gMSIsIm1ldGFkYXRhIjogImxheWVyMS1wcnVlYmEvdXJpLzE5MDAwMDAzIiwiY29udHJhY3QiOiAiMHhkYzY0YTE0MGFhM2U5ODExMDBhOWJlY2E0ZTY4NWY5NjJmMGNmNmM5IiwidG9rZW5JZCI6ICIxOTAwMDAwMyJ9XX0='
            )
        });

        it("Should return onchain token uri, post reveal, no position 19", async function () {
            advanceBlocks(3000);

            await network.provider.send("evm_setNextBlockTimestamp", [1904083205]);
            await traitVault.connect(addr1).mint(2, { value: ethers.utils.parseEther("0.2") });
            await traitVault.connect(addr1).mintTraits(1);
            await traitVault.connect(addr1).mintTraits(2);
            await traitVault.connect(owner).addContractToAllowlist(layer1Prueba.address);

            for (i = 0; i < 20; i++) {
                await layer1Prueba.connect(addr1).mint(3, i);
            }

            await traitVault.connect(addr1).changeTraits(1, [0, 2, 4, 6, 8, 10], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0]);
            await traitVault.connect(addr1).changeTraits(2, [19], [0], [0]);
            let newTraits = [];
            let contracts = [];
            let layers = [];
            for (i = 1; i < 19; i++) {
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
            await traitVault.connect(addr1).changeTraits(2, layers, contracts, newTraits)

            await network.provider.send("evm_setNextBlockTimestamp", [2061849605]);
            await reveal()

            await expect(await layer0.tokenURI(2)).to.be.equal(
                'data:application/json;base64,eyJuYW1lIjogIlJlZ2VuICMyIiwiZGVzY3JpcHRpb24iOiAiVGhlIGZpcnN0IG9wZW4sIGRlY2VudHJhbGl6ZWQgYW5kIGluZmluaXRlbHktZXh0ZW5zaWJsZSBtZXRhLWNvbGxlY3Rpb24sIHBvd2VyZWQgYnkgZHluYW1pYyBhbmQgY29tcG9zYWJsZSBORlRzLiIsImltYWdlIjogInJlZ2Vucy16ZXJvL3ByZXZpZXctaW1hZ2UvMi5wbmciLCJhbmltYXRpb25fdXJsIjogImRhdGE6aW1hZ2Uvc3ZnK3htbDtiYXNlNjQsUEhOMlp5QjRiV3h1Y3owaWFIUjBjRG92TDNkM2R5NTNNeTV2Y21jdk1qQXdNQzl6ZG1jaUlIQnlaWE5sY25abFFYTndaV04wVW1GMGFXODlJbmhOYVc1WlRXbHVJRzFsWlhRaUlIWnBaWGRDYjNnOUlqQWdNQ0F6TURBd0lETXdNREFpSUhkcFpIUm9QU0kxTURndU16TXpJaUJvWldsbmFIUTlJalV3T0M0ek16TWlQanhwYldGblpTQm9jbVZtUFNBaVoyVnVaWE5wY3kxMGNtRnBkSE12YVcxaFoyVXRkWEpwTHpJdWNHNW5JaTgrUEdsdFlXZGxJR2h5WldZOUlDSnNZWGxsY2pFdGNISjFaV0poTDJsdFlXZGxMekV3TURBd01ETXVjRzVuSWk4K1BHbHRZV2RsSUdoeVpXWTlJQ0puWlc1bGMybHpMWFJ5WVdsMGN5OXBiV0ZuWlMxMWNta3ZOaTV3Ym1jaUx6NDhhVzFoWjJVZ2FISmxaajBnSW5KbFoyVnVjeTE2WlhKdkwyUnVZUzFwYldGblpTMTFjbWt1Y0c1bklpOCtQR2x0WVdkbElHaHlaV1k5SUNKc1lYbGxjakV0Y0hKMVpXSmhMMmx0WVdkbEx6TXdNREF3TURNdWNHNW5JaTgrUEdsdFlXZGxJR2h5WldZOUlDSm5aVzVsYzJsekxYUnlZV2wwY3k5cGJXRm5aUzExY21rdk55NXdibWNpTHo0OGFXMWhaMlVnYUhKbFpqMGdJbXhoZVdWeU1TMXdjblZsWW1FdmFXMWhaMlV2TlRBd01EQXdNeTV3Ym1jaUx6NDhhVzFoWjJVZ2FISmxaajBnSW1kbGJtVnphWE10ZEhKaGFYUnpMMmx0WVdkbExYVnlhUzh4TWk1d2JtY2lMejQ4YVcxaFoyVWdhSEpsWmowZ0lteGhlV1Z5TVMxd2NuVmxZbUV2YVcxaFoyVXZOekF3TURBd015NXdibWNpTHo0OGFXMWhaMlVnYUhKbFpqMGdJbWRsYm1WemFYTXRkSEpoYVhSekwybHRZV2RsTFhWeWFTOHhPQzV3Ym1jaUx6NDhhVzFoWjJVZ2FISmxaajBnSW14aGVXVnlNUzF3Y25WbFltRXZhVzFoWjJVdk9UQXdNREF3TXk1d2JtY2lMejQ4YVcxaFoyVWdhSEpsWmowZ0ltZGxibVZ6YVhNdGRISmhhWFJ6TDJsdFlXZGxMWFZ5YVM4eU1pNXdibWNpTHo0OGFXMWhaMlVnYUhKbFpqMGdJbXhoZVdWeU1TMXdjblZsWW1FdmFXMWhaMlV2TVRFd01EQXdNRE11Y0c1bklpOCtQR2x0WVdkbElHaHlaV1k5SUNKc1lYbGxjakV0Y0hKMVpXSmhMMmx0WVdkbEx6RXlNREF3TURBekxuQnVaeUl2UGp4cGJXRm5aU0JvY21WbVBTQWliR0Y1WlhJeExYQnlkV1ZpWVM5cGJXRm5aUzh4TXpBd01EQXdNeTV3Ym1jaUx6NDhhVzFoWjJVZ2FISmxaajBnSW14aGVXVnlNUzF3Y25WbFltRXZhVzFoWjJVdk1UUXdNREF3TURNdWNHNW5JaTgrUEdsdFlXZGxJR2h5WldZOUlDSnNZWGxsY2pFdGNISjFaV0poTDJsdFlXZGxMekUxTURBd01EQXpMbkJ1WnlJdlBqeHBiV0ZuWlNCb2NtVm1QU0FpYkdGNVpYSXhMWEJ5ZFdWaVlTOXBiV0ZuWlM4eE5qQXdNREF3TXk1d2JtY2lMejQ4YVcxaFoyVWdhSEpsWmowZ0lteGhlV1Z5TVMxd2NuVmxZbUV2YVcxaFoyVXZNVGN3TURBd01ETXVjRzVuSWk4K1BHbHRZV2RsSUdoeVpXWTlJQ0pzWVhsbGNqRXRjSEoxWldKaEwybHRZV2RsTHpFNE1EQXdNREF6TG5CdVp5SXZQand2YzNablBnPT0iLCJhdHRyaWJ1dGVzIjogW3sidHJhaXRfdHlwZSI6ICJETkEiLCJ2YWx1ZSI6ICJHZW5lc2lzRE5BIiwiY29udHJhY3QiOiAiMHg5ZmU0NjczNjY3OWQyZDlhNjVmMDk5MmYyMjcyZGU5ZjNjN2ZhNmUwIn0seyJ0cmFpdF90eXBlIjogIkxheWVyIDAiLCJ2YWx1ZSI6ICJmb25kbzIiLCJtZXRhZGF0YSI6ICJnZW5lc2lzLXRyYWl0cy9iYXNlLXVyaS8yLmpzb24iLCJjb250cmFjdCI6ICIweGU3ZjE3MjVlNzczNGNlMjg4ZjgzNjdlMWJiMTQzZTkwYmIzZjA1MTIiLCJ0b2tlbklkIjogIjIifSx7InRyYWl0X3R5cGUiOiAiTGF5ZXIgMSIsInZhbHVlIjogIlRva2VuIGRlIGxheWVyMVBydWViYSB0aXBvIDQiLCJtZXRhZGF0YSI6ICJsYXllcjEtcHJ1ZWJhL3VyaS8xMDAwMDAzIiwiY29udHJhY3QiOiAiMHhkYzY0YTE0MGFhM2U5ODExMDBhOWJlY2E0ZTY4NWY5NjJmMGNmNmM5IiwidG9rZW5JZCI6ICIxMDAwMDAzIn0seyJ0cmFpdF90eXBlIjogIkxheWVyIDIiLCJ2YWx1ZSI6ICJza2luMyIsIm1ldGFkYXRhIjogImdlbmVzaXMtdHJhaXRzL2Jhc2UtdXJpLzYuanNvbiIsImNvbnRyYWN0IjogIjB4ZTdmMTcyNWU3NzM0Y2UyODhmODM2N2UxYmIxNDNlOTBiYjNmMDUxMiIsInRva2VuSWQiOiAiMjAwMDAwMSJ9LHsidHJhaXRfdHlwZSI6ICJMYXllciAzIiwidmFsdWUiOiAiVG9rZW4gZGUgbGF5ZXIxUHJ1ZWJhIHRpcG8gNiIsIm1ldGFkYXRhIjogImxheWVyMS1wcnVlYmEvdXJpLzMwMDAwMDMiLCJjb250cmFjdCI6ICIweGRjNjRhMTQwYWEzZTk4MTEwMGE5YmVjYTRlNjg1Zjk2MmYwY2Y2YzkiLCJ0b2tlbklkIjogIjMwMDAwMDMifSx7InRyYWl0X3R5cGUiOiAiTGF5ZXIgNCIsInZhbHVlIjogImV5ZXMxIiwibWV0YWRhdGEiOiAiZ2VuZXNpcy10cmFpdHMvYmFzZS11cmkvNy5qc29uIiwiY29udHJhY3QiOiAiMHhlN2YxNzI1ZTc3MzRjZTI4OGY4MzY3ZTFiYjE0M2U5MGJiM2YwNTEyIiwidG9rZW5JZCI6ICI0MDAwMDAxIn0seyJ0cmFpdF90eXBlIjogIkxheWVyIDUiLCJ2YWx1ZSI6ICJUb2tlbiBkZSBsYXllcjFQcnVlYmEgdGlwbyAxIiwibWV0YWRhdGEiOiAibGF5ZXIxLXBydWViYS91cmkvNTAwMDAwMyIsImNvbnRyYWN0IjogIjB4ZGM2NGExNDBhYTNlOTgxMTAwYTliZWNhNGU2ODVmOTYyZjBjZjZjOSIsInRva2VuSWQiOiAiNTAwMDAwMyJ9LHsidHJhaXRfdHlwZSI6ICJMYXllciA2IiwidmFsdWUiOiAiaGVhZDEiLCJtZXRhZGF0YSI6ICJnZW5lc2lzLXRyYWl0cy9iYXNlLXVyaS8xMi5qc29uIiwiY29udHJhY3QiOiAiMHhlN2YxNzI1ZTc3MzRjZTI4OGY4MzY3ZTFiYjE0M2U5MGJiM2YwNTEyIiwidG9rZW5JZCI6ICI2MDAwMDAxIn0seyJ0cmFpdF90eXBlIjogIkxheWVyIDciLCJ2YWx1ZSI6ICJUb2tlbiBkZSBsYXllcjFQcnVlYmEgdGlwbyAzIiwibWV0YWRhdGEiOiAibGF5ZXIxLXBydWViYS91cmkvNzAwMDAwMyIsImNvbnRyYWN0IjogIjB4ZGM2NGExNDBhYTNlOTgxMTAwYTliZWNhNGU2ODVmOTYyZjBjZjZjOSIsInRva2VuSWQiOiAiNzAwMDAwMyJ9LHsidHJhaXRfdHlwZSI6ICJMYXllciA4IiwidmFsdWUiOiAicm9wYTIiLCJtZXRhZGF0YSI6ICJnZW5lc2lzLXRyYWl0cy9iYXNlLXVyaS8xOC5qc29uIiwiY29udHJhY3QiOiAiMHhlN2YxNzI1ZTc3MzRjZTI4OGY4MzY3ZTFiYjE0M2U5MGJiM2YwNTEyIiwidG9rZW5JZCI6ICI4MDAwMDAxIn0seyJ0cmFpdF90eXBlIjogIkxheWVyIDkiLCJ2YWx1ZSI6ICJUb2tlbiBkZSBsYXllcjFQcnVlYmEgdGlwbyA1IiwibWV0YWRhdGEiOiAibGF5ZXIxLXBydWViYS91cmkvOTAwMDAwMyIsImNvbnRyYWN0IjogIjB4ZGM2NGExNDBhYTNlOTgxMTAwYTliZWNhNGU2ODVmOTYyZjBjZjZjOSIsInRva2VuSWQiOiAiOTAwMDAwMyJ9LHsidHJhaXRfdHlwZSI6ICJMYXllciAxMCIsInZhbHVlIjogIm1vdXRoMSIsIm1ldGFkYXRhIjogImdlbmVzaXMtdHJhaXRzL2Jhc2UtdXJpLzIyLmpzb24iLCJjb250cmFjdCI6ICIweGU3ZjE3MjVlNzczNGNlMjg4ZjgzNjdlMWJiMTQzZTkwYmIzZjA1MTIiLCJ0b2tlbklkIjogIjEwMDAwMDAxIn0seyJ0cmFpdF90eXBlIjogIkxheWVyIDExIiwidmFsdWUiOiAiVG9rZW4gZGUgbGF5ZXIxUHJ1ZWJhIHRpcG8gMCIsIm1ldGFkYXRhIjogImxheWVyMS1wcnVlYmEvdXJpLzExMDAwMDAzIiwiY29udHJhY3QiOiAiMHhkYzY0YTE0MGFhM2U5ODExMDBhOWJlY2E0ZTY4NWY5NjJmMGNmNmM5IiwidG9rZW5JZCI6ICIxMTAwMDAwMyJ9LHsidHJhaXRfdHlwZSI6ICJMYXllciAxMiIsInZhbHVlIjogIlRva2VuIGRlIGxheWVyMVBydWViYSB0aXBvIDEiLCJtZXRhZGF0YSI6ICJsYXllcjEtcHJ1ZWJhL3VyaS8xMjAwMDAwMyIsImNvbnRyYWN0IjogIjB4ZGM2NGExNDBhYTNlOTgxMTAwYTliZWNhNGU2ODVmOTYyZjBjZjZjOSIsInRva2VuSWQiOiAiMTIwMDAwMDMifSx7InRyYWl0X3R5cGUiOiAiTGF5ZXIgMTMiLCJ2YWx1ZSI6ICJUb2tlbiBkZSBsYXllcjFQcnVlYmEgdGlwbyAyIiwibWV0YWRhdGEiOiAibGF5ZXIxLXBydWViYS91cmkvMTMwMDAwMDMiLCJjb250cmFjdCI6ICIweGRjNjRhMTQwYWEzZTk4MTEwMGE5YmVjYTRlNjg1Zjk2MmYwY2Y2YzkiLCJ0b2tlbklkIjogIjEzMDAwMDAzIn0seyJ0cmFpdF90eXBlIjogIkxheWVyIDE0IiwidmFsdWUiOiAiVG9rZW4gZGUgbGF5ZXIxUHJ1ZWJhIHRpcG8gMyIsIm1ldGFkYXRhIjogImxheWVyMS1wcnVlYmEvdXJpLzE0MDAwMDAzIiwiY29udHJhY3QiOiAiMHhkYzY0YTE0MGFhM2U5ODExMDBhOWJlY2E0ZTY4NWY5NjJmMGNmNmM5IiwidG9rZW5JZCI6ICIxNDAwMDAwMyJ9LHsidHJhaXRfdHlwZSI6ICJMYXllciAxNSIsInZhbHVlIjogIlRva2VuIGRlIGxheWVyMVBydWViYSB0aXBvIDQiLCJtZXRhZGF0YSI6ICJsYXllcjEtcHJ1ZWJhL3VyaS8xNTAwMDAwMyIsImNvbnRyYWN0IjogIjB4ZGM2NGExNDBhYTNlOTgxMTAwYTliZWNhNGU2ODVmOTYyZjBjZjZjOSIsInRva2VuSWQiOiAiMTUwMDAwMDMifSx7InRyYWl0X3R5cGUiOiAiTGF5ZXIgMTYiLCJ2YWx1ZSI6ICJUb2tlbiBkZSBsYXllcjFQcnVlYmEgdGlwbyA1IiwibWV0YWRhdGEiOiAibGF5ZXIxLXBydWViYS91cmkvMTYwMDAwMDMiLCJjb250cmFjdCI6ICIweGRjNjRhMTQwYWEzZTk4MTEwMGE5YmVjYTRlNjg1Zjk2MmYwY2Y2YzkiLCJ0b2tlbklkIjogIjE2MDAwMDAzIn0seyJ0cmFpdF90eXBlIjogIkxheWVyIDE3IiwidmFsdWUiOiAiVG9rZW4gZGUgbGF5ZXIxUHJ1ZWJhIHRpcG8gNiIsIm1ldGFkYXRhIjogImxheWVyMS1wcnVlYmEvdXJpLzE3MDAwMDAzIiwiY29udHJhY3QiOiAiMHhkYzY0YTE0MGFhM2U5ODExMDBhOWJlY2E0ZTY4NWY5NjJmMGNmNmM5IiwidG9rZW5JZCI6ICIxNzAwMDAwMyJ9LHsidHJhaXRfdHlwZSI6ICJMYXllciAxOCIsInZhbHVlIjogIlRva2VuIGRlIGxheWVyMVBydWViYSB0aXBvIDAiLCJtZXRhZGF0YSI6ICJsYXllcjEtcHJ1ZWJhL3VyaS8xODAwMDAwMyIsImNvbnRyYWN0IjogIjB4ZGM2NGExNDBhYTNlOTgxMTAwYTliZWNhNGU2ODVmOTYyZjBjZjZjOSIsInRva2VuSWQiOiAiMTgwMDAwMDMifV19'
            )
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