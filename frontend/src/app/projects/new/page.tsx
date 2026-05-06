"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ScriptInput from "@/components/script-input/ScriptInput";
import { api } from "@/lib/api";

const MODELS = [
  { value: "flash", label: "DeepSeek Flash（快速）" },
  { value: "pro", label: "DeepSeek Pro（高质量）" },
];

export default function NewProjectPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [script, setScript] = useState("");
  const [model, setModel] = useState("flash");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError("请输入项目标题");
      return;
    }
    if (!script.trim()) {
      setError("请输入脚本内容");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const project = await api.createProject({
        title: title.trim(),
        source_text: script,
      });
      const { task_id } = await api.generateStoryboard(project.id, model);
      while (true) {
        await new Promise((r) => setTimeout(r, 1500));
        const status = await api.getTaskStatus(task_id);
        if (status.status === "completed" || status.status === "failed") break;
      }
      router.push(`/projects/${project.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "创建项目失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold">新建项目</h1>
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1">项目标题</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="输入项目标题"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <ScriptInput value={script} onChange={setScript} />

        <div>
          <label className="block text-sm font-medium mb-1">拆解模型</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {MODELS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {loading ? "正在拆解..." : "开始拆解"}
        </button>
      </div>
    </div>
  );
}
