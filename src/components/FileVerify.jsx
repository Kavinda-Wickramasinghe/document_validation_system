import React, { useState } from "react";
import { ethers } from "ethers";
import contractABI from "../contractABI.json"; // adjust path if needed

// ✅ Make sure this address matches your deployed contract
const contractAddress = import.meta.env.VITE_SMART_CONTRACT_ADDRESS;

export default function FileVerify() {
  const [cid, setCid] = useState("");
  const [status, setStatus] = useState("");
  const [verified, setVerified] = useState(false);
  const [owner, setOwner] = useState("");
  const [timestamp, setTimestamp] = useState(null);

  const handleVerify = async () => {
    if (!cid.trim()) {
      setStatus("❌ Please enter a CID");
      return;
    }

    try {
      // Connect to wallet
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        contractAddress,
        contractABI,
        signer
      );

      setStatus("🔎 Checking blockchain...");
      setVerified(false);
      setOwner("");
      setTimestamp(null);

      // ✅ Get tuple (owner, timestamp)
      const result = await contract.verifyDocument(cid);
      const ownerAddress = result[0];
      const time = Number(result[1]);

      if (ownerAddress === ethers.ZeroAddress || time === 0) {
        setStatus("❌ Document not found on blockchain");
        setVerified(false);
        return;
      }

      setOwner(ownerAddress);
      setTimestamp(time);
      setVerified(true);
      const formattedDate = new Date(time * 1000).toLocaleString();
      setStatus(
        `✅ Document verified! Uploaded by ${ownerAddress} on ${formattedDate}`
      );
    } catch (error) {
      console.error("⚠️ Error verifying document:", error);
      if (error.reason?.includes("Document not found")) {
        setStatus("❌ Document not found on blockchain");
      } else {
        setStatus("⚠️ Error verifying document");
      }
      setVerified(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-slate-100 p-6">
      <div className="flex flex-col items-center p-6 bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-auto space-y-4">
        <h2 className="text-xl font-bold text-purple-600">Verify Document</h2>

        <input
          type="text"
          value={cid}
          onChange={(e) => setCid(e.target.value)}
          placeholder="Enter CID"
          className="w-full p-3 border border-slate-300 rounded-lg bg-white text-black"
        />

        <button
          onClick={handleVerify}
          className="px-6 py-2 bg-purple-600 text-white rounded-lg shadow-sm hover:bg-purple-700 transition"
        >
          Verify
        </button>

        {status && (
          <p
            className={`text-center font-medium ${
              status.startsWith("✅")
                ? "text-green-600"
                : status.startsWith("❌")
                ? "text-red-500"
                : "text-gray-700"
            }`}
          >
            {status}
          </p>
        )}

        {verified && (
          <div className="p-4 w-full">
            <p className="text-center text-green-600 font-semibold mb-2">
              Document Details
            </p>
            <p className="text-sm text-center text-gray-700">
              <strong>Owner:</strong> {owner}
            </p>
            <p className="text-sm text-center text-gray-700 mb-3">
              <strong>Timestamp:</strong>{" "}
              {new Date(timestamp * 1000).toLocaleString()}
            </p>

            {/* ✅ IPFS Preview */}
            <div className="flex justify-center items-center">
              <a
                href={`https://white-changing-marmot-52.mypinata.cloud/ipfs/${cid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block mt-3 text-purple-600 hover:underline"
              >
                <img
                  src={`https://white-changing-marmot-52.mypinata.cloud/ipfs/${cid}`}
                  alt="Verified Document"
                  className="w-64 h-64 object-cover border rounded-lg shadow-sm"
                />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
