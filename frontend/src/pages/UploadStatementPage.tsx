import React, { useEffect, useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Trash2, ArrowRight } from 'lucide-react';
import { statementsApi } from '../api/statements.api';
import { BankStatement } from '../types/statement.types';
import { formatDate, formatINR } from '../utils/formatters';
import { Link } from 'react-router-dom';

export const UploadStatementPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [statements, setStatements] = useState<BankStatement[]>([]);

  const fetchStatements = async () => {
    try {
      const data = await statementsApi.getStatements();
      setStatements(data);
    } catch {
      // Handled silently or set message
    }
  };

  useEffect(() => {
    fetchStatements();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      const ext = selected.name.split('.').pop()?.toLowerCase();
      if (ext !== 'pdf' && ext !== 'csv') {
        setMessage({ type: 'error', text: 'Only PDF and CSV statements are supported.' });
        return;
      }
      setFile(selected);
      setMessage(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setMessage(null);
    try {
      const res = await statementsApi.uploadStatement(file);
      setMessage({
        type: 'success',
        text: `Extracted ${res.transactions_count} transactions from ${res.statement.filename}.`,
      });
      setFile(null);
      fetchStatements();
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to process statement. Please check file format.',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this statement and its transactions?')) return;
    try {
      await statementsApi.deleteStatement(id);
      fetchStatements();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Could not delete statement');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-slate-100">Bank Statement Ingestion</h1>
        <p className="text-xs text-slate-400 mt-1">
          Upload PDF or CSV bank statements to extract, sanitize, and automatically categorize transactions.
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-3 border ${
            message.type === 'success'
              ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/50 border-rose-800 text-rose-300'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Upload Dropzone */}
      <div className="p-8 rounded-2xl bg-slate-900 border-2 border-dashed border-slate-700 hover:border-indigo-500/60 transition-colors text-center">
        <form onSubmit={handleUpload} className="flex flex-col items-center">
          <div className="p-4 rounded-2xl bg-indigo-600/10 text-indigo-400 mb-3">
            <Upload className="w-8 h-8" />
          </div>
          <h3 className="text-sm font-semibold text-slate-200">
            {file ? file.name : 'Upload Bank Statement (PDF or CSV)'}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            Drag and drop your file here, or click to browse. Files are processed securely in memory and isolated per user.
          </p>

          <input
            id="statement-input"
            type="file"
            accept=".pdf,.csv"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="mt-5 flex items-center gap-3">
            <label
              htmlFor="statement-input"
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 cursor-pointer transition-colors"
            >
              Choose File
            </label>

            {file && (
              <button
                type="submit"
                disabled={uploading}
                className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-60"
              >
                {uploading ? 'Processing Extraction...' : 'Extract Transactions'}
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Statement Ingestion History */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200">Ingested Bank Statements</h3>
          <Link
            to="/transactions"
            className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            Review Transactions <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/60 text-slate-400 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Filename</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Uploaded</th>
                <th className="py-3 px-4">Transactions</th>
                <th className="py-3 px-4">Total Debit</th>
                <th className="py-3 px-4">Total Credit</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {statements.length > 0 ? (
                statements.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-slate-100 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-500" />
                      <span className="truncate max-w-[180px]">{st.filename}</span>
                    </td>
                    <td className="py-3.5 px-4 uppercase text-[11px] font-semibold text-slate-400">
                      {st.file_type}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">{formatDate(st.upload_date)}</td>
                    <td className="py-3.5 px-4 font-medium">{st.total_transactions}</td>
                    <td className="py-3.5 px-4 text-rose-400 font-medium">{formatINR(st.total_debit)}</td>
                    <td className="py-3.5 px-4 text-emerald-400 font-medium">{formatINR(st.total_credit)}</td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDelete(st.id)}
                        title="Delete statement"
                        className="p-1.5 text-slate-500 hover:text-rose-400 rounded-md transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No statements uploaded yet. Upload your first statement above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

