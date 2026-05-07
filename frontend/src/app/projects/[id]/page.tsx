"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, Settings, Loader2, Sparkles, Film, History, Save, Users } from "lucide-react";
import { useWebSocket } from "@/lib/useWebSocket";
import StoryboardTable from "@/components/storyboard-table/StoryboardTable";
import CommentsPanel from "@/components/storyboard-table/CommentsPanel";
import { api, Shot } from "@/lib/api";
import { useProjectStore } from "@/store/projectStore";

const MODELS = [
  { value: "flash", label: "DeepSeek Flash" },
  { value: "pro", label: "DeepSeek Pro" },
];

export default function ProjectEditorPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const {
    currentProject,
    shots,
    loading,
    loadProject,
    setShots,
    updateShot,
    addShot,
    deleteShot,
    reorderShots,
  } = useProjectStore();

  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [model, setModel] = useState("flash");
  const [commentShotId, setCommentShotId] = useState<string | null>(null);
  const [savingVersion, setSavingVersion] = useState(false);
  const [versions, setVersions] = useState<Array<{id:string;version_number:number;shot_count:number;created_at:string}>>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);

  const { send: wsSend } = useWebSocket(projectId, {
    onShotUpdated: (data) => {
      const { shots: currentShots } = useProjectStore.getState();
      setShots(currentShots.map((s) => s.id === data.shot_id ? { ...s, ...data.updates } : s));
    },
    onShotAdded: (data) => {
      loadProject(projectId);
    },
    onShotDeleted: (data) => {
      const { shots: currentShots } = useProjectStore.getState();
      setShots(currentShots.filter((s) => s.id !== data.shot_id));
    },
    onOnlineCount: setOnlineCount,
  });

  useEffect(() => {
    loadProject(projectId).catch(() => router.push("/projects"));
  }, [projectId, loadProject, router]);

  useEffect(() => {
    const handler = (e: CustomEvent) => setCommentShotId(e.detail.shotId);
    window.addEventListener("open-comments", handler as EventListener);
    return () => window.removeEventListener("open-comments", handler as EventListener);
  }, []);

  const handleUpdateShot = useCallback(
    async (id: string, data: Partial<Shot>) => {
      await updateShot(id, data);
      wsSend({ type: "edit_shot", shot_id: id, updates: data });
    },
    [updateShot, wsSend]
  );

  const handleAddShot = useCallback(async () => {
    await addShot();
    wsSend({ type: "add_shot", shot: {} });
  }, [addShot, wsSend]);

  const handleDeleteShot = useCallback(
    async (id: string) => {
      await deleteShot(id);
      wsSend({ type: "delete_shot", shot_id: id });
    },
    [deleteShot, wsSend]
  );

  const handleSaveVersion = async () => {
    setSavingVersion(true);
    try {
      await api.saveVersion(projectId);
    } catch {}
    setSavingVersion(false);
  };

  const handleShowVersions = async () => {
    setShowVersions(!showVersions);
    if (!showVersions) {
      try {
        const res = await api.listVersions(projectId);
        setVersions(res.items);
      } catch {}
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    if (!confirm("确定要恢复到此版本吗？当前修改将丢失。")) return;
    try {
      await api.restoreVersion(projectId, versionId);
      await loadProject(projectId);
      setShowVersions(false);
    } catch (err: unknown) {
      setGenerateError(err instanceof Error ? err.message : "恢复失败");
    }
  };

  const handleReorder = useCallback(
    async (items: Shot[]) => {
      await reorderShots(items);
    },
    [reorderShots]
  );

  const handleGenerate = async () => {
    if (!currentProject?.source_text) return;
    setGenerating(true);
    setGenerateError(null);
    try {
      if (shots.length > 0) {
        await api.saveVersion(projectId);
        setShots([]);
        if (showVersions) {
          const res = await api.listVersions(projectId);
          setVersions(res.items);
        }
      }
      const { task_id } = await api.generateStoryboard(projectId, model);
      while (true) {
        await new Promise((r) => setTimeout(r, 1500));
        const status = await api.getTaskStatus(task_id);
        if (status.status === "completed") {
          await loadProject(projectId);
          break;
        }
        if (status.status === "failed") {
          throw new Error(status.error || "拆解失败");
        }
      }
    } catch (err: unknown) {
      setGenerateError(err instanceof Error ? err.message : "拆解失败");
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = async (type: "excel" | "csv" | "pdf") => {
    setGenerateError(null);
    const urls: Record<string, string> = {
      excel: api.getExcelUrl(projectId),
      csv: api.getCsvUrl(projectId),
      pdf: api.getPdfUrl(projectId),
    };
    try {
      const token = api.getToken();
      const res = await fetch(urls[type], {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "导出失败");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${currentProject?.title || "分镜表"}.${type === "excel" ? "xlsx" : type}`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 1000);
    } catch (err: unknown) {
      setGenerateError(err instanceof Error ? err.message : "导出失败");
    }
  };

  if (loading && !currentProject) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!currentProject) return null;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/projects"
            className="flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="返回项目列表"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{currentProject.title}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {shots.length} 个镜头
              {onlineCount > 1 && (
                <span className="ml-2 inline-flex items-center gap-1 text-green-600">
                  <Users className="h-3 w-3" /> {onlineCount} 人在线
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {currentProject.source_text && (
            <>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="input-field w-auto text-xs py-1.5"
              >
                {MODELS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="btn-primary gap-1.5 text-xs py-1.5 px-3"
              >
                {generating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {generating ? "拆解中..." : (shots.length > 0 ? "重新拆解" : "开始拆解")}
              </button>
            </>
          )}
          <div className="flex items-center gap-1">
            <button onClick={handleSaveVersion} disabled={savingVersion} className="btn-secondary gap-1" title="保存版本">
              <Save className="h-3 w-3" />
              保存
            </button>
            <button onClick={handleShowVersions} className="btn-secondary gap-1" title="版本历史">
              <History className="h-3 w-3" />
              历史
            </button>
            {(["excel", "csv", "pdf"] as const).map((type) => (
              <button
                key={type}
                onClick={() => handleExport(type)}
                disabled={shots.length === 0}
                className="btn-secondary gap-1 uppercase"
              >
                <Download className="h-3 w-3" />
                {type}
              </button>
            ))}
          </div>
          <Link
            href={`/projects/${projectId}/settings`}
            className="btn-secondary gap-1"
          >
            <Settings className="h-3 w-3" />
            设置
          </Link>
        </div>
      </div>

      {generateError && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {generateError}
        </div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="w-full lg:w-1/3 lg:max-w-sm">
          <div className="card-panel overflow-hidden">
            <div className="border-b bg-muted/30 px-4 py-2.5">
              <h2 className="text-sm font-medium">原始脚本</h2>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-4">
              {currentProject.source_text ? (
                <pre className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground font-mono">
                  {currentProject.source_text}
                </pre>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Film className="mb-2 h-8 w-8 opacity-30" />
                  <p className="text-sm">无脚本内容</p>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          {shots.length === 0 && !generating ? (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-24">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/5">
                <Sparkles className="h-7 w-7 text-primary/40" />
              </div>
              <p className="text-base font-medium text-muted-foreground">尚未生成分镜</p>
              <p className="mt-1 text-sm text-muted-foreground/60">点击右上角「开始拆解」按钮</p>
            </div>
          ) : (
            <StoryboardTable
              shots={shots}
              onShotsChange={setShots}
              onUpdateShot={handleUpdateShot}
              onAddShot={handleAddShot}
              onDeleteShot={handleDeleteShot}
              onReorder={handleReorder}
            />
          )}
          {generating && shots.length === 0 && (
            <div className="flex items-center justify-center rounded-xl border py-24">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">AI 正在拆解脚本...</span>
              </div>
            </div>
          )}
        </div>
      </div>
      {showVersions && (
        <div className="fixed bottom-0 right-0 z-40 w-full max-w-sm border-l bg-white shadow-xl" style={{ top: "3.5rem" }}>
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="text-sm font-medium">版本历史</h3>
            <button onClick={() => setShowVersions(false)} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </button>
          </div>
          <div className="overflow-y-auto p-4 space-y-2" style={{ height: "calc(100vh - 8rem)" }}>
            {versions.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">暂无版本</p>
            ) : (
              versions.map((v) => (
                <div key={v.id} className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium">版本 {v.version_number}</p>
                    <p className="text-xs text-muted-foreground">{v.shot_count} 个镜头 · {v.created_at ? new Date(v.created_at).toLocaleString("zh-CN") : ""}</p>
                  </div>
                  <button onClick={() => handleRestoreVersion(v.id)} className="btn-secondary text-xs">
                    恢复
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      {commentShotId && (
        <CommentsPanel
          shotId={commentShotId}
          onClose={() => setCommentShotId(null)}
        />
      )}
    </div>
  );
}
