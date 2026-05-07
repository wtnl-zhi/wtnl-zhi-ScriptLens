"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, FileText, Film, Loader2 } from "lucide-react";
import { api, Project } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

const STATUS_TABS = [
  { key: "", label: "全部" },
  { key: "draft", label: "草稿" },
  { key: "in_progress", label: "进行中" },
  { key: "completed", label: "已完成" },
];

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-yellow-100 text-yellow-700 border-yellow-200",
  in_progress: "bg-blue-100 text-blue-700 border-blue-200",
  completed: "bg-green-100 text-green-700 border-green-200",
  generated: "bg-purple-100 text-purple-700 border-purple-200",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "草稿",
  in_progress: "进行中",
  completed: "已完成",
  generated: "已生成",
};

export default function ProjectsPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 12;

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    api
      .listProjects({ page, size: pageSize })
      .then((res) => {
        setProjects(res.items);
        setTotal(res.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, router, page]);

  const filtered = filter
    ? projects.filter((p) => p.status === filter)
    : projects;
  const totalPages = Math.ceil(total / pageSize);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">项目列表</h1>
          <p className="mt-1 text-sm text-muted-foreground">共 {total} 个项目</p>
        </div>
        <Link
          href="/projects/new"
          className="btn-primary gap-2"
        >
          <Plus className="h-4 w-4" />
          新建项目
        </Link>
      </div>

      <div className="mb-6 flex gap-1 rounded-lg bg-muted p-1 w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setFilter(tab.key); setPage(1); }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
              filter === tab.key
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-24">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/5">
            <Film className="h-8 w-8 text-primary/40" />
          </div>
          <p className="text-base font-medium text-muted-foreground">还没有项目</p>
          <p className="mt-1 text-sm text-muted-foreground/60">创建一个新项目，开始拆解你的剧本</p>
          <Link href="/projects/new" className="btn-primary mt-6 gap-2">
            <Plus className="h-4 w-4" />
            新建项目
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-24">
          <FileText className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">该状态暂无项目</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((project, i) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="card-panel card-hover group overflow-hidden"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="p-5">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <h3 className="font-semibold leading-tight group-hover:text-primary transition-colors line-clamp-2">
                      {project.title}
                    </h3>
                    <span
                      className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                        STATUS_STYLES[project.status] || "bg-gray-100 text-gray-700 border-gray-200"
                      }`}
                    >
                      {STATUS_LABELS[project.status] || project.status}
                    </span>
                  </div>
                  {project.description && (
                    <p className="mb-3 text-xs text-muted-foreground line-clamp-2">
                      {project.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span>创建 {new Date(project.created_at).toLocaleDateString("zh-CN")}</span>
                    <span>·</span>
                    <span>更新 {new Date(project.updated_at).toLocaleDateString("zh-CN")}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="btn-secondary"
              >
                上一页
              </button>
              <span className="text-xs text-muted-foreground">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="btn-secondary"
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
