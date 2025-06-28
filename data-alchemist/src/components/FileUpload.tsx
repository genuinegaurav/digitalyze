'use client';

import { useState, useRef } from 'react';
import { Upload, File, X } from 'lucide-react';

interface FileUploadProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onUpload: (file: File) => void;
  acceptedTypes: string;
}

export default function FileUpload({ title, description, icon, onUpload, acceptedTypes }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const file = files[0];
    
    if (file && acceptedTypes.split(',').some(type => file.name.toLowerCase().endsWith(type.replace('.', '')))) {
      handleFileSelect(file);
    }
  };

  const handleFileSelect = (file: File) => {
    setUploadedFile(file);
    onUpload(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes}
        onChange={handleFileInputChange}
        className="hidden"
      />
      
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200 ${
          isDragOver
            ? 'border-blue-500 bg-blue-50'
            : uploadedFile
            ? 'border-green-500 bg-green-50'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        {uploadedFile ? (
          <div className="space-y-3">
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mx-auto">
              <File className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{uploadedFile.name}</p>
              <p className="text-xs text-gray-500">
                {(uploadedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveFile();
              }}
              className="inline-flex items-center space-x-1 text-xs text-red-600 hover:text-red-700"
            >
              <X className="w-3 h-3" />
              <span>Remove</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mx-auto">
              {icon}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{title}</p>
              <p className="text-xs text-gray-500">{description}</p>
            </div>
            <div className="flex items-center justify-center space-x-1 text-xs text-gray-500">
              <Upload className="w-3 h-3" />
              <span>Click to upload or drag and drop</span>
            </div>
            <p className="text-xs text-gray-400">
              {acceptedTypes.split(',').join(', ')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 