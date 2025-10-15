import React, { useState } from "react";
import { ethers } from "ethers";
import contractABI from "./contractABI.json";

const contractAddress = import.meta.env.VITE_SMART_CONTRACT_ADDRESS;

export default function UploadDocument() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [targetChain, setTargetChain] = useState(null);
  const [modalError, setModalError] = useState("");
  const [pendingCid, setPendingCid] = useState(null);

  // Centralized status helper to keep messages consistent and maintainable
  function setAppStatus(key, extra) {
    let text = "";
    switch (key) {
      case "need_file":
        text = "Error: Please upload a file";
        break;
      case "uploading_ipfs":
        text = "⏳ Uploading to IPFS...";
        break;
      case "upload_failed":
        text = "❌ Upload failed";
        break;
      case "storing":
        text = "⏳ Storing CID on blockchain...";
        break;
      case "stored":
        text = `✅ Document stored with CID: ${extra ?? ""}`;
        break;
      case "tx_failed":
        text = "❌ Blockchain transaction failed";
        break;
      case "resuming":
        text = "⏳ Resuming upload after network switch...";
        break;
      case "resume_failed":
        text = "❌ Resume upload failed";
        break;
      case "paused":
        text = "❌ Network switch/add failed — upload paused";
        break;
      default:
        text = extra ?? "";
    }
    setStatus(text);
  }

  async function uploadToPinata(file) {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(
        "https://api.pinata.cloud/pinning/pinFileToIPFS",
        {
          method: "POST",
          headers: {
            pinata_api_key: import.meta.env.VITE_PINATA_API_KEY,
            pinata_secret_api_key: import.meta.env.VITE_PINATA_API_KEY_SECRET,
          },
          body: formData,
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error ? JSON.stringify(data.error) : "Upload failed"
        );
      }
      return data.IpfsHash;
    } catch (err) {
      console.error("Upload to IPFS failed:", err);
      return null;
    }
  }

  async function uploadDocument() {
    if (!file) return setAppStatus("need_file");

    setAppStatus("uploading_ipfs");
    const cid = await uploadToPinata(file);

    if (!cid) {
      setAppStatus("upload_failed");
      return;
    }

    try {
      // 🔹 Alchemy RPC Provider
      const alchemyRpc =
        "https://eth-sepolia.g.alchemy.com/v2/tkUgem1xbwAjbPRlxtUjw"; // replace with your actual key
      const alchemyProvider = new ethers.JsonRpcProvider(alchemyRpc);

      // 🔹 MetaMask Signer (for transaction)
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await browserProvider.getSigner();

      // 🔹 Optional: Verify user is on same network
      const signerNetwork = await browserProvider.getNetwork();
      const alchemyNetwork = await alchemyProvider.getNetwork();

      if (signerNetwork.chainId !== alchemyNetwork.chainId) {
        // show a modal asking the user to switch MetaMask network
        setTargetChain({
          chainId: alchemyNetwork.chainId,
          name: alchemyNetwork.name,
          rpcUrl: alchemyRpc,
        });
        setModalError("");
        // remember this CID so we can resume after switching
        setPendingCid(cid);
        setShowNetworkModal(true);
        return;
      }

      // 🔹 Contract (connected with signer)
      // Only set storing status once we've confirmed the networks match
      setAppStatus("storing");
      const contract = new ethers.Contract(
        contractAddress,
        contractABI,
        signer
      );

      // 🔹 Execute blockchain transaction
      const tx = await contract.uploadDocument(cid);
      await tx.wait();

      setAppStatus("stored", cid);
    } catch (err) {
      console.error("Blockchain transaction failed:", err);
      setAppStatus("tx_failed");
    }
  }

  async function switchNetwork() {
    setModalError("");
    try {
      if (!window.ethereum) throw new Error("MetaMask not detected");

      const chainIdHex = "0x" + parseInt(targetChain.chainId).toString(16);

      // Try to switch the network in MetaMask
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainIdHex }],
      });

      // If success, close modal
      setShowNetworkModal(false);
      setModalError("");

      // If we have a pending CID from before the switch, resume the upload automatically
      if (pendingCid) {
        // small delay to allow MetaMask to complete network change
        setAppStatus("resuming");
        const cidToResume = pendingCid;
        setPendingCid(null);
        try {
          await resumeUpload(cidToResume);
        } catch (resumeErr) {
          console.error("Resume upload failed", resumeErr);
          setAppStatus("resume_failed");
        }
      }
    } catch (err) {
      console.warn("Initial switch failed, attempting to add chain:", err);
      // If the chain is not added to MetaMask, try to add it (minimal data)
      try {
        // For demo purpose we provide basic chain params for Sepolia; in production use correct values per chain
        const chainParams = {
          chainId: "0x" + parseInt(targetChain.chainId).toString(16),
          chainName: targetChain.name || "Network",
          nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
          rpcUrls: [targetChain.rpcUrl || ""],
          blockExplorerUrls: [],
        };
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [chainParams],
        });

        setShowNetworkModal(false);
        setModalError("");

        if (pendingCid) {
          setAppStatus("paused");
        }
      } catch (err2) {
        console.error("Switch network failed", err2);
        setModalError(err2.message || String(err2));
      }
    }
  }

  async function resumeUpload(cid) {
    try {
      // create a fresh browser provider and signer (MetaMask should now be on correct network)
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await browserProvider.getSigner();

      // contract with signer
      const contract = new ethers.Contract(
        contractAddress,
        contractABI,
        signer
      );

      setAppStatus("storing");
      const tx = await contract.uploadDocument(cid);
      await tx.wait();
      setAppStatus("stored", cid);
    } catch (err) {
      console.error("resumeUpload failed", err);
      setAppStatus("tx_failed");
    }
  }

  return (
    <div className="flex justify-center h-full bg-slate-100 p-2">
      {showNetworkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Network mismatch
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Your MetaMask is connected to a different network than the app's
              Alchemy provider. Please switch MetaMask to the correct network
              and then click Ok.
            </p>
            {modalError && (
              <div className="mb-3 text-sm text-red-500">{modalError}</div>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={switchNetwork}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Switch network
              </button>
              <button
                onClick={() => {
                  setShowNetworkModal(false);
                  setModalError("");
                }}
                className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl bg-white rounded-2xl shadow-xl p-8">
        {/* LEFT SIDE - FILE UPLOAD */}
        <div className="flex flex-col justify-center space-y-6 border-dashed border-2 border-purple-500 rounded-xl p-10">
          <label
            htmlFor="file-upload"
            className="flex flex-col items-center justify-center w-full cursor-pointer p-4"
          >
            <svg
              className="w-10 h-10 text-gray-400 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M7 16V4m0 0l4 4m-4-4L3 8m14 12v-8m0 0l4 4m-4-4l-4 4"
              />
            </svg>
            <span className="text-gray-500 font-medium">
              Click or drag file here
            </span>
          </label>

          <input
            id="file-upload"
            type="file"
            className="hidden"
            onChange={(e) => setFile(e.target.files[0])}
          />

          {/* ✅ Single box for status or file name */}
          <div className="px-3 py-2 text-sm font-medium rounded-md text-center space-y-1">
            {file && (
              <span className="text-green-600 block truncate max-w-[250px] mx-auto">
                Selected: {file.name}
              </span>
            )}
            {status && (
              <span
                className={`block truncate max-w-[250px] mx-auto ${
                  status.startsWith("✅")
                    ? "text-green-600"
                    : status.startsWith("❌")
                    ? "text-red-500"
                    : "text-gray-600"
                }`}
              >
                {status}
              </span>
            )}
            {!file && !status && (
              <span className="text-red-400 block truncate max-w-[250px] mx-auto">
                No File Selected
              </span>
            )}
          </div>

          <button
            className="px-4 py-2 font-semibold text-purple-500 transition-colors duration-200 bg-purple-50 rounded-lg hover:bg-purple-100"
            onClick={uploadDocument}
          >
            Upload
          </button>
        </div>

        {/* RIGHT SIDE - INSTRUCTIONS */}
        <div className="flex flex-col justify-center space-y-4 text-slate-700">
          <h2 className="text-xl font-bold text-purple-600">Instructions</h2>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li>Select a document you want to verify ownership for.</li>
            <li>Make sure the file format is supported (PDF, JPG, PNG).</li>
            <li>
              Click <span className="font-semibold">Upload</span> to store the
              file hash on blockchain.
            </li>
            <li>
              After success, you’ll see a CID which you can use for
              verification.
            </li>
          </ul>
          <p className="text-xs text-slate-500">
            ⚠️ For demo purposes, your MetaMask must be connected to the Sepolia
            test network.
          </p>
        </div>
      </div>
    </div>
  );
}
