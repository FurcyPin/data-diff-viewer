# Data Diff Viewer

This project provides a generic interface to visualize data-diff reports generated
by tools like [spark-frame](https://github.com/FurcyPin/spark-frame) 
and [bigquery-frame](https://github.com/FurcyPin/bigquery-frame).

It generates HTML pages containing interactive visualization of a data-diff report.  
**The generated HTML pages are self-contained: they can be opened as local files with a browser,
and work even without any internet connection**. 
They contain all the diff report data and the required dependencies, 
which is why the generated HTML pages may grow to a few MB in some cases.


# How to use it ?

As an end-user of spark-frame or bigquery-frame, this project should automatically 
be used, and you don't have to do anything.

As a developer, if you made a data-diff tool that generates a diff report and want
to use data-diff-viewer to use this project, you can use it like with three steps:

### 1. Create a temporary directory to automatically remove the intermediary files at the end.
### 2. Write the result of your diff as a Parquet file. 
The file must contain one row per column in the DataFrames, and have the following schema:

```
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
```


### 3. Create a DiffSummary object that will contain all the metadata necessary to display the data-diff correctly.   
### 4. Call the `generate_report` method

Here is a code sample to get started (replace the `...` with the correct values):
```python
import tempfile
from pathlib import Path

from data_diff_viewer import generate_report, DiffSummary

diff_per_col_df = ... # The results of your data-diff 
output_file_path = "..." # Path of the HTML file that will be generated
report_title = "..." # The title of your report, it will be displayed at the top of the html page
encoding = "..." # The encoding to use. UTF-8 is recommended.

# 1. Create a temporary directory to automatically remove the intermediary files at the end.
with tempfile.TemporaryDirectory() as temp_dir:
    diff_per_col_parquet_path = f"{temp_dir}/diff_per_col"
    
    # 2. Write the result of your data-diff as a Parquet file
    # This syntax works in Spark, you'll have to adapt it to the framework you used to generate the diff
    diff_per_col_df.write.parquet(diff_per_col_parquet_path)
    
    # 3. Create a DiffSummary object that will contain all the metadata necessary to display the data-diff correctly.
    diff_summary = DiffSummary(
        generated_with=...,
        left_df_alias=...,
        right_df_alias=...,
        join_cols=...,
        same_schema=...,
        schema_diff_str=...,
        column_names_diff=...,
        same_data=...,
        total_nb_rows=...,
    )
    generate_report(report_title, diff_summary, Path(temp_dir), output_file_path, encoding)
    print(f"Report exported as {output_file_path}")
```

### 5. (Optional) Displaying sample data

Since version v0.3.0, the `generate_report` method takes a new optional argument called `sample_table_paths`.
This is a list of paths that should point to parquet tables representing samples of rows from the diffed DataFrames.

To use it, two extra elements must be passed to this method.

1 : The optional argument `sample_table_paths` must be passed, it should be a list of paths pointing to one or
several parquet tables. The sample tables should give examples of rows from the original DataFrames being
compared.

- A `__SAMPLE_ID__` column of type STRING that contains a unique identifier for the sample row
- Columns having the same name as the ones from the compared DataFrame, with the following schema:

```
<COL_NAME>: struct (nullable = false)
    |-- left_value: <T> (nullable = true)
    |-- right_value: <T> (nullable = true)
    |-- is_equal: boolean (nullable = true)
    |-- exists_left: boolean (nullable = false)
    |-- exists_right: boolean (nullable = false)
```
where `<COL_NAME>` is the name and `<T>` the type of the corresponding in the compared DataFrame.

_Note: If the name contains the string "__STRUCT__" and "__ARRAY__", they will be replaced with `"."` and `"!"`
  respectively._

2 : The elements of `diff.changed`, `diff.no_change`, `diff.only_in_left` and `diff.only_in_right` arrays
should contain an extra field called "sample_ids" that contains a list of nullable strings
(one for each sample table). Each of those string is either NULL or an id equal to the `__SAMPLE_ID__`
from one of the rows of the corresponding sample table.

_Note: In the simple cases (when the diffed tables are not nested), there is only one sample table.
  But when the diff tables contains arrays of structs that are exploded (if one of the join_cols contains
  an exclamation mark `!`), then we will have one sample table per level of granularity (a.k.a. "shard")._



# How do this project work ?

The `javascript/data-diff-viewer` folder contains a React project with the source code of the HTML page.
This project can is compiled with the `npm run build` command, 
which generates a file `javascript/data-diff-viewer/build/index.html`.

This HTML file is self-contained and all the dependencies it requires are embedded in it,
and contains a `{{db_base64}}` placeholder string where the data of the data-diff report will be embedded. 

The HTML file is included in the `data-diff-viewer` Python package.
When the `data_diff_viewer.generate_report` method is called,
it will create locally a [duckdb](https://duckdb.org/) database file containing
all the data needed for displaying the report, then encode this file as Base64
inside the HTML file, and write the result as a new HTML page at the specified location.


## Changelog

### v0.3.2

Bugfix:
- fix version incompatibility between duckdb and duckdb-wasm which made it not work for displaying details.

### v0.3.1

Bugfix:
- fix crash when the `diff.*` arrays are null.
- fix peformance issue with caching duckdb results.
- fix details not being displayed correctly.


### v0.3.0

Improvements:
- Several improvements in the way the results are displayed.
- Optimized performances.

New features:
- We can now display sample rows when we click on one of the "most frequent value/change".


### v0.2.0

Breaking Changes:
- replaced method `generate_report` with `generate_report_string`: instead of writing directly the report to a file, 
  we now return the full string. This leaves more flexibility, for example to write the report directly on a remote
  file system (like hdfs or s3).

### v0.1.3

- Fixed incorrect packaging from v0.1.1 and v0.1.2

### v0.1.2 (Broken)

This version got deployed with a part missing, please use version v0.1.3 instead

### v0.1.1 (Broken)

This version got deployed with a part missing, please use version v0.1.3 instead

- Added python stubs to be compliant with [PEP 561](https://peps.python.org/pep-0561/)
- Added CI release process

