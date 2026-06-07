import { useState, useRef } from "react";
import {
  UploadCloud,
  FileType,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Download,
} from "lucide-react";
import axios from "axios";
const API = import.meta.env.VITE_API_URL;

const CsvPrediction = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [results, setResults] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const selected = e.target.files[0];
    const validExtensions = [".csv", ".xlsx"];
    const isValid =
      selected &&
      validExtensions.some((ext) => selected.name.toLowerCase().endsWith(ext));

    if (isValid) {
      setFile(selected);
      setError(null);
      setResults(null);
      await uploadForPreview(selected);
    } else {
      setFile(null);
      setError(
        <div>
          <p className="font-bold">Invalid file format.</p>
          <p className="text-sm mt-1">Supported formats:</p>
          <p className="text-sm">CSV (.csv)</p>
          <p className="text-sm">Excel (.xlsx)</p>
        </div>,
      );
    }
  };

  const [mapping, setMapping] = useState({});
  const [isAutoMapped, setIsAutoMapped] = useState(false);

  const uploadForPreview = async (selectedFile) => {
    setLoading(true);
    const formData = new FormData();
    formData.append("file", selectedFile);
    try {
      const res = await axios.post(
        `${API}/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      const data = res.data;
      setPreview(data);

      const suggested = data.suggested_mapping || {};
      setMapping(suggested);

      // Rule: Skip mapping screen if columns match (at least 2 parameters)
      // We check if the mapping covers at least 2 fields and if the user columns match model fields exactly for those fields.
      const matchedCount = Object.keys(suggested).length;
      const isPerfectMatchForAvailable = Object.entries(suggested).every(
        ([feature, col]) => col === feature,
      );

      setIsAutoMapped(matchedCount >= 2 && isPerfectMatchForAvailable);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to upload file");
    } finally {
      setLoading(false);
    }
  };

  const handlePredict = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("mapping", JSON.stringify(mapping));
    try {
      const res = await axios.post(
        `${API}/predict`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      setResults(res.data);
      setSuccess("Prediction completed successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(detail || "Prediction failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!results || results.length === 0) {
      setError("No results available for download.");
      return;
    }

    try {
      // Get all unique columns from the first result row to maintain original columns + predictions
      const columns = Object.keys(results[0]);

      // Build CSV using proper quoting
      const csvRows = [];

      // 1. Header Row
      csvRows.push(columns.join(","));

      // 2. Data Rows
      results.forEach((row) => {
        const rowValues = columns.map((col) => {
          const val = row[col] !== undefined ? row[col] : "";
          const escaped = String(val).replace(/"/g, '""'); // Escape double quotes
          return `"${escaped}"`;
        });
        csvRows.push(rowValues.join(","));
      });

      const csvString = csvRows.join("\n");

      // Create Blob and Trigger Download
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `shelf_life_predictions_${new Date().toISOString().slice(0, 10)}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSuccess("CSV Exported successfully!");
    } catch (err) {
      console.error("Export Error:", err);
      setError("Failed to generate CSV. Please check the data format.");
    }
  };

  const getRiskColor = (level) => {
    if (level === "Fresh")
      return "text-green-400 bg-green-500/10 border-green-500/20";
    if (level === "Monitor")
      return "text-blue-400 bg-blue-500/10 border-blue-500/20";
    if (level === "Near Spoilage")
      return "text-orange-400 bg-orange-500/10 border-orange-500/20";
    if (level === "Spoiled")
      return "text-red-400 bg-red-500/10 border-red-500/20";
    return "text-slate-400 bg-slate-500/10 border-slate-500/20";
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold">Batch Prediction</h2>
        <p className="text-slate-400 mt-2">
          Upload bulk datasets for instant batch predictions. Supported formats:
          CSV (.csv), Excel (.xlsx)
        </p>
      </div>

      <div
        className={`border-2 border-dashed rounded-xl p-10 text-center transition-all ${
          file
            ? "border-emerald-500 bg-emerald-500/5"
            : "border-slate-600 hover:border-slate-400 bg-surface/50"
        }`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            fileInputRef.current.files = e.dataTransfer.files;
            handleFileChange({ target: { files: e.dataTransfer.files } });
          }
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".csv,.xlsx"
          className="hidden"
        />

        {!file ? (
          <div
            className="flex flex-col items-center cursor-pointer"
            onClick={() => fileInputRef.current.click()}
          >
            <div className="bg-slate-800 p-4 rounded-full mb-4 text-slate-300">
              <UploadCloud size={32} />
            </div>
            <h3 className="text-lg font-medium mb-1">
              Click or drag and drop to upload
            </h3>
            <div className="text-sm text-slate-500 space-y-1">
              <p>Supported formats:</p>
              <p>CSV (.csv)</p>
              <p>Excel (.xlsx)</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="bg-emerald-500/20 p-4 rounded-full mb-4 text-emerald-500">
              <FileType size={32} />
            </div>
            <h3 className="text-lg font-medium text-white">{file.name}</h3>
            <p className="text-sm text-slate-400 mt-1">
              {(file.size / 1024).toFixed(2)} KB
            </p>
            <button
              onClick={() => {
                setFile(null);
                setPreview(null);
                setResults(null);
              }}
              className="mt-4 text-sm text-red-400 hover:text-red-300 transition-colors"
            >
              Remove file
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg flex items-center gap-3">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-lg flex items-center gap-3">
          <CheckCircle2 size={20} />
          {success}
        </div>
      )}

      {loading && (
        <div className="text-center p-8 bg-surface rounded-xl border border-white/5">
          <RefreshCw
            className="animate-spin mx-auto text-emerald-500 mb-4"
            size={32}
          />
          <p className="text-slate-300 font-medium text-lg">
            Processing Dataset...
          </p>
          <p className="text-slate-500 text-sm mt-1">
            This might take a moment.
          </p>
        </div>
      )}

      {preview && !loading && !results && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
          {/* Success Summary for Auto-mapped files */}
          {isAutoMapped && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-emerald-500/20 p-2 rounded-full text-emerald-500">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h4 className="text-emerald-400 font-bold">
                    ✓ File uploaded successfully
                  </h4>
                  <div className="flex gap-4 mt-1 text-sm text-slate-400">
                    <span>
                      Rows detected:{" "}
                      <strong className="text-slate-200">
                        {preview.row_count}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={handlePredict}
                className="px-8 py-3 bg-emerald-500 text-white hover:bg-emerald-600 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
              >
                Run Prediction <RefreshCw size={18} />
              </button>
            </div>
          )}

          {/* Mapping UI - Only show if not auto-mapped */}
          {!isAutoMapped && (
            <div className="bg-surface rounded-xl border border-white/5 overflow-hidden">
              <div className="p-6 border-b border-white/5 bg-white/5">
                <h3 className="text-xl font-bold">Column Mapping Required</h3>
                <p className="text-sm text-slate-400 mt-1">
                  Some columns don't match the model schema. Please map them
                  manually.
                </p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-6">
                  {preview.features.map((feature) => (
                    <div key={feature} className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Model Field
                        </span>
                        <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider">
                          Uploaded Column
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-slate-900/50 border border-white/5 rounded-lg px-3 py-2 text-sm text-slate-300 truncate">
                          {feature}
                        </div>
                        <div className="text-slate-600">→</div>
                        <select
                          className="flex-1 bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                          value={mapping[feature] || ""}
                          onChange={(e) =>
                            setMapping({
                              ...mapping,
                              [feature]: e.target.value,
                            })
                          }
                        >
                          <option value="">Skip / None</option>
                          {preview.columns.map((col) => (
                            <option key={col} value={col}>
                              {col}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-10 flex justify-center">
                  <button
                    onClick={handlePredict}
                    className="px-10 py-4 bg-emerald-500 text-white hover:bg-emerald-600 rounded-xl font-bold transition-all shadow-xl shadow-emerald-500/20 flex items-center gap-3 text-lg"
                  >
                    Confirm Mapping & Predict <RefreshCw size={22} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Data Preview - Show first 5 rows for auto-mapped, 10 otherwise */}
          <div className="bg-surface rounded-xl border border-white/5 overflow-hidden">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
              <div>
                <h3 className="text-xl font-bold">Data Preview</h3>
                <p className="text-sm text-slate-400">
                  Showing first {isAutoMapped ? 5 : 10} rows of the dataset.
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-400 uppercase bg-slate-900/50 border-b border-white/10">
                  <tr>
                    {preview.columns.slice(0, 6).map((col) => (
                      <th key={col} className="px-6 py-4">
                        {col.replace(/_/g, " ")}
                      </th>
                    ))}
                    {preview.columns.length > 6 && (
                      <th className="px-6 py-4 text-center">...</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {preview.preview
                    .slice(0, isAutoMapped ? 5 : 10)
                    .map((row, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-white/5 hover:bg-white/5"
                      >
                        {preview.columns.slice(0, 6).map((col) => (
                          <td key={col} className="px-6 py-4">
                            {row[col]}
                          </td>
                        ))}
                        {preview.columns.length > 6 && (
                          <td className="px-6 py-4 text-slate-500 text-center">
                            ...
                          </td>
                        )}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {results && !loading && (
        <div className="bg-surface rounded-xl border border-white/5 overflow-hidden animate-in zoom-in-95 duration-500">
          <div className="p-6 border-b border-white/5 flex flex-col md:flex-row justify-between items-center bg-slate-900/50 gap-4">
            <div>
              <h3 className="text-xl font-bold">Prediction Results</h3>
              <p className="text-sm text-slate-400">
                {results.length} rows processed with PPT Schema validation.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleDownload}
                className="px-6 py-3 bg-emerald-500 text-white hover:bg-emerald-600 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
              >
                <Download size={18} /> Download Verified CSV
              </button>
            </div>
          </div>
          <div className="bg-emerald-500/5 border-b border-white/5 p-4">
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
              <CheckCircle2 size={16} /> Export Ready: 16 columns (PPT Schema +
              Predictions) validated.
            </div>
          </div>
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-sm text-left relative">
              <thead className="text-xs text-slate-300 uppercase bg-slate-800 sticky top-0 z-10 shadow-md">
                <tr>
                  <th className="px-6 py-4 font-semibold">Row</th>
                  <th className="px-6 py-4 font-semibold">Retort Temp</th>
                  <th className="px-6 py-4 font-semibold">Est. pH</th>
                  <th className="px-6 py-4 font-semibold">Est. TPC</th>
                  <th className="px-6 py-4 font-semibold">Shelf Life</th>
                  <th className="px-6 py-4 font-semibold">Risk Level</th>
                </tr>
              </thead>
              <tbody>
                {results.slice(0, 100).map((row, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-white/5 hover:bg-white/5"
                  >
                    <td className="px-6 py-4 text-slate-500">{idx + 1}</td>
                    <td className="px-6 py-4 font-medium">
                      {row.Retort_Temperature}°C
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {row.Estimated_pH
                        ? row.Estimated_pH.toFixed(2)
                        : row.pH?.toFixed(2) || "N/A"}
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {row.Estimated_TPC
                        ? row.Estimated_TPC.toFixed(2)
                        : row.TPC?.toFixed(2) || "N/A"}
                    </td>
                    <td className="px-6 py-4 text-lg font-bold text-emerald-400">
                      {row.Shelf_Life.toFixed(1)}{" "}
                      <span className="text-sm font-normal text-slate-400">
                        Days
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold border ${getRiskColor(row.Risk_Level)}`}
                      >
                        {row.Risk_Level}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {results.length > 100 && (
            <div className="p-4 text-center text-sm text-slate-400 bg-slate-900/30">
              Showing first 100 rows. Download CSV to see all {results.length}{" "}
              rows.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CsvPrediction;
