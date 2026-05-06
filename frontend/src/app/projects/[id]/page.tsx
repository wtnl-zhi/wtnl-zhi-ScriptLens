"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, Settings, Loader2, Sparkles } from "lucide-react";
import StoryboardTable from "@/components/storyboard-table/StoryboardTable";
import { api, Shot } from "@/lib/api";
import { useProjectStore } from "@/store/projectStore";

const MODELS = [
  { value: "flash", label: "Flash（快速）" },
  { value: "pro", label: "Pro（高质量）" },
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

  useEffect(() => {
    loadProject(projectId).catch(() => router.push("/projects"));
  }, [projectId, loadProject, router]);

  const handleUpdateShot = useCallback(
    async (id: string, data: Partial<Shot>) => {
      await updateShot(id, data);
    },
    [updateShot]
  );

  const handleAddShot = useCallback(async () => {
    await addShot();
  }, [addShot]);

  const handleDeleteShot = useCallback(
    async (id: string) => {
      await deleteShot(id);
    },
    [deleteShot]
  );

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
      await api.generateStoryboard(projectId, model);
      await loadProject(projectId);
    } catch (err: unknown) {
      setGenerateError(err instanceof Error ? err.message : "拆解失败");
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = (type: "excel" | "csv" | "pdf") => {
    const urls: Record<string, string> = {
      excel: api.getExcelUrl(projectId),
      csv: api.getCsvUrl(projectId),
      pdf: api.getPdfUrl(projectId),
    };
    window.open(urls[type], "_blank");
  };

  if (loading && !currentProject) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!currentProject) return null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/projects"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold">{currentProject.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          {currentProject.source_text && (
            <>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="rounded-md border border-input bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {MODELS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {generating ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                {generating ? "拆解中..." : (shots.length > 0 ? "重新拆解" : "开始拆解")}
              </button>
            </>
          )}
          <button
            onClick={() => handleExport("excel")}
            disabled={shots.length === 0}
            className="flex items-center gap-1 rounded-md bg-secondary px-3 py-1.5 text-xs text-secondary-foreground hover:bg-secondary/80 disabled:opacity-30 transition-colors"
          >
            <Download className="h-3 w-3" />
            Excel
          </button>
          <button
            onClick={() => handleExport("csv")}
            disabled={shots.length === 0}
            className="flex items-center gap-1 rounded-md bg-secondary px-3 py-1.5 text-xs text-secondary-foreground hover:bg-secondary/80 disabled:opacity-30 transition-colors"
          >
            <Download className="h-3 w-3" />
            CSV
          </button>
          <button
            onClick={() => handleExport("pdf")}
            disabled={shots.length === 0}
            className="flex items-center gap-1 rounded-md bg-secondary px-3 py-1.5 text-xs text-secondary-foreground hover:bg-secondary/80 disabled:opacity-30 transition-colors"
          >
            <Download className="h-3 w-3" />
            PDF
          </button>
          <Link
            href={`/projects/${projectId}/settings`}
            className="flex items-center gap-1 rounded-md bg-secondary px-3 py-1.5 text-xs text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            <Settings className="h-3 w-3" />
            设置
          </Link>
        </div>
      </div>

      {generateError && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {generateError}
        </div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="w-full lg:w-1/3">
          <div className="rounded-lg border bg-muted/20 p-4">
            <h2 className="mb-3 text-sm font-medium">原始脚本</h2>
            <pre className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground font-mono">
              {currentProject.source_text || "无脚本内容"}
            </pre>
          </div>
        </div>
        <div className="w-full lg:w-2/3">
          {shots.length === 0 && !generating ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20">
              <Sparkles className="mb-2 h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">尚未生成分镜</p>
              <p className="mt-1 text-xs text-muted-foreground">点击右上角「开始拆解」按钮</p>
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
            <div className="flex items-center justify-center rounded-lg border py-20">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">AI 正在拆解脚本...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
