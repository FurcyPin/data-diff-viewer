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

