"use server";

import fs from "fs";
import path from "path";
import { verifyAdminCaller } from "@/lib/auth/adminVerification";

const INTEGRATIONS_FILE = path.join(process.cwd(), "src", "config", "integrations-config.json");

export interface MaskedAiProviderConfig {
  apiKeyMasked: string;
  hasKey: boolean;
  model: string;
  temperature: number;
  maxTokens: number;
  lastTestedAt: string | null;
  lastTestStatus: "success" | "failed" | null;
  lastTestMessage?: string | null;
}

export interface MaskedIntegrationsConfig {
  ai: {
    enabled: boolean;
    activeProvider: "openai" | "gemini";
    systemPrompt: string;
    openai: MaskedAiProviderConfig;
    gemini: MaskedAiProviderConfig;
  };
  whatsapp: {
    enabled: boolean;
    integrationType: "click_to_chat" | "business_api";
    clickToChatNumber: string;
    clickToChatMessage: string;
    businessApi: {
      phoneNumberId: string;
      accessTokenMasked: string;
      hasToken: boolean;
      wabaId: string;
      webhookVerifyTokenMasked: string;
      lastTestedAt: string | null;
      lastTestStatus: "success" | "failed" | null;
    };
  };
  facebook: {
    enabled: boolean;
    integrationType: "page_link" | "graph_api";
    pageUrl: string;
    graphApi: {
      pageId: string;
      pageAccessTokenMasked: string;
      hasToken: boolean;
      lastTestedAt: string | null;
      lastTestStatus: "success" | "failed" | null;
    };
  };
  updatedAt: string;
}

export interface ActionResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

function maskSecret(val?: string | null): string {
  if (!val || typeof val !== "string") return "";
  const trimmed = val.trim();
  if (trimmed.length <= 8) return "••••••••";
  return `${trimmed.slice(0, 4)}••••••••${trimmed.slice(-4)}`;
}

