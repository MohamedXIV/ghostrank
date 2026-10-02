import type { RunPersistence } from "@/persistence/run-persistence";
import {
  parsePortableRunSave,
  serializePortableRunSave,
} from "@/persistence/portable-run-save";

const DATABASE_NAME = "ghostrank";
const DATABASE_VERSION = 1;
const ACTIVE_RUN_STORE = "active-run";
const ACTIVE_RUN_KEY = "current";

export interface BrowserRunStorage {
  readActiveRun: () => Promise<string | null>;
  writeActiveRun: (serialized: string) => Promise<void>;
}

export function createBrowserRunPersistence(
  storage: BrowserRunStorage = createIndexedDbRunStorage(),
): RunPersistence {
  return {
    async loadActiveState() {
      const serialized = await storage.readActiveRun();

      if (serialized === null) {
        return null;
      }

      return parsePortableRunSave(serialized);
    },

    async saveActiveState(state) {
      await storage.writeActiveRun(serializePortableRunSave(state));
    },
  };
}

export function createIndexedDbRunStorage(
  factory: IDBFactory = getIndexedDbFactory(),
): BrowserRunStorage {
  return {
    async readActiveRun() {
      const database = await openDatabase(factory);

      try {
        const transaction = database.transaction(
          ACTIVE_RUN_STORE,
          "readonly",
        );
        const request = transaction
          .objectStore(ACTIVE_RUN_STORE)
          .get(ACTIVE_RUN_KEY);
        const result = await requestResult<unknown>(request);

        if (result === undefined) {
          return null;
        }

        if (typeof result !== "string") {
          throw new Error("Ghostrank browser save is not serialized text");
        }

        return result;
      } finally {
        database.close();
      }
    },

    async writeActiveRun(serialized) {
      const database = await openDatabase(factory);

      try {
        const transaction = database.transaction(
          ACTIVE_RUN_STORE,
          "readwrite",
        );
        const completed = transactionComplete(transaction);

        transaction
          .objectStore(ACTIVE_RUN_STORE)
          .put(serialized, ACTIVE_RUN_KEY);

        await completed;
      } finally {
        database.close();
      }
    },
  };
}

function getIndexedDbFactory(): IDBFactory {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is unavailable in this browser context");
  }

  return indexedDB;
}

function openDatabase(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(ACTIVE_RUN_STORE)) {
        database.createObjectStore(ACTIVE_RUN_STORE);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to open Ghostrank IndexedDB"));
    request.onblocked = () =>
      reject(new Error("Ghostrank IndexedDB upgrade is blocked"));
  });
}

function requestResult<T>(request: IDBRequest): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as T);
    request.onerror = () =>
      reject(request.error ?? new Error("Ghostrank IndexedDB request failed"));
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(
        transaction.error ??
          new Error("Ghostrank IndexedDB transaction failed"),
      );
    transaction.onabort = () =>
      reject(
        transaction.error ??
          new Error("Ghostrank IndexedDB transaction aborted"),
      );
  });
}
