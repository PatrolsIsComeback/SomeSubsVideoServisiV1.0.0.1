'use client';

import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Upload, CheckCircle2, XCircle, Loader2, Clock, FileVideo, ChevronDown, ChevronUp } from 'lucide-react';

export default function Home() {
  const [file, setFile] = useState(null);
  const [selectedServices, setSelectedServices] = useState(['filemoon', 'voe']);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [uploadHistory, setUploadHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    fetchUploadHistory();
  }, []);

  const fetchUploadHistory = async () => {
    try {
      const response = await axios.get('/api/history');
      setUploadHistory(response.data.history || []);
    } catch (error) {
      console.error('Error fetching upload history:', error);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    processFile(selectedFile);
  };

  const processFile = (selectedFile) => {
    if (selectedFile) {
      if (selectedFile.size > 2 * 1024 * 1024 * 1024) {
        setError('Dosya boyutu 2GB limitini aşıyor');
        return;
      }
      if (!selectedFile.type.startsWith('video/')) {
        setError('Lütfen sadece video dosyası seçin');
        return;
      }
      setFile(selectedFile);
      setError(null);
      setResults(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    processFile(droppedFile);
  };

  const handleServiceToggle = (service) => {
    setSelectedServices(prev => {
      if (prev.includes(service)) {
        return prev.filter(s => s !== service);
      } else {
        return [...prev, service];
      }
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('tr-TR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Lütfen dosya seçin');
      return;
    }

    if (selectedServices.length === 0) {
      setError('Lütfen en az bir servis seçin');
      return;
    }

    setUploading(true);
    setError(null);
    setResults(null);
    setUploadProgress({});

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('services', selectedServices.join(','));

      const response = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress({ overall: percentCompleted });
        },
      });

      setResults(response.data.results);
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      await fetchUploadHistory();
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.message || err.message || 'Yükleme başarısız oldu');
    } finally {
      setUploading(false);
      setUploadProgress({});
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-900">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Header */}
      <header className="relative backdrop-blur-sm bg-black/30 border-b border-white/10">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-white to-gray-300 rounded-2xl shadow-lg shadow-white/20">
                <FileVideo className="w-7 h-7 text-black" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">Video Yükleyici</h1>
                <p className="text-gray-400 text-sm mt-1">Filemoon & Voe.sx</p>
              </div>
            </div>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="group flex items-center space-x-2 px-5 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl transition-all duration-300 border border-white/20 hover:border-white/30"
            >
              <Clock className="w-5 h-5 text-white" />
              <span className="text-white font-medium">Geçmiş</span>
              {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      <main className="relative container mx-auto px-6 py-12 max-w-5xl">
        {/* Upload Section */}
        <div className="backdrop-blur-xl bg-white/5 rounded-3xl border border-white/10 p-8 mb-8 shadow-2xl shadow-black/50">
          <h2 className="text-2xl font-bold mb-8 text-white">Dosya Yükle</h2>

          {/* Service Selection */}
          <div className="mb-8">
            <label className="block text-sm font-medium mb-4 text-gray-300">
              Yükleme Servisleri Seçin
            </label>
            <div className="flex gap-4">
              <button
                onClick={() => handleServiceToggle('filemoon')}
                disabled={uploading}
                className={`flex-1 p-6 rounded-2xl border-2 transition-all duration-300 ${
                  selectedServices.includes('filemoon')
                    ? 'bg-white text-black border-white shadow-lg shadow-white/20'
                    : 'bg-white/5 text-gray-300 border-white/20 hover:bg-white/10 hover:border-white/30'
                }`}
              >
                <div className="text-center">
                  <div className="text-xl font-bold mb-1">Filemoon</div>
                  <div className="text-sm opacity-70">filemoon.sx</div>
                </div>
              </button>
              <button
                onClick={() => handleServiceToggle('voe')}
                disabled={uploading}
                className={`flex-1 p-6 rounded-2xl border-2 transition-all duration-300 ${
                  selectedServices.includes('voe')
                    ? 'bg-white text-black border-white shadow-lg shadow-white/20'
                    : 'bg-white/5 text-gray-300 border-white/20 hover:bg-white/10 hover:border-white/30'
                }`}
              >
                <div className="text-center">
                  <div className="text-xl font-bold mb-1">Voe.sx</div>
                  <div className="text-sm opacity-70">voe.sx</div>
                </div>
              </button>
            </div>
          </div>

          {/* File Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`mb-8 relative ${
              isDragging ? 'scale-105' : 'scale-100'
            } transition-transform duration-200`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              disabled={uploading}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className={`block cursor-pointer ${
                isDragging
                  ? 'bg-white/20 border-white/50'
                  : 'bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/30'
              } border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300`}
            >
              <div className="flex flex-col items-center">
                <div className="p-4 bg-white/10 rounded-full mb-4">
                  <Upload className="w-12 h-12 text-white" />
                </div>
                <p className="text-xl font-semibold text-white mb-2">
                  {file ? file.name : 'Dosya Seçin veya Sürükleyin'}
                </p>
                <p className="text-gray-400 text-sm">
                  {file ? formatFileSize(file.size) : 'MP4 video dosyası, maksimum 2GB'}
                </p>
              </div>
            </label>
          </div>

          {/* Upload Progress */}
          {uploading && uploadProgress.overall !== undefined && (
            <div className="mb-8">
              <div className="flex justify-between mb-3">
                <span className="text-sm font-medium text-gray-300">Yükleniyor...</span>
                <span className="text-sm font-bold text-white">{uploadProgress.overall}%</span>
              </div>
              <div className="relative w-full bg-white/10 rounded-full h-4 overflow-hidden">
                <div
                  className="absolute inset-0 bg-gradient-to-r from-white to-gray-300 transition-all duration-300 rounded-full"
                  style={{ width: `${uploadProgress.overall}%` }}
                >
                  <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-8 p-5 bg-red-500/20 backdrop-blur-sm border border-red-500/50 text-red-200 rounded-2xl flex items-start space-x-3">
              <XCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Success Results */}
          {results && (
            <div className="mb-8 space-y-4">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-6 rounded-2xl border-2 backdrop-blur-sm ${
                    result.success
                      ? 'bg-green-500/20 border-green-500/50 text-green-100'
                      : 'bg-red-500/20 border-red-500/50 text-red-100'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    {result.success ? (
                      <CheckCircle2 className="w-6 h-6 flex-shrink-0 mt-1" />
                    ) : (
                      <XCircle className="w-6 h-6 flex-shrink-0 mt-1" />
                    )}
                    <div className="flex-1">
                      <p className="font-bold text-lg capitalize mb-2">
                        {result.service} {result.success ? '✓ Başarılı' : '✗ Başarısız'}
                      </p>
                      {result.success ? (
                        <a
                          href={result.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm hover:underline break-all font-medium"
                        >
                          {result.file_url}
                        </a>
                      ) : (
                        <p className="text-sm mt-1">{result.error}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={uploading || !file || selectedServices.length === 0}
            className={`w-full py-5 px-6 rounded-2xl font-bold text-lg flex items-center justify-center space-x-3 transition-all duration-300 ${
              uploading || !file || selectedServices.length === 0
                ? 'bg-white/10 text-gray-500 cursor-not-allowed border-2 border-white/10'
                : 'bg-gradient-to-r from-white to-gray-300 text-black hover:scale-105 shadow-lg shadow-white/20 border-2 border-white'
            }`}
          >
            {uploading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Yükleniyor...</span>
              </>
            ) : (
              <>
                <Upload className="w-6 h-6" />
                <span>Yükle</span>
              </>
            )}
          </button>
        </div>

        {/* Upload History */}
        {showHistory && (
          <div className="backdrop-blur-xl bg-white/5 rounded-3xl border border-white/10 p-8 shadow-2xl shadow-black/50 animate-in fade-in slide-in-from-top-4 duration-300">
            <h2 className="text-2xl font-bold mb-6 text-white">Yükleme Geçmişi</h2>
            {uploadHistory.length === 0 ? (
              <div className="text-center py-16">
                <Clock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">Henüz yükleme geçmişi yok</p>
              </div>
            ) : (
              <div className="space-y-4">
                {uploadHistory.map((record, index) => (
                  <div
                    key={record.id || index}
                    className="backdrop-blur-sm bg-white/5 rounded-2xl border border-white/10 p-6 hover:bg-white/10 transition-all duration-300"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-bold text-white text-lg mb-2">{record.fileName}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <span className="px-3 py-1 bg-white/10 rounded-lg">{formatFileSize(record.fileSize)}</span>
                          <span>{formatDate(record.uploadDate)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {record.results?.map((result, idx) => (
                        <div key={idx} className="flex items-center space-x-3 text-sm p-3 bg-white/5 rounded-xl">
                          {result.success ? (
                            <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                          )}
                          <span className="capitalize text-gray-300 font-medium min-w-[80px]">{result.service}:</span>
                          {result.success ? (
                            <a
                              href={result.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 hover:underline break-all font-medium"
                            >
                              {result.file_url}
                            </a>
                          ) : (
                            <span className="text-red-400">{result.error}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative backdrop-blur-sm bg-black/30 border-t border-white/10 mt-12">
        <div className="container mx-auto px-6 py-6 text-center text-gray-400 text-sm">
          <p className="font-medium">Video Yükleyici Platform - 2024</p>
        </div>
      </footer>
    </div>
  );
}
