import React, { useState, useEffect } from 'react';
import {
  FileText,
  UploadCloud,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
  Send,
  RefreshCw,
  Table
} from 'lucide-react';
import { api } from '../../services/api';
import { formatINR } from '../../utils/currency';

export const DocumentsView: React.FC = () => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Q&A State
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [question, setQuestion] = useState('');
  const [qaAnswer, setQaAnswer] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);

  const loadDocuments = () => {
    api.getDocuments().then((docs) => {
      setDocuments(docs || []);
      if (docs && docs.length > 0 && !selectedDocId) {
        setSelectedDocId(docs[0].id);
      }
    }).catch(console.error);
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    try {
      setUploading(true);
      setUploadSuccess(null);
      const res = await api.uploadDocument(selectedFile);
      setUploadSuccess(res.summary);
      setSelectedFile(null);
      loadDocuments();
    } catch (err: any) {
      console.error(err);
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocId || !question.trim()) return;

    try {
      setAsking(true);
      setQaAnswer(null);
      const res = await api.askDocument(selectedDocId, question);
      setQaAnswer(res.answer);
    } catch (err: any) {
      console.error(err);
      setQaAnswer(`Failed to query document: ${err.message}`);
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-white/10 shadow-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide">
              Document Intelligence & Statement Analyzer
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Secure upload of transaction CSVs, broker trade-books, and prompt-injection-safe financial Q&A
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Upload Box */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-cyan-400" />
            <span>Upload Financial Statement</span>
          </h3>

          <form onSubmit={handleUpload} className="space-y-3">
            <div className="border-2 border-dashed border-white/10 hover:border-cyan-500/40 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-950/40">
              <input
                type="file"
                accept=".csv,.txt"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <FileText className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                <span className="text-xs text-slate-300 font-semibold block">
                  {selectedFile ? selectedFile.name : 'Select trade CSV or broker statement'}
                </span>
                <span className="text-[10px] text-slate-500 mt-1 block">Maximum size 5MB (CSV, TXT)</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-xs font-bold text-white shadow-lg cursor-pointer disabled:opacity-40"
            >
              {uploading ? 'Parsing Records...' : 'Upload & Parse Statement'}
            </button>
          </form>

          {uploadSuccess && (
            <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{uploadSuccess}</span>
            </div>
          )}

          <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-500/10 text-[11px] text-slate-400 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <span>
              <strong>Prompt Injection Guard:</strong> Document text is sanitized before parsing to prevent malicious instruction hijacking.
            </span>
          </div>
        </div>

        {/* Right Column: Uploaded Documents & Fact-Based Q&A */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Parsed Document Archive</h3>
              <span className="text-xs text-slate-400">{documents.length} Statements</span>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-2">
              {documents.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">No documents uploaded yet. Upload a sample trade CSV on the left.</div>
              ) : (
                documents.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => setSelectedDocId(d.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                      selectedDocId === d.id
                        ? 'bg-blue-600/15 border-blue-500/40 text-white'
                        : 'bg-slate-950/40 border-white/5 text-slate-400 hover:border-white/10'
                    }`}
                  >
                    <div>
                      <span className="font-semibold text-slate-200 block">{d.filename}</span>
                      <span className="text-[10px] text-slate-500">{d.summary}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-slate-900 text-[10px] font-bold text-cyan-400 border border-white/5">
                      {d.record_count} Records
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Document Q&A Section */}
            {selectedDocId && (
              <div className="pt-4 border-t border-white/5 space-y-3">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Ask Factual Questions on Selected Document</span>
                </h4>

                <form onSubmit={handleAsk} className="flex gap-2">
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="e.g. What was my total traded turnover? How many buy orders?"
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={asking || !question.trim()}
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-bold text-white shadow-lg disabled:opacity-40"
                  >
                    {asking ? 'Searching...' : 'Ask Doc'}
                  </button>
                </form>

                {qaAnswer && (
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-cyan-500/20 text-xs text-slate-200">
                    <strong className="text-cyan-300 block mb-1">Verified Document Finding:</strong>
                    {qaAnswer}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
