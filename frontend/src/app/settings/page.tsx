"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Loader2, Save, Key, User, Sparkles, RotateCcw } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const loadUser = useAuthStore((s) => s.loadUser);

  const [name, setName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Prompt templates
  const [promptClean, setPromptClean] = useState<{
    system_prompt: string;
    user_template: string;
  } | null>(null);
  const [promptStoryboard, setPromptStoryboard] = useState<{
    system_prompt: string;
    user_template: string;
  } | null>(null);
  const [defaultClean, setDefaultClean] = useState<{
    system_prompt: string;
    user_template: string;
  } | null>(null);
  const [defaultStoryboard, setDefaultStoryboard] = useState<{
    system_prompt: string;
    user_template: string;
  } | null>(null);
  const [savingPrompts, setSavingPrompts] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [promptSuccess, setPromptSuccess] = useState(false);
  const [loadingPrompts, setLoadingPrompts] = useState(true);

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    loadUser().catch(() => {});
  }, [token, router, loadUser]);

  useEffect(() => {
    if (user) setName(user.name || "");
  }, [user]);

  useEffect(() => {
    loadPromptTemplates();
  }, []);

  async function loadPromptTemplates() {
    setLoadingPrompts(true);
    try {
      const data = await api.getPromptTemplates();
      setDefaultClean(data.default_clean);
      setDefaultStoryboard(data.default_storyboard);
      setPromptClean(data.prompt_clean);
      setPromptStoryboard(data.prompt_storyboard);
    } catch (err) {
      console.error("Failed to load prompt templates", err);
    } finally {
      setLoadingPrompts(false);
    }
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await api.updateSettings({
        name: name || undefined,
        deepseek_key: apiKey || undefined,
      });
      await loadUser();
      setSuccess(true);
      setApiKey("");
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePrompts = async () => {
    setSavingPrompts(true);
    setPromptError(null);
    setPromptSuccess(false);
    try {
      await api.updatePromptTemplates({
        prompt_clean: promptClean,
        prompt_storyboard: promptStoryboard,
      });
      setPromptSuccess(true);
      setTimeout(() => setPromptSuccess(false), 3000);
    } catch (err: unknown) {
      setPromptError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSavingPrompts(false);
    }
  };

  const handleResetClean = () => {
    setPromptClean(defaultClean ? { ...defaultClean } : null);
  };

  const handleResetStoryboard = () => {
    setPromptStoryboard(defaultStoryboard ? { ...defaultStoryboard } : null);
  };

  const handleClearClean = () => {
    setPromptClean(null);
  };

  const handleClearStoryboard = () => {
    setPromptStoryboard(null);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="page-title mb-8">设置</h1>

      {/* 个人信息 */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="card-panel p-6 space-y-5">
          <div className="flex items-center gap-3 border-b pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-medium">个人信息</h2>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <div>
            <label className="section-label">显示名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder="您的名称"
            />
          </div>
        </div>

        {/* DeepSeek API */}
        <div className="card-panel p-6 space-y-5">
          <div className="flex items-center gap-3 border-b pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Key className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-medium">DeepSeek API</h2>
              <p className="text-xs text-muted-foreground">
                配置 API Key 以启用 AI 拆解功能
              </p>
            </div>
          </div>
          <div>
            <label className="section-label">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="input-field"
              placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              留空则保持现有 Key 不变。Key 会加密存储。
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-700 border border-green-200">
            设置保存成功
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
              保存设置
            </>
          )}
        </button>
      </form>

      {/* AI Prompt 模板 */}
      <div className="card-panel p-6 space-y-5">
        <div className="flex items-center gap-3 border-b pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-medium">AI Prompt 模板</h2>
            <p className="text-xs text-muted-foreground">
              自定义 AI 拆解时使用的 Prompt，留空则使用系统默认模板
            </p>
          </div>
        </div>

        {loadingPrompts ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            加载中...
          </div>
        ) : (
          <div className="space-y-6">
            {/* 脚本清洗 Prompt */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">脚本清洗 Prompt</h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleResetClean}
                    disabled={!defaultClean}
                    className="text-xs px-2 py-1 rounded border border-input bg-background hover:bg-accent disabled:opacity-50"
                  >
                    <RotateCcw className="h-3 w-3 inline mr-1" />
                    恢复默认
                  </button>
                  <button
                    type="button"
                    onClick={handleClearClean}
                    className="text-xs px-2 py-1 rounded border border-input bg-background hover:bg-accent"
                  >
                    使用默认
                  </button>
                </div>
              </div>
              <div>
                <label className="section-label">System Prompt</label>
                <textarea
                  className="input-field h-24 resize-y font-mono text-xs"
                  value={promptClean?.system_prompt ?? ""}
                  onChange={(e) =>
                    setPromptClean(
                      e.target.value
                        ? { ...(promptClean || { user_template: "" }), system_prompt: e.target.value }
                        : null
                    )
                  }
                  placeholder={defaultClean?.system_prompt || ""}
                />
              </div>
              <div>
                <label className="section-label">User Template（用 {"{content}"} 代表脚本内容）</label>
                <textarea
                  className="input-field h-20 resize-y font-mono text-xs"
                  value={promptClean?.user_template ?? ""}
                  onChange={(e) =>
                    setPromptClean(
                      e.target.value
                        ? { ...(promptClean || { system_prompt: "" }), user_template: e.target.value }
                        : null
                    )
                  }
                  placeholder={defaultClean?.user_template || ""}
                />
              </div>
            </div>

            <hr className="border-border" />

            {/* 分镜拆解 Prompt */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">分镜拆解 Prompt</h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleResetStoryboard}
                    disabled={!defaultStoryboard}
                    className="text-xs px-2 py-1 rounded border border-input bg-background hover:bg-accent disabled:opacity-50"
                  >
                    <RotateCcw className="h-3 w-3 inline mr-1" />
                    恢复默认
                  </button>
                  <button
                    type="button"
                    onClick={handleClearStoryboard}
                    className="text-xs px-2 py-1 rounded border border-input bg-background hover:bg-accent"
                  >
                    使用默认
                  </button>
                </div>
              </div>
              <div>
                <label className="section-label">System Prompt</label>
                <textarea
                  className="input-field h-24 resize-y font-mono text-xs"
                  value={promptStoryboard?.system_prompt ?? ""}
                  onChange={(e) =>
                    setPromptStoryboard(
                      e.target.value
                        ? { ...(promptStoryboard || { user_template: "" }), system_prompt: e.target.value }
                        : null
                    )
                  }
                  placeholder={defaultStoryboard?.system_prompt || ""}
                />
              </div>
              <div>
                <label className="section-label">User Template（用 {"{script_text}"} 代表脚本内容）</label>
                <textarea
                  className="input-field h-20 resize-y font-mono text-xs"
                  value={promptStoryboard?.user_template ?? ""}
                  onChange={(e) =>
                    setPromptStoryboard(
                      e.target.value
                        ? { ...(promptStoryboard || { system_prompt: "" }), user_template: e.target.value }
                        : null
                    )
                  }
                  placeholder={defaultStoryboard?.user_template || ""}
                />
              </div>
            </div>

            {promptError && (
              <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {promptError}
              </div>
            )}
            {promptSuccess && (
              <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-700 border border-green-200">
                Prompt 模板保存成功
              </div>
            )}

            <button
              type="button"
              onClick={handleSavePrompts}
              disabled={savingPrompts}
              className="btn-primary w-full gap-2"
            >
              {savingPrompts ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  保存 Prompt 模板
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
