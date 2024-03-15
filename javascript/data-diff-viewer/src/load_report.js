import * as duckdb from '@duckdb/duckdb-wasm'
import db_base64 from './db_base64.js'

async function _load_duck_db(){
  const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles()

  // Select a bundle based on browser checks
  const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES)

  const worker_url = URL.createObjectURL(
    new Blob([`importScripts("${bundle.mainWorker}");`], {type: 'text/javascript'})
  )

  // Instantiate the asynchronus version of DuckDB-wasm
  const worker = new Worker(worker_url)
  const logger = new duckdb.ConsoleLogger()
  const db = new duckdb.AsyncDuckDB(logger, worker)
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker)

  // Translate a base64 object to Uint8Array
  function base64ToUint8Array(base64) {
    var binary_string = window.atob(base64)
    var len = binary_string.length
    var bytes = new Uint8Array(len)
    for (var i = 0; i < len; i++) {
      bytes[i] = binary_string.charCodeAt(i)
    }
    return bytes
  }

  // Load the report database
  const dbBytes = base64ToUint8Array(db_base64)
  await db.registerFileBuffer('diff_report.db', dbBytes)
  await db.open({path: `diff_report.db`})
  const conn = await db.connect()

  return conn
}


async function _get_diff_report(conn){
  const diff_report_sql_result = await conn.query("SELECT report_title, creation_timestamp, diff_summary FROM diff_report")
  const diff_reports = diff_report_sql_result.toArray().map((r) => {
    const row = r.toJSON()
    row.diff_summary = JSON.parse(row.diff_summary)
    row.creation_timestamp = new Date(row.creation_timestamp)
    return row
  })

  const diff_report = diff_reports[0]
  return diff_report
}

async function _get_diff_per_col(conn){
    const diff_per_col_sql_result = await conn.query("SELECT column_number, column_name, counts, diff FROM diff_per_col")
    const diff_per_col = JSON.parse(diff_per_col_sql_result.toString())
    return diff_per_col
}


class DiffReport {

  constructor(conn, diff_report, diff_per_col) {
    this.report_title = diff_report.report_title
    this.creation_timestamp = diff_report.creation_timestamp
    this.diff_summary = diff_report.diff_summary
    this.diff_per_col = diff_per_col
  }

}

async function _load_diff_report() {
  let conn = await _load_duck_db()
  let diff_report = await _get_diff_report(conn)
  let diff_per_col = await _get_diff_per_col(conn)
  return new DiffReport(conn, diff_report, diff_per_col)
}


/* Cache the result of a function to avoid recomputing it */
let cache = {}
function cacheResult(fun){
  return async () => {
    if(!(fun.name in cache)) {
      cache[fun.name] = fun()
    }
    return cache[fun.name]
  }
}

const load_diff_report = cacheResult(_load_diff_report)
export default load_diff_report
