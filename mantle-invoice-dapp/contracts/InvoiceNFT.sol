// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract InvoiceNFT is ERC721, Ownable {
    uint256 private _nextTokenId;
    address public marketplaceAddress;

    struct Invoice {
        uint256 amount;
        uint256 dueDate;
        string pdfLink;
        address seller;
        bool isPaid;
    }
    mapping(uint256 => Invoice) public invoices;

    event InvoiceCreated(uint256 indexed tokenId, address indexed seller, uint256 amount);
    event InvoicePaid(uint256 indexed tokenId);

    constructor() ERC721("InvoiceNFT", "INV") Ownable(msg.sender) {}

    // Only allow the marketplace to mark invoices as paid
    modifier onlyMarketplace() {
        require(msg.sender == marketplaceAddress, "Only Marketplace");
        _;
    }

    function setMarketplaceAddress(address _marketplace) external onlyOwner {
        marketplaceAddress = _marketplace;
    }

    // SIMPLIFIED: Anyone can mint (Marketplace handles the selling restrictions)
    function mintInvoice(uint256 _amount, uint256 _dueDate, string memory _pdfLink) external returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
        invoices[tokenId] = Invoice(_amount, _dueDate, _pdfLink, msg.sender, false);
        emit InvoiceCreated(tokenId, msg.sender, _amount);
        return tokenId;
    }

    function markInvoicePaid(uint256 tokenId) external onlyMarketplace {
        invoices[tokenId].isPaid = true;
        emit InvoicePaid(tokenId);
    }

    function getInvoice(uint256 tokenId) external view returns (Invoice memory) {
        return invoices[tokenId];
    }
}