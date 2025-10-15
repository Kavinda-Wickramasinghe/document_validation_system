import React, { useState, useEffect } from "react";
import { Copy, Check, Download } from "lucide-react";

export default function FileUploadSection() {
  const [files, setFiles] = useState([]);
  const [copyingCid, setCopyingCid] = useState(null);
  const [visibleCount, setVisibleCount] = useState(5); // Show 5 by default

  // Fetch uploaded file details
  useEffect(() => {
    const fetchFiles = async () => {
      const url =
        "https://api.pinata.cloud/v3/files/public?pageLimit=10&pageOffset=${page*10}";
      const options = {
        method: "GET",
        headers: {
          Authorization: import.meta.env.VITE_AUTHORIZATION,
        },
      };

      try {
        const response = await fetch(url, options);
        if (!response.ok) throw new Error("Failed to fetch files");
        const data = await response.json();
        setFiles(data?.data?.files || []);
      } catch (error) {
        console.error("Error fetching files:", error);
      }
    };

    fetchFiles();
  }, []);

  // Copy CID
  const handleCopy = (cid) => {
    navigator.clipboard.writeText(cid);
    setCopyingCid(cid);
    setTimeout(() => setCopyingCid(null), 2000);
  };

  // ✅ Download as CSV
  const handleDownloadCSV = () => {
    if (!files.length) return;

    const headers = ["File Name", "CID", "Created"];
    const rows = files.map((file) => [
      `"${file.name || "Unnamed File"}"`,
      `"${file.cid}"`,
      `"${new Date(file.created_at).toLocaleString()}"`,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "uploaded_files.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (files.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 bg-white rounded-2xl shadow-2xl">
        <p className="text-gray-500">No uploaded files found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-8 bg-white rounded-2xl shadow-2xl w-full relative">
      <h2 className="text-1xl font-bold text-purple-600 mb-4 self-start">
        Uploaded Documents
      </h2>
      <div className="w-full overflow-x-auto">
        <table className="w-full text-sm text-left border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="px-4 py-2">File Name</th>
              <th className="px-4 py-2">CID</th>
              <th className="px-4 py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {files.slice(0, visibleCount).map((file) => (
              <tr
                key={file.id}
                className="border-t border-gray-200 hover:bg-gray-50"
              >
                <td className="px-4 py-2 text-black">
                  {file.name || "Unnamed File"}
                </td>
                <td className="px-4 py-2 flex items-center space-x-2 text-black">
                  <span className="truncate max-w-[200px]">{file.cid}</span>
                  <button
                    onClick={() => handleCopy(file.cid)}
                    className="p-1 rounded-sm hover:bg-gray-200"
                  >
                    {copyingCid === file.cid ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                </td>
                <td className="px-4 py-2 text-black">
                  {new Date(file.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ✅ Footer Buttons */}
      <div className="flex justify-between items-center w-full mt-6">
        {/* Download CSV */}
        {files.length > 0 && (
          <button
            onClick={handleDownloadCSV}
            className="flex items-center px-5 py-2 bg-purple-600 text-white font-medium rounded-lg shadow-sm hover:bg-purple-700 transition"
          >
            <Download className="w-5 h-5 mr-2" />
            Download CSV
          </button>
        )}

        {/* Load More / Show Less */}
        <div className="flex space-x-2 ml-auto">
          {visibleCount < files.length && (
            <button
              onClick={() =>
                setVisibleCount((prev) => Math.min(prev + 5, files.length))
              }
              className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg shadow-sm hover:bg-gray-200 transition"
            >
              Load More
            </button>
          )}

          {visibleCount > 5 && (
            <button
              onClick={() => setVisibleCount(5)}
              className="px-4 py-2 bg-red-100 text-red-700 font-medium rounded-lg shadow-sm hover:bg-red-200 transition"
            >
              Show Less
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
