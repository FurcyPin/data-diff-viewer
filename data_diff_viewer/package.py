import datetime
import json
from pathlib import Path
from typing import List, Optional

import duckdb

import data_diff_viewer
from data_diff_viewer.diff_summary import DiffSummary
from data_diff_viewer.utils import (
    encode_file_to_base64_string,
    read_resource,
)


def _get_diff_per_col_parquet_path(temp_dir: Path) -> Path:
    return temp_dir / "diff_per_col"


def _get_diff_report_json_path(temp_dir: Path) -> Path:
    return temp_dir / "diff_report.json"


def _get_db_path(temp_dir: Path) -> Path:
    return temp_dir / "diff.db"


def _write_report_files(
    report_title: str,
    diff_summary: DiffSummary,
    temp_dir: Path,
) -> None:
    diff_summary_dict = {
        "data_diff_viewer_version": data_diff_viewer.__version__,
        "results_serialized_with": "duck_db:" + duckdb.__version__,
        "generated_with": diff_summary.generated_with,
        "left_df_alias": diff_summary.left_df_alias,
        "right_df_alias": diff_summary.right_df_alias,
        "join_cols": diff_summary.join_cols,
        "same_schema": diff_summary.same_schema,
        "schema_diff_str": diff_summary.schema_diff_str,
        "column_names_diff": diff_summary.column_names_diff,
        "same_data": diff_summary.same_data,
        "total_nb_rows": diff_summary.total_nb_rows,
        "diff_per_col_table_name": "diff_per_col",
    }
    json_diff_summary = json.dumps(diff_summary_dict)
    creation_timestamp = datetime.datetime.now(tz=datetime.timezone.utc).isoformat()
    diff_report = {
        "report_title": report_title,
        "creation_timestamp": creation_timestamp,
        "diff_summary": json_diff_summary,
    }
    json_diff_report = json.dumps(diff_report)
    with _get_diff_report_json_path(temp_dir).open("w") as f:
        f.write(json_diff_report)


def _write_duck_db(temp_dir: Path, diff_table_path: Path, table_paths: List[Path]) -> None:
    conn = duckdb.connect(database=str(_get_db_path(temp_dir)))
    conn.execute(
        """
        CREATE TABLE diff_per_col AS
        SELECT * FROM read_parquet($1)
        """,
        [str(diff_table_path)],
    )
    for index, table_path in enumerate(table_paths):
        conn.execute(
            f"""
            CREATE TABLE sample_{index} AS
            SELECT * FROM read_parquet($1)
            """,  # noqa: S608
            [str(table_path)],
        )
    conn.execute(
        "CREATE TABLE diff_report (report_title VARCHAR, creation_timestamp TIMESTAMP, diff_summary VARCHAR)",
    )
    conn.execute(
        """
        INSERT INTO diff_report
        SELECT *
        FROM read_json(?,
            format = 'newline_delimited',
            columns = {report_title: 'VARCHAR', creation_timestamp: 'TIMESTAMP', diff_summary: 'VARCHAR'}
        )
        """,
        [str(_get_diff_report_json_path(temp_dir))],
    )
    conn.close()