function readIntegrationsFile(): any {
  try {
    if (!fs.existsSync(INTEGRATIONS_FILE)) {
      return null;
    }
    const raw = fs.readFileSync(INTEGRATIONS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading integrations-config.json:", err);
    return null;
  }
}

function writeIntegrationsFile(data: any): void {
  const dir = path.dirname(INTEGRATIONS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(INTEGRATIONS_FILE, JSON.stringify(data, null, 2), "utf-8");
}

/**
 * Get Integrations Configuration for Admin View (Masked Secrets Only)
 */
export async function getIntegrationsConfigAction(): Promise<ActionResponse<MaskedIntegrationsConfig>> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  const raw = readIntegrationsFile();
  if (!raw) {
    return { success: false, error: "Integration configuration file not found." };
  }

  const masked: MaskedIntegrationsConfig = {
    ai: {
      enabled: Boolean(raw.ai?.enabled),
      activeProvider: raw.ai?.activeProvider || "openai",
      systemPrompt: raw.ai?.systemPrompt || "",
      openai: {
        apiKeyMasked: maskSecret(raw.ai?.openai?.apiKey),
        hasKey: Boolean(raw.ai?.openai?.apiKey && raw.ai.openai.apiKey.trim().length > 0),
        model: raw.ai?.openai?.model || "gpt-4o-mini",
        temperature: raw.ai?.openai?.temperature ?? 0.7,
        maxTokens: raw.ai?.openai?.maxTokens ?? 800,
        lastTestedAt: raw.ai?.openai?.lastTestedAt || null,
        lastTestStatus: raw.ai?.openai?.lastTestStatus || null,
        lastTestMessage: raw.ai?.openai?.lastTestMessage || null,
      },
      gemini: {
        apiKeyMasked: maskSecret(raw.ai?.gemini?.apiKey),
        hasKey: Boolean(raw.ai?.gemini?.apiKey && raw.ai.gemini.apiKey.trim().length > 0),
        model: raw.ai?.gemini?.model || "gemini-1.5-flash",
        temperature: raw.ai?.gemini?.temperature ?? 0.7,
        maxTokens: raw.ai?.gemini?.maxTokens ?? 800,
        lastTestedAt: raw.ai?.gemini?.lastTestedAt || null,
        lastTestStatus: raw.ai?.gemini?.lastTestStatus || null,
        lastTestMessage: raw.ai?.gemini?.lastTestMessage || null,
      },
    },
    whatsapp: {
      enabled: Boolean(raw.whatsapp?.enabled),
      integrationType: raw.whatsapp?.integrationType || "click_to_chat",
      clickToChatNumber: raw.whatsapp?.clickToChatNumber || "",
      clickToChatMessage: raw.whatsapp?.clickToChatMessage || "",
      businessApi: {
        phoneNumberId: raw.whatsapp?.businessApi?.phoneNumberId || "",
        accessTokenMasked: maskSecret(raw.whatsapp?.businessApi?.accessToken),
        hasToken: Boolean(raw.whatsapp?.businessApi?.accessToken),
        wabaId: raw.whatsapp?.businessApi?.wabaId || "",
        webhookVerifyTokenMasked: maskSecret(raw.whatsapp?.businessApi?.webhookVerifyToken),
        lastTestedAt: raw.whatsapp?.businessApi?.lastTestedAt || null,
        lastTestStatus: raw.whatsapp?.businessApi?.lastTestStatus || null,
      },
    },
    facebook: {
      enabled: Boolean(raw.facebook?.enabled),
      integrationType: raw.facebook?.integrationType || "page_link",
      pageUrl: raw.facebook?.pageUrl || "",
      graphApi: {
        pageId: raw.facebook?.graphApi?.pageId || "",
        pageAccessTokenMasked: maskSecret(raw.facebook?.graphApi?.pageAccessToken),
        hasToken: Boolean(raw.facebook?.graphApi?.pageAccessToken),
        lastTestedAt: raw.facebook?.graphApi?.lastTestedAt || null,
        lastTestStatus: raw.facebook?.graphApi?.lastTestStatus || null,
      },
    },
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };

  return { success: true, data: masked };
}

/**
 * Save AI Provider Configuration
 */
export async function saveAiIntegrationAction(input: {
  enabled: boolean;
  activeProvider: "openai" | "gemini";
  systemPrompt: string;
  openaiKey?: string;
  openaiModel?: string;
  geminiKey?: string;
  geminiModel?: string;
}): Promise<ActionResponse> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  const raw = readIntegrationsFile() || { ai: {} };

  raw.ai = raw.ai || {};
  raw.ai.enabled = Boolean(input.enabled);
  raw.ai.activeProvider = input.activeProvider;
  raw.ai.systemPrompt = input.systemPrompt?.trim() || "";

  // Update OpenAI
  raw.ai.openai = raw.ai.openai || {};
  if (input.openaiModel) {
    // Validate model choices
    const validOpenAiModels = ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"];
    if (validOpenAiModels.includes(input.openaiModel)) {
      raw.ai.openai.model = input.openaiModel;
    }
  }
  if (input.openaiKey && !input.openaiKey.includes("••••")) {
    raw.ai.openai.apiKey = input.openaiKey.trim();
  }

  // Update Gemini
  raw.ai.gemini = raw.ai.gemini || {};
  if (input.geminiModel) {
    const validGeminiModels = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-1.0-pro"];
    if (validGeminiModels.includes(input.geminiModel)) {
      raw.ai.gemini.model = input.geminiModel;
    }
  }
  if (input.geminiKey && !input.geminiKey.includes("••••")) {
    raw.ai.gemini.apiKey = input.geminiKey.trim();
  }

  raw.updatedAt = new Date().toISOString();
  writeIntegrationsFile(raw);

  return { success: true, message: "AI provider configuration successfully saved." };
}

/**
 * Test AI Provider Connection End-to-End
 */
