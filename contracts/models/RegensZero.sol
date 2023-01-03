// SPDX-License-Identifier: MIT

pragma solidity ^0.8.2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "contracts/interfaces/IDNAVault.sol";

contract RegensZero is ERC721Enumerable, Ownable, ReentrancyGuard {
    uint256 constant MAX_INT_TYPE = type(uint256).max;
    uint256 constant UNLOCKING_PERIOD = 7 days;
    uint256 constant TRANSFER_TIMEOUT = 300;

    address public genesisDNA;
    uint256 public genesisSupply;
    uint256 private postGenesisSupply = 10000;

    mapping(uint256 => uint256) public lastTraitModification;
    mapping(uint256 => uint256) private tokenTimelock;
    mapping(address => bool) public DNAs;
    mapping(uint256 => address) private controller;
    mapping(uint256 => address) private signer;
    mapping(uint256 => uint256) public ownerSince;
    mapping(uint256 => uint256) public holderSince;
    mapping(uint256 => address) public tokenIdDNA;

    event controllerChanged(
        uint256 indexed tokenId,
        address indexed oldController,
        address indexed newController
    );

    event signerChanged(
        uint256 indexed tokenId,
        address indexed oldSigner,
        address indexed newSigner
    );

    event tokenLockedUntil(uint256 indexed tokenId, uint256 indexed timestamp);

    event DNAAdded(address indexed _DNA);

    event DNARemoved(address indexed _DNA);

    constructor() ERC721("RegensZero", "RZ") {}

    function getController(uint256 tokenId) public view returns (address) {
        return controller[tokenId];
    }

    function getPostGenesisSupply() public view returns (uint256) {
        return postGenesisSupply - 10000;
    }

    function getSigner(uint256 tokenId) public view returns (address) {
        return signer[tokenId];
    }

    function getTokenTimelock(uint256 tokenId) public view returns (uint256) {
        return tokenTimelock[tokenId];
    }

    function setNewDNA(address _dna) public onlyOwner {
        require(!DNAs[_dna], "RegensZero: Address is already a DNA");
        DNAs[_dna] = true;

        emit DNAAdded(_dna);
    }

    function removeDNA(address _dna) public onlyOwner {
        require(_dna != genesisDNA, "RegensZero: Cannot remove genesisDNA");
        DNAs[_dna] = false;

        emit DNARemoved(_dna);
    }

    function setController(uint256 tokenId, address _controller) public {
        require(
            ownerOf(tokenId) == _msgSender() ||
                controller[tokenId] == _msgSender(),
            "RegensZero: Only token owner or controller can set token controller."
        );
        address oldController = controller[tokenId];
        controller[tokenId] = _controller;

        emit controllerChanged(tokenId, oldController, _controller);
    }

    function setSigner(uint256 tokenId, address _signer) public {
        require(
            ownerOf(tokenId) == _msgSender() ||
                controller[tokenId] == _msgSender(),
            "RegensZero: Only token owner or controller can set token signer."
        );
        address oldSigner = controller[tokenId];
        signer[tokenId] = _signer;

        emit signerChanged(tokenId, oldSigner, _signer);
    }

    function setGenesisDNA(address _genesisDNA) public onlyOwner {
        require(
            genesisDNA == address(0),
            "RegensZero: Cannot change genesisDNA"
        );
        genesisDNA = _genesisDNA;
        DNAs[genesisDNA] = true;

        emit DNAAdded(_genesisDNA);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override {
        super._beforeTokenTransfer(from, to, tokenId);
        require(
            lastTraitModification[tokenId] + TRANSFER_TIMEOUT < block.timestamp,
            "RegensZero: This nft is still on transfer timeout due to a modification on the DNA contract."
        );
        ownerSince[tokenId] = block.timestamp;
    }

    function changeLastTraitModification(uint256 tokenId) public {
        require(
            tokenIdDNA[tokenId] == _msgSender(),
            "RegensZero: Only the appropriate DNA for tokenId can call this function."
        );
        lastTraitModification[tokenId] = block.timestamp;
    }

    function lockToken(uint256 tokenId) public {
        require(
            tokenTimelock[tokenId] < MAX_INT_TYPE,
            "RegensZero: Token is already locked."
        );
        require(
            ownerOf(tokenId) == _msgSender() ||
                getController(tokenId) == _msgSender(),
            "RegensZero: Only token owner and controller can lock the token."
        );
        tokenTimelock[tokenId] = MAX_INT_TYPE;

        emit tokenLockedUntil(tokenId, MAX_INT_TYPE);
    }

    function unlockToken(uint256 tokenId) public {
        require(
            ownerOf(tokenId) == _msgSender() ||
                getController(tokenId) == _msgSender(),
            "RegensZero: Only token owner and controller can unlock the token."
        );
        require(
            tokenTimelock[tokenId] == MAX_INT_TYPE,
            "RegensZero: Cannot unlock a token that is not locked."
        );
        uint256 lockedUntil = block.timestamp + UNLOCKING_PERIOD;
        tokenTimelock[tokenId] = lockedUntil;

        emit tokenLockedUntil(tokenId, lockedUntil);
    }

    function genesisMint(uint256 amount, address _address) public nonReentrant {
        require(
            _msgSender() == genesisDNA,
            "RegensZero: Caller must be Genesis DNA."
        );
        genesisSupply += amount;
        _mint(_address, _msgSender(), genesisSupply, amount);
    }

    function postGenesisMint(uint256 amount, address _address)
        public
        nonReentrant
    {
        require(DNAs[_msgSender()], "RegensZero: Caller must be DNA.");
        postGenesisSupply += amount;
        _mint(_address, _msgSender(), postGenesisSupply, amount);
    }

    function _mint(
        address _address,
        address _DNA,
        uint256 supply,
        uint256 amount
    ) internal {
        uint256 i;
        for (i = supply - amount + 1; i <= supply; i++) {
            holderSince[i] = block.timestamp;
            ownerSince[i] = block.timestamp;
            tokenIdDNA[i] = _DNA;
            _safeMint(_address, i);
        }
    }

    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public override(ERC721) {
        controller[tokenId] = address(0);
        signer[tokenId] = address(0);
        holderSince[tokenId] = block.timestamp;
        super.transferFrom(from, to, tokenId);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory _data
    ) public override(ERC721) {
        controller[tokenId] = address(0);
        signer[tokenId] = address(0);
        holderSince[tokenId] = block.timestamp;
        super.safeTransferFrom(from, to, tokenId, _data);
    }

    function transferHoldership(
        address from,
        address to,
        uint256 tokenId
    ) public {
        require(
            _msgSender() == ownerOf(tokenId),
            "RegensZero: Only token owner can transfer holdership"
        );
        super.safeTransferFrom(from, to, tokenId, "");
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory uri)
    {
        require(
            _exists(tokenId),
            "ERC721Metadata: URI query for nonexistent token."
        );
        return IDNAVault(tokenIdDNA[tokenId]).tokenURI(tokenId);
    }

    function royaltyInfo(uint256 _tokenId, uint256 _salePrice)
        public
        view
        returns (address, uint256)
    {
        require(
            _exists(_tokenId),
            "RegensZero: RoyaltieInfo query for nonexistent token."
        );
        return
            IDNAVault(tokenIdDNA[_tokenId]).royaltyInfo(_tokenId, _salePrice);
    }
}
