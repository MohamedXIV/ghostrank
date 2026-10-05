import type { RunPersistence } from "@/persistence/run-persistence";
import {
  parsePortableRunSave,
  serializePortableRunSave,
} from "@/persistence/portable-run-save";

const DATABASE_NAME = "ghostrank";
const DATABASE_VERSION = 2;
const ACTIVE_RUN_STORE = "active-run";
const ACTIVE_RUN_KEY = "current";
const RUN_HISTORY_STORE = "run-history";

export interface BrowserRunStorage {
  readActiveRun: () => Promise<string | null>;
  writeActiveRun: (serialized: string) => Promise<void>;
  readCompletedRuns: () => Promise<string[]>;
  completeRun: (archiveId: string, serialized: string) => Promise<void>;
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

    async loadCompletedStates() {
      const serializedRuns = await storage.readCompletedRuns();
      return serializedRuns.map((serialized) => {
        const state = parsePortableRunSave(serialized);

        if (state.run.status !== "ended") {
          throw new Error("Ghostrank run history contains an active run");
        }

        return state;
      });
    },

    async completeRun(state) {
      if (state.run.status !== "ended") {
        throw new Error("Cannot archive a Ghostrank run before it ends");
      }

      const archiveId = `completed:${new Date().toISOString()}:${crypto.randomUUID()}`;
      await storage.completeRun(archiveId, serializePortableRunSave(state));
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

    async readCompletedRuns() {
      const database = await openDatabase(factory);

      try {
        const transaction = database.transaction(
          RUN_HISTORY_STORE,
          "readonly",
        );
        const request = transaction.objectStore(RUN_HISTORY_STORE).getAll();
        const results = await requestResult<unknown[]>(request);

        if (!results.every((value) => typeof value === "string")) {
          throw new Error("Ghostrank run history contains invalid data");
        }

        return results as string[];
      } finally {
        database.close();
      }
    },

    async completeRun(archiveId, serialized) {
      const database = await openDatabase(factory);

      try {
        // The final authoritative state moves from the active slot into history
        // in one IndexedDB transaction. A crash cannot leave two divergent
        // copies or erase both.
        const transaction = database.transaction(
          [ACTIVE_RUN_STORE, RUN_HISTORY_STORE],
          "readwrite",
        );
        const completed = transactionComplete(transaction);

        transaction
          .objectStore(RUN_HISTORY_STORE)
          .put(serialized, archiveId);
        transaction.objectStore(ACTIVE_RUN_STORE).delete(ACTIVE_RUN_KEY);

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

      if (!database.objectStoreNames.contains(RUN_HISTORY_STORE)) {
        database.createObjectStore(RUN_HISTORY_STORE);
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
