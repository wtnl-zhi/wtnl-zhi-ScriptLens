"use client";

import { useState } from "react";
import UploadDropzone from "@/components/upload-dropzone/UploadDropzone";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onUpload?: (text: string) => void;
}

export default function ScriptInput({ value, onChange, onUpload }: Props) {
  const [showUpload, setShowUpload] = useState(false);

  const handleUploadComplete = (text: string) => {
    onChange(text);
    onUpload?.(text);
    setShowUpload(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">脚本内容</label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowUpload(!showUpload)}
            className="rounded-md bg-secondary px-3 py-1.5 text-xs text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            {showUpload ? "收起上传" : "上传文档"}
          </button>
          <span className="text-xs text-muted-foreground">
            {value.length} 字符
          </span>
        </div>
      </div>
      {showUpload && (
        <UploadDropzone onUploadComplete={handleUploadComplete} />
      )}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="在此输入脚本内容，或上传文档自动提取文本..."
        className="min-h-[300px] w-full rounded-lg border border-input bg-background p-4 font-mono text-sm leading-relaxed placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
      />
    </div>
  );
}
