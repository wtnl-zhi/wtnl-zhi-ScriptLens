"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2, Save, Loader2 } from "lucide-react";
import { api, Project } from "@/lib/api";

const STATUS_OPTIONS = [
  { value: "draft", label: "草稿" },
  { value: "in_progress", label: "进行中" },
  { value: "completed", label: "已完成" },
];

export default function ProjectSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("draft");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api
      .getProject(projectId)
      .then((res) => {
        const p = res.project;
        setProject(p);
        setTitle(p.title);
        setDescription(p.description || "");
        setStatus(p.status);
      })
      .catch(() => router.push("/projects"))
      .finally(() => setLoading(false));
  }, [projectId, router]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const updated = await api.updateProject(projectId, { title, description, status });
      setProject(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.deleteProject(projectId);
      router.push("/projects");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "删除失败");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href={`/projects/${projectId}`}
          className="flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="page-title">项目设置</h1>
      </div>

      <div className="card-panel p-6">
        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="section-label">标题</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="input-field"
            />
          </div>

          <div>
            <label className="section-label">描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="input-field resize-none"
            />
          </div>

          <div>
            <label className="section-label">状态</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="input-field"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 border border-green-200">
              保存成功
            </div>
          )}

          <button type="submit" disabled={saving} className="btn-primary w-full gap-2">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                保存
              </>
            )}
          </button>
        </form>
      </div>

      <div className="mt-8">
        <div className="card-panel border-destructive/20 p-6">
          <h2 className="mb-1 text-sm font-medium text-destructive">危险操作</h2>
          <p className="mb-4 text-xs text-muted-foreground">删除项目后将进入回收站，30 天后永久删除。</p>
          {showDeleteConfirm ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
              <p className="text-sm text-destructive font-medium">
                确定要删除此项目吗？
              </p>
              <div className="flex gap-2">
                <button onClick={handleDelete} className="btn-primary bg-destructive hover:bg-destructive/90 gap-2">
                  <Trash2 className="h-4 w-4" />
                  确认删除
                </button>
                <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary">
                  取消
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="btn-secondary border-destructive/30 text-destructive hover:bg-destructive/5 gap-1.5"
            >
              <Trash2 className="h-4 w-4" />
              删除项目
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
