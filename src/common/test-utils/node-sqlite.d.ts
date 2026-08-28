/**
 * Minimal ambient types for `node:sqlite`, used only by `sqliteTestDb.ts`.
 *
 * `tsconfig.json` sets `types: ["jest"]`, which keeps Node's globals out of a
 * React Native program on purpose — app code that reaches for `process` or `fs`
 * should not typecheck. Adding `"node"` there to get one module's types would
 * remove that safeguard everywhere, so the surface actually used is declared
 * here instead.
 */
declare module 'node:sqlite' {
  export interface StatementResultingChanges {
    changes: number | bigint;
    lastInsertRowid: number | bigint;
  }

  export class StatementSync {
    all(...params: Array<string | number | null>): unknown[];
    get(...params: Array<string | number | null>): unknown;
    run(...params: Array<string | number | null>): StatementResultingChanges;
  }

  export class DatabaseSync {
    constructor(path: string);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
}
