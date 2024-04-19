/*
These variables are placeholder that will contain duckdb-wasm javascript string encoded in base64.
During compilation, the Python code dev/bin/inline_javascript_libraries will replace the {{...}} tags with
the corresponding libraries encoded in base64.
*/
export const duckdb_browser_mvp_base64 = `{{duckdb_browser_mvp_base64}}`;
export const duckdb_browser_mvp_worker_base64 = `{{duckdb_browser_mvp_worker_base64}}`;

export const duckdb_browser_eh_base64 = `{{duckdb_browser_eh_base64}}`;
export const duckdb_browser_eh_worker_base64 = `{{duckdb_browser_eh_worker_base64}}`;
