from dataclasses import dataclass
from typing import Dict, List


@dataclass
class DiffSummary:
    """Summary information of a data-diff."""

    generated_with: str
    """Name and version of the tool used to generate the diff
    Example:
        "spark-frame:0.3.2"
    """

    left_df_alias: str
    """Name of the left DataFrame."""
    right_df_alias: str
    """Name of the right DataFrame."""
    join_cols: List[str]
    """List of columns used to join the DataFrames for the diff."""
    same_schema: bool
    """True if both DataFrames have the same schema."""
    schema_diff_str: str
    """Diff of the string representation of the DataFrames schemas.

    Example:
    If we compare two DataFrames with columns [id, a, b, c] and [id, b, a, d],
    then the schema_diff_str will look like this:

    .. code-block::

        @@ -1,4 +1,4 @@

         id INT
        +b INT
         a INT
        -b INT
        -c INT
        +d INT
    """
    column_names_diff: Dict[str, str]
    """List of all column names present in the DataFrames, with an indicator
    whether it exists in both DataFrames (" "), only in the left DataFrame("-")
    or only in the right DataFrame ("+").

    Example:
    If we compare two DataFrames with columns [id, a, b, c] and [id, b, a, d],
    then the column_names_diff will be {'id': ' ', 'a': ' ', 'b': ' ', 'c': '-', 'd': '+'}
    """
    same_data: bool
    """True if the two DataFrame contain the same data"""
    total_nb_rows: int
    """Total number of rows in both DataFrames. More precisely, it is the number of rows in the full outer
    join of the two DataFrames using the join_cols."""