def generate_report_string(
    report_title: str,
    diff_summary: DiffSummary,
    temp_dir: Path,
    data_diff_path: Path,
    sample_table_paths: Optional[List[Path]] = None,
) -> str:
    """Generate a string containing a standalone HTML report to visualize a data-diff.

    This string must be written to a file to be used.

    The HTML report is self-contained: it can be opened as local files with a browser,
    and works even without any internet connection

    The results of the diff are mostly passed via two arguments: the `diff_summary` which
    contains the metadata of the diff, and `data_diff_path` which must point to a parquet
    table containing the actual diff data. The expected schema of the parquet file is as follows:

    .. code-block::

            root
             |-- column_number: integer ("Number used to preserve the column order, this number is not displayed")
             |-- column_name: string ("Name of the column")
             |-- counts: struct ("Struct containing global counts for this column")
             |    |-- total: long ("Total number of rows where this column appears.")
             |    |-- changed: long ("Number of rows where this column has changed.")
             |    |-- no_change: long ("Number of rows where this column is identical.")
             |    |-- only_in_left: long ("Number of rows where this row appears only in the left DataFrame.")
             |    |-- only_in_right: long ("Number of rows where this row appears only in the right DataFrame.")
             |-- diff: struct ("Struct containing most frequent diff examples for this column")
             |    |-- changed: array ("The most frequent examples of changes on this column")
             |    |    |-- element: struct
             |    |    |    |-- left_value: string ("Value in the left Dataframe")
             |    |    |    |-- right_value: string ("Value in the right Dataframe")
             |    |    |    |-- nb: long ("Number of time this change occured")
             |    |-- no_change: array ("The most frequent examples of values that are identical")
             |    |    |-- element: struct
             |    |    |    |-- value: string ("Value being the same in both Dataframe")
             |    |    |    |-- nb: long ("Number of time this value occurred")
             |    |-- only_in_left: array ("The most frequent examples  from rows only present in the left DataFrame")
             |    |    |-- element: struct
             |    |    |    |-- value: string ("Value in the left DataFrame")
             |    |    |    |-- nb: long ("Number of rows with that value that exists only in the left DataFrame")
             |    |-- only_in_right: array ("The most frequent examples  from rows only present in the left DataFrame")
             |    |    |-- element: struct
             |    |    |    |-- value: string ("Value in the right DataFrame")
             |    |    |    |-- nb: long ("Number of rows with that value that exists only in the left DataFrame")

    !!! note "Displaying sample data"
        Since version v.0.3.0, this library supports displaying sample rows when clicking on one of most frequent
        examples of changes/values.

        To use it, two extra elements must be passed to this method.

        1 : The optional argument `sample_table_paths` must be passed, it should be a list of paths pointing to one or
        several parquet tables. The sample tables should give examples of rows from the original DataFrames being
        compared.

        - A `__SAMPLE_ID__` column of type STRING that contains a unique identifier for the sample row
        - Columns having the same name as the ones from the compared DataFrame, with the following schema:

        .. code-block::

            <COL_NAME>: struct (nullable = false)
                |-- left_value: <T> (nullable = true)
                |-- right_value: <T> (nullable = true)
                |-- is_equal: boolean (nullable = true)
                |-- exists_left: boolean (nullable = false)
                |-- exists_right: boolean (nullable = false)

        where `<COL_NAME>` is the name and `<T>` the type of the corresponding in the compared DataFrame.

        !!! note
            If the name contains the string "__STRUCT__" and "__ARRAY__", they will be replaced with `"."` and `"!"`
            respectively.

        2 : The elements of `diff.changed`, `diff.no_change`, `diff.only_in_left` and `diff.only_in_right` arrays
        should contain an extra field called "sample_ids" that contains a list of nullable strings
        (one for each sample table). Each of those string is either NULL or an id equal to the `__SAMPLE_ID__`
        from one of the rows of the corresponding sample table.

        !!! note
            In the simple cases (when the diffed tables are not nested), there is only one sample table.
            But when the diff tables contains arrays of structs that are exploded (if one of the join_cols contains
            an exclamation mark `!`), then we will have one sample table per level of granularity (a.k.a. "shard").

    Args:
        report_title: The title of the report, it will be displayed at the top of the html page
        diff_summary: A DiffSummary object containing all the metadata of the data-diff
        temp_dir: The Path to a temporary directory
        data_diff_path: The Path to a parquet table containing the diff data (wildcards '*' are allowed in the path)
        sample_table_paths: List of Paths that point to parquet files containing sample tables.
            (wildcards '*' are allowed in the paths).

    Returns:
        A string containing the HTML report. This string must be written to a file to be used.
    """
    if sample_table_paths is None:
        sample_table_paths = []
    _write_report_files(report_title, diff_summary, temp_dir)
    _write_duck_db(temp_dir, data_diff_path, sample_table_paths)
    base64_report = encode_file_to_base64_string(_get_db_path(temp_dir))
    report_template = read_resource("templates/diff_report.html")
    report = report_template.replace("{{db_base64}}", base64_report)
    return report
