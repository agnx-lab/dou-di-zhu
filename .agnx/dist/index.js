var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// .agnx/src/index.ts
var index_exports = {};
__export(index_exports, {
  APP_ID: () => APP_ID,
  AppPanel: () => AppPanel,
  OPEN_COMMAND_ID: () => OPEN_COMMAND_ID,
  PANEL_ID: () => PANEL_ID,
  activate: () => activate,
  appId: () => appId,
  default: () => index_default
});
module.exports = __toCommonJS(index_exports);
var import_lucide_react_native = require("lucide-react-native");

// .agnx/src/constants.ts
var APP_ID = "phantom";
var PANEL_ID = "phantom.main";
var OPEN_COMMAND_ID = "phantom.open";
var ENSURE_TOOL_REL = ".agnx/tools/ensure-phantom.mjs";

// .agnx/src/panel.tsx
var import_react = require("react");
var import_react_native = require("react-native");
var import_react_native_unistyles = require("react-native-unistyles");

// .agnx/src/host-bind.ts
var boundHost = null;
function bindHost(host) {
  boundHost = host;
}
function requireBoundHost() {
  if (!boundHost) {
    throw new Error("\u5E7B\u5C40 Host \u5C1A\u672A\u7ED1\u5B9A");
  }
  return boundHost;
}

// .agnx/src/panel.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var WEB_ROOT_STYLE = {
  flex: "1 1 0%",
  alignSelf: "stretch",
  minHeight: 0,
  minWidth: 0,
  width: "100%",
  height: "100%",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  position: "relative",
  backgroundColor: "transparent"
};
var GUEST_HOST_STYLE = {
  flex: "1 1 auto",
  minHeight: 0,
  minWidth: 0,
  width: "100%",
  height: "100%",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  position: "relative"
};
var BOOT_LAYER_STYLE = {
  position: "absolute",
  inset: 0,
  zIndex: 2,
  display: "flex",
  flexDirection: "column",
  background: "rgb(9, 9, 11)"
};
var ERROR_LAYER_STYLE = {
  position: "absolute",
  inset: 0,
  zIndex: 3,
  display: "flex",
  flexDirection: "column",
  background: "rgba(9,9,11,0.88)"
};
var ERROR_FALLBACK_STYLE = {
  ...ERROR_LAYER_STYLE,
  alignItems: "center",
  justifyContent: "center",
  color: "#a1a1aa",
  padding: 24,
  textAlign: "center"
};
var RETAIN_REASON = "phantom-open";
var styles = import_react_native_unistyles.StyleSheet.create((theme) => ({
  fallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing[6],
    backgroundColor: "transparent"
  },
  fallbackText: {
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.sm,
    textAlign: "center"
  }
}));
function bindHost2(host) {
  bindHost(host);
}
function getHost() {
  return requireBoundHost();
}
function canUseGuestSurface() {
  return typeof document !== "undefined" && getHost().platform.isWeb;
}
function AppPanel(_props) {
  const guestHostRef = (0, import_react.useRef)(null);
  const [booting, setBooting] = (0, import_react.useState)(true);
  const [error, setError] = (0, import_react.useState)(null);
  (0, import_react.useEffect)(() => {
    const host = getHost();
    host.background?.requestRetain?.({ appId: APP_ID, active: true, reason: RETAIN_REASON });
    return () => {
      host.background?.requestRetain?.({ appId: APP_ID, active: false, reason: RETAIN_REASON });
    };
  }, []);
  (0, import_react.useEffect)(() => {
    if (!canUseGuestSurface()) {
      setBooting(false);
      setError("\u5F53\u524D\u5E73\u53F0\u6682\u4E0D\u652F\u6301\u5D4C\u5165\u5E7B\u5C40\uFF0C\u8BF7\u4F7F\u7528 Agnx \u684C\u9762\u7AEF\u3002");
      return;
    }
    let cancelled = false;
    let unmountGuest = null;
    const mountGuest = async (options) => {
      const host = getHost();
      if (!guestHostRef.current) return;
      if (!host.guest?.mount) {
        if (!cancelled) {
          setBooting(false);
          setError("\u5BBF\u4E3B\u672A\u63D0\u4F9B host.guest\uFF08\u9700\u5347\u7EA7 Agnx \u5E76\u91CD\u65B0\u626B\u63CF\u5B50\u5E94\u7528\uFF09");
        }
        return;
      }
      unmountGuest?.();
      unmountGuest = null;
      setBooting(true);
      setError(null);
      try {
        const args = [];
        if (options?.forceRestart) {
          args.push("--force-restart");
        }
        if (cancelled || !guestHostRef.current) return;
        unmountGuest = host.guest.mount({
          container: guestHostRef.current,
          ensureTool: ENSURE_TOOL_REL,
          ensureArgs: args,
          timeoutMs: 6e5,
          bootOverlay: false,
          onReady: () => {
            if (!cancelled) {
              setError(null);
              window.setTimeout(() => {
                if (!cancelled) setBooting(false);
              }, 320);
            }
          },
          onError: (detail) => {
            if (!cancelled) {
              setBooting(false);
              setError(`${detail.code}: ${detail.message}`);
            }
          }
        });
      } catch (err) {
        if (!cancelled) {
          setBooting(false);
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    };
    void mountGuest();
    return () => {
      cancelled = true;
      unmountGuest?.();
    };
  }, []);
  if (!canUseGuestSurface()) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react_native.View, { style: styles.fallback, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react_native.Text, { style: styles.fallbackText, children: error ?? "\u52A0\u8F7D\u4E2D\u2026" }) });
  }
  const BrandPanel = getHost().ui?.BrandLogoLoaderPanel;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: WEB_ROOT_STYLE, "data-testid": `workspace-mini-app-${APP_ID}-root`, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "div",
      {
        ref: guestHostRef,
        "data-agnx-guest-surface-host": "true",
        style: GUEST_HOST_STYLE
      }
    ),
    booting && !error && BrandPanel ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { "data-agnx-guest-boot-overlay": "true", style: BOOT_LAYER_STYLE, role: "status", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BrandPanel, { title: "\u6B63\u5728\u542F\u52A8\u5E7B\u5C40\u2026", testID: "phantom-boot-overlay" }) }) : null,
    booting && !error && !BrandPanel ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { "data-agnx-guest-boot-overlay": "true", style: ERROR_FALLBACK_STYLE, role: "status", children: "\u6B63\u5728\u542F\u52A8\u5E7B\u5C40\u2026" }) : null,
    error && BrandPanel ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: ERROR_LAYER_STYLE, role: "alert", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      BrandPanel,
      {
        title: error,
        description: "\u6253\u5F00\u547D\u4EE4\u9762\u677F \u2192 \u5E7B\u5C40 \u2192 \u8BE6\u60C5\uFF0C\u67E5\u770B Guest Surface / ensure \u65E5\u5FD7\u3002",
        testID: "phantom-mount-error"
      }
    ) }) : null,
    error && !BrandPanel ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: ERROR_FALLBACK_STYLE, role: "alert", children: error }) : null
  ] });
}

