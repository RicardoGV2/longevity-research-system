(() => {
  const PREFIX = "longevityResearchSystem.";
  const ROLLING_BACKUP_PREFIX = "longevityResearchSystem.backups.item.";
  const LEGACY_BACKUP_PREFIX = "longevityResearchSystem.backup.";
  const BACKUP_INDEX_KEY = "longevityResearchSystem.backups.index.v0.1";
  const LAST_AUTO_KEY = "longevityResearchSystem.backups.lastAuto.v0.1";

  function isQuotaError(error) {
    return Boolean(
      error &&
      (error.name === "QuotaExceededError" ||
       error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
       error.code === 22 ||
       error.code === 1014)
    );
  }

  function jsonParse(raw, fallback) {
    try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
  }

  function keySize(key) {
    try {
      return (key.length + (localStorage.getItem(key) || "").length) * 2;
    } catch {
      return 0;
    }
  }

  function storageKeys() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) keys.push(key);
    }
    return keys;
  }

  function backupKeys() {
    return storageKeys().filter((key) => key.startsWith(ROLLING_BACKUP_PREFIX) || key.startsWith(LEGACY_BACKUP_PREFIX));
  }

  function backupKeyTime(key) {
    if (key.startsWith(ROLLING_BACKUP_PREFIX)) return key.slice(ROLLING_BACKUP_PREFIX.length);
    if (key.startsWith(LEGACY_BACKUP_PREFIX)) return key.slice(LEGACY_BACKUP_PREFIX.length);
    return key;
  }

  function pruneBackups({ keep = 3, aggressive = false } = {}) {
    const keys = backupKeys().sort((a, b) => backupKeyTime(b).localeCompare(backupKeyTime(a)));
    const remove = aggressive ? keys : keys.slice(keep);
    remove.forEach((key) => {
      try { localStorage.removeItem(key); } catch {}
    });

    const remainingRollingIds = new Set(
      storageKeys()
        .filter((key) => key.startsWith(ROLLING_BACKUP_PREFIX))
        .map((key) => key.slice(ROLLING_BACKUP_PREFIX.length))
    );
    const index = jsonParse(localStorage.getItem(BACKUP_INDEX_KEY), []);
    if (Array.isArray(index)) {
      const compact = index.filter((entry) => remainingRollingIds.has(entry.id)).slice(0, keep);
      try { localStorage.setItem(BACKUP_INDEX_KEY, JSON.stringify(compact)); } catch {}
    }
    if (aggressive) {
      try { localStorage.removeItem(LAST_AUTO_KEY); } catch {}
    }
    return remove.length;
  }

  function currentUsageKb() {
    const bytes = storageKeys().reduce((sum, key) => sum + keySize(key), 0);
    return Math.round(bytes / 1024);
  }

  function installSetItemGuard() {
    if (Storage.prototype.setItem.__longevityQuotaGuard) return;
    const originalSetItem = Storage.prototype.setItem;

    function guardedSetItem(key, value) {
      try {
        return originalSetItem.call(this, key, value);
      } catch (error) {
        if (!isQuotaError(error) || !String(key).startsWith(PREFIX)) throw error;

        pruneBackups({ keep: 3, aggressive: false });
        try {
          return originalSetItem.call(this, key, value);
        } catch (secondError) {
          if (!isQuotaError(secondError)) throw secondError;
          pruneBackups({ keep: 0, aggressive: true });
          return originalSetItem.call(this, key, value);
        }
      }
    }

    guardedSetItem.__longevityQuotaGuard = true;
    Storage.prototype.setItem = guardedSetItem;
  }

  function startupPruneIfNeeded() {
    window.setTimeout(() => {
      const kb = currentUsageKb();
      if (kb > 3500) pruneBackups({ keep: 3, aggressive: false });
      if (currentUsageKb() > 4400) pruneBackups({ keep: 0, aggressive: true });
    }, 600);
  }

  installSetItemGuard();
  startupPruneIfNeeded();

  window.longevityStorage = {
    usageKb: currentUsageKb,
    pruneBackups: () => pruneBackups({ keep: 3, aggressive: false }),
    pruneAllBackups: () => pruneBackups({ keep: 0, aggressive: true })
  };
})();
