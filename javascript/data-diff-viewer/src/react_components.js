import PropTypes from "prop-types";
import * as Diff from "diff";
import React from "react";
import * as report_loader from "./report_loader.js";
import * as Interactions from "./interactions.js";
import * as Diff2Html from "diff2html/bundles/js/diff2html.min.js";
import "diff2html/bundles/css/diff2html.min.css";

/* diff_detail_row currently selected */
var current_diff_detail_row = null;
/* Name of the column corresponding to this row */
var current_column_with_diff_detail = null;

class CustomPropTypes {
  static customType(expectedType) {
    return (propValue, key, componentName, location, propFullName) => {
      let actualType = typeof propValue[key];
      if (actualType !== expectedType) {
        return new Error(
          `Invalid prop \`${propFullName}\` of type \`${actualType}\` supplied to \`${componentName}\`, ` +
            `expected \`${expectedType}\`.`,
        );
      }
    };
  }

  static diff_summary = PropTypes.shape({
    column_names_diff: PropTypes.object.isRequired,
    join_cols: PropTypes.arrayOf(PropTypes.string).isRequired,
    left_df_alias: PropTypes.string.isRequired,
    right_df_alias: PropTypes.string.isRequired,
    same_data: PropTypes.bool.isRequired,
    same_schema: PropTypes.bool.isRequired,
    schema_diff_str: PropTypes.string.isRequired,
    total_nb_rows: PropTypes.number.isRequired,
  });
  static char_diff_change = PropTypes.shape({
    value: PropTypes.string.isRequired,
    removed: PropTypes.bool,
    added: PropTypes.bool,
  });
  static sample_row = PropTypes.instanceOf(Map);
  static diff_row = PropTypes.shape({
    value: PropTypes.any,
    left_value: PropTypes.any,
    right_value: PropTypes.any,
    nb: CustomPropTypes.customType("bigint"),
    sample_ids: PropTypes.object,
  });
  static col_diff = PropTypes.shape({
    column_name: PropTypes.string.isRequired,
    column_number: PropTypes.number.isRequired,
    counts: PropTypes.shape({
      changed: CustomPropTypes.customType("bigint"),
      no_change: CustomPropTypes.customType("bigint"),
      only_in_left: CustomPropTypes.customType("bigint"),
      only_in_right: CustomPropTypes.customType("bigint"),
      total: CustomPropTypes.customType("bigint"),
    }),
    diff: PropTypes.shape({
      changed: PropTypes.object.isRequired,
      no_change: PropTypes.object.isRequired,
      only_in_left: PropTypes.object.isRequired,
      only_in_right: PropTypes.object.isRequired,
    }),
  });
}

function DiffReport() {
  const [diffData, setDiffData] = React.useState(null);
  const [sampleRows, setSampleRows] = React.useState(null);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const diff_report = await report_loader.load_diff_report();

        setDiffData({
          report_title: diff_report.report_title,
          diff_summary: diff_report.diff_summary,
          diff_per_col: diff_report.diff_per_col,
        });
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []); // The empty dependency array ensures that this effect runs once on mount

  const selectDiffDetailRow = async (
    clicked_diff_detail_row,
    selected_diff_row,
    column_name,
  ) => {
    const sampleTableNames = await report_loader.getSampleTableNames();
    if (sampleTableNames.length === 0) {
      return;
    }
    current_column_with_diff_detail = column_name;

    // If a diff_detail_row was already selected, we unselect it.
    if (current_diff_detail_row != null) {
      current_diff_detail_row.classList.toggle("selected");
    }
    // If we click on the row that was already selected, we stop displaying the sample row for it.
    if (clicked_diff_detail_row === current_diff_detail_row) {
      current_diff_detail_row = null;
      setSampleRows(null);
      return;
    } else {
      clicked_diff_detail_row.classList.toggle("selected");
      current_diff_detail_row = clicked_diff_detail_row;
    }
    let sample_data = await report_loader.getSampleData(
      sampleTableNames,
      selected_diff_row["sample_ids"].toArray(),
    );
    let sample_rows_sorted_by_column = sample_data.map(
      (sample_row) =>
        new Map(
          diff_per_col.map((col_diff) => [
            col_diff.column_name,
            sample_row.get(col_diff.column_name),
          ]),
        ),
    );
    setSampleRows(sample_rows_sorted_by_column);
  };

  if (!diffData) {
    // Data is still being fetched, render a loading state or return null
    return <p>Loading...</p>;
  }

  const { report_title, diff_summary, diff_per_col } = diffData;

  return (
    <React.Fragment>
      <Title report_title={report_title} />
      <SchemaDiffReport diff_summary={diff_summary} />
      <DataDiffReport
        report_title={report_title}
        diff_summary={diff_summary}
        diff_per_col={diff_per_col}
        on_select_diff_detail_row={selectDiffDetailRow}
        sample_rows={sampleRows}
      />
    </React.Fragment>
  );
}

