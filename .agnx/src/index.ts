// 场景：幻局 Sub App 入口 — Guest + ensure + retain
import type { WorkspaceAppHostApi, WorkspaceAppModule } from "@agnx-lab/app-sdk";
import { AppWindow } from "lucide-react-native";
import { APP_ID, ENSURE_TOOL_REL, OPEN_COMMAND_ID, PANEL_ID } from "./constants";
import { bindHost, AppPanel } from "./panel";

export const appId = APP_ID;

function openTab(
  host: WorkspaceAppHostApi,
  context?: {
    serverId?: string;
    workspaceId?: string;
    currentPathname?: string | null;
  },
): void {
  host.openMiniAppTab({
    appId: APP_ID,
    panelId: PANEL_ID,
    serverId: context?.serverId,
    workspaceId: context?.workspaceId,
    currentPathname: context?.currentPathname,
  });
}

export function activate(host: WorkspaceAppHostApi): void {
  bindHost(host);

  host.registerMiniApp({
    id: PANEL_ID,
    appId: APP_ID,
    title: "斗地主",
    icon: AppWindow,
    component: AppPanel,
    iframeShortcutCapture: true,
    isolation: {
      mode: "iframe",
      sidecarTools: [ENSURE_TOOL_REL],
      note: "host.guest.mount；ensure-phantom supervised FastAPI:8765 + frontend:5173",
    },
  });

  host.registerCommand({
    id: OPEN_COMMAND_ID,
    appId: APP_ID,
    title: "斗地主",
    keywords: ["phantom", "幻局", "斗地主", "dou dizhu", "ddz", "poker"],
    icon: AppWindow,
    sidebarAction: {
      defaultVisible: true,
      label: "斗地主",
      order: 73,
    },
    run: (context) => {
      openTab(host, context);
    },
  });
}

const moduleExport: WorkspaceAppModule = { appId: APP_ID, activate };
export default moduleExport;
export { APP_ID, OPEN_COMMAND_ID, PANEL_ID } from "./constants";
export { AppPanel } from "./panel";
