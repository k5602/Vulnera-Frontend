import React, { useCallback, useState } from 'react';

export interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
}

export default function UploadZone({ onFilesSelected, maxFiles = 50 }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files).slice(0, maxFiles);
    onFilesSelected(fileArray);
  }, [onFilesSelected, maxFiles]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  }, [handleFiles]);

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-6 sm:p-8 text-center bg-black/40 transition-all group ${
        isDragging
          ? 'border-cyber-400 bg-black/50'
          : 'border-cyber-400/40 hover:bg-black/50 hover:border-cyber-400/60'
      }`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-cyber-400/5 to-matrix-400/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative z-10">
        <div className="text-4xl mb-3">📦</div>
        <p className="text-matrix-300 text-sm sm:text-base font-medium mb-2">
          Drag & drop your files here
        </p>
        <p className="text-gray-500 text-xs sm:text-sm mb-4">or click to browse</p>
        <div className="flex flex-wrap gap-1 justify-center text-xs text-gray-600 mb-4">
          <span className="px-2 py-1 bg-black/40 rounded border border-gray-700/30">package.json</span>
          <span className="px-2 py-1 bg-black/40 rounded border border-gray-700/30">requirements.txt</span>
          <span className="px-2 py-1 bg-black/40 rounded border border-gray-700/30">pom.xml</span>
          <span className="px-2 py-1 bg-black/40 rounded border border-gray-700/30">Cargo.lock</span>
        </div>
        <input
          id="file-input"
          type="file"
          className="sr-only"
          multiple
          onChange={handleFileInput}
        />
        <label
          htmlFor="file-input"
          className="inline-flex items-center cursor-pointer bg-gradient-to-r from-cyber-600 to-matrix-600 hover:from-cyber-500 hover:to-matrix-500 text-black font-bold px-4 sm:px-6 py-2.5 rounded-lg font-mono text-xs sm:text-sm terminal-border shadow-lg hover:shadow-cyber-400/20 transition-all"
        >
          <span className="mr-2">📂</span> SELECT_FILES
        </label>
      </div>
    </div>
  );
}

