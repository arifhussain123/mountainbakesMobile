import {
  LATEST_SCHEMA_VERSION,
  MIGRATIONS,
  pendingMigrations,
} from '../migrations';

/**
 * Guards on the migration list itself. These catch the mistakes that are
 * invisible in review but corrupt real devices: a duplicated version number, a
 * gap, or a destructive statement slipped into an update that would drop a table
 * holding an unsynced shift of sales.
 */

describe('migration list integrity', () => {
  it('has strictly increasing, gapless versions starting at 1', () => {
    const versions = MIGRATIONS.map(m => m.version);
    expect(versions).toEqual(versions.slice().sort((a, b) => a - b));
    expect(new Set(versions).size).toBe(versions.length);
    versions.forEach((v, i) => expect(v).toBe(i + 1));
  });

  it('has a unique name per migration', () => {
    const names = MIGRATIONS.map(m => m.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('reports the highest version as the latest', () => {
    expect(LATEST_SCHEMA_VERSION).toBe(MIGRATIONS.length);
  });

  it('contains no destructive statements', () => {
    // An app update must never drop or truncate a table — pending offline
    // transactions live in these tables and are irreplaceable.
    const forbidden = /\b(DROP\s+TABLE|DROP\s+COLUMN|TRUNCATE|DELETE\s+FROM)\b/i;
    for (const migration of MIGRATIONS) {
      for (const statement of migration.statements) {
        expect({ migration: migration.name, statement }).toMatchObject({
          statement: expect.not.stringMatching(forbidden),
        });
      }
    }
  });

  it('creates tables idempotently, so a partially-applied step can retry', () => {
    for (const migration of MIGRATIONS) {
      for (const statement of migration.statements) {
        if (/^\s*CREATE\s+TABLE/i.test(statement)) {
          expect(statement).toMatch(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS/i);
        }
        if (/^\s*CREATE\s+INDEX/i.test(statement)) {
          expect(statement).toMatch(/CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS/i);
        }
      }
    }
  });
});

describe('pendingMigrations', () => {
  it('returns everything for a fresh database', () => {
    expect(pendingMigrations(0)).toHaveLength(MIGRATIONS.length);
  });

  it('returns nothing when already current', () => {
    expect(pendingMigrations(LATEST_SCHEMA_VERSION)).toHaveLength(0);
  });

  it('returns only the steps after the current version, in order', () => {
    const pending = pendingMigrations(1);
    // Every version above the current one, ascending — derived, so a new
    // migration does not fail a test that is really about ordering.
    const expected = MIGRATIONS.map(m => m.version)
      .filter(v => v > 1)
      .sort((a, b) => a - b);
    expect(pending.map(m => m.version)).toEqual(expected);
  });

  it('is a no-op for a database ahead of this build (downgrade safety)', () => {
    // An older APK must not attempt to "migrate" a newer schema backwards.
    expect(pendingMigrations(LATEST_SCHEMA_VERSION + 5)).toHaveLength(0);
  });
});

describe('offline transaction tables', () => {
  const allSql = MIGRATIONS.flatMap(m => m.statements).join('\n');

  it('keys device-originated rows by client_operation_id', () => {
    for (const table of ['local_sales', 'local_expenses', 'local_production_orders']) {
      const ddl = allSql.match(new RegExp(`CREATE TABLE IF NOT EXISTS ${table}[\\s\\S]*?\\)`, 'i'));
      expect(ddl).not.toBeNull();
      expect(ddl![0]).toMatch(/client_operation_id\s+TEXT\s+PRIMARY KEY/i);
    }
  });

  it('captures business_date on every offline-creatable transaction', () => {
    // The server stamps the business day on receipt, so a queued 9pm sale synced
    // at 7am would land on a closed day unless the device sends its own.
    for (const table of ['local_sales', 'local_expenses', 'local_production_orders']) {
      const ddl = allSql.match(new RegExp(`CREATE TABLE IF NOT EXISTS ${table}[\\s\\S]*?\\)`, 'i'));
      expect(ddl![0]).toMatch(/business_date\s+TEXT\s+NOT NULL/i);
    }
    expect(allSql).toMatch(/CREATE TABLE IF NOT EXISTS sync_queue[\s\S]*?business_date/i);
  });

  it('enforces one queue row per operation id', () => {
    expect(allSql).toMatch(/client_operation_id\s+TEXT\s+NOT NULL\s+UNIQUE/i);
  });

  it('stores money as TEXT to preserve the exact numeric(14,2) decimal', () => {
    expect(allSql).toMatch(/grand_total\s+TEXT\s+NOT NULL/i);
    expect(allSql).toMatch(/amount\s+TEXT\s+NOT NULL/i);
    expect(allSql).not.toMatch(/\b(grand_total|amount|balance|price)\s+REAL\b/i);
  });

  it('indexes the queue drain path', () => {
    expect(allSql).toMatch(/idx_queue_ready ON sync_queue\(status, next_attempt_at\)/i);
  });
});
