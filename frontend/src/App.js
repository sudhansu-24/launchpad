import React, { useState, useCallback, useEffect } from "react";
import { getListedNFTs, buyNFT, delistNFT, listNFT, getTransactionHistory, mintNFT, getEthereumContract, getNFTMetadata } from "./web3";
import "./style.css";
import "./modal.css";
import "./footer.css";
import "./transaction.css";
import "./navbar.css";
import "./loading.css";
import "./notification.css";
import "./responsive.css";
import logo from './assets/logo.png';

function App() {
    const [account, setAccount] = useState("");
    const [listedNFTs, setListedNFTs] = useState([]);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("");
    const [notification, setNotification] = useState(null);
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [selectedRole, setSelectedRole] = useState(null);
    const [transactionHistory, setTransactionHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const scrollToSection = (sectionId) => {
        setTimeout(() => {
            const element = document.getElementById(sectionId);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100); // Small delay to ensure section is rendered
    };
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showFetchModal, setShowFetchModal] = useState(false);
    const [showListModal, setShowListModal] = useState(false);
    const [fetchIndex, setFetchIndex] = useState('');
    const [fetchedNFT, setFetchedNFT] = useState(null);
    const [listingDetails, setListingDetails] = useState({
        tokenId: '',
        price: ''
    });
    const [tokenURI, setTokenURI] = useState("");

    // Keep existing Web3 functions
    const showNotification = (title, message, type = 'info') => {
        setNotification({ title, message, type });
        setTimeout(() => setNotification(null), 5000);
    };

    const LoadingScreen = () => {
        return isLoading ? (
            <div className="loading-overlay">
                <div className="loading-spinner">
                    <div className="eth-logo" />
                </div>
                <div className="loading-text">{loadingMessage}</div>
            </div>
        ) : null;
    };

    const Notification = () => {
        if (!notification) return null;

        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            info: 'fas fa-info-circle'
        };

        return (
            <div className={`notification ${notification.type} show`}>
                <i className={icons[notification.type]} />
                <div className="notification-content">
                    <div className="notification-title">{notification.title}</div>
                    <div className="notification-message">{notification.message}</div>
                </div>
                <button className="notification-close" onClick={() => setNotification(null)}>
                    <i className="fas fa-times" />
                </button>
            </div>
        );
    };

    const fetchListedNFTs = useCallback(async () => {
        setLoadingMessage("Fetching listed NFTs...");
        try {
            const nfts = await getListedNFTs();
            setListedNFTs(nfts);
        } catch (error) {
            console.error("Error fetching listed NFTs:", error);
        }
    }, []);

    // Connect wallet function
    const connectWallet = async () => {
        if (!window.ethereum) {
            alert("Please install MetaMask.");
            return;
        }

        if (isConnecting) return;

        try {
            setIsConnecting(true);
            const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
            setAccount(accounts[0]);
            setShowRoleModal(true); // Show role modal after connecting
            await fetchListedNFTs();
        } catch (error) {
            console.error("Connection error:", error);
            alert("Failed to connect wallet.");
        } finally {
            setIsConnecting(false);
        }
    };

    // Handle role selection
    const handleRoleSelect = async (role) => {
        setSelectedRole(role);
        setShowRoleModal(false);
        await fetchListedNFTs();
        await loadTransactionHistory();
    };

    const loadTransactionHistory = async () => {
        setLoadingMessage("Loading transaction history...");
        try {
            const history = await getTransactionHistory();
            setTransactionHistory(history);
        } catch (err) {
            console.error('Failed to load transaction history:', err);
        }
    };

    const handleBuyNFT = async (tokenId, price) => {
        if (!account) {
            showNotification('Connection Required', 'Please connect your wallet to continue', 'error');
            return;
        }

        try {
            setLoadingMessage("Preparing purchase transaction...");
            setIsLoading(true);

            const tx = await buyNFT(tokenId, price);
            setLoadingMessage("Confirming purchase on blockchain...");
            const receipt = await tx.wait();

            showNotification('Success', 'NFT purchased successfully!', 'success');
            console.log('Purchase confirmed in block:', receipt.blockNumber);

            await Promise.all([
                fetchListedNFTs(),
                loadTransactionHistory()
            ]);
        } catch (err) {
            console.error('Failed to buy NFT:', err);
            showNotification('Error', err.message || 'Failed to purchase NFT', 'error');

            // Refresh data to ensure UI is in sync
            await Promise.all([
                fetchListedNFTs(),
                loadTransactionHistory()
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelistNFT = async (tokenId) => {
        if (!account) {
            showNotification('Connection Required', 'Please connect your wallet to continue', 'error');
            return;
        }

        try {
            setLoadingMessage("Preparing delisting transaction...");
            setIsLoading(true);

            const tx = await delistNFT(tokenId);
            setLoadingMessage("Confirming delisting on blockchain...");
            await tx.wait();

            showNotification('Success', 'NFT has been delisted successfully', 'success');
            await Promise.all([
                fetchListedNFTs(),
                loadTransactionHistory()
            ]);
        } catch (err) {
            console.error('Failed to delist NFT:', err);
            showNotification('Error', err.message || 'Failed to delist NFT', 'error');

            await Promise.all([
                fetchListedNFTs(),
                loadTransactionHistory()
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleListNFT = async (tokenId, price) => {
        if (!account) {
            showNotification('Connection Required', 'Please connect your wallet to continue', 'error');
            return;
        }

        setIsLoading(true);
        setLoadingMessage("Verifying ownership...");

        try {
            const tx = await listNFT(tokenId, price);
            setLoadingMessage("Confirming listing on blockchain...");
            const receipt = await tx.wait();

            showNotification('Success', `NFT #${tokenId} listed for ${price} ETH`, 'success');
            console.log('Listing confirmed in block:', receipt.blockNumber);
        } catch (err) {
            console.error('Failed to list NFT:', err);
            showNotification('Error', err.message, 'error');
        } finally {
            setIsLoading(false);
            // Always refresh data to ensure UI is in sync
            await Promise.all([
                fetchListedNFTs(),
                loadTransactionHistory()
            ]).catch(console.error);
        }
    };

    useEffect(() => {
        if (selectedRole) {
            fetchListedNFTs();
            loadTransactionHistory();
        }
    }, [selectedRole, fetchListedNFTs]);

    return (
        <div className="app">
            <Notification />
            <LoadingScreen />
            <div className="gradient-bg">
                <div className="gradient-overlay"></div>
            </div>

            <nav className="navbar">
                <div className="logo">
                    <img src={logo} alt="LaunchPad Logo" />
                </div>
                <button
                    className="menu-toggle"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    aria-label="Toggle navigation menu"
                >
                    <i className={`fas fa-${isMobileMenuOpen ? 'times' : 'bars'}`}></i>
                </button>
                <div className="nav-links">
                    <button
                        onClick={() => {
                            setShowHistory(false);
                            scrollToSection('marketplace');
                        }}
                        className={!showHistory ? 'active' : ''}
                    >
                        <i className="fas fa-store"></i>
                        Marketplace
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                    >
                        <i className="fas fa-plus-circle"></i>
                        Create
                    </button>
                    <button
                        onClick={() => {
                            setShowHistory(true);
                            scrollToSection('history');
                        }}
                        className={showHistory ? 'active' : ''}
                    >
                        <i className="fas fa-history"></i>
                        History
                    </button>
                </div>
                <div className="desktop-wallet">
                    {!account ? (
                        <button
                            className="connect-wallet"
                            onClick={connectWallet}
                            disabled={isConnecting}
                        >
                            {isConnecting ? "Connecting..." : "Connect Wallet"}
                        </button>
                    ) : (
                        <button className="connect-wallet">
                            {`${account.slice(0, 6)}...${account.slice(-4)}`}
                        </button>
                    )}
                </div>
                <div className={`mobile-nav ${isMobileMenuOpen ? 'active' : ''}`}>
                    <button
                        onClick={() => {
                            setShowHistory(false);
                            setIsMobileMenuOpen(false);
                            scrollToSection('marketplace');
                        }}
                        className={!showHistory ? 'active' : ''}
                    >
                        <i className="fas fa-store"></i>
                        Marketplace
                    </button>
                    <button
                        onClick={() => {
                            setIsMobileMenuOpen(false);
                            setShowCreateModal(true);
                        }}
                    >
                        <i className="fas fa-plus-circle"></i>
                        Create
                    </button>
                    <button
                        onClick={() => {
                            setIsMobileMenuOpen(false);
                            setShowHistory(true);
                            scrollToSection('history');
                        }}
                        className={showHistory ? 'active' : ''}
                    >
                        <i className="fas fa-history"></i>
                        History
                    </button>
                    <button
                        className="connect-wallet"
                        onClick={() => {
                            if (!account) {
                                connectWallet();
                            }
                            setIsMobileMenuOpen(false);
                        }}
                        disabled={isConnecting}
                    >
                        <i className={account ? "fas fa-user-astronaut" : "fas fa-wallet"}></i>
                        {isConnecting
                            ? "Connecting..."
                            : account
                                ? `${account.slice(0, 6)}...${account.slice(-4)}`
                                : "Connect Wallet"
                        }
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="hero" id="home">
                <div className="hero-content">
                    <h1>Discover, Collect, and Trade Space-Themed NFTs</h1>
                    <p>The first NFT marketplace dedicated to space enthusiasts and cosmic art collectors</p>
                    <div className="hero-buttons">
                        <button className="primary-btn" onClick={() => document.querySelector('#marketplace').scrollIntoView({ behavior: 'smooth' })}>Explore NFTs</button>
                        {!account ? (
                            <button className="secondary-btn" onClick={connectWallet}>Connect Wallet</button>
                        ) : (
                            <button className="secondary-btn" onClick={() => setShowCreateModal(true)}>Create NFT</button>
                        )}
                    </div>
                </div>
            </section>

            {/* Role Selection Modal */}
            {showRoleModal && (
                <div className="role-selection-modal">
                    <div className="modal-content">
                        <h2>Welcome to LaunchPad</h2>
                        <p>Please select your role:</p>
                        <div className="role-buttons">
                            <button
                                className="role-btn seller-btn"
                                onClick={() => handleRoleSelect('seller')}
                            >
                                <i className="fas fa-store"></i>
                                <span>I want to Sell NFTs</span>
                                <p className="role-description">Create, list, and manage your NFTs</p>
                            </button>
                            <button
                                className="role-btn buyer-btn"
                                onClick={() => handleRoleSelect('buyer')}
                            >
                                <i className="fas fa-shopping-cart"></i>
                                <span>I want to Buy NFTs</span>
                                <p className="role-description">Browse and collect NFTs</p>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Marketplace Section */}
            <section id="marketplace" className="section">
                {account && selectedRole && (
                    <div className="marketplace-container">
                        <div className="marketplace-header">
                            <div className="tab-buttons">
                                <button
                                    className={`tab-btn ${!showHistory ? 'active' : ''}`}
                                    onClick={() => setShowHistory(false)}
                                >
                                    <i className="fas fa-store"></i>
                                    Marketplace
                                </button>
                                <button
                                    className={`tab-btn ${showHistory ? 'active' : ''}`}
                                    onClick={() => setShowHistory(true)}
                                >
                                    <i className="fas fa-history"></i>
                                    History
                                </button>
                            </div>
                            <div className="header-actions">
                                <button
                                    className="action-btn fetch-btn"
                                    onClick={() => setShowFetchModal(true)}
                                >
                                    <i className="fas fa-search"></i>
                                    Fetch NFT
                                </button>
                                <button
                                    className="action-btn list-btn"
                                    onClick={() => setShowListModal(true)}
                                >
                                    <i className="fas fa-tag"></i>
                                    List NFT
                                </button>
                                <button
                                    className="action-btn refresh-btn"
                                    onClick={() => fetchListedNFTs()}
                                >
                                    <i className="fas fa-sync-alt"></i>
                                    Refresh
                                </button>
                                <button
                                    className="action-btn create-btn"
                                    onClick={() => setShowCreateModal(true)}
                                >
                                    <i className="fas fa-plus"></i>
                                    Create NFT
                                </button>
                            </div>
                        </div>

                        <div id="marketplace">
                            {!showHistory ? (
                                <div className="nft-grid">
                                    {listedNFTs.map((nft) => (
                                        <div key={nft.tokenId} className="nft-card">
                                            <div className="card-image-container">
                                                <img
                                                    src={nft.image || '/assets/space-placeholder.svg'}
                                                    alt={nft.name}
                                                    onError={(e) => {
                                                        e.target.src = '/assets/space-placeholder.svg';
                                                    }}
                                                />
                                                {nft.owner?.toLowerCase() === account.toLowerCase() && (
                                                    <div className="owner-badge">
                                                        <i className="fas fa-user-check"></i>
                                                        You Own This
                                                    </div>
                                                )}
                                            </div>
                                            <div className="card-content">
                                                <h3>{nft.name || `Space NFT #${nft.tokenId}`}</h3>
                                                <p className="nft-description">{nft.description}</p>
                                                <div className="price-tag">
                                                    <i className="fab fa-ethereum"></i>
                                                    <span>{nft.price} ETH</span>
                                                </div>
                                                {account && nft.owner?.toLowerCase() === account.toLowerCase() ? (
                                                    <div className="seller-actions">
                                                        <button
                                                            onClick={() => handleDelistNFT(nft.tokenId)}
                                                            disabled={isLoading}
                                                            className="delist-btn"
                                                        >
                                                            <i className="fas fa-times"></i>
                                                            {isLoading ? 'Processing...' : 'Delist'}
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                const newPrice = prompt('Enter new price in ETH:');
                                                                if (newPrice) handleListNFT(nft.tokenId, newPrice);
                                                            }}
                                                            disabled={isLoading}
                                                            className="update-price-btn"
                                                        >
                                                            <i className="fas fa-tag"></i>
                                                            {isLoading ? 'Processing...' : 'Update Price'}
                                                        </button>
                                                    </div>
                                                ) : account ? (
                                                    <button
                                                        onClick={() => handleBuyNFT(nft.tokenId, nft.price)}
                                                        disabled={isLoading}
                                                        className="buy-btn"
                                                    >
                                                        <i className="fas fa-shopping-cart"></i>
                                                        {isLoading ? 'Processing...' : 'Buy Now'}
                                                    </button>
                                                ) : null}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div id="history" className="transaction-history">
                                    <h2>Transaction History</h2>
                                    <div className="transaction-list">
                                        {transactionHistory.map((tx) => (
                                            <div key={tx.transactionHash} className={`transaction-item ${tx.type.toLowerCase()}`}>
                                                <div className="transaction-icon">
                                                    {tx.type === 'Listed' && <i className="fas fa-tag"></i>}
                                                    {tx.type === 'Purchased' && <i className="fas fa-shopping-cart"></i>}
                                                    {tx.type === 'Delisted' && <i className="fas fa-archive"></i>}
                                                </div>
                                                <div className="transaction-content">
                                                    <div className="transaction-header">
                                                        <span className="token-id">Token #{tx.tokenId}</span>
                                                        <span className="timestamp">{new Date(tx.timestamp).toLocaleString()}</span>
                                                    </div>
                                                    <div className="transaction-details">
                                                        <span className="type">{tx.type}</span>
                                                        {tx.price && <span className="price">{tx.price} ETH</span>}
                                                        <span className="address">
                                                            <i className="fas fa-user-astronaut"></i>
                                                            {tx.from.slice(0, 6)}...{tx.from.slice(-4)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </section>

            {/* How It Works Section */}
            <section className="how-it-works">
                <h2>How It Works</h2>
                <div className="steps-container">
                    <div className="step">
                        <i className="fas fa-wallet"></i>
                        <h3>Connect Wallet</h3>
                        <p>Connect your MetaMask wallet to get started</p>
                    </div>
                    <div className="step">
                        <i className="fas fa-image"></i>
                        <h3>Create NFT</h3>
                        <p>Upload your space-themed artwork and create NFTs</p>
                    </div>
                    <div className="step">
                        <i className="fas fa-store"></i>
                        <h3>List for Sale</h3>
                        <p>List your NFTs on the marketplace</p>
                    </div>
                    <div className="step">
                        <i className="fas fa-exchange-alt"></i>
                        <h3>Buy/Sell NFTs</h3>
                        <p>Trade NFTs with other space enthusiasts</p>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="footer">
                <div className="footer-content">
                    <div className="footer-section">
                        <h3>LaunchPad</h3>
                        <p>The ultimate space-themed NFT marketplace</p>
                    </div>
                    <div className="footer-section">
                        <h3>Quick Links</h3>
                        <a href="#marketplace">Marketplace</a>
                        <a href="#create">Create NFT</a>
                        <a href="#profile">Profile</a>
                    </div>
                    <div className="footer-section">
                        <h3>Connect</h3>
                        <div className="social-links">
                            <a href="https://x.com/Sudhansu_24" target="_blank" rel="noopener noreferrer">
                                <i className="fab fa-twitter"></i>
                            </a>
                            <a href="https://github.com/sudhansu-24" target="_blank" rel="noopener noreferrer">
                                <i className="fab fa-github"></i>
                            </a>
                            <a href="https://www.instagram.com/sudhansu_24/" target="_blank" rel="noopener noreferrer">
                                <i className="fab fa-instagram"></i>
                            </a>
                        </div>
                    </div>
                </div>
                <div className="footer-bottom">
                    <div className="footer-bottom-content">
                        <p>&copy; 2025 LaunchPad. All rights reserved.</p>
                    </div>
                </div>
            </footer>

            {/* Create NFT Modal */}
            {showCreateModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <button
                            className="modal-close"
                            onClick={() => {
                                setShowCreateModal(false);
                                setTokenURI("");
                            }}
                            aria-label="Close modal"
                        />

                        <h2>Create New NFT</h2>
                        <div className="modal-form">
                            <div className="form-group">
                                <label>IPFS URI</label>
                                <input
                                    type="text"
                                    placeholder="Enter your metadata.json IPFS link"
                                    value={tokenURI}
                                    onChange={(e) => setTokenURI(e.target.value)}
                                />
                            </div>
                            <div className="modal-actions">
                                <button
                                    className="primary-btn"
                                    onClick={async () => {
                                        try {
                                            setIsLoading(true);
                                            await mintNFT(tokenURI);
                                            await fetchListedNFTs();
                                            setShowCreateModal(false);
                                            setTokenURI("");
                                            alert("NFT created successfully! You can now list it for sale.");
                                        } catch (error) {
                                            console.error("Error creating NFT:", error);
                                            alert("Failed to create NFT: " + error.message);
                                        } finally {
                                            setIsLoading(false);
                                        }
                                    }}
                                    disabled={isLoading || !tokenURI}
                                >
                                    {isLoading ? "Creating..." : "Create NFT"}
                                </button>
                                <button
                                    className="secondary-btn"
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        setTokenURI("");
                                    }}
                                >
                                    Create Another
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Fetch NFT Modal */}
            {showFetchModal && (
                <div className="modal-overlay fetch-nft-modal">
                    <div className="modal-content">
                        <button
                            className="modal-close"
                            onClick={() => {
                                setShowFetchModal(false);
                                setFetchIndex('');
                                setFetchedNFT(null);
                            }}
                            aria-label="Close modal"
                        />

                        <h2>Fetch NFT</h2>

                        {fetchedNFT && (
                            <button
                                className="modal-back"
                                onClick={() => {
                                    setShowFetchModal(false);
                                    setFetchedNFT(null);
                                    setFetchIndex('');
                                }}
                            >
                                <i className="fas fa-arrow-left"></i>
                            </button>
                        )}

                        {!fetchedNFT ? (
                            <div className="search-group">
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="Enter NFT index"
                                    value={fetchIndex}
                                    onChange={(e) => setFetchIndex(e.target.value)}
                                />
                                <button
                                    className="search-btn primary-btn"
                                    onClick={async () => {
                                        try {
                                            setIsLoading(true);
                                            const metadata = await getNFTMetadata(fetchIndex);

                                            if (!metadata) {
                                                throw new Error("Failed to fetch NFT metadata");
                                            }

                                            const contract = await getEthereumContract();
                                            const owner = await contract.ownerOf(fetchIndex);

                                            setFetchedNFT({
                                                tokenId: fetchIndex,
                                                name: metadata.name,
                                                description: metadata.description,
                                                image: metadata.image, // Processed image URL
                                                owner
                                            });
                                        } catch (error) {
                                            console.error("Error fetching NFT:", error);
                                            alert("Failed to fetch NFT: " + error.message);
                                        } finally {
                                            setIsLoading(false);
                                        }
                                    }}
                                    disabled={isLoading || !fetchIndex}
                                >
                                    {isLoading ? "Fetching..." : "Search"}
                                </button>
                            </div>
                        ) : (
                            <div className="marketplace-card">
                                {fetchedNFT.owner.toLowerCase() === account.toLowerCase() && (
                                    <div className="ownership-badge">
                                        <i className="fas fa-user"></i>
                                        You Own This
                                    </div>
                                )}
                                <div className="card-image">
                                    <img
                                        src={fetchedNFT.image || '/assets/space-placeholder.svg'}
                                        alt={fetchedNFT.name || `LaunchPad NFT #${fetchedNFT.tokenId}`}
                                    />
                                </div>
                                <div className="card-content">
                                    <h3>{fetchedNFT.name || `LaunchPad NFT #${fetchedNFT.tokenId}`}</h3>
                                    <p className="nft-type">{fetchedNFT.description || 'Moon NFT'}</p>
                                    <div className="token-info">
                                        <div className="token-id">
                                            <span className="label">Token ID</span>
                                            <span className="value">#{fetchedNFT.tokenId}</span>
                                        </div>
                                        <div className="owner-info">
                                            <span className="label">Owner</span>
                                            <span className="value">
                                                <i className="fas fa-user-circle"></i>
                                                {fetchedNFT.owner.toLowerCase() === account.toLowerCase()
                                                    ? 'You'
                                                    : `${fetchedNFT.owner.substring(0, 6)}...${fetchedNFT.owner.substring(38)}`}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* List NFT Modal */}
            {showListModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <button
                            className="modal-close"
                            onClick={() => {
                                setShowListModal(false);
                                setListingDetails({ tokenId: '', price: '' });
                            }}
                            aria-label="Close modal"
                        />

                        <h2>List NFT for Sale</h2>
                        <div className="modal-form">
                            <div className="form-group">
                                <label>NFT Index</label>
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="Enter NFT index number"
                                    value={listingDetails.tokenId}
                                    onChange={(e) => setListingDetails(prev => ({ ...prev, tokenId: e.target.value }))}
                                />
                            </div>
                            <div className="form-group">
                                <label>Price (ETH)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.001"
                                    placeholder="Enter listing price in ETH"
                                    value={listingDetails.price}
                                    onChange={(e) => setListingDetails(prev => ({ ...prev, price: e.target.value }))}
                                />
                            </div>
                            <div className="modal-actions">
                                <button
                                    className="primary-btn"
                                    onClick={async () => {
                                        try {
                                            setIsLoading(true);
                                            await listNFT(listingDetails.tokenId, listingDetails.price);
                                            await fetchListedNFTs();
                                            setShowListModal(false);
                                            setListingDetails({ tokenId: '', price: '' });
                                            alert("NFT listed successfully!");
                                        } catch (error) {
                                            console.error("Error listing NFT:", error);
                                            alert("Failed to list NFT: " + error.message);
                                        } finally {
                                            setIsLoading(false);
                                        }
                                    }}
                                    disabled={isLoading || !listingDetails.tokenId || !listingDetails.price}
                                >
                                    {isLoading ? "Listing..." : "List NFT"}
                                </button>
                                <button
                                    className="secondary-btn"
                                    onClick={() => {
                                        setListingDetails({ tokenId: '', price: '' });
                                    }}
                                >
                                    List Another
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