// .agnx/src/index.ts
var appId = APP_ID;
function openTab(host, context) {
  host.openMiniAppTab({
    appId: APP_ID,
    panelId: PANEL_ID,
    serverId: context?.serverId,
    workspaceId: context?.workspaceId,
    currentPathname: context?.currentPathname
  });
}
function activate(host) {
  bindHost2(host);
  host.registerMiniApp({
    id: PANEL_ID,
    appId: APP_ID,
    title: "\u6597\u5730\u4E3B",
    icon: import_lucide_react_native.AppWindow,
    component: AppPanel,
    iframeShortcutCapture: true,
    isolation: {
      mode: "iframe",
      sidecarTools: [ENSURE_TOOL_REL],
      note: "host.guest.mount\uFF1Bensure-phantom supervised FastAPI:8765 + frontend:5173"
    }
  });
  host.registerCommand({
    id: OPEN_COMMAND_ID,
    appId: APP_ID,
    title: "\u6597\u5730\u4E3B",
    keywords: ["phantom", "\u5E7B\u5C40", "\u6597\u5730\u4E3B", "dou dizhu", "ddz", "poker"],
    icon: import_lucide_react_native.AppWindow,
    sidebarAction: {
      defaultVisible: true,
      label: "\u6597\u5730\u4E3B",
      order: 73
    },
    run: (context) => {
      openTab(host, context);
    }
  });
}
var moduleExport = { appId: APP_ID, activate };
var index_default = moduleExport;
