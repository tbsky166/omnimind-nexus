// ═══════════════════════════════════════════════════════════════
// 浏览器自动化 — Playwright 集成（可选依赖）
// 让 Agent 可以浏览网页、截图、提取内容、交互操作
// Browser automation — Playwright integration (optional dependency)
// ═══════════════════════════════════════════════════════════════

// ── 浏览器页面接口（不直接依赖 Playwright 类型）/ Browser page interface (no direct Playwright type dependency) ──
interface BrowserPage {
  goto: (url: string) => Promise<unknown>;
  title: () => Promise<string>;
  screenshot: (opts: { type: string; fullPage: boolean }) => Promise<Buffer>;
  evaluate: (fn: unknown) => Promise<unknown>;
  click: (selector: string) => Promise<void>;
  fill: (selector: string, text: string) => Promise<void>;
  url: () => string;
}

// ── 浏览器状态 / Browser state ──
interface BrowserState {
  page: BrowserPage;
  url: string;
  title: string;
  initialized: boolean;
}

// 模块级浏览器状态 / Module-level browser state
let browserState: BrowserState | null = null;

// ── 延迟加载 Playwright（可选依赖）/ Lazy load Playwright (optional dependency) ──
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _playwrightModule: any = undefined;

async function getPlaywright() {
  if (_playwrightModule) return _playwrightModule.chromium;
  try {
    // 使用 eval 避免 webpack 构建时解析 / Use eval to avoid webpack build-time resolution
    _playwrightModule = eval("require('playwright')");
    return _playwrightModule.chromium;
  } catch {
    throw new Error(
      "Playwright 未安装。请运行: npm install playwright && npx playwright install chromium"
    );
  }
}

// ── 初始化浏览器 / Initialize browser ──
async function ensureBrowser(): Promise<BrowserState> {
  if (browserState?.initialized) return browserState;

  const chromium = await getPlaywright();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: "every-agents/1.0 BrowserTool",
  });
  const page = await context.newPage();

  browserState = {
    page,
    url: "about:blank",
    title: "",
    initialized: true,
  };

  return browserState;
}

// ── 导航到 URL / Navigate to URL ──
export async function browserNavigate(url: string): Promise<{
  success: boolean;
  url: string;
  title: string;
  message: string;
}> {
  try {
    const state = await ensureBrowser();
    await state.page.goto(url);
    state.url = url;
    state.title = await state.page.title();
    return {
      success: true,
      url: state.url,
      title: state.title,
      message: `已导航到 ${state.title || url}`,
    };
  } catch (e) {
    return {
      success: false,
      url,
      title: "",
      message: `导航失败：${e instanceof Error ? e.message : "未知错误"}`,
    };
  }
}

// ── 截图 / Screenshot ──
export async function browserScreenshot(): Promise<{
  success: boolean;
  base64?: string;
  message: string;
}> {
  try {
    const state = await ensureBrowser();
    const buffer = await state.page.screenshot({ type: "png", fullPage: false });
    const base64 = buffer.toString("base64");
    return {
      success: true,
      base64: `data:image/png;base64,${base64}`,
      message: `截图完成：${state.url}`,
    };
  } catch (e) {
    return {
      success: false,
      message: `截图失败：${e instanceof Error ? e.message : "未知错误"}`,
    };
  }
}

// ── 提取页面文本 / Extract page text ──
export async function browserExtractText(): Promise<{
  success: boolean;
  text: string;
  url: string;
  message: string;
}> {
  try {
    const state = await ensureBrowser();
    const text = await state.page.evaluate(() => {
      const clone = document.body.cloneNode(true) as HTMLElement;
      clone.querySelectorAll("script, style, noscript, iframe, svg").forEach((el) => el.remove());
      return clone.innerText.substring(0, 10000);
    }) as string;
    return {
      success: true,
      text,
      url: state.url,
      message: `提取了 ${text.length} 个字符的文本`,
    };
  } catch (e) {
    return {
      success: false,
      text: "",
      url: "",
      message: `提取文本失败：${e instanceof Error ? e.message : "未知错误"}`,
    };
  }
}

// ── 点击元素 / Click element ──
export async function browserClick(selector: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const state = await ensureBrowser();
    await state.page.click(selector);
    return {
      success: true,
      message: `已点击 ${selector}`,
    };
  } catch (e) {
    return {
      success: false,
      message: `点击失败：${e instanceof Error ? e.message : "未知错误"}`,
    };
  }
}

// ── 输入文本 / Type text ──
export async function browserType(
  selector: string,
  text: string
): Promise<{ success: boolean; message: string }> {
  try {
    const state = await ensureBrowser();
    await state.page.fill(selector, text);
    return {
      success: true,
      message: `已在 ${selector} 中输入文本`,
    };
  } catch (e) {
    return {
      success: false,
      message: `输入失败：${e instanceof Error ? e.message : "未知错误"}`,
    };
  }
}

// ── 获取当前 URL / Get current URL ──
export async function browserGetURL(): Promise<{
  success: boolean;
  url: string;
  title: string;
}> {
  try {
    const state = await ensureBrowser();
    return {
      success: true,
      url: state.url,
      title: state.title,
    };
  } catch {
    return { success: false, url: "", title: "" };
  }
}

// ── 执行 JavaScript / Execute JavaScript ──
export async function browserEvaluate(
  script: string
): Promise<{ success: boolean; result: unknown; message: string }> {
  try {
    const state = await ensureBrowser();
    const result = await state.page.evaluate(`(() => { ${script} })()`);
    return {
      success: true,
      result,
      message: `脚本执行完成`,
    };
  } catch (e) {
    return {
      success: false,
      result: null,
      message: `脚本执行失败：${e instanceof Error ? e.message : "未知错误"}`,
    };
  }
}

// ── 关闭浏览器 / Close browser ──
export async function browserClose(): Promise<void> {
  browserState = null;
}

// ── 浏览器工具执行器（统一入口）/ Browser tool executor (unified entry) ──
export async function executeBrowserTool(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case "browser_navigate": {
      const r = await browserNavigate((args.url as string) || "");
      return JSON.stringify(r);
    }
    case "browser_screenshot": {
      const r = await browserScreenshot();
      return JSON.stringify(r);
    }
    case "browser_extract_text": {
      const r = await browserExtractText();
      return JSON.stringify(r);
    }
    case "browser_click": {
      const r = await browserClick((args.selector as string) || "");
      return JSON.stringify(r);
    }
    case "browser_type": {
      const r = await browserType(
        (args.selector as string) || "",
        (args.text as string) || ""
      );
      return JSON.stringify(r);
    }
    case "browser_get_url": {
      const r = await browserGetURL();
      return JSON.stringify(r);
    }
    case "browser_evaluate": {
      const r = await browserEvaluate((args.script as string) || "");
      return JSON.stringify(r);
    }
    default:
      return JSON.stringify({ error: `Unknown browser tool: ${name}` });
  }
}