"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2, Save, Loader2, UserPlus, X, Users, Mail } from "lucide-react";
import { api, Project, Collaborator } from "@/lib/api";

const STATUS_OPTIONS = [
  { value: "draft", label: "草稿" },
  { value: "in_progress", label: "进行中" },
  { value: "completed", label: "已完成" },
];

const ROLE_LABELS: Record<string, string> = {
  owner: "拥有者",
  editor: "编辑者",
  viewer: "查看者",
};

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

  // Collaborators
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [collabError, setCollabError] = useState<string | null>(null);

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

    api.listCollaborators(projectId).then((res) => setCollaborators(res.items)).catch(() => {});
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

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setCollabError(null);
    try {
      await api.inviteCollaborator(projectId, inviteEmail.trim());
      setInviteEmail("");
      const res = await api.listCollaborators(projectId);
      setCollaborators(res.items);
    } catch (err: unknown) {
      setCollabError(err instanceof Error ? err.message : "邀请失败");
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (collabId: string) => {
    try {
      await api.removeCollaborator(projectId, collabId);
      setCollaborators((prev) => prev.filter((c) => c.id !== collabId));
    } catch {}
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

      <div className="card-panel p-6 mb-6">
        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="section-label">标题</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="input-field" />
          </div>
          <div>
            <label className="section-label">描述</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="input-field resize-none" />
          </div>
          <div>
            <label className="section-label">状态</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-field">
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          {error && <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
          {success && <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 border border-green-200">保存成功</div>}
          <button type="submit" disabled={saving} className="btn-primary w-full gap-2">
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> 保存中...</> : <><Save className="h-4 w-4" /> 保存</>}
          </button>
        </form>
      </div>

      <div className="card-panel p-6 mb-6">
        <div className="flex items-center gap-3 border-b pb-4 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-medium">协作者</h2>
            <p className="text-xs text-muted-foreground">邀请其他人协作此项目</p>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          {collaborators.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                  {c.name?.[0] || c.email[0]}
                </div>
                <div>
                  <p className="text-sm font-medium">{c.name || c.email}</p>
                  <p className="text-xs text-muted-foreground">{c.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground border rounded px-1.5 py-0.5">
                  {ROLE_LABELS[c.role] || c.role}
                </span>
                {c.role !== "owner" && (
                  <button onClick={() => handleRemove(c.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="输入邮箱地址邀请协作者"
            className="input-field flex-1"
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleInvite())}
          />
          <button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()} className="btn-primary gap-1.5">
            {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            邀请
          </button>
        </div>
        {collabError && <p className="mt-2 text-xs text-destructive">{collabError}</p>}
      </div>

      <div className="card-panel border-destructive/20 p-6">
        <h2 className="mb-1 text-sm font-medium text-destructive">危险操作</h2>
        <p className="mb-4 text-xs text-muted-foreground">删除项目后将进入回收站，30 天后永久删除。</p>
        {showDeleteConfirm ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
            <p className="text-sm text-destructive font-medium">确定要删除此项目吗？</p>
            <div className="flex gap-2">
              <button onClick={async () => { await api.deleteProject(projectId); router.push("/projects"); }} className="btn-primary bg-destructive hover:bg-destructive/90 gap-2">
                <Trash2 className="h-4 w-4" /> 确认删除
              </button>
              <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary">取消</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowDeleteConfirm(true)} className="btn-secondary border-destructive/30 text-destructive hover:bg-destructive/5 gap-1.5">
            <Trash2 className="h-4 w-4" /> 删除项目
          </button>
        )}
      </div>
    </div>
  );
}
