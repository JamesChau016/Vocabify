declare namespace chrome {
  namespace storage {
    const local: {
      get(keys: string[]): Promise<Record<string, unknown>>;
      set(items: Record<string, unknown>): Promise<void>;
      remove(keys: string | string[]): Promise<void>;
    };
  }

  namespace permissions {
    function request(permissions: { origins: string[] }): Promise<boolean>;
  }
  namespace alarms {
    function create(name: string, info: { periodInMinutes: number }): Promise<void>;
    const onAlarm: { addListener(callback: (alarm: { name: string }) => void): void };
  }
  namespace runtime {
    const onInstalled: { addListener(callback: () => void): void };
    const onMessage: { addListener(callback: (message: unknown) => void): void };
    function sendMessage(message: unknown): Promise<unknown>;
  }
  namespace tabs {
    function query(query: { active: boolean; currentWindow: boolean }): Promise<Array<{ id?: number; url?: string }>>;
  }
  namespace scripting {
    function executeScript<T>(details: { target: { tabId: number }; func: () => T }): Promise<Array<{ result?: T }>>;
  }
}
