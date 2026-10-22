"use client";

import React, { useEffect, useState } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import {
  getIntegrationsConfigAction,
  saveAiIntegrationAction,
  testAiConnectionAction,
  saveWhatsAppConfigAction,
  saveFacebookConfigAction,
  type MaskedIntegrationsConfig,
} from "@/app/admin/integration-actions";

export default function IntegrationsSettingsPage() {
  const [config, setConfig] = useState<MaskedIntegrationsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ai" | "whatsapp" | "facebook">("ai");

  // AI Form State
  const [aiEnabled, setAiEnabled] = useState(false);
  const [activeProvider, setActiveProvider] = useState<"openai" | "gemini">("openai");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [openaiModel, setOpenaiModel] = useState("gpt-4o-mini");
  const [geminiKey, setGeminiKey] = useState("");
  const [geminiModel, setGeminiModel] = useState("gemini-1.5-flash");

  // WhatsApp Form State
  const [waEnabled, setWaEnabled] = useState(false);
  const [waType, setWaType] = useState<"click_to_chat" | "business_api">("click_to_chat");
  const [waNumber, setWaNumber] = useState("");
  const [waMessage, setWaMessage] = useState("");
  const [waPhoneId, setWaPhoneId] = useState("");
  const [waToken, setWaToken] = useState("");
  const [waWabaId, setWaWabaId] = useState("");

  // Facebook Form State
  const [fbEnabled, setFbEnabled] = useState(false);
  const [fbType, setFbType] = useState<"page_link" | "graph_api">("page_link");
  const [fbPageUrl, setFbPageUrl] = useState("");
  const [fbPageId, setFbPageId] = useState("");
  const [fbToken, setFbToken] = useState("");

  // Status feedback
  const [saving, setSaving] = useState(false);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await getIntegrationsConfigAction();
      if (res.success && res.data) {
        const d = res.data;
        setConfig(d);

        // Populate AI fields
        setAiEnabled(d.ai.enabled);
        setActiveProvider(d.ai.activeProvider);
        setSystemPrompt(d.ai.systemPrompt);
        setOpenaiKey(d.ai.openai.apiKeyMasked);
        setOpenaiModel(d.ai.openai.model);
        setGeminiKey(d.ai.gemini.apiKeyMasked);
        setGeminiModel(d.ai.gemini.model);

        // Populate WhatsApp fields
        setWaEnabled(d.whatsapp.enabled);
        setWaType(d.whatsapp.integrationType);
        setWaNumber(d.whatsapp.clickToChatNumber);
        setWaMessage(d.whatsapp.clickToChatMessage);
        setWaPhoneId(d.whatsapp.businessApi.phoneNumberId);
        setWaToken(d.whatsapp.businessApi.accessTokenMasked);
        setWaWabaId(d.whatsapp.businessApi.wabaId);

        // Populate Facebook fields
        setFbEnabled(d.facebook.enabled);
        setFbType(d.facebook.integrationType);
        setFbPageUrl(d.facebook.pageUrl);
        setFbPageId(d.facebook.graphApi.pageId);
        setFbToken(d.facebook.graphApi.pageAccessTokenMasked);
      }
    } catch (err) {
      console.error("Failed to load integrations", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveAi = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedbackMsg(null);
    try {
      const res = await saveAiIntegrationAction({
        enabled: aiEnabled,
        activeProvider,
        systemPrompt,
        openaiKey,
        openaiModel,
        geminiKey,
        geminiModel,
      });

      if (res.success) {
        setFeedbackMsg({ type: "success", text: "AI and Chatbot configuration successfully saved." });
        loadSettings();
      } else {
        setFeedbackMsg({ type: "error", text: res.error || "Failed to save AI configuration." });
      }
    } catch {
      setFeedbackMsg({ type: "error", text: "Error saving configuration." });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async (provider: "openai" | "gemini") => {
    setTestingProvider(provider);
    setFeedbackMsg(null);
    try {
      const res = await testAiConnectionAction(provider);
      if (res.success && res.data) {
        setFeedbackMsg({ type: "success", text: res.data.message });
        loadSettings();
      } else {
        setFeedbackMsg({ type: "error", text: res.error || `Connection test to ${provider} failed.` });
        loadSettings();
      }
    } catch {
      setFeedbackMsg({ type: "error", text: "Network error during connection test." });
    } finally {
      setTestingProvider(null);
    }
  };

  const handleSaveWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedbackMsg(null);
    try {
      const res = await saveWhatsAppConfigAction({
        enabled: waEnabled,
        integrationType: waType,
        clickToChatNumber: waNumber,
        clickToChatMessage: waMessage,
        phoneNumberId: waPhoneId,
        accessToken: waToken,
        wabaId: waWabaId,
      });

      if (res.success) {
        setFeedbackMsg({ type: "success", text: "WhatsApp settings saved successfully." });
        loadSettings();
      } else {
        setFeedbackMsg({ type: "error", text: res.error || "Failed to save WhatsApp settings." });
      }
    } catch {
      setFeedbackMsg({ type: "error", text: "Error saving WhatsApp settings." });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFacebook = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedbackMsg(null);
    try {
      const res = await saveFacebookConfigAction({
        enabled: fbEnabled,
        integrationType: fbType,
        pageUrl: fbPageUrl,
        pageId: fbPageId,
        pageAccessToken: fbToken,
      });

      if (res.success) {
        setFeedbackMsg({ type: "success", text: "Facebook/Meta settings saved successfully." });
        loadSettings();
      } else {
        setFeedbackMsg({ type: "error", text: res.error || "Failed to save Facebook settings." });
      }
    } catch {
      setFeedbackMsg({ type: "error", text: "Error saving Facebook settings." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminHeader
        title="AI & External Integrations"
        subtitle="Configure chatbot adapters, secure API providers, and official messaging platforms without rebuilds."
      />

      {/* Configuration Header */}
      <div className="flex items-center gap-3 border-b border-[var(--surface-border)] pb-3">
        <div className="px-5 py-2.5 rounded-xl font-display text-xs uppercase tracking-wider font-bold bg-[#d4af37] text-[#141416] shadow-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-[17px]">smart_toy</span>
          <span>AI Providers &amp; Chatbot Configuration</span>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl text-xs font-serif flex items-center gap-2 animate-in fade-in duration-200 ${
            feedbackMsg.type === "success"
              ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
              : "bg-rose-500/15 border border-rose-500/30 text-rose-800 dark:text-rose-300"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {feedbackMsg.type === "success" ? "check_circle" : "error"}
          </span>
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center space-y-3">
          <span className="material-symbols-outlined text-4xl text-[#d4af37] animate-spin">
            progress_activity
          </span>
          <p className="font-display text-xs uppercase tracking-wider text-[var(--text-muted)]">
            Loading secure integration profiles...
          </p>
        </div>
      ) : (
        <>
          {/* ================= TAB 1: AI PROVIDERS & CHATBOT ================= */}
          {activeTab === "ai" && (
            <form onSubmit={handleSaveAi} className="space-y-6">
              {/* Enable / Disable Switch Banner */}
              <div className="p-5 rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-sm font-bold text-[var(--text-main)]">
                      Student AI Chatbot Assistant
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-display font-bold uppercase tracking-wider ${
                        aiEnabled
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                          : "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border border-zinc-500/30"
                      }`}
                    >
                      {aiEnabled ? "Active & Online" : "Offline / Disabled"}
                    </span>
                  </div>
                  <p className="font-serif text-xs text-[var(--text-muted)]">
                    Controls the student learning chatbot interface on the website. Requires a verified API provider connection below.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aiEnabled}
                    onChange={(e) => setAiEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-300 peer-focus:outline-hidden rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-[#d4af37]"></div>
                </label>
              </div>

              {/* Active Provider Selector */}
              <div className="p-5 rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] space-y-4 shadow-2xs">
                <h4 className="font-display text-xs font-bold uppercase tracking-wider text-[var(--text-main)]">
                  Active AI Provider Adapter
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* OpenAI Option */}
                  <div
                    onClick={() => setActiveProvider("openai")}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      activeProvider === "openai"
                        ? "border-[#d4af37] bg-[#d4af37]/5 shadow-xs"
                        : "border-[var(--surface-border)] hover:border-zinc-400"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-xl text-[#d4af37]">auto_awesome</span>
                        <span className="font-display text-sm font-bold text-[var(--text-main)]">OpenAI</span>
                      </div>
                      <input
                        type="radio"
                        name="activeProvider"
                        checked={activeProvider === "openai"}
                        onChange={() => setActiveProvider("openai")}
                        className="text-[#d4af37]"
                      />
                    </div>
                    <p className="font-serif text-xs text-[var(--text-muted)]">
                      Official GPT-4o and GPT-4o-mini models. Recommended for multilingual articulation and deep grammar reasoning.
                    </p>
                    {config?.ai.openai.lastTestStatus && (
                      <div className="mt-2 text-[10px] font-mono flex items-center gap-1 text-[var(--text-muted)]">
                        <span>Status: </span>
                        <span className={config.ai.openai.lastTestStatus === "success" ? "text-emerald-500 font-bold" : "text-rose-500 font-bold"}>
                          {config.ai.openai.lastTestStatus.toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Gemini Option */}
                  <div
                    onClick={() => setActiveProvider("gemini")}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      activeProvider === "gemini"
                        ? "border-[#d4af37] bg-[#d4af37]/5 shadow-xs"
                        : "border-[var(--surface-border)] hover:border-zinc-400"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-xl text-[#d4af37]">bolt</span>
                        <span className="font-display text-sm font-bold text-[var(--text-main)]">Google Gemini</span>
                      </div>
                      <input
                        type="radio"
                        name="activeProvider"
                        checked={activeProvider === "gemini"}
                        onChange={() => setActiveProvider("gemini")}
                        className="text-[#d4af37]"
                      />
                    </div>
                    <p className="font-serif text-xs text-[var(--text-muted)]">
                      Google Gemini 1.5 Flash and Pro. High throughput and extensive context window for complex language queries.
                    </p>
                    {config?.ai.gemini.lastTestStatus && (
                      <div className="mt-2 text-[10px] font-mono flex items-center gap-1 text-[var(--text-muted)]">
                        <span>Status: </span>
                        <span className={config.ai.gemini.lastTestStatus === "success" ? "text-emerald-500 font-bold" : "text-rose-500 font-bold"}>
                          {config.ai.gemini.lastTestStatus.toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Provider Credentials & Parameters */}
              <div className="p-5 rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] space-y-6 shadow-2xs">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--surface-border)]">
                  <h4 className="font-display text-xs font-bold uppercase tracking-wider text-[var(--text-main)]">
                    {activeProvider === "openai" ? "OpenAI Settings & Credentials" : "Google Gemini Settings & Credentials"}
                  </h4>
                  <button
                    type="button"
                    onClick={() => handleTestConnection(activeProvider)}
                    disabled={testingProvider !== null}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-display font-bold uppercase tracking-wider border border-[var(--surface-border)] hover:border-[#d4af37] bg-[var(--surface-low)] hover:bg-[#d4af37]/10 text-[var(--text-main)] transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px] text-[#d4af37]">
                      {testingProvider === activeProvider ? "progress_activity" : "network_check"}
                    </span>
                    <span>{testingProvider === activeProvider ? "Testing..." : "Test Connection"}</span>
                  </button>
                </div>

                {activeProvider === "openai" ? (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="block font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                        OpenAI API Key
                      </label>
                      <input
                        type="text"
                        value={openaiKey}
                        onChange={(e) => setOpenaiKey(e.target.value)}
                        placeholder="sk-proj-..."
                        className="w-full px-4 py-2.5 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-[var(--text-main)] font-mono text-xs focus:outline-hidden focus:border-[#d4af37]"
                      />
                      <p className="font-serif text-[11px] text-[var(--text-muted)]">
                        Keys are masked on load and never exposed to the client browser or public endpoints.
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-[var(--surface-low)] border border-[var(--surface-border)] flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)] block">
                          Model Resolution
                        </span>
                        <p className="font-serif text-[11px] text-[var(--text-muted)]">
                          Automatically detected server-side from API capabilities (Active: {openaiModel || "gpt-4o-mini"}).
                        </p>
                      </div>
                      <span className="font-mono text-[10px] text-[#8a6d1b] dark:text-[#d4af37] bg-[#d4af37]/15 px-2.5 py-1 rounded-md font-bold">
                        Auto-Managed
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="block font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                        Google Gemini API Key
                      </label>
                      <input
                        type="text"
                        value={geminiKey}
                        onChange={(e) => setGeminiKey(e.target.value)}
                        placeholder="AIzaSy..."
                        className="w-full px-4 py-2.5 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-[var(--text-main)] font-mono text-xs focus:outline-hidden focus:border-[#d4af37]"
                      />
                      <p className="font-serif text-[11px] text-[var(--text-muted)]">
                        Google AI Studio or Vertex AI Gemini API credential. Stored strictly server-side.
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-[var(--surface-low)] border border-[var(--surface-border)] flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)] block">
                          Model Resolution
                        </span>
                        <p className="font-serif text-[11px] text-[var(--text-muted)]">
                          Automatically detected server-side from API capabilities (Active: {geminiModel || "gemini-1.5-flash"}).
                        </p>
                      </div>
                      <span className="font-mono text-[10px] text-[#8a6d1b] dark:text-[#d4af37] bg-[#d4af37]/15 px-2.5 py-1 rounded-md font-bold">
                        Auto-Managed
                      </span>
                    </div>
                  </div>
                )}

                {/* System Prompt Instructions */}
                <div className="space-y-1 pt-2">
                  <label className="block font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                    System Instructions &amp; Chatbot Persona
                  </label>
                  <textarea
                    rows={4}
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    placeholder="Instructions guiding the tone, pedagogical guidelines, and boundaries of the AI..."
                    className="w-full px-4 py-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-[var(--text-main)] font-serif text-xs focus:outline-hidden focus:border-[#d4af37]"
                  />
                  <p className="font-serif text-[11px] text-[var(--text-muted)]">
                    Student course submissions and private records are never sent to third-party providers.
                  </p>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] disabled:opacity-40 text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs cursor-pointer flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[17px]">save</span>
                    <span>{saving ? "Saving..." : "Save AI Configuration"}</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* ================= TAB 2: WHATSAPP BUSINESS ================= */}
          {activeTab === "whatsapp" && (
            <form onSubmit={handleSaveWhatsApp} className="space-y-6">
              <div className="p-5 rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] flex items-center justify-between gap-4 shadow-2xs">
                <div className="space-y-1">
                  <span className="font-display text-sm font-bold text-[var(--text-main)]">
                    WhatsApp Integration Status
                  </span>
                  <p className="font-serif text-xs text-[var(--text-muted)]">
                    Enable direct WhatsApp student contact and messaging.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={waEnabled}
                    onChange={(e) => setWaEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-300 peer-focus:outline-hidden rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-[#d4af37]"></div>
                </label>
              </div>

              {/* Integration Type Switcher: Click-to-Chat vs Official Business API */}
              <div className="p-5 rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] space-y-4 shadow-2xs">
                <h4 className="font-display text-xs font-bold uppercase tracking-wider text-[var(--text-main)]">
                  WhatsApp Method
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div
                    onClick={() => setWaType("click_to_chat")}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      waType === "click_to_chat"
                        ? "border-[#d4af37] bg-[#d4af37]/5"
                        : "border-[var(--surface-border)]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-display text-sm font-bold text-[var(--text-main)]">
                        Click-to-Chat Link (Direct)
                      </span>
                      <input
                        type="radio"
                        checked={waType === "click_to_chat"}
                        onChange={() => setWaType("click_to_chat")}
                      />
                    </div>
                    <p className="font-serif text-xs text-[var(--text-muted)]">
                      Opens WhatsApp directly with the configured business phone number and prefilled introductory message.
                    </p>
                  </div>

                  <div
                    onClick={() => setWaType("business_api")}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      waType === "business_api"
                        ? "border-[#d4af37] bg-[#d4af37]/5"
                        : "border-[var(--surface-border)]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-display text-sm font-bold text-[var(--text-main)]">
                        Official Meta WhatsApp Cloud API
                      </span>
                      <input
                        type="radio"
                        checked={waType === "business_api"}
                        onChange={() => setWaType("business_api")}
                      />
                    </div>
                    <p className="font-serif text-xs text-[var(--text-muted)]">
                      Enterprise automated messaging via Meta WhatsApp Business Platform. Requires Phone Number ID &amp; System User Token.
                    </p>
                  </div>
                </div>

                {waType === "click_to_chat" ? (
                  <div className="space-y-4 pt-4 border-t border-[var(--surface-border)]">
                    <div className="space-y-1">
                      <label className="block font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                        Business WhatsApp Number (International format with country code)
                      </label>
                      <input
                        type="text"
                        value={waNumber}
                        onChange={(e) => setWaNumber(e.target.value)}
                        placeholder="+49 152 12345678"
                        className="w-full px-4 py-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                        Prefilled Starter Message
                      </label>
                      <input
                        type="text"
                        value={waMessage}
                        onChange={(e) => setWaMessage(e.target.value)}
                        placeholder="Hello SpeakUp! I would like to inquire about courses..."
                        className="w-full px-4 py-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-xs font-serif"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 pt-4 border-t border-[var(--surface-border)]">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                          Phone Number ID
                        </label>
                        <input
                          type="text"
                          value={waPhoneId}
                          onChange={(e) => setWaPhoneId(e.target.value)}
                          placeholder="e.g. 109283746501928"
                          className="w-full px-4 py-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-xs font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                          WABA ID (WhatsApp Business Account ID)
                        </label>
                        <input
                          type="text"
                          value={waWabaId}
                          onChange={(e) => setWaWabaId(e.target.value)}
                          placeholder="e.g. 981726354819203"
                          className="w-full px-4 py-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                        Permanent System User Access Token
                      </label>
                      <input
                        type="text"
                        value={waToken}
                        onChange={(e) => setWaToken(e.target.value)}
                        placeholder="EAABw..."
                        className="w-full px-4 py-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-xs font-mono"
                      />
                      <p className="font-serif text-[11px] text-[var(--text-muted)]">
                        Stored securely server-side. Never use personal Facebook passwords.
                      </p>
                    </div>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] disabled:opacity-40 text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs cursor-pointer flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[17px]">save</span>
                    <span>{saving ? "Saving..." : "Save WhatsApp Settings"}</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* ================= TAB 3: FACEBOOK & META ================= */}
          {activeTab === "facebook" && (
            <form onSubmit={handleSaveFacebook} className="space-y-6">
              <div className="p-5 rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] flex items-center justify-between gap-4 shadow-2xs">
                <div className="space-y-1">
                  <span className="font-display text-sm font-bold text-[var(--text-main)]">
                    Facebook &amp; Meta Integration Status
                  </span>
                  <p className="font-serif text-xs text-[var(--text-muted)]">
                    Configure institutional Facebook links and official Graph API webhooks.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fbEnabled}
                    onChange={(e) => setFbEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-300 peer-focus:outline-hidden rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-[#d4af37]"></div>
                </label>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] space-y-4 shadow-2xs">
                <h4 className="font-display text-xs font-bold uppercase tracking-wider text-[var(--text-main)]">
                  Integration Level
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div
                    onClick={() => setFbType("page_link")}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      fbType === "page_link"
                        ? "border-[#d4af37] bg-[#d4af37]/5"
                        : "border-[var(--surface-border)]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-display text-sm font-bold text-[var(--text-main)]">
                        Public Page Link
                      </span>
                      <input
                        type="radio"
                        checked={fbType === "page_link"}
                        onChange={() => setFbType("page_link")}
                      />
                    </div>
                    <p className="font-serif text-xs text-[var(--text-muted)]">
                      Connects users to SpeakUp&apos;s verified public Facebook institutional presence.
                    </p>
                  </div>

                  <div
                    onClick={() => setFbType("graph_api")}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      fbType === "graph_api"
                        ? "border-[#d4af37] bg-[#d4af37]/5"
                        : "border-[var(--surface-border)]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-display text-sm font-bold text-[var(--text-main)]">
                        Meta Graph API Token
                      </span>
                      <input
                        type="radio"
                        checked={fbType === "graph_api"}
                        onChange={() => setFbType("graph_api")}
                      />
                    </div>
                    <p className="font-serif text-xs text-[var(--text-muted)]">
                      Authenticated Graph API token for real-time Meta Messenger responses and inquiries.
                    </p>
                  </div>
                </div>

                {fbType === "page_link" ? (
                  <div className="space-y-1 pt-4 border-t border-[var(--surface-border)]">
                    <label className="block font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                      Public Facebook Page URL
                    </label>
                    <input
                      type="url"
                      value={fbPageUrl}
                      onChange={(e) => setFbPageUrl(e.target.value)}
                      placeholder="https://facebook.com/speakup.institute"
                      className="w-full px-4 py-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-xs font-serif"
                    />
                  </div>
                ) : (
                  <div className="space-y-4 pt-4 border-t border-[var(--surface-border)]">
                    <div className="space-y-1">
                      <label className="block font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                        Facebook Page ID
                      </label>
                      <input
                        type="text"
                        value={fbPageId}
                        onChange={(e) => setFbPageId(e.target.value)}
                        placeholder="e.g. 109283746501928"
                        className="w-full px-4 py-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                        Page Access Token (Graph API)
                      </label>
                      <input
                        type="text"
                        value={fbToken}
                        onChange={(e) => setFbToken(e.target.value)}
                        placeholder="EAA..."
                        className="w-full px-4 py-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-xs font-mono"
                      />
                    </div>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] disabled:opacity-40 text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs cursor-pointer flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[17px]">save</span>
                    <span>{saving ? "Saving..." : "Save Facebook Settings"}</span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}
