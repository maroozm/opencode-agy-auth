import { mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { TuiPlugin, TuiPluginApi } from "@opencode-ai/plugin/tui";
import type { PluginOptions } from "@opencode-ai/plugin";

/**
 * UI Look plugin for OpenCode.
 *
 * Installs custom OpenCode themes that make the terminal UI look like
 * Claude Code ("claude-look") or Grok ("grok-look"). Themes are written
 * to the global themes directory, where OpenCode discovers them and
 * makes them selectable from the theme picker (Ctrl+P → Theme).
 *
 * Notes on the runtime API (OpenCode v2.x):
 * - `context.ui.toast` is an object with a `show()` method in current
 *   releases (a bare callable in newer plans), so both shapes are handled.
 * - The plugin context does not expose a theme-switching service, so the
 *   themes are installed by writing them next to the user's other themes.
 */

export const THEME_SCHEMA = "https://opencode.ai/theme.json";

export type ThemeColor = string;

export interface ThemeDocument {
  $schema: string;
  defs: Record<string, ThemeColor>;
  theme: Record<string, { dark: ThemeColor; light: ThemeColor }>;
}

interface ThemeStyle {
  id: string;
  label: string;
  themeName: string;
  fileName: string;
  document: ThemeDocument;
}

type ToastMessage = {
  title?: string;
  message: string;
  variant?: "info" | "success" | "warning" | "error";
  duration?: number;
};

const CLAUDE_LOOK_THEME: ThemeDocument = {
  $schema: THEME_SCHEMA,
  defs: {
    dark_bg: "#262624",
    dark_bg_panel: "#30302e",
    dark_bg_element: "#3a3a38",
    dark_bg_menu: "#3a3a38",
    dark_border: "#45453f",
    dark_text: "#e8e6e3",
    dark_text_muted: "#9b9a97",
    dark_accent: "#d97757",
    dark_secondary: "#8d8c88",
    dark_error: "#d64545",
    dark_warning: "#d4a017",
    dark_success: "#5b8c5a",
    dark_info: "#d97757",
    dark_selected_list_item_text: "#ffffff",
    dark_diff_added: "#5b8c5a",
    dark_diff_removed: "#d64545",
    dark_diff_context: "#8a887f",
    dark_diff_hunk_header: "#9b9a97",
    dark_diff_added_bg: "#2e2e2c",
    dark_diff_removed_bg: "#2e2e2c",
    dark_diff_context_bg: "#2e2e2c",
    dark_diff_line_number: "#6b6a66",
    dark_diff_added_line_number_bg: "#2e2e2c",
    dark_diff_removed_line_number_bg: "#2e2e2c",
    dark_markdown_text: "#e8e6e3",
    dark_markdown_heading: "#d97757",
    dark_markdown_link: "#7aa2f7",
    dark_markdown_link_text: "#d97757",
    dark_markdown_code: "#8fbc8f",
    dark_markdown_block_quote: "#9b9a97",
    dark_markdown_emph: "#d97757",
    dark_markdown_strong: "#e8a25e",
    dark_markdown_horizontal_rule: "#45453f",
    dark_markdown_list_item: "#d97757",
    dark_markdown_list_enumeration: "#d97757",
    dark_markdown_image: "#7aa2f7",
    dark_markdown_image_text: "#d97757",
    dark_markdown_code_block: "#e8e6e3",
    dark_syntax_comment: "#9b9a97",
    dark_syntax_keyword: "#c58af9",
    dark_syntax_function: "#d97757",
    dark_syntax_variable: "#e8e6e3",
    dark_syntax_string: "#8fbc8f",
    dark_syntax_number: "#e8a25e",
    dark_syntax_type: "#7aa2f7",
    dark_syntax_operator: "#7aa2f7",
    dark_syntax_punctuation: "#e8e6e3",
    light_bg: "#ffffff",
    light_bg_panel: "#f5f5f4",
    light_bg_element: "#eaeae8",
    light_bg_menu: "#eaeae8",
    light_border: "#e0e0dd",
    light_text: "#1f1f1f",
    light_text_muted: "#6b6a66",
    light_accent: "#c96442",
    light_secondary: "#8d8c88",
    light_error: "#d64545",
    light_warning: "#b8860b",
    light_success: "#4c7a4e",
    light_info: "#c96442",
    light_selected_list_item_text: "#1f1f1f",
    light_diff_added: "#4c7a4e",
    light_diff_removed: "#d64545",
    light_diff_context: "#8a887f",
    light_diff_hunk_header: "#6b6a66",
    light_diff_added_bg: "#f5f5f4",
    light_diff_removed_bg: "#f5f5f4",
    light_diff_context_bg: "#f5f5f4",
    light_diff_line_number: "#a0a09a",
    light_diff_added_line_number_bg: "#f5f5f4",
    light_diff_removed_line_number_bg: "#f5f5f4",
    light_markdown_text: "#1f1f1f",
    light_markdown_heading: "#c96442",
    light_markdown_link: "#4f6ef7",
    light_markdown_link_text: "#c96442",
    light_markdown_code: "#3f7d44",
    light_markdown_block_quote: "#6b6a66",
    light_markdown_emph: "#c96442",
    light_markdown_strong: "#b85c2e",
    light_markdown_horizontal_rule: "#e0e0dd",
    light_markdown_list_item: "#c96442",
    light_markdown_list_enumeration: "#c96442",
    light_markdown_image: "#4f6ef7",
    light_markdown_image_text: "#c96442",
    light_markdown_code_block: "#1f1f1f",
    light_syntax_comment: "#6b6a66",
    light_syntax_keyword: "#9a4edd",
    light_syntax_function: "#c96442",
    light_syntax_variable: "#1f1f1f",
    light_syntax_string: "#3f7d44",
    light_syntax_number: "#b85c2e",
    light_syntax_type: "#4f6ef7",
    light_syntax_operator: "#4f6ef7",
    light_syntax_punctuation: "#1f1f1f",
  },
  theme: {
    primary: { dark: "dark_accent", light: "light_accent" },
    secondary: { dark: "dark_secondary", light: "light_secondary" },
    accent: { dark: "dark_accent", light: "light_accent" },
    error: { dark: "dark_error", light: "light_error" },
    warning: { dark: "dark_warning", light: "light_warning" },
    success: { dark: "dark_success", light: "light_success" },
    info: { dark: "dark_info", light: "light_info" },
    text: { dark: "dark_text", light: "light_text" },
    textMuted: { dark: "dark_text_muted", light: "light_text_muted" },
    background: { dark: "dark_bg", light: "light_bg" },
    backgroundPanel: { dark: "dark_bg_panel", light: "light_bg_panel" },
    backgroundElement: { dark: "dark_bg_element", light: "light_bg_element" },
    backgroundMenu: { dark: "dark_bg_menu", light: "light_bg_menu" },
    border: { dark: "dark_border", light: "light_border" },
    borderActive: { dark: "dark_accent", light: "light_accent" },
    borderSubtle: { dark: "dark_border", light: "light_border" },
    diffAdded: { dark: "dark_diff_added", light: "light_diff_added" },
    diffRemoved: { dark: "dark_diff_removed", light: "light_diff_removed" },
    diffContext: { dark: "dark_diff_context", light: "light_diff_context" },
    diffHunkHeader: { dark: "dark_diff_hunk_header", light: "light_diff_hunk_header" },
    diffHighlightAdded: { dark: "dark_diff_added", light: "light_diff_added" },
    diffHighlightRemoved: { dark: "dark_diff_removed", light: "light_diff_removed" },
    diffAddedBg: { dark: "dark_diff_added_bg", light: "light_diff_added_bg" },
    diffRemovedBg: { dark: "dark_diff_removed_bg", light: "light_diff_removed_bg" },
    diffContextBg: { dark: "dark_diff_context_bg", light: "light_diff_context_bg" },
    diffLineNumber: { dark: "dark_diff_line_number", light: "light_diff_line_number" },
    diffAddedLineNumberBg: { dark: "dark_diff_added_line_number_bg", light: "light_diff_added_line_number_bg" },
    diffRemovedLineNumberBg: { dark: "dark_diff_removed_line_number_bg", light: "light_diff_removed_line_number_bg" },
    markdownText: { dark: "dark_markdown_text", light: "light_markdown_text" },
    markdownHeading: { dark: "dark_markdown_heading", light: "light_markdown_heading" },
    markdownLink: { dark: "dark_markdown_link", light: "light_markdown_link" },
    markdownLinkText: { dark: "dark_markdown_link_text", light: "light_markdown_link_text" },
    markdownCode: { dark: "dark_markdown_code", light: "light_markdown_code" },
    markdownBlockQuote: { dark: "dark_markdown_block_quote", light: "light_markdown_block_quote" },
    markdownEmph: { dark: "dark_markdown_emph", light: "light_markdown_emph" },
    markdownStrong: { dark: "dark_markdown_strong", light: "light_markdown_strong" },
    markdownHorizontalRule: { dark: "dark_markdown_horizontal_rule", light: "light_markdown_horizontal_rule" },
    markdownListItem: { dark: "dark_markdown_list_item", light: "light_markdown_list_item" },
    markdownListEnumeration: { dark: "dark_markdown_list_enumeration", light: "light_markdown_list_enumeration" },
    markdownImage: { dark: "dark_markdown_image", light: "light_markdown_image" },
    markdownImageText: { dark: "dark_markdown_image_text", light: "light_markdown_image_text" },
    markdownCodeBlock: { dark: "dark_markdown_code_block", light: "light_markdown_code_block" },
    syntaxComment: { dark: "dark_syntax_comment", light: "light_syntax_comment" },
    syntaxKeyword: { dark: "dark_syntax_keyword", light: "light_syntax_keyword" },
    syntaxFunction: { dark: "dark_syntax_function", light: "light_syntax_function" },
    syntaxVariable: { dark: "dark_syntax_variable", light: "light_syntax_variable" },
    syntaxString: { dark: "dark_syntax_string", light: "light_syntax_string" },
    syntaxNumber: { dark: "dark_syntax_number", light: "light_syntax_number" },
    syntaxType: { dark: "dark_syntax_type", light: "light_syntax_type" },
    syntaxOperator: { dark: "dark_syntax_operator", light: "light_syntax_operator" },
    syntaxPunctuation: { dark: "dark_syntax_punctuation", light: "light_syntax_punctuation" },
  },
};

const GROK_LOOK_THEME: ThemeDocument = {
  $schema: THEME_SCHEMA,
  defs: {
    dark_bg: "#0a0a0f",
    dark_bg_panel: "#12121a",
    dark_bg_element: "#1a1a26",
    dark_bg_menu: "#1a1a26",
    dark_border: "#2a2a3a",
    dark_text: "#e8e8f0",
    dark_text_muted: "#8b8ba3",
    dark_accent: "#7c6cff",
    dark_secondary: "#9a9ab0",
    dark_error: "#e5484d",
    dark_warning: "#e8a13a",
    dark_success: "#46a758",
    dark_info: "#7c6cff",
    dark_selected_list_item_text: "#ffffff",
    dark_diff_added: "#46a758",
    dark_diff_removed: "#e5484d",
    dark_diff_context: "#8a8aa3",
    dark_diff_hunk_header: "#8b8ba3",
    dark_diff_added_bg: "#12161f",
    dark_diff_removed_bg: "#12161f",
    dark_diff_context_bg: "#12121a",
    dark_diff_line_number: "#5a5a70",
    dark_diff_added_line_number_bg: "#12161f",
    dark_diff_removed_line_number_bg: "#12161f",
    dark_markdown_text: "#e8e8f0",
    dark_markdown_heading: "#7c6cff",
    dark_markdown_link: "#7c6cff",
    dark_markdown_link_text: "#7c6cff",
    dark_markdown_code: "#46a758",
    dark_markdown_block_quote: "#8b8ba3",
    dark_markdown_emph: "#7c6cff",
    dark_markdown_strong: "#a294ff",
    dark_markdown_horizontal_rule: "#2a2a3a",
    dark_markdown_list_item: "#7c6cff",
    dark_markdown_list_enumeration: "#7c6cff",
    dark_markdown_image: "#7c6cff",
    dark_markdown_image_text: "#7c6cff",
    dark_markdown_code_block: "#e8e8f0",
    dark_syntax_comment: "#8b8ba3",
    dark_syntax_keyword: "#c58af9",
    dark_syntax_function: "#7c6cff",
    dark_syntax_variable: "#e8e8f0",
    dark_syntax_string: "#46a758",
    dark_syntax_number: "#a294ff",
    dark_syntax_type: "#7c6cff",
    dark_syntax_operator: "#7c6cff",
    dark_syntax_punctuation: "#e8e8f0",
    light_bg: "#ffffff",
    light_bg_panel: "#f6f6f8",
    light_bg_element: "#efeff4",
    light_bg_menu: "#efeff4",
    light_border: "#e2e2ea",
    light_text: "#0a0a0f",
    light_text_muted: "#5a5a70",
    light_accent: "#6d5ef2",
    light_secondary: "#7a7a92",
    light_error: "#e5484d",
    light_warning: "#e8a13a",
    light_success: "#2f8f55",
    light_info: "#6d5ef2",
    light_selected_list_item_text: "#0a0a0f",
    light_diff_added: "#2f8f55",
    light_diff_removed: "#e5484d",
    light_diff_context: "#8a8aa3",
    light_diff_hunk_header: "#5a5a70",
    light_diff_added_bg: "#f6f6f8",
    light_diff_removed_bg: "#f6f6f8",
    light_diff_context_bg: "#f6f6f8",
    light_diff_line_number: "#a0a0b8",
    light_diff_added_line_number_bg: "#f6f6f8",
    light_diff_removed_line_number_bg: "#f6f6f8",
    light_markdown_text: "#0a0a0f",
    light_markdown_heading: "#6d5ef2",
    light_markdown_link: "#6d5ef2",
    light_markdown_link_text: "#6d5ef2",
    light_markdown_code: "#2f8f55",
    light_markdown_block_quote: "#5a5a70",
    light_markdown_emph: "#6d5ef2",
    light_markdown_strong: "#5847e0",
    light_markdown_horizontal_rule: "#e2e2ea",
    light_markdown_list_item: "#6d5ef2",
    light_markdown_list_enumeration: "#6d5ef2",
    light_markdown_image: "#6d5ef2",
    light_markdown_image_text: "#6d5ef2",
    light_markdown_code_block: "#0a0a0f",
    light_syntax_comment: "#5a5a70",
    light_syntax_keyword: "#9a4edd",
    light_syntax_function: "#6d5ef2",
    light_syntax_variable: "#0a0a0f",
    light_syntax_string: "#2f8f55",
    light_syntax_number: "#5847e0",
    light_syntax_type: "#6d5ef2",
    light_syntax_operator: "#6d5ef2",
    light_syntax_punctuation: "#0a0a0f",
  },
  theme: {
    primary: { dark: "dark_accent", light: "light_accent" },
    secondary: { dark: "dark_secondary", light: "light_secondary" },
    accent: { dark: "dark_accent", light: "light_accent" },
    error: { dark: "dark_error", light: "light_error" },
    warning: { dark: "dark_warning", light: "light_warning" },
    success: { dark: "dark_success", light: "light_success" },
    info: { dark: "dark_info", light: "light_info" },
    text: { dark: "dark_text", light: "light_text" },
    textMuted: { dark: "dark_text_muted", light: "light_text_muted" },
    background: { dark: "dark_bg", light: "light_bg" },
    backgroundPanel: { dark: "dark_bg_panel", light: "light_bg_panel" },
    backgroundElement: { dark: "dark_bg_element", light: "light_bg_element" },
    backgroundMenu: { dark: "dark_bg_menu", light: "light_bg_menu" },
    border: { dark: "dark_border", light: "light_border" },
    borderActive: { dark: "dark_accent", light: "light_accent" },
    borderSubtle: { dark: "dark_border", light: "light_border" },
    diffAdded: { dark: "dark_diff_added", light: "light_diff_added" },
    diffRemoved: { dark: "dark_diff_removed", light: "light_diff_removed" },
    diffContext: { dark: "dark_diff_context", light: "light_diff_context" },
    diffHunkHeader: { dark: "dark_diff_hunk_header", light: "light_diff_hunk_header" },
    diffHighlightAdded: { dark: "dark_diff_added", light: "light_diff_added" },
    diffHighlightRemoved: { dark: "dark_diff_removed", light: "light_diff_removed" },
    diffAddedBg: { dark: "dark_diff_added_bg", light: "light_diff_added_bg" },
    diffRemovedBg: { dark: "dark_diff_removed_bg", light: "light_diff_removed_bg" },
    diffContextBg: { dark: "dark_diff_context_bg", light: "light_diff_context_bg" },
    diffLineNumber: { dark: "dark_diff_line_number", light: "light_diff_line_number" },
    diffAddedLineNumberBg: { dark: "dark_diff_added_line_number_bg", light: "light_diff_added_line_number_bg" },
    diffRemovedLineNumberBg: { dark: "dark_diff_removed_line_number_bg", light: "light_diff_removed_line_number_bg" },
    markdownText: { dark: "dark_markdown_text", light: "light_markdown_text" },
    markdownHeading: { dark: "dark_markdown_heading", light: "light_markdown_heading" },
    markdownLink: { dark: "dark_markdown_link", light: "light_markdown_link" },
    markdownLinkText: { dark: "dark_markdown_link_text", light: "light_markdown_link_text" },
    markdownCode: { dark: "dark_markdown_code", light: "light_markdown_code" },
    markdownBlockQuote: { dark: "dark_markdown_block_quote", light: "light_markdown_block_quote" },
    markdownEmph: { dark: "dark_markdown_emph", light: "light_markdown_emph" },
    markdownStrong: { dark: "dark_markdown_strong", light: "light_markdown_strong" },
    markdownHorizontalRule: { dark: "dark_markdown_horizontal_rule", light: "light_markdown_horizontal_rule" },
    markdownListItem: { dark: "dark_markdown_list_item", light: "light_markdown_list_item" },
    markdownListEnumeration: { dark: "dark_markdown_list_enumeration", light: "light_markdown_list_enumeration" },
    markdownImage: { dark: "dark_markdown_image", light: "light_markdown_image" },
    markdownImageText: { dark: "dark_markdown_image_text", light: "light_markdown_image_text" },
    markdownCodeBlock: { dark: "dark_markdown_code_block", light: "light_markdown_code_block" },
    syntaxComment: { dark: "dark_syntax_comment", light: "light_syntax_comment" },
    syntaxKeyword: { dark: "dark_syntax_keyword", light: "light_syntax_keyword" },
    syntaxFunction: { dark: "dark_syntax_function", light: "light_syntax_function" },
    syntaxVariable: { dark: "dark_syntax_variable", light: "light_syntax_variable" },
    syntaxString: { dark: "dark_syntax_string", light: "light_syntax_string" },
    syntaxNumber: { dark: "dark_syntax_number", light: "light_syntax_number" },
    syntaxType: { dark: "dark_syntax_type", light: "light_syntax_type" },
    syntaxOperator: { dark: "dark_syntax_operator", light: "light_syntax_operator" },
    syntaxPunctuation: { dark: "dark_syntax_punctuation", light: "light_syntax_punctuation" },
  },
};

const STYLES: Record<string, ThemeStyle> = {
  claude: {
    id: "claude",
    label: "Claude Code",
    themeName: "claude-look",
    fileName: "claude-look.json",
    document: CLAUDE_LOOK_THEME,
  },
  grok: {
    id: "grok",
    label: "Grok",
    themeName: "grok-look",
    fileName: "grok-look.json",
    document: GROK_LOOK_THEME,
  },
};

export const TUI_PLUGIN_ID = "ui-look";

interface RuntimePaths {
  readonly path?: { readonly state: string; readonly config: string; readonly worktree: string; readonly directory: string };
}

/** OpenCode's toast API is an object with `show()` today; some builds expose a bare callable. */
function toastFor(api: TuiPluginApi): ((message: ToastMessage) => void) | undefined {
  const value = (api as unknown as { ui?: { toast?: unknown } }).ui?.toast;
  if (typeof value === "function") return (message) => value(message);
  const show = value && typeof value === "object" ? (value as { show?: unknown }).show : undefined;
  if (typeof show === "function") return (message) => show(message);
  return undefined;
}

/** Best-effort immediate switch when a theme service (install/set) is exposed by a newer runtime. */
async function applyWithThemeService(api: TuiPluginApi, style: ThemeStyle): Promise<boolean> {
  const runtime = api as unknown as Record<string, unknown>;
  const service = (runtime.themes ?? runtime.theme) as { install?: unknown; set?: unknown; has?: unknown } | undefined;
  if (!service || typeof service !== "object") return false;
  if (typeof service.install === "function" && typeof service.set === "function") {
    for (const candidate of Object.values(STYLES)) {
      const jsonPath = path.join(os.tmpdir(), `opencode-ui-look-${candidate.id}.json`);
      writeFileSync(jsonPath, JSON.stringify(candidate.document));
      await service.install(jsonPath);
    }
    return Boolean(service.set(style.themeName));
  }
  if (typeof service.has === "function" && typeof service.set === "function") {
    return Boolean(service.has(style.themeName) && service.set(style.themeName));
  }
  return false;
}

/** Themes are discovered from `<config>/themes/*.json`; `state.path.config` may be a file or a directory. */
function themesDirectory(api: TuiPluginApi): string {
  const runtime = api as unknown as RuntimePaths;
  const hinted = runtime.path?.config;
  if (hinted) {
    const looksLikeFile = path.basename(hinted).includes(".");
    return path.join(looksLikeFile ? path.dirname(hinted) : hinted, "themes");
  }
  return path.join(os.homedir(), ".config", "opencode", "themes");
}

export const setupUiLookTui: TuiPlugin = async (api: TuiPluginApi, options: PluginOptions | undefined, meta) => {
  const styleKey = options?.style === "grok" ? "grok" : "claude";
  const style: ThemeStyle | undefined = STYLES[styleKey];
  if (!style) return;

  const toast = toastFor(api);

  // Fast path: a runtime that exposes the theme service switches instantly.
  let activated = false;
  try {
    activated = await applyWithThemeService(api, style);
  } catch {
    activated = false;
  }

  const installed: string[] = [];
  const failures: string[] = [];

  // Always install the theme files so both looks stay selectable from Ctrl+P → Theme.
  try {
    const directory = themesDirectory(api);
    mkdirSync(directory, { recursive: true });
    for (const candidate of Object.values(STYLES)) {
      try {
        writeFileSync(path.join(directory, candidate.fileName), JSON.stringify(candidate.document));
        installed.push(candidate.themeName);
      } catch (error) {
        failures.push(`${candidate.themeName}: ${String(error)}`);
      }
    }
  } catch (error) {
    failures.push(`themes directory: ${String(error)}`);
  }

  const message = activated
    ? `UI theme set to ${style.label}. Switch looks anytime via Ctrl+P → Theme.`
    : installed.length > 0
      ? `Themes installed: ${[...new Set([...installed])].join(", ")}. Pick one via Ctrl+P → Theme (or restart to refresh the list).`
      : `Could not install themes. ${failures.join("; ")}`;

  toast?.({
    title: "UI Look",
    message,
    variant: failures.length && installed.length === 0 ? "error" : activated ? "success" : "info",
  });

  if (meta) {
    // TuiPluginMeta is informational only; nothing to do here.
  }
};

export default { id: TUI_PLUGIN_ID, setup: setupUiLookTui };
