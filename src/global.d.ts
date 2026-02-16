import './types.js';

declare global {
  interface Window {
    asd: {
      services: import('./types.js').Service[];
      config: import('./types.js').DashboardConfig;
      currentBoardId: string | null;
      currentViewId: string | null;
      widgetStore: import('./component/widget/widgetStore.js').WidgetStore;
      runtime?: {
        tasks: any[];
        shells: any[];
        processes: any[];
      };
    };
    _appLogs?: import('./types.js').LoggerEntry[];

    /** Test-only hook to open the widget selector panel */
    __openWidgetPanel?: () => void;
  }
}

export {};
