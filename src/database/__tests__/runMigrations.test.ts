import { LATEST_SCHEMA_VERSION, MIGRATIONS } from '../migrations';
import { readSchemaVersion, runMigrations, type MigrationDb } from '../runMigrations';

/**
 * A fake database recording every statement, so the runner's ordering,
 * transaction boundaries and version handling can be asserted without a native
 * SQLite. Transactions roll back on throw, like the real thing.
 */
function fakeDb(initialVersion = 0) {
  let version = initialVersion;
  const statements: string[] = [];
  const committedTransactions: string[][] = [];
  let failOn: string | null = null;

  const db: MigrationDb = {
    async execute(query: string) {
      if (/^\s*PRAGMA user_version\s*$/i.test(query)) {
        return { rows: [{ user_version: version }] };
      }
      statements.push(query);
      return { rows: [] };
    },
    async transaction(fn) {
      const buffered: string[] = [];
      const versionBefore = version;
      try {
        await fn({
          async execute(query: string) {
            if (failOn && query.includes(failOn)) {
              throw new Error(`simulated failure: ${failOn}`);
            }
            buffered.push(query);
            const bump = /^\s*PRAGMA user_version\s*=\s*(\d+)/i.exec(query);
            if (bump?.[1]) version = Number(bump[1]);
            return undefined;
          },
        });
      } catch (error) {
        // Roll back: discard buffered statements AND the version bump.
        version = versionBefore;
        throw error;
      }
      statements.push(...buffered);
      committedTransactions.push(buffered);
      return undefined;
    },
  };

  return {
    db,
    statements,
    committedTransactions,
    get version() {
      return version;
    },
    setFailOn(fragment: string | null) {
      failOn = fragment;
    },
  };
}

describe('readSchemaVersion', () => {
  it('reports 0 for a fresh database', async () => {
    const { db } = fakeDb(0);
    await expect(readSchemaVersion(db)).resolves.toBe(0);
  });

  it('reads an existing version', async () => {
    const { db } = fakeDb(2);
    await expect(readSchemaVersion(db)).resolves.toBe(2);
  });
});

describe('runMigrations on a fresh database', () => {
  it('applies every migration and lands on the latest version', async () => {
    const fake = fakeDb(0);
    const result = await runMigrations(fake.db);

    expect(result.from).toBe(0);
    expect(result.to).toBe(LATEST_SCHEMA_VERSION);
    expect(result.applied).toEqual(MIGRATIONS.map(m => m.name));
    expect(fake.version).toBe(LATEST_SCHEMA_VERSION);
  });

  it('runs each migration in its own transaction, version bump included', async () => {
    const fake = fakeDb(0);
    await runMigrations(fake.db);

    expect(fake.committedTransactions).toHaveLength(MIGRATIONS.length);
    fake.committedTransactions.forEach((tx, i) => {
      const migration = MIGRATIONS[i]!;
      // Every statement of the migration, then its version bump, all together.
      expect(tx).toHaveLength(migration.statements.length + 1);
      expect(tx[tx.length - 1]).toBe(`PRAGMA user_version = ${migration.version}`);
    });
  });

  it('creates sync_queue before anything reads from it', async () => {
    const fake = fakeDb(0);
    await runMigrations(fake.db);
    const sql = fake.statements.join('\n');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS sync_queue');
    expect(sql.indexOf('local_sales')).toBeLessThan(sql.indexOf('sync_queue'));
  });
});

describe('runMigrations on an existing database', () => {
  it('applies only what is missing', async () => {
    const fake = fakeDb(1);
    const result = await runMigrations(fake.db);

    expect(result.applied).toEqual(['002_sync_queue', '003_conflicts']);
    expect(result.to).toBe(LATEST_SCHEMA_VERSION);
  });

  it('is a no-op when already current', async () => {
    const fake = fakeDb(LATEST_SCHEMA_VERSION);
    const result = await runMigrations(fake.db);

    expect(result.applied).toEqual([]);
    expect(fake.committedTransactions).toHaveLength(0);
  });

  it('leaves a newer database untouched when an older build opens it', async () => {
    // Downgrade safety: migrating backwards would destroy rows the newer build
    // wrote, including unsynced transactions.
    const fake = fakeDb(LATEST_SCHEMA_VERSION + 3);
    const result = await runMigrations(fake.db);

    expect(result.applied).toEqual([]);
    expect(fake.committedTransactions).toHaveLength(0);
    expect(fake.version).toBe(LATEST_SCHEMA_VERSION + 3);
  });
});

describe('failure handling', () => {
  it('rolls back the version when a migration throws', async () => {
    const fake = fakeDb(0);
    fake.setFailOn('sync_conflicts'); // migration 3 fails

    await expect(runMigrations(fake.db)).rejects.toThrow('simulated failure');

    // Migrations 1 and 2 committed; 3 rolled back entirely.
    expect(fake.version).toBe(2);
    expect(fake.committedTransactions).toHaveLength(2);
  });

  it('retries cleanly from where it stopped', async () => {
    const fake = fakeDb(0);
    fake.setFailOn('sync_conflicts');
    await expect(runMigrations(fake.db)).rejects.toThrow();

    fake.setFailOn(null);
    const result = await runMigrations(fake.db);

    expect(result.from).toBe(2);
    expect(result.applied).toEqual(['003_conflicts']);
    expect(fake.version).toBe(LATEST_SCHEMA_VERSION);
  });
});