export async function testAiConnectionAction(
  provider: "openai" | "gemini"
): Promise<ActionResponse<{ status: "success" | "failed"; message: string }>> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  const raw = readIntegrationsFile();
  if (!raw) return { success: false, error: "Integrations configuration file missing." };

  const now = new Date().toISOString();

  if (provider === "openai") {
    const key = raw.ai?.openai?.apiKey || process.env.OPENAI_API_KEY;
    if (!key || !key.trim()) {
      return {
        success: false,
        error: "No OpenAI API key configured. Please enter a valid API key first.",
      };
    }

    try {
      const resp = await fetch("https://api.openai.com/v1/models", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${key.trim()}`,
        },
      });

      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        const errMsg = errJson?.error?.message || `HTTP ${resp.status}: Unauthorized or Invalid API Key`;
        raw.ai.openai.lastTestedAt = now;
        raw.ai.openai.lastTestStatus = "failed";
        raw.ai.openai.lastTestMessage = errMsg;
        writeIntegrationsFile(raw);
        return { success: false, error: `OpenAI Connection Failed: ${errMsg}` };
      }

      raw.ai.openai.lastTestedAt = now;
      raw.ai.openai.lastTestStatus = "success";
      raw.ai.openai.lastTestMessage = "Connection verified successfully.";
      writeIntegrationsFile(raw);

      return {
        success: true,
        data: {
          status: "success",
          message: "OpenAI connection successfully verified. Models accessible.",
        },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error contacting OpenAI API.";
      raw.ai.openai.lastTestedAt = now;
      raw.ai.openai.lastTestStatus = "failed";
      raw.ai.openai.lastTestMessage = msg;
      writeIntegrationsFile(raw);
      return { success: false, error: `Connection failed: ${msg}` };
    }
  } else if (provider === "gemini") {
    const key = raw.ai?.gemini?.apiKey || process.env.GEMINI_API_KEY;
    if (!key || !key.trim()) {
      return {
        success: false,
        error: "No Google Gemini API key configured. Please enter a valid API key first.",
      };
    }

    try {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${key.trim()}`,
        { method: "GET" }
      );

      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        const errMsg = errJson?.error?.message || `HTTP ${resp.status}: Invalid Gemini API Key`;
        raw.ai.gemini.lastTestedAt = now;
        raw.ai.gemini.lastTestStatus = "failed";
        raw.ai.gemini.lastTestMessage = errMsg;
        writeIntegrationsFile(raw);
        return { success: false, error: `Google Gemini Connection Failed: ${errMsg}` };
      }

      raw.ai.gemini.lastTestedAt = now;
      raw.ai.gemini.lastTestStatus = "success";
      raw.ai.gemini.lastTestMessage = "Connection verified successfully.";
      writeIntegrationsFile(raw);

      return {
        success: true,
        data: {
          status: "success",
          message: "Google Gemini connection successfully verified. Models accessible.",
        },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error contacting Gemini API.";
      raw.ai.gemini.lastTestedAt = now;
      raw.ai.gemini.lastTestStatus = "failed";
      raw.ai.gemini.lastTestMessage = msg;
      writeIntegrationsFile(raw);
      return { success: false, error: `Connection failed: ${msg}` };
    }
  }

  return { success: false, error: "Unsupported provider requested." };
}

/**
 * Save WhatsApp Configuration
 */
export async function saveWhatsAppConfigAction(input: {
  enabled: boolean;
  integrationType: "click_to_chat" | "business_api";
  clickToChatNumber?: string;
  clickToChatMessage?: string;
  phoneNumberId?: string;
  accessToken?: string;
  wabaId?: string;
}): Promise<ActionResponse> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  const raw = readIntegrationsFile() || { whatsapp: {} };
  raw.whatsapp = raw.whatsapp || {};
  raw.whatsapp.enabled = Boolean(input.enabled);
  raw.whatsapp.integrationType = input.integrationType;

  if (input.clickToChatNumber !== undefined) {
    raw.whatsapp.clickToChatNumber = input.clickToChatNumber.trim();
  }
  if (input.clickToChatMessage !== undefined) {
    raw.whatsapp.clickToChatMessage = input.clickToChatMessage.trim();
  }

  raw.whatsapp.businessApi = raw.whatsapp.businessApi || {};
  if (input.phoneNumberId !== undefined) {
    raw.whatsapp.businessApi.phoneNumberId = input.phoneNumberId.trim();
  }
  if (input.wabaId !== undefined) {
    raw.whatsapp.businessApi.wabaId = input.wabaId.trim();
  }
  if (input.accessToken && !input.accessToken.includes("••••")) {
    raw.whatsapp.businessApi.accessToken = input.accessToken.trim();
  }

  raw.updatedAt = new Date().toISOString();
  writeIntegrationsFile(raw);

  return { success: true, message: "WhatsApp configuration saved successfully." };
}

/**
 * Save Facebook / Meta Configuration
 */
export async function saveFacebookConfigAction(input: {
  enabled: boolean;
  integrationType: "page_link" | "graph_api";
  pageUrl?: string;
  pageId?: string;
  pageAccessToken?: string;
}): Promise<ActionResponse> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  const raw = readIntegrationsFile() || { facebook: {} };
  raw.facebook = raw.facebook || {};
  raw.facebook.enabled = Boolean(input.enabled);
  raw.facebook.integrationType = input.integrationType;

  if (input.pageUrl !== undefined) {
    raw.facebook.pageUrl = input.pageUrl.trim();
  }

  raw.facebook.graphApi = raw.facebook.graphApi || {};
  if (input.pageId !== undefined) {
    raw.facebook.graphApi.pageId = input.pageId.trim();
  }
  if (input.pageAccessToken && !input.pageAccessToken.includes("••••")) {
    raw.facebook.graphApi.pageAccessToken = input.pageAccessToken.trim();
  }

  raw.updatedAt = new Date().toISOString();
  writeIntegrationsFile(raw);

  return { success: true, message: "Facebook/Meta configuration saved successfully." };
}
