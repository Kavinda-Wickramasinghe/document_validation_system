import React, { useState } from "react";
import { ethers } from "ethers";
import contractABI from "./contractABI.json";

const contractAddress = import.meta.env.VITE_SMART_CONTRACT_ADDRESS;

export default function UploadDocument() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");

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
    if (!file) return setStatus("Error: Please upload a file");

    setStatus("⏳ Uploading to IPFS...");
    const cid = await uploadToPinata(file);

    if (!cid) {
      setStatus("❌ Upload failed");
      return;
    }

    setStatus("⏳ Storing CID on blockchain...");
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        contractAddress,
        contractABI,
        signer
      );

      const tx = await contract.uploadDocument(cid);
      await tx.wait();

      setStatus(`✅ Document stored with CID: ${cid}`);
    } catch (err) {
      console.error("Blockchain transaction failed:", err);
      setStatus("❌ Blockchain transaction failed");
    }
  }

  return (
    <div className="flex justify-center h-full bg-slate-100 p-2">
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
