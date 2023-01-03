// SPDX-License-Identifier: MIT

pragma solidity ^0.8.2;

import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "contracts/interfaces/IRegensZero.sol";
import "contracts/interfaces/IGenesisCollection.sol";
import "contracts/interfaces/IGenesisDNAVault.sol";

contract GenesisTraits is
    ERC721Enumerable,
    Ownable,
    ReentrancyGuard,
    IGenesisCollection
{
    using SafeMath for uint256;
    using Strings for uint256;

    uint256 constant INITIAL_TRAITS_AMOUNT = 6;
    uint256 constant MAX_TRAIT_PER_POSITION = 1000000;
    uint256 constant MAX_INT_TYPE = type(uint256).max;

    uint256 public override generalSalt;

    address public traitVault;
    address public regensZero;

    string private baseURI = "";
    string private imageUri = "";
    string private preRevealUri = "";
    string public override collectionName = "GenesisTraits";

    mapping(uint256 => uint256) public tokensClaimed;
    mapping(uint256 => uint256) public traitCap;
    mapping(uint256 => uint256) public traitPercentage;
    mapping(uint256 => string) private traitNames;
    mapping(uint256 => uint256) public positionsNextToken;
    mapping(uint256 => uint256) public traitIdSalt;

    event tokenClaimed(uint256 indexed tokenId);

    modifier onlyTraitsVault() {
        require(
            _msgSender() == traitVault,
            "GenesisTraits: Sender can only be traitsVault."
        );
        _;
    }

    modifier traitClaim(uint256 tokenId) {
        require(
            IRegensZero(regensZero).tokenIdDNA(tokenId) == traitVault,
            "GenesisTraits: This tokenId does not have genesisDNA"
        );
        require(
            IERC721(regensZero).ownerOf(tokenId) == _msgSender() ||
                IRegensZero(regensZero).getController(tokenId) == _msgSender(),
            "GenesisTraits: Sender can only be owner or controller of tokenId."
        );
        require(
            tokensClaimed[tokenId] < 4,
            "GenesisTraits: This tokenId has no more claiming tokens"
        );
        tokensClaimed[tokenId]++;

        _;

        emit tokenClaimed(tokenId);
    }

    constructor(uint256[] memory cap, uint256[] memory percentage)
        ERC721("GenesisTraits", "GT")
    {
        for (uint256 i = 0; i < INITIAL_TRAITS_AMOUNT; i++) {
            positionsNextToken[i * 2] = MAX_TRAIT_PER_POSITION * i * 2 + 10000;
            traitCap[i * 2] = cap[i];
            traitPercentage[i * 2] = percentage[i];
        }
    }

    function setImageURI(string memory newImageURI) public onlyOwner {
        imageUri = newImageURI;
    }

    function setBaseURI(string memory newURI) public onlyOwner {
        baseURI = newURI;
    }

    function setPreRevealUri(string memory _preRevealUri) public onlyOwner {
        preRevealUri = _preRevealUri;
    }

    function setTraitsVault(address _traitsVault) public onlyOwner {
        require(
            traitVault == address(0),
            "GenesisTraits: traitVault can only be set once"
        );
        traitVault = _traitsVault;
    }

    function setRegensZero(address _regensZero) public onlyOwner {
        require(
            regensZero == address(0),
            "GenesisTraits: regensZero can only be set once"
        );
        regensZero = _regensZero;
    }

    function setTraitName(string memory name, uint256 traitNameId)
        public
        onlyOwner
    {
        require(
            traitNameId > 0,
            "GenesisTraits: traitNameId must be greater than 0"
        );
        require(
            (
                keccak256(abi.encodePacked((name))) !=
                keccak256(abi.encodePacked(("")))
            ),
            "GenesisTraits: Trait name cannot be empty"
        );
        traitNames[traitNameId] = name;
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    function reveal(string[] memory names) public onlyOwner {
        generalSalt = block.timestamp;
        uint256 i;
        for (i = 0; i < names.length; i++) {
            traitNames[i + 1] = names[i];
        }
    }

    function distribution(uint256 tokenId, uint256 layer)
        public
        view
        returns (uint256)
    {
        uint256 seed = tokenId + generalSalt + tokenIdSalt(tokenId);
        uint256 i;
        uint256 trait;
        uint256 success;
        uint256 halt;
        for (i = 0; i < MAX_INT_TYPE; i++) {
            for (trait = 1; trait <= traitCap[layer]; trait++) {
                uint256 attempt = uint256(keccak256(abi.encodePacked(seed)));
                if (attempt < MAX_INT_TYPE / traitPercentage[layer]) {
                    success = trait;
                    halt += 1;
                    break;
                } else {
                    seed = attempt;
                }
            }
            if (halt > 0) {
                break;
            }
        }
        uint256 traitSum;
        for (i = 0; i < layer; i++) {
            traitSum += traitCap[i];
        }
        return success + traitSum;
    }

    function tokenIdSalt(uint256 tokenId) public view returns (uint256) {
        return
            (tokenId % 1000000) <= 10000
                ? IGenesisDNAVault(traitVault).getTokenIdSalt(tokenId % 1000000)
                : traitIdSalt[tokenId];
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory uri)
    {
        require(
            _exists(tokenId),
            "ERC721Metadata: URI query for nonexistent token"
        );
        uint256 tokenMetadata = distribution(tokenId, tokenId / 1000000);

        return
            (generalSalt > 0)
                ? string(
                    abi.encodePacked(baseURI, tokenMetadata.toString(), ".json")
                )
                : preRevealUri;
    }

    function tokenImage(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        uint256 imageId = distribution(tokenId, tokenId / 1000000);

        return
            (generalSalt > 0 && tokenIdSalt(tokenId) > 0)
                ? string(abi.encodePacked(imageUri, imageId.toString(), ".png"))
                : "";
    }

    function traitName(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        require(
            tokenIdSalt(tokenId) > 0,
            "GenesisTraits: tokenId does not exist"
        );
        uint256 nameId = distribution(tokenId, tokenId / 1000000);
        return traitNames[nameId];
    }

    function transferSpecial(uint256 tokenId, address _address)
        public
        override
        onlyTraitsVault
    {
        _transfer(_address, traitVault, tokenId);
    }

    function mintTraits(uint256 tokenId)
        public
        override
        onlyTraitsVault
        nonReentrant
    {
        for (uint256 i = 0; i < INITIAL_TRAITS_AMOUNT; i++) {
            uint256 traitId = tokenId + (MAX_TRAIT_PER_POSITION * i * 2);
            _mint(traitVault, traitId);
        }
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override
        returns (bool)
    {
        return
            (interfaceId == type(ITraitCollection).interfaceId) ||
            (interfaceId == type(IGenesisCollection).interfaceId) ||
            super.supportsInterface(interfaceId);
    }

    function claimBackground(uint256 tokenId) public traitClaim(tokenId) {
        positionsNextToken[0]++;
        traitIdSalt[positionsNextToken[0]] = block.timestamp;
        _mint(IERC721(regensZero).ownerOf(tokenId), positionsNextToken[0]);
    }

    function claimSkin(uint256 tokenId) public traitClaim(tokenId) {
        positionsNextToken[2]++;
        traitIdSalt[positionsNextToken[2]] = block.timestamp;
        _mint(IERC721(regensZero).ownerOf(tokenId), positionsNextToken[2]);
    }

    function claimEyes(uint256 tokenId) public traitClaim(tokenId) {
        positionsNextToken[4]++;
        traitIdSalt[positionsNextToken[4]] = block.timestamp;
        _mint(IERC721(regensZero).ownerOf(tokenId), positionsNextToken[4]);
    }

    function claimHead(uint256 tokenId) public traitClaim(tokenId) {
        positionsNextToken[6]++;
        traitIdSalt[positionsNextToken[6]] = block.timestamp;
        _mint(IERC721(regensZero).ownerOf(tokenId), positionsNextToken[6]);
    }

    function claimClothing(uint256 tokenId) public traitClaim(tokenId) {
        positionsNextToken[8]++;
        traitIdSalt[positionsNextToken[8]] = block.timestamp;
        _mint(IERC721(regensZero).ownerOf(tokenId), positionsNextToken[8]);
    }

    function claimMouthAndNose(uint256 tokenId) public traitClaim(tokenId) {
        positionsNextToken[10]++;
        traitIdSalt[positionsNextToken[10]] = block.timestamp;
        _mint(IERC721(regensZero).ownerOf(tokenId), positionsNextToken[10]);
    }
}
