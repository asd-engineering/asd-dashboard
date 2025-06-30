import './types.js';

declare global {
  interface Window {
    asd: {
      services: import('./types.js').Service[];
      config: import('./types.js').DashboardConfig;
      boards: import('./types.js').Board[];
      currentBoardId: string | null;
      currentViewId: string | null;
    };
    _appLogs?: import('./types.js').LoggerEntry[];
  }
}

export {};
