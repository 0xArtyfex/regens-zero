// SPDX-License-Identifier: MIT

pragma solidity ^0.8.2;
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "contracts/interfaces/IRegensZero.sol";
import "contracts/interfaces/IGenesisDNAVault.sol";
import "contracts/interfaces/IGenesisCollection.sol";
import "contracts/interfaces/ITokenUri.sol";
import "hardhat/console.sol";

contract GenesisDNA is Ownable, ReentrancyGuard, ERC2981, IGenesisDNAVault {
    uint256 constant MAX_TRAIT_SUPPLY = 1000000;
    uint256 constant MAX_TRAITS = 20;
    uint256 constant INITIAL_TRAITS_AMOUNT = 6;
    uint256 constant MAX_PER_TX = 15;
    uint256 constant MAX_NUMBER_OF_TOKENS = 10000;

    uint256 public immutable price;
    uint256 public immutable mintStart;
    address public artyfex;
    address public immutable regensZero;
    IGenesisCollection public immutable genesisTraits;

    uint256 public reserveClaimed;
    uint256 public totalSupply;
    address public publicGoods;

    ITokenUri public tokenUriContract;

    string public override DNAImageUri = "";
    string public override previewImageUri = "";

    address[] public override contractsArray;

    mapping(uint256 => Trait[MAX_TRAITS]) public tokenIdToTrait;

    mapping(uint256 => uint256) private tokenIdSalt;

    mapping(address => uint256) public contractsMapping;

    mapping(uint256 => bool) public override hasMintedTraits;

    event traitsClaimed(uint256 indexed tokenId);

    event traitsChanged(
        uint256 indexed tokenId,
        uint256[] layers,
        uint256[] contracts,
        uint256[] newTraits,
        uint256[] changeMade
    );

    event contractAllowlisted(
        address indexed _contract,
        uint256 indexed number
    );

    event contractRemovedFromAllowlist(
        address indexed _contract,
        uint256 indexed number
    );

    constructor(
        address _regensZero,
        address _genesisTraits,
        uint256 _mintStart,
        uint256 _price,
        address _artyfex,
        address _publicGoods
    ) {
        regensZero = _regensZero;
        genesisTraits = IGenesisCollection(_genesisTraits);
        mintStart = _mintStart;
        price = _price;
        artyfex = _artyfex;
        publicGoods = _publicGoods;

        contractsArray.push(_genesisTraits);
        contractsMapping[_genesisTraits] = 1;
    }

    function getTraits(uint256 tokenId)
        public
        view
        override
        returns (Trait[MAX_TRAITS] memory traits)
    {
        require(
            hasMintedTraits[tokenId],
            "DNA: Token has not minted traits, does not belong to genesisDNA or does not exist."
        );
        traits = tokenIdToTrait[tokenId];
    }

    function setDNAImageUri(string memory _DNAImageUri) public onlyOwner {
        DNAImageUri = _DNAImageUri;
    }

    function setPreviewImageUri(string memory _previewImageUri)
        public
        onlyOwner
    {
        previewImageUri = _previewImageUri;
    }

    function setTokenUriContract(address _tokenUriContract) public onlyOwner {
        tokenUriContract = ITokenUri(_tokenUriContract);
    }

    function setArtyfex(address _artyfex) public {
        require(
            _msgSender() == artyfex,
            "DNA: Only Artyfex can call this function"
        );
        artyfex = _artyfex;
    }

    function setPublicGoods(address _publicGoods) public {
        require(
            _msgSender() == publicGoods,
            "DNA: Only Public Goods can call this function"
        );
        publicGoods = _publicGoods;
    }

    function getTokenIdSalt(uint256 tokenId)
        public
        view
        override
        returns (uint256)
    {
        require(
            tokenId <= totalSupply && tokenId > 0,
            "DNA: TokenId does not exist or does not belong to this DNA"
        );
        return
            tokenIdSalt[tokenId] > 0
                ? tokenIdSalt[tokenId]
                : getTokenIdSalt(tokenId + 1);
    }

    function addContractToAllowlist(address _address) public onlyOwner {
        contractsArray.push(_address);
        uint256 number = contractsArray.length;
        contractsMapping[_address] = number;

        emit contractAllowlisted(_address, number);
    }

    function removeContractFromAllowlist(address _address) public onlyOwner {
        require(
            _address != address(genesisTraits),
            "DNA: Cannot remove GenesisTraits"
        );
        uint256 number = contractsMapping[_address];
        contractsMapping[_address] = 0;

        emit contractRemovedFromAllowlist(_address, number);
    }

    function mintTraits(uint256 tokenId) public {
        require(
            IRegensZero(regensZero).tokenIdDNA(tokenId) == address(this),
            "DNA: The DNA does not correspond to this vault"
        );
        require(
            IERC721(regensZero).ownerOf(tokenId) == _msgSender(),
            "DNA: Only token owner can mint traits."
        );
        require(!hasMintedTraits[tokenId], "DNA: Traits already minted");
        hasMintedTraits[tokenId] = true;
        for (uint256 j = 0; j < INITIAL_TRAITS_AMOUNT; j++) {
            tokenIdToTrait[tokenId][j * 2].traitId =
                tokenId +
                (MAX_TRAIT_SUPPLY * j * 2);
        }
        genesisTraits.mintTraits(tokenId);

        emit traitsClaimed(tokenId);
    }

    function mint(uint256 amount) public payable nonReentrant {
        require(
            _msgSender() != address(0),
            "DNA: Buyer cannot be address zero."
        );
        require(mintStart < block.number, "DNA: Mint has not started.");
        require(amount > 0, "DNA: Cannot mint 0 tokens.");
        require(
            msg.value >= price * amount,
            "DNA: Ether amount is not enough to mint."
        );
        require(
            totalSupply + amount <= MAX_NUMBER_OF_TOKENS,
            "DNA: Amount exceeds available tokens for mint."
        );
        require(
            amount <= MAX_PER_TX,
            "DNA: You have exceeded mint limit per call."
        );
        totalSupply += amount;
        IRegensZero(regensZero).genesisMint(amount, _msgSender());
        tokenIdSalt[totalSupply] = block.timestamp;
    }

    function changeTraits(
        uint256 tokenId,
        uint256[] memory layers,
        uint256[] memory contracts,
        uint256[] memory newTraits
    ) public nonReentrant returns (uint256[] memory) {
        require(
            IRegensZero(regensZero).tokenIdDNA(tokenId) == address(this),
            "DNA: The DNA does not correspond to this vault"
        );
        require(
            IRegensZero(regensZero).getTokenTimelock(tokenId) < block.timestamp,
            "DNA: Token is locked."
        );
        require(hasMintedTraits[tokenId], "DNA: Traits not minted yet.");
        require(
            IERC721(regensZero).ownerOf(tokenId) == _msgSender() ||
                IRegensZero(regensZero).getController(tokenId) == _msgSender(),
            "DNA: Only token owner or controller can change traits."
        );
        require(
            layers.length == contracts.length,
            "DNA: Contracts amount does not equal layers amount."
        );
        require(
            layers.length == newTraits.length,
            "DNA: Traits amount does not equal layers amount."
        );
        require(
            layers.length <= MAX_TRAITS,
            "DNA: Layers amount exceeds max layers."
        );
        IRegensZero(regensZero).changeLastTraitModification(tokenId);
        address owner = IERC721(regensZero).ownerOf(tokenId);
        uint256[] memory changed = new uint256[](layers.length);
        for (uint256 i = 0; i < layers.length; i++) {
            uint256 layer = layers[i];
            uint256 layerContract = contracts[i];
            uint256 traitId = newTraits[i];

            if (
                (traitId > 0 || layerContract > 0) &&
                ((layerContract >= contractsArray.length) ||
                    (contractsMapping[contractsArray[layerContract]] == 0) ||
                    (traitId == 0) ||
                    ((IERC721(contractsArray[layerContract]).ownerOf(traitId) !=
                        owner) &&
                        (IERC721(contractsArray[layerContract]).ownerOf(
                            traitId
                        ) != _msgSender())) ||
                    (layer * MAX_TRAIT_SUPPLY >= traitId) ||
                    (traitId >= (layer + 1) * MAX_TRAIT_SUPPLY))
            ) continue;

            Trait[MAX_TRAITS] storage traits = tokenIdToTrait[tokenId];
            Trait memory oldTrait = traits[layer];
            traits[layer].layer1 = layerContract;
            traits[layer].traitId = traitId;
            if (traitId > 0) {
                ITraitCollection(contractsArray[layerContract]).transferSpecial(
                        traitId,
                        owner
                    );
            }

            if (oldTrait.traitId > 0) {
                IERC721(contractsArray[oldTrait.layer1]).safeTransferFrom(
                    address(this),
                    owner,
                    oldTrait.traitId
                );
            }
            changed[i] = 1;
        }

        emit traitsChanged(tokenId, layers, contracts, newTraits, changed);
        return changed;
    }

    function withdraw() public nonReentrant {
        require(
            owner() == _msgSender() ||
                _msgSender() == artyfex ||
                _msgSender() == publicGoods,
            "DNA: Sender is not allowed to call this function"
        );
        uint256 balance = address(this).balance;
        uint256 amountForPublicGoods = balance / 5 * 4;
        Address.sendValue(payable(publicGoods), amountForPublicGoods);
        Address.sendValue(payable(artyfex), balance - amountForPublicGoods);
    }

    function reserve(uint256 amount) public {
        require(_msgSender() == artyfex, "DNA: Sender is not Artyfex");
        require(
            reserveClaimed + amount <= 140,
            "DNA: Reserved claimed plus amount exceeds amount reserved"
        );
        require(
            totalSupply + amount <= MAX_NUMBER_OF_TOKENS,
            "DNA: Amount exceeds available tokens for mint."
        );
        reserveClaimed += amount;
        totalSupply += amount;
        IRegensZero(regensZero).genesisMint(amount, artyfex);
        tokenIdSalt[totalSupply] = block.timestamp;
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory uri)
    {
        require(
            tokenId <= totalSupply && tokenId > 0,
            "DNA: TokenId does not exist or does not belong to this DNA"
        );
        return tokenUriContract.tokenURI(tokenId);
    }

    function royaltyInfo(uint256 _tokenId, uint256 _salePrice)
        public
        view
        virtual
        override(ERC2981, IDNAVault)
        returns (address, uint256)
    {
        return ERC2981.royaltyInfo(_tokenId, _salePrice);
    }

    function setDefaultRoyalty(address receiver, uint96 feeNumerator)
        public
        onlyOwner
    {
        _setDefaultRoyalty(receiver, feeNumerator);
    }

    function deleteDefaultRoyalty() public onlyOwner {
        _deleteDefaultRoyalty();
    }

    function setTokenRoyalty(
        uint256 tokenId,
        address receiver,
        uint96 feeNumerator
    ) public onlyOwner {
        _setTokenRoyalty(tokenId, receiver, feeNumerator);
    }

    function resetTokenRoyalty(uint256 tokenId) public onlyOwner {
        _resetTokenRoyalty(tokenId);
    }
}
