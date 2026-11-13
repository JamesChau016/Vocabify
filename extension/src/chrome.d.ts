declare namespace chrome {
  namespace storage {
    const local: {
      get(keys: string[]): Promise<Record<string, unknown>>;
      set(items: Record<string, string>): Promise<void>;
      remove(keys: string | string[]): Promise<void>;
    };
  }

  namespace permissions {
    function request(permissions: { origins: string[] }): Promise<boolean>;
  }
}
