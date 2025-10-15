import React, { useState, useEffect, createContext, useContext } from "react";
import UploadDocument from "./UploadDocument.jsx";
import FileUploadSection from "./components/FileUploadSection";
import FileVerify from "./components/FileVerify";

// Placeholder components for the navigation demonstration.
// In a real application, these would be in separate files.

// Navigation bar component
const NavBar = ({ onNavigate }) => {
  const { walletAddress, handleLogout } = useWallet();
  const [currentPage, setCurrentPage] = useState("upload");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const navigateTo = (page) => {
    setCurrentPage(page);
    onNavigate(page);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-4 flex items-center justify-between bg-white shadow-xl rounded-b-xl">
      <div className="flex items-center p-2 space-x-2">
        <span className="text-2xl font-bold text-transparent p-4 bg-clip-text bg-linear-to-r from-indigo-500 to-purple-600">
          Trustify
        </span>
        <button
          onClick={() => navigateTo("upload")}
          className={`px-8 py-2 font-medium transition duration-200 rounded-lg ${
            currentPage === "upload"
              ? "font-bold text-purple-600 "
              : "text-gray-600 hover:text-gray-400"
          }`}
        >
          Upload File
        </button>
        <button
          onClick={() => navigateTo("verify")}
          className={`px-0 py-2 font-medium transition-colors duration-200 rounded-lg ${
            currentPage === "verify"
              ? "font-bold text-purple-600 "
              : "text-gray-600 hover:text-grayq-400"
          }`}
        >
          Verify
        </button>
      </div>
      <div className="flex items-center space-x-4">
        <span className="text-sm font-medium text-slate-500 truncate">
          Wallet:{" "}
          {walletAddress
            ? `${walletAddress.substring(0, 8)}...${walletAddress.substring(
                38
              )}`
            : "Disconnected"}
        </span>
        <>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="px-4 py-2 font-semibold text-red-500 transition-colors duration-200 bg-red-50 rounded-lg hover:bg-red-100"
          >
            Logout
          </button>

          {showLogoutConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="w-full max-w-sm p-6 bg-white rounded-lg shadow-lg">
                <h3 className="text-lg font-semibold text-slate-600">
                  Confirm logout
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Are you sure you want to logout? This will disconnect your
                  wallet from the app.
                </p>
                <div className="mt-4 flex justify-end space-x-3">
                  <button
                    onClick={() => setShowLogoutConfirm(false)}
                    className="px-4 py-2 text-sm bg-gray-600 rounded hover:bg-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      setShowLogoutConfirm(false);
                      await handleLogout();
                    }}
                    className="px-4 py-2 text-sm font-semibold text-white bg-red-500 rounded hover:bg-red-600"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      </div>
    </nav>
  );
};

// --- Wallet Context and Hook ---
const WalletContext = createContext(null);

// Custom hook to use the wallet context
const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};

// Provider component to encapsulate wallet logic
const WalletProvider = ({ children }) => {
  const [walletAddress, setWalletAddress] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    const checkWalletConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({
            method: "eth_accounts",
          });
          if (accounts.length > 0) {
            setWalletAddress(accounts[0]);
          }

          window.ethereum.on("accountsChanged", (newAccounts) => {
            if (newAccounts.length > 0) {
              setWalletAddress(newAccounts[0]);
              setStatusMessage("");
            } else {
              setWalletAddress("");
              setStatusMessage("Wallet disconnected.");
            }
          });
        } catch (err) {
          console.error(err);
        }
      }
    };
    checkWalletConnection();
  }, []);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        setWalletAddress(accounts[0]);
        setStatusMessage("Wallet connected successfully!");
      } catch (err) {
        console.error(err);
        setStatusMessage("Failed to connect wallet. Please try again.");
      }
    } else {
      setStatusMessage("Please install MetaMask!");
    }
  };

  const handleLogout = async () => {
    if (window.ethereum && walletAddress) {
      try {
        await window.ethereum.request({
          method: "wallet_revokePermissions",
          params: [
            {
              eth_accounts: {},
            },
          ],
        });
        setWalletAddress("");
        setStatusMessage("Wallet disconnected.");
      } catch (error) {
        console.error("Error revoking permissions:", error);
        setWalletAddress("");
      }
    } else {
      setWalletAddress("");
      setStatusMessage("Wallet already disconnected.");
    }
  };

  const value = {
    walletAddress,
    connectWallet,
    handleLogout,
    statusMessage,
  };

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
};

// Login component now uses the context
const Login = () => {
  const { connectWallet, statusMessage } = useWallet();

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100">
      <div className="flex flex-col items-center p-12 space-y-6 bg-white rounded-2xl shadow-2xl">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-indigo-500 to-purple-500">
          Trustify
        </h1>
        <p className="text-lg text-slate-500">
          Connect your MetaMask wallet to continue.
        </p>
        <button
          onClick={connectWallet}
          className="px-7 py-3 text-lg font-semibold text-white transition-all duration-300 transform bg-linear-to-r from-indigo-500 to-purple-500 rounded-full shadow-lg hover:scale-105 hover:shadow-xl focus:outline-hidden"
        >
          Connect Wallet
        </button>
        {statusMessage && (
          <div
            className={`mt-4 px-4 py-2 rounded-lg text-sm text-center ${
              statusMessage.includes("Please install") ||
              statusMessage.includes("Failed")
                ? "bg-red-100 text-red-700"
                : "bg-purple-100 text-purple-700"
            }`}
          >
            {statusMessage}
          </div>
        )}
      </div>
    </div>
  );
};

// New component to house the main content
const MainContent = () => {
  const [currentPage, setCurrentPage] = useState("upload");
  const { walletAddress } = useWallet();

  const renderPage = () => {
    switch (currentPage) {
      case "upload":
        return (
          <div className="pt-20">
            <div className="flex flex-col items-center space-y-6 p-6">
              <UploadDocument />
              <FileUploadSection />
            </div>
          </div>
        );
      case "verify":
        return (
          <div className="pt-20">
            <FileVerify />
          </div>
        );
      default:
        return <UploadDocument />;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {walletAddress ? (
        <div className="flex flex-col flex-1">
          <NavBar onNavigate={setCurrentPage} />
          <div className="flex-1 bg-slate-100">{renderPage()}</div>
        </div>
      ) : (
        <Login />
      )}
    </div>
  );
};

export default function App() {
  return (
    <div className="w-screen min-h-screen">
      <WalletProvider>
        <MainContent />
      </WalletProvider>
    </div>
  );
}
