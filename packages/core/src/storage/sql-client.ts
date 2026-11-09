export type SqlValue = string | number | null;

export interface SqlClient {
  select<Row>(query: string, params?: SqlValue[]): Promise<Row[]>;
  execute(query: string, params?: SqlValue[]): Promise<void>;
}
