"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import UploadDropzone from "@/components/upload-dropzone/UploadDropzone";
import { api } from "@/lib/api";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onUpload?: (text: string) => void;
}

export default function ScriptInput({ value, onChange, onUpload }: Props) {
  const [showUpload, setShowUpload] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  const handleUploadComplete = (text: string) => {
    onChange(text);
    onUpload?.(text);
    setShowUpload(false);
  };

  const handleClean = async () => {
    if (!value.trim()) return;
    setCleaning(true);
    try {
      const result = await api.cleanScript(value);
      onChange(result.cleaned_text);
    } catch (err) {
      alert(err instanceof Error ? err.message : "清洗失败");
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">脚本内容</label>
        <div className="flex items-center gap-2">
          {value.trim() && (
            <button
              type="button"
              onClick={handleClean}
              disabled={cleaning}
              className="flex items-center gap-1 rounded-md bg-secondary px-3 py-1.5 text-xs text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 transition-colors"
            >
              {cleaning ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              {cleaning ? "清洗中..." : "智能清洗"}
            </button>
          )}
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
