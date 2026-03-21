export class MemoryRedisClient {
  constructor() {
    this.kv = new Map();
    this.sorted = new Map();
    this.expiries = new Map();
  }

  cleanupKey(key) {
    const expiry = this.expiries.get(key);

    if (expiry && expiry <= Date.now()) {
      this.expiries.delete(key);
      this.kv.delete(key);
      this.sorted.delete(key);
    }
  }

  async get(key) {
    this.cleanupKey(key);
    return this.kv.has(key) ? this.kv.get(key) : null;
  }

  async set(key, value, options = {}) {
    this.kv.set(key, value);

    if (options.EX) {
      this.expiries.set(key, Date.now() + options.EX * 1000);
    } else {
      this.expiries.delete(key);
    }
  }

  async del(key) {
    this.kv.delete(key);
    this.sorted.delete(key);
    this.expiries.delete(key);
  }

  getSortedSet(key) {
    this.cleanupKey(key);

    if (!this.sorted.has(key)) {
      this.sorted.set(key, []);
    }

    return this.sorted.get(key);
  }

  async zAdd(key, entry) {
    const items = this.getSortedSet(key);
    items.push({ score: entry.score, value: entry.value });
  }

  async zRemRangeByScore(key, min, max) {
    const items = this.getSortedSet(key);
    const filtered = items.filter((item) => item.score < min || item.score > max);
    this.sorted.set(key, filtered);
  }

  async expire(key, seconds) {
    this.expiries.set(key, Date.now() + seconds * 1000);
  }

  async zCard(key) {
    return this.getSortedSet(key).length;
  }

  async exists(key) {
    this.cleanupKey(key);
    return Number(this.kv.has(key) || this.sorted.has(key));
  }
}

export class MemoryRedisStore {
  constructor({ logger }) {
    this.logger = logger;
    this.client = new MemoryRedisClient();
  }

  async connect() {
    this.logger.warn('In-memory session storage enabled');
  }

  async end() {}
}
