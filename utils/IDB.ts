// indexedDBUtils.ts
const DB_NAME = 'ModelDB';
const DB_VERSION = 2; // Increment version to trigger onupgradeneeded
const OBJECT_STORE_NAME = 'models';

export const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            reject(`Database error: ${(event.target as IDBRequest).error}`);
        };

        request.onsuccess = (event) => {
            resolve((event.target as IDBRequest<IDBDatabase>).result);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(OBJECT_STORE_NAME)) {
                db.createObjectStore(OBJECT_STORE_NAME);
            }
        };
    });
};

export const saveModelToDB = async (modelData: ArrayBuffer, filename: string, key: string) => {
    const db = await openDB();
    const transaction = db.transaction(OBJECT_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(OBJECT_STORE_NAME);
    store.put({ modelData, filename }, key); // Store object with modelData and filename
};

export const getModelFromDB = async (key: string): Promise<{ modelData: ArrayBuffer; filename: string } | null> => {
    const db = await openDB();
    const transaction = db.transaction(OBJECT_STORE_NAME, 'readonly');
    const store = transaction.objectStore(OBJECT_STORE_NAME);
    return new Promise((resolve, reject) => {
        const request = store.get(key);

        request.onerror = (event) => {
            reject(`Database error: ${(event.target as IDBRequest).error}`);
        };

        request.onsuccess = (event) => {
            resolve((event.target as IDBRequest<{ modelData: ArrayBuffer; filename: string }>).result);
        };
    });
};