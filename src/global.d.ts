import './types.js';

declare global {
  interface Window {
    asd: {
      services: import('./types.js').Service[];
      config: import('./types.js').DashboardConfig;
      currentBoardId: string | null;
      currentViewId: string | null;
      widgetStore: import('./component/widget/widgetStore.js').WidgetStore;
    };
    _appLogs?: import('./types.js').LoggerEntry[];
  }
}

export {};
