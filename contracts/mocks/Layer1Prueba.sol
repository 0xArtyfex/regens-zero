// SPDX-License-Identifier: MIT

pragma solidity ^0.8.2;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Timers.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "contracts/interfaces/IDNAVault.sol";
import "contracts/interfaces/IRegensZero.sol";
import "contracts/interfaces/ITraitCollection.sol";

contract Layer1Prueba is
    ERC721Enumerable,
    Ownable,
    ReentrancyGuard,
    ITraitCollection
{
    using SafeMath for uint256;
    using Strings for uint256;

    //-----------------------------------
    //------------ Constants ------------
    //-----------------------------------

    uint256 constant MAX_TRAITS = 15;
    uint256 constant INITIAL_TRAITS_AMOUNT = 6;
    uint256 constant MAX_TRAIT_SUPPLY = 1000000;
    uint256 constant EXISTING_TRAIT_LIMIT = 100000;
    string public constant override collectionName =
        "layer1PruebaFacheroFacherito";

    //-----------------------------------
    //------------ Variables ------------
    //-----------------------------------

    uint256 public price;
    uint256 public maxOwnedPerAdress = 16;

    IDNAVault public traitVault;
    Timers.BlockNumber private mintStart;

    mapping(uint256 => Trait[MAX_TRAITS]) public tokenIdToTrait;
    mapping(uint256 => uint256) public layerSupply;

    string private baseURI = "";
    string private imageUri = "";

    //-----------------------------------
    //------------ Modifiers ------------
    //-----------------------------------

    modifier onlyTraitsVault() {
        require(
            _msgSender() == address(traitVault),
            "Sender can only be traitsVault."
        );
        _;
    }

    modifier timerExpired(Timers.BlockNumber storage timer) {
        require(Timers.isExpired(timer), "The timer has not expired.");
        _;
    }

    modifier timerNotExpired(Timers.BlockNumber storage timer) {
        require(
            Timers.isStarted(timer) && Timers.isPending(timer),
            "The timer has expired."
        );
        _;
    }

    //-----------------------------------
    //----------- Constructor -----------
    //-----------------------------------

    constructor() ERC721("rzPrueba1", "RZ1") {}

    //---------------------------------
    //------------ Getters ------------
    //---------------------------------

    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    function getMintStart() public view returns (uint64) {
        return Timers.getDeadline(mintStart);
    }

    //---------------------------------
    //------------ Setters ------------
    //---------------------------------

    function setBaseURI(string memory newURI) public onlyOwner {
        baseURI = newURI;
    }

    function setImageURI(string memory newURI) public onlyOwner {
        imageUri = newURI;
    }

    function setMintStart(uint64 deadline) public onlyOwner {
        Timers.setDeadline(mintStart, deadline);
    }

    function setTraitsVault(address _traitsVault) public onlyOwner {
        traitVault = IDNAVault(_traitsVault);
    }

    //-----------------------------------
    //------------ Functions ------------
    //-----------------------------------

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override(ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function mint(uint256 amount, uint256 layer)
        public
        payable
        timerExpired(mintStart)
        nonReentrant
    {
        uint256 i;
        for (i = 0; i < amount; i++) {
            _mintTrait(_msgSender(), layer);
        }
    }

    function _mintTrait(address _address, uint256 layer) internal {
        layerSupply[layer] = layerSupply[layer] + 1;
        uint256 tokenId = 1000000 * layer + layerSupply[layer];
        _mint(_address, tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        Address.sendValue(payable(_msgSender()), balance);
    }

    function tokenImage(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        require(
            _exists(tokenId),
            "ERC721Metadata: URI query for nonexistent token"
        );

        return
            bytes(imageUri).length > 0
                ? string(abi.encodePacked(imageUri, tokenId.toString(), ".png"))
                : "";
    }

    function transferSpecial(uint256 tokenId, address _address)
        public
        override
        onlyTraitsVault
    {
        _transfer(_address, address(traitVault), tokenId);
    }

    function traitName(uint256 tokenId)
        external
        pure
        override
        returns (string memory)
    {
        return
            string(
                abi.encodePacked(
                    "Token de layer1Prueba tipo ",
                    (tokenId.mod(7)).toString()
                )
            );
    }
}
