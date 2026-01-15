// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol"; // Added Ownable
import "./InvoiceNFT.sol";

contract CompliantInvoiceMarketplace is IERC721Receiver, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    
    InvoiceNFT public nftContract;
    IERC20 public usdtToken;
    
    // --- BUILT-IN COMPLIANCE (Replaces Registry) ---
    mapping(address => bool) public isWhitelisted;

    struct Listing {
        address seller;
        uint256 price;
        bool isActive;
    }
    mapping(uint256 => Listing) public listings;
    
    event InvoiceListed(uint256 indexed tokenId, address indexed seller, uint256 price);
    event InvoicePurchased(uint256 indexed tokenId, address indexed buyer, uint256 price);
    event InvoiceRepaid(uint256 indexed tokenId, address indexed holder, uint256 amount);
    event WhitelistUpdated(address indexed user, bool status);

    // Pass msg.sender to Ownable so YOU are the admin
    constructor(address _nft, address _usdt) Ownable(msg.sender) {
        nftContract = InvoiceNFT(_nft);
        usdtToken = IERC20(_usdt);
        // Auto-whitelist the deployer (you) so you can test easily
        isWhitelisted[msg.sender] = true;
    }

    // --- ADMIN FUNCTIONS ---
    function toggleWhitelist(address _user) external onlyOwner {
        isWhitelisted[_user] = !isWhitelisted[_user];
        emit WhitelistUpdated(_user, isWhitelisted[_user]);
    }

    // --- MARKETPLACE LOGIC ---
    function listInvoice(uint256 tokenId, uint256 _price) external nonReentrant {
        require(isWhitelisted[msg.sender], "Seller not whitelisted");
        require(nftContract.ownerOf(tokenId) == msg.sender, "Not owner");
        
        InvoiceNFT.Invoice memory inv = nftContract.getInvoice(tokenId);
        require(!inv.isPaid, "Already Paid");
        
        require(_price < inv.amount, "Price should be less than Invoice Amount");

        nftContract.safeTransferFrom(msg.sender, address(this), tokenId);
        
        listings[tokenId] = Listing(msg.sender, _price, true);
        emit InvoiceListed(tokenId, msg.sender, _price);
    }
    
    function buyInvoice(uint256 tokenId) external nonReentrant {
        require(isWhitelisted[msg.sender], "Buyer not whitelisted");
        Listing storage listing = listings[tokenId];
        require(listing.isActive, "Not listed");
        
        // Buyer pays Seller
        usdtToken.safeTransferFrom(msg.sender, listing.seller, listing.price);
        
        // Market sends NFT to Buyer
        nftContract.safeTransferFrom(address(this), msg.sender, tokenId);
        
        listing.isActive = false;
        delete listings[tokenId]; // Clean up storage
        emit InvoicePurchased(tokenId, msg.sender, listing.price);
    }
    
    function repayInvoice(uint256 tokenId) external nonReentrant {
        InvoiceNFT.Invoice memory inv = nftContract.getInvoice(tokenId);
        require(!inv.isPaid, "Already repaid");
        
        address currentHolder = nftContract.ownerOf(tokenId);
        
        // Payer pays the current holder
        usdtToken.safeTransferFrom(msg.sender, currentHolder, inv.amount);
        
        // Mark as paid
        nftContract.markInvoicePaid(tokenId);
        emit InvoiceRepaid(tokenId, currentHolder, inv.amount);
    }

    function cancelListing(uint256 tokenId) external nonReentrant {
        Listing storage listing = listings[tokenId];
        require(listing.isActive, "Not listed");
        require(msg.sender == listing.seller, "Not your listing");
        
        nftContract.safeTransferFrom(address(this), msg.sender, tokenId);
        delete listings[tokenId];
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
}