Title.propTypes = {
  report_title: PropTypes.string.isRequired,
};
function Title({ report_title }) {
  return <h1 className="report_title">{report_title}</h1>;
}

SchemaDiffReport.propTypes = {
  diff_summary: CustomPropTypes.diff_summary.isRequired,
};
function SchemaDiffReport({ diff_summary }) {
  return (
    <React.Fragment>
      <div className={`box ${diff_summary.same_schema ? "green" : "red"}`}>
        {diff_summary.same_schema ? "SCHEMA: OK" : "SCHEMA: CHANGES DETECTED"}
      </div>

      <button
        className="collapsible"
        onClick={(e) => Interactions.toggleShowSchema(e.target)}
      >
        {diff_summary.same_schema ? "Show Schema" : "Show Schema Diff"}
      </button>
      {diff_summary.same_schema ? (
        <SameSchemaDetails diff_summary={diff_summary} />
      ) : (
        <DiffSchemaDetails diff_summary={diff_summary} />
      )}
    </React.Fragment>
  );
}

SameSchemaDetails.propTypes = {
  diff_summary: CustomPropTypes.diff_summary.isRequired,
};
function SameSchemaDetails({ diff_summary }) {
  return (
    <div className="content" style={{ display: "none" }}>
      <div>
        <div className="d2h-wrapper">
          <div className="d2h-file-wrapper" data-lang="">
            <div className="d2h-file-header">
              <React.Fragment>
                <svg
                  aria-hidden="true"
                  className="d2h-icon"
                  height="16"
                  version="1.1"
                  viewBox="0 0 12 16"
                  width="12"
                >
                  <path d="M6 5H2v-1h4v1zM2 8h7v-1H2v1z m0 2h7v-1H2v1z m0 2h7v-1H2v1z m10-7.5v9.5c0 0.55-0.45 1-1 1H1c-0.55 0-1-0.45-1-1V2c0-0.55 0.45-1 1-1h7.5l3.5 3.5z m-1 0.5L8 2H1v12h10V5z"></path>
                </svg>
                <span className="d2h-file-name">Schema</span>
              </React.Fragment>
            </div>
            <div className="d2h-file-diff">
              <div className="d2h-code-wrapper">
                <table className="d2h-diff-table">
                  <tbody className="d2h-diff-tbody">
                    {diff_summary.schema_diff_str
                      .split("\n")
                      .map((line, id) => (
                        <SameSchemaDetailsRow key={id} id={id} line={line} />
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

SameSchemaDetailsRow.propTypes = {
  line: PropTypes.string.isRequired,
  id: PropTypes.number.isRequired,
};
function SameSchemaDetailsRow({ line, id }) {
  return (
    <tr>
      <td className="d2h-code-side-linenumber d2h-cntx">{id}</td>
      <td className="d2h-cntx">
        <div className="d2h-code-side-line d2h-cntx">
          <span className="d2h-code-side-line-prefix">&nbsp;</span>
          <span
            className="d2h-code-side-line-ctn"
            style={{ userSelect: "text" }}
          >
            {line}
          </span>
        </div>
      </td>
    </tr>
  );
}

DiffSchemaDetails.propTypes = {
  diff_summary: CustomPropTypes.diff_summary.isRequired,
};
function DiffSchemaDetails({ diff_summary }) {
  const schemaDiffStr =
    "--- Schema\n+++ Schema\n" + diff_summary.schema_diff_str;

  const diffHtml = Diff2Html.html(schemaDiffStr, {
    drawFileList: false,
    matching: "lines",
    outputFormat: "side-by-side",
  });

  return (
    <React.Fragment>
      <div className="content" style={{ display: "block" }}>
        <div
          id="schema_diff"
          dangerouslySetInnerHTML={{ __html: diffHtml }}
        ></div>
      </div>
      <div>
        <i>
          Columns that changed names are displayed but their values cannot be
          compared.
          <br />
          Columns that changed type have been converted to perform the
          comparison.
        </i>
      </div>
    </React.Fragment>
  );
}

DataDiffReport.propTypes = {
  report_title: PropTypes.string.isRequired,
  diff_summary: CustomPropTypes.diff_summary.isRequired,
  diff_per_col: PropTypes.arrayOf(CustomPropTypes.col_diff).isRequired,
  on_select_diff_detail_row: PropTypes.func.isRequired,
  sample_rows: PropTypes.arrayOf(CustomPropTypes.sample_row),
};
function DataDiffReport({
  report_title,
  diff_summary,
  diff_per_col,
  on_select_diff_detail_row,
  sample_rows,
}) {
  return (
    <div>
      <div className={`box ${diff_summary.same_data ? "green" : "red"}`}>
        {diff_summary.same_data
          ? `DATA: OK (${diff_summary.total_nb_rows})`
          : "DATA: CHANGES DETECTED"}
      </div>

      <div>
        <button
          className="button_toggleHideColumnsWithNoChange"
          onClick={() => Interactions.toggleHideColumnsWithNoChange()}
        >
          Hide columns with no change
        </button>
        <button
          className="button_toggleExpandAllDetails"
          onClick={() => Interactions.toggleExpandAllDetails()}
        >
          Expand all details
        </button>
      </div>

      <DataDiffTable
        diff_summary={diff_summary}
        diff_per_col={diff_per_col}
        on_select_diff_detail_row={on_select_diff_detail_row}
      />
      <SampleDataTable diff_summary={diff_summary} sample_rows={sample_rows} />
    </div>
  );
}

DataDiffTable.propTypes = {
  diff_summary: CustomPropTypes.diff_summary.isRequired,
  diff_per_col: PropTypes.arrayOf(CustomPropTypes.col_diff).isRequired,
  on_select_diff_detail_row: PropTypes.func.isRequired,
};
function DataDiffTable({
  diff_summary,
  diff_per_col,
  on_select_diff_detail_row,
}) {
  if (diff_summary.total_nb_rows === 0) {
    return <div className="box orange">Both DataFrames are empty</div>;
  }

  return (
    <table
      className="DataDiffTable"
      style={{ borderSpacing: 0, width: "auto", display: "inline-block" }}
    >
      <tbody className="DataDiffTable_tbody">
        {diff_per_col.map((col_diff, id) => (
          <ColumnDiff
            key={col_diff.column_number}
            col_diff={col_diff}
            diff_summary={diff_summary}
            on_select_diff_detail_row={on_select_diff_detail_row}
          />
        ))}
      </tbody>
    </table>
  );
}

ColumnDiff.propTypes = {
  col_diff: CustomPropTypes.col_diff.isRequired,
  diff_summary: CustomPropTypes.diff_summary.isRequired,
  on_select_diff_detail_row: PropTypes.func.isRequired,
};
function ColumnDiff({ col_diff, diff_summary, on_select_diff_detail_row }) {
  function sortDiffArray(array) {
    return array.toArray().sort((a, b) => {
      return Number(b.nb) - Number(a.nb);
    });
  }

  const no_change_element = {
    type: "no_change",
    name: "Not changed",
    desc: "Number of values that did not change",
    count: Number(col_diff.counts.no_change),
    diff: sortDiffArray(col_diff.diff.no_change),
    top_title: "Most frequent identical values",
    pct: (
      (Number(col_diff.counts.no_change) / Number(col_diff.counts.total)) *
      100
    ).toFixed(2),
    color: "green",
  };
  const changed_element = {
    type: "changed",
    name: "Changed",
    desc: "Number of values that changed",
    count: Number(col_diff.counts.changed),
    diff: sortDiffArray(col_diff.diff.changed),
    top_title: "Most frequent changes",
    pct: (
      (Number(col_diff.counts.changed) / Number(col_diff.counts.total)) *
      100
    ).toFixed(2),
    color: "red",
  };
  const only_in_left_element = {
    type: "only_in_left",
    name: "Only in " + diff_summary.left_df_alias,
    desc: "Number of values only in " + diff_summary.left_df_alias,
    count: Number(col_diff.counts.only_in_left),
    diff: sortDiffArray(col_diff.diff.only_in_left),
    top_title: "Most frequent values in " + diff_summary.left_df_alias,
    pct: (
      (Number(col_diff.counts.only_in_left) / Number(col_diff.counts.total)) *
      100
    ).toFixed(2),
    color: "blue",
  };
  const only_in_right_element = {
    type: "only_in_right",
    name: "Only in " + diff_summary.right_df_alias,
    desc: "Number of values only in " + diff_summary.right_df_alias,
    count: Number(col_diff.counts.only_in_right),
    diff: sortDiffArray(col_diff.diff.only_in_right),
    top_title: "Most frequent values in " + diff_summary.right_df_alias,
    pct: (
      (Number(col_diff.counts.only_in_right) / Number(col_diff.counts.total)) *
      100
    ).toFixed(2),
    color: "purple",
  };
  const elements = [
    no_change_element,
    changed_element,
    only_in_left_element,
    only_in_right_element,
  ];

  const no_change = col_diff.counts.no_change === col_diff.counts.total;

  return (
    <React.Fragment>
      <ColumnDiffRow
        col_diff={col_diff}
        diff_summary={diff_summary}
        elements={elements}
        no_change={no_change}
      />
      <DetailsTable
        col_diff={col_diff}
        diff_summary={diff_summary}
        elements={elements}
        no_change={no_change}
        on_select_diff_detail_row={on_select_diff_detail_row}
      />
    </React.Fragment>
  );
}

ColumnDiffRow.propTypes = {
  col_diff: CustomPropTypes.col_diff.isRequired,
  diff_summary: CustomPropTypes.diff_summary.isRequired,
  elements: PropTypes.arrayOf(PropTypes.object).isRequired,
  no_change: PropTypes.bool.isRequired,
};
function ColumnDiffRow({ col_diff, diff_summary, elements, no_change }) {
  return (
    <tr
      key={col_diff.column_name}
      className={"ColumnDiffRow " + (no_change ? "no_change" : "")}
    >
      <td className="ColumnDiffRow_td left" />
      <td
        className={
          "ColumnDiffRow_td column_name " +
          (diff_summary.join_cols.includes(col_diff.column_name)
            ? " join_column_name"
            : "")
        }
      >
        <pre
          style={{ margin: 0 }}
        >{`${diff_summary.column_names_diff[col_diff.column_name]} ${col_diff.column_name}`}</pre>
      </td>
      <td className="ColumnDiffRow_td chart_bar_container">
        <div className="chart_bar_table_container">
          <table className="chart_bar_table">
            <tbody>
              <tr className="chart_bar_row">
                {elements.map((element, id) => (
                  <ChartBar key={id} element={element} col_diff={col_diff} />
                ))}
              </tr>
            </tbody>
          </table>
          <table className="chart_bar_table_tooltip_text">
            <tbody>
              {elements.map((element, id) => (
                <ChartBarTooltip key={id} element={element} />
              ))}
            </tbody>
          </table>
        </div>
      </td>
      <td className="ColumnDiffRow_td right" />
    </tr>
  );
}

ChartBar.propTypes = {
  element: PropTypes.object,
  col_diff: CustomPropTypes.col_diff.isRequired,
};
function ChartBar({ element, col_diff }) {
  return (
    <td
      style={{
        backgroundColor: element.color,
        width: element.count > 0 ? `${Math.max(element.pct, 2.5)}%` : "0%",
        height: "100%",
        padding: 0,
      }}
      onClick={() => Interactions.toggleColumnDetails(col_diff.column_name)}
    ></td>
  );
}

ChartBarTooltip.propTypes = {
  element: PropTypes.object,
  col_diff: CustomPropTypes.col_diff,
};
function ChartBarTooltip({ element }) {
  return (
    <tr>
      <td style={{ color: element.color }}>
        {element.name}: {element.count} ({element.pct}%)
      </td>
    </tr>
  );
}

DetailsTable.propTypes = {
  col_diff: CustomPropTypes.col_diff.isRequired,
  diff_summary: CustomPropTypes.diff_summary.isRequired,
  elements: PropTypes.arrayOf(PropTypes.object).isRequired,
  no_change: PropTypes.bool.isRequired,
  on_select_diff_detail_row: PropTypes.func.isRequired,
};
function DetailsTable({
  col_diff,
  diff_summary,
  elements,
  no_change,
  on_select_diff_detail_row,
}) {
  return (
    <tr
      key={col_diff.column_name}
      className={`details${no_change ? " no_change" : ""}`}
      // eslint-disable-next-line react/no-unknown-property
      column_name={col_diff.column_name}
    >
      <td colSpan="4">
        <div className="DetailsTable">
          <div className="top_cols_container">
            {elements.map((element, id) => (
              <ElementDetails
                key={id}
                col_diff={col_diff}
                diff_summary={diff_summary}
                element={element}
                on_select_diff_detail_row={on_select_diff_detail_row}
              />
            ))}
          </div>
        </div>
      </td>
    </tr>
  );
}

ElementDetails.propTypes = {
  col_diff: CustomPropTypes.col_diff.isRequired,
  diff_summary: CustomPropTypes.diff_summary.isRequired,
  element: PropTypes.object.isRequired,
  on_select_diff_detail_row: PropTypes.func.isRequired,
};
function ElementDetails({
  col_diff,
  diff_summary,
  element,
  on_select_diff_detail_row,
}) {
  if (element.count === 0) {
    return <React.Fragment />;
  }
  return (
    <div key={element.type} className="top_col_table_container">
      <b>{element.top_title}</b>
      <table className="top_col_table">
        <tbody>
          <tr>
            <React.Fragment>
              {element.type === "changed" && (
                <React.Fragment>
                  <th className="top_col_table_header">
                    {diff_summary.left_df_alias}
                  </th>
                  <th className="top_col_table_header"> </th>
                  <th className="top_col_table_header">
                    {diff_summary.right_df_alias}
                  </th>
                </React.Fragment>
              )}
              {element.type !== "changed" && (
                <th className="top_col_table_header"> Value </th>
              )}
              <th colSpan="2" className="top_col_table_header">
                Nb occurrences
              </th>
            </React.Fragment>
          </tr>
          {element.diff.map((diff_row, id) => (
            <DiffDetailRow
              key={id}
              col_diff={col_diff}
              diff_row={diff_row}
              element={element}
              on_select_diff_detail_row={on_select_diff_detail_row}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

DiffDetailRow.propTypes = {
  col_diff: CustomPropTypes.col_diff.isRequired,
  diff_row: CustomPropTypes.diff_row.isRequired,
  element: PropTypes.object.isRequired,
  on_select_diff_detail_row: PropTypes.func.isRequired,
};
function DiffDetailRow({
  col_diff,
  diff_row,
  element,
  on_select_diff_detail_row,
}) {
  const diff_row_pct = (
    (Number(diff_row.nb) / Number(col_diff.counts.total)) *
    100
  ).toFixed(2);

  return (
    <tr
      className="top_col_table_row"
      key={diff_row.value}
      onClick={(e) =>
        on_select_diff_detail_row(
          e.currentTarget,
          diff_row,
          col_diff.column_name,
        )
      }
    >
      <React.Fragment>
        <DiffDetailRowValue element={element} diff_row={diff_row} />
        <td className="top_col_table_div">{Number(diff_row.nb)}</td>
        <td className="top_col_table_div">
          <table className="top_col_bar_table">
            <tbody>
              <tr>
                <td
                  style={{
                    backgroundColor: element.color,
                    width: `${Math.max(diff_row_pct, 2.5)}px`,
                    height: "100%",
                    padding: 0,
                  }}
                  title={`${diff_row.nb} (${diff_row_pct}%)`}
                ></td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </td>
      </React.Fragment>
    </tr>
  );
}

DiffDetailRowChanged.propTypes = {
  diff_row: CustomPropTypes.diff_row.isRequired,
};
function DiffDetailRowChanged({ diff_row }) {
  let char_diff = null;
  let left = format_value(diff_row.left_value);
  let right = format_value(diff_row.right_value);
  if ((diff_row.left_value == null) ^ (diff_row.right_value == null)) {
    char_diff = [
      { removed: true, value: left },
      { added: true, value: right },
    ];
  } else {
    char_diff = Diff.diffChars(left, right);
  }
  return (
    <React.Fragment>
      <LeftDiff char_diff={char_diff} className="top_col_table_div" />
      <td className="top_col_table_div">&#10132;</td>
      <RightDiff char_diff={char_diff} className="top_col_table_div" />
    </React.Fragment>
  );
}

DiffDetailRowValue.propTypes = {
  element: PropTypes.object.isRequired,
  diff_row: CustomPropTypes.diff_row.isRequired,
};
function DiffDetailRowValue({ element, diff_row }) {
  switch (element.type) {
    case "no_change":
      return (
        <td className="top_col_table_div">
          {diff_row.value == null ? <i>NULL</i> : format_value(diff_row.value)}
        </td>
      );

    case "changed":
      return <DiffDetailRowChanged diff_row={diff_row} />;

    case "only_in_left":
      return (
        <td className="top_col_table_div">
          {diff_row.value == null ? <i>NULL</i> : format_value(diff_row.value)}
        </td>
      );

    case "only_in_right":
      return (
        <td className="top_col_table_div">
          {diff_row.value == null ? <i>NULL</i> : format_value(diff_row.value)}
        </td>
      );
    default:
      return;
  }
}

function format_value(sample_value) {
  if (typeof sample_value === "object" && sample_value !== null) {
    return JSON.stringify(sample_value);
  } else if (typeof sample_value === "string" && sample_value !== null) {
    return `"${sample_value}"`;
  } else if (sample_value !== null) {
    return sample_value.toString();
  } else {
    return "NULL";
  }
}

SampleDataTable.propTypes = {
  diff_summary: CustomPropTypes.diff_summary.isRequired,
  sample_rows: PropTypes.arrayOf(CustomPropTypes.sample_row),
};
function SampleDataTable({ diff_summary, sample_rows }) {
  if (!sample_rows) {
    // Data is still being fetched, render a loading state or return null
    return;
  }

  return (
    <React.Fragment>
      <div className="box blue">
        Example of row where the selected value appears
      </div>
      <table className="SampleDataTable">
        <thead>
          <tr>
            <th>Column name</th>
            <th>{diff_summary.left_df_alias}</th>
            <th>{diff_summary.right_df_alias}</th>
          </tr>
        </thead>
        <tbody>
          {sample_rows.map((sample_row, id) => (
            <SampleDataRowVertical key={id} sample_row={sample_row} />
          ))}
        </tbody>
      </table>
    </React.Fragment>
  );
}

SampleDataRowVertical.propTypes = {
  sample_row: CustomPropTypes.sample_row.isRequired,
};
function SampleDataRowVertical({ sample_row }) {
  return (
    <React.Fragment>
      {Array.from(sample_row.entries()).map(([col_name, col_diff], id) => (
        <SampleDataRowVerticalCell
          key={id}
          col_name={col_name}
          col_diff={col_diff}
        />
      ))}
    </React.Fragment>
  );
}

LeftDiff.propTypes = {
  char_diff: PropTypes.arrayOf(CustomPropTypes.char_diff_change),
  className: PropTypes.string,
};
function LeftDiff({ char_diff, className = "" }) {
  if (char_diff) {
    const has_change = char_diff.some(
      (change) => change.removed || change.added,
    );
    return (
      <td
        className={"LeftDiff " + className + " " + (has_change ? "change" : "")}
      >
        {char_diff.map((change, id) => (
          <LeftDiffPart key={id} change={change} />
        ))}
      </td>
    );
  } else {
    return <td className={"LeftDiff missing"}></td>;
  }
}

RightDiff.propTypes = {
  char_diff: PropTypes.arrayOf(CustomPropTypes.char_diff_change),
  className: PropTypes.string,
};
function RightDiff({ char_diff, className = "" }) {
  if (char_diff) {
    const has_change = char_diff.some(
      (change) => change.removed || change.added,
    );
    return (
      <td
        className={
          "RightDiff " + className + " " + (has_change ? "change" : "")
        }
      >
        {char_diff.map((change, id) => (
          <RightDiffPart key={id} change={change} />
        ))}
      </td>
    );
  } else {
    return <td className={"RightDiff missing"}></td>;
  }
}

LeftDiffPart.propTypes = {
  change: CustomPropTypes.char_diff_change,
};
function LeftDiffPart({ change }) {
  if (change) {
    if (change.added) {
      return "";
    }
    if (change.removed) {
      return <del>{change.value}</del>;
    }
    return change.value;
  }
  return "";
}

RightDiffPart.propTypes = {
  change: CustomPropTypes.char_diff_change,
};
function RightDiffPart({ change }) {
  if (change) {
    if (change.removed) {
      return "";
    }
    if (change.added) {
      return <ins>{change.value}</ins>;
    }
    return change.value;
  }
  return "";
}

SampleDataRowVerticalCell.propTypes = {
  col_name: PropTypes.string.isRequired,
  col_diff: CustomPropTypes.col_diff,
};
function SampleDataRowVerticalCell({ col_name, col_diff }) {
  let char_diff = null;
  if (col_diff) {
    let left = format_value(col_diff.left_value);
    let right = format_value(col_diff.right_value);
    if ((col_diff.left_value == null) ^ (col_diff.right_value == null)) {
      char_diff = [
        { removed: true, value: left },
        { added: true, value: right },
      ];
    } else {
      char_diff = Diff.diffChars(left, right);
    }
  }

  return (
    <tr
      className={
        "SampleDataRowVerticalCell" +
        (current_column_with_diff_detail === col_name ? " selected" : "") +
        (char_diff ? "" : " missing")
      }
    >
      <td className="column_name">{col_name}</td>
      <LeftDiff char_diff={char_diff} />
      <RightDiff char_diff={char_diff} />
    </tr>
  );
}

SampleDataCell.propTypes = {
  value: PropTypes.string.isRequired,
};
function SampleDataCell({ value }) {
  return <td>{value}</td>;
}

export default DiffReport;
