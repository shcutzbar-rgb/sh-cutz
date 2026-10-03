/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PGlite } from "@electric-sql/pglite";

// Minimal PostgREST/supabase-js-liknande klient ovanpå PGlite, bara så mycket som serverkoden använder.
// Riktig SQL körs mot riktiga migreringar, så constraints (t.ex. 23P01) beter sig som i Supabase.

const FOREIGN_KEYS: Record<string, string> = { services: "service_id", barbers: "barber_id" };

type Filter = { col: string; op: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "is" | "notnull"; value?: unknown };
type Op = "select" | "insert" | "update" | "delete";

const q = (name: string) => `"${name.replace(/"/g, '""')}"`;

function splitTopLevel(cols: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of cols) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function selectList(table: string, columns: string): string {
  return splitTopLevel(columns)
    .map((item) => {
      if (item === "*") return `${q(table)}.*`;
      const embed = /^(\w+)\((.*)\)$/.exec(item);
      if (!embed) return `${q(table)}.${q(item)}`;
      const [, rel, inner] = embed;
      const fk = FOREIGN_KEYS[rel];
      if (!fk) throw new Error(`Okänd relation i testadaptern: ${rel}`);
      const cols = splitTopLevel(inner).map(q).join(", ");
      return `(select to_jsonb(r) from (select ${cols} from ${q(rel)} where ${q(rel)}."id" = ${q(table)}.${q(fk)}) r) as ${q(rel)}`;
    })
    .join(", ");
}

function normalize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  return value;
}

class Builder implements PromiseLike<{ data: any; error: any }> {
  private op: Op = "select";
  private columns = "*";
  private returning = false;
  private values: Record<string, unknown> = {};
  private filters: Filter[] = [];
  private orderBy: { col: string; asc: boolean } | null = null;
  private max: number | null = null;
  private mode: "many" | "maybe" | "one" = "many";

  constructor(
    private db: PGlite,
    private table: string,
  ) {}

  select(columns = "*") {
    this.columns = columns;
    this.returning = true;
    return this;
  }
  insert(values: Record<string, unknown>) {
    this.op = "insert";
    this.values = values;
    return this;
  }
  update(values: Record<string, unknown>) {
    this.op = "update";
    this.values = values;
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }
  eq(col: string, value: unknown) {
    this.filters.push({ col, op: "eq", value });
    return this;
  }
  neq(col: string, value: unknown) {
    this.filters.push({ col, op: "neq", value });
    return this;
  }
  gt(col: string, value: unknown) {
    this.filters.push({ col, op: "gt", value });
    return this;
  }
  gte(col: string, value: unknown) {
    this.filters.push({ col, op: "gte", value });
    return this;
  }
  lt(col: string, value: unknown) {
    this.filters.push({ col, op: "lt", value });
    return this;
  }
  lte(col: string, value: unknown) {
    this.filters.push({ col, op: "lte", value });
    return this;
  }
  in(col: string, value: unknown[]) {
    this.filters.push({ col, op: "in", value });
    return this;
  }
  is(col: string, value: null) {
    if (value !== null) throw new Error("Testadaptern stöder bara is(col, null)");
    this.filters.push({ col, op: "is" });
    return this;
  }
  not(col: string, operator: string, value: unknown) {
    if (operator !== "is" || value !== null) throw new Error("Testadaptern stöder bara not(col, 'is', null)");
    this.filters.push({ col, op: "notnull" });
    return this;
  }
  order(col: string, opts: { ascending?: boolean } = {}) {
    this.orderBy = { col, asc: opts.ascending !== false };
    return this;
  }
  limit(n: number) {
    this.max = n;
    return this;
  }
  maybeSingle() {
    this.mode = "maybe";
    return this;
  }
  single() {
    this.mode = "one";
    return this;
  }

  private where(params: unknown[]): string {
    if (this.filters.length === 0) return "";
    const clauses = this.filters.map((f) => {
      const col = `${q(this.table)}.${q(f.col)}`;
      const add = (v: unknown) => {
        params.push(v);
        return `$${params.length}`;
      };
      switch (f.op) {
        case "eq":
          return `${col} = ${add(f.value)}`;
        case "neq":
          return `${col} <> ${add(f.value)}`;
        case "gt":
          return `${col} > ${add(f.value)}`;
        case "gte":
          return `${col} >= ${add(f.value)}`;
        case "lt":
          return `${col} < ${add(f.value)}`;
        case "lte":
          return `${col} <= ${add(f.value)}`;
        case "in":
          return `${col}::text = any(${add(f.value)}::text[])`;
        case "is":
          return `${col} is null`;
        case "notnull":
          return `${col} is not null`;
      }
    });
    return ` where ${clauses.join(" and ")}`;
  }

  private build(): { sql: string; params: unknown[] } {
    const params: unknown[] = [];
    const t = q(this.table);
    const returning = this.returning ? ` returning ${selectList(this.table, this.columns)}` : "";

    if (this.op === "insert") {
      const keys = Object.keys(this.values);
      const placeholders = keys.map((k) => {
        params.push(this.values[k]);
        return `$${params.length}`;
      });
      return { sql: `insert into ${t} (${keys.map(q).join(", ")}) values (${placeholders.join(", ")})${returning}`, params };
    }
    if (this.op === "update") {
      const sets = Object.keys(this.values).map((k) => {
        params.push(this.values[k]);
        return `${q(k)} = $${params.length}`;
      });
      return { sql: `update ${t} set ${sets.join(", ")}${this.where(params)}${returning}`, params };
    }
    if (this.op === "delete") {
      return { sql: `delete from ${t}${this.where(params)}${returning}`, params };
    }
    const order = this.orderBy ? ` order by ${t}.${q(this.orderBy.col)} ${this.orderBy.asc ? "asc" : "desc"}` : "";
    const limit = this.max !== null ? ` limit ${this.max}` : "";
    return {
      sql: `select ${selectList(this.table, this.columns)} from ${t}${this.where(params)}${order}${limit}`,
      params,
    };
  }

  private async run(): Promise<{ data: any; error: any }> {
    try {
      const { sql, params } = this.build();
      const result = await this.db.query<Record<string, unknown>>(sql, params);
      if (this.op !== "select" && !this.returning) return { data: null, error: null };

      const rows = result.rows.map((row) => Object.fromEntries(Object.entries(row).map(([k, v]) => [k, normalize(v)])));
      if (this.mode === "many") return { data: rows, error: null };
      if (this.mode === "maybe") {
        if (rows.length > 1) return { data: null, error: { code: "PGRST116", message: "Flera rader" } };
        return { data: rows[0] ?? null, error: null };
      }
      if (rows.length !== 1) return { data: null, error: { code: "PGRST116", message: "Förväntade exakt en rad" } };
      return { data: rows[0], error: null };
    } catch (err: any) {
      return { data: null, error: { code: err.code, message: err.message } };
    }
  }

  then<R1 = { data: any; error: any }, R2 = never>(
    onfulfilled?: ((value: { data: any; error: any }) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    return this.run().then(onfulfilled, onrejected);
  }
}

/** Ger något som liknar `SupabaseClient` för de anrop serverkoden gör. */
export function createPgliteSupabase(db: PGlite): any {
  return { from: (table: string) => new Builder(db, table) };
}
