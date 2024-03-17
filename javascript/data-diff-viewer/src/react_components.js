import React from 'react'
import load_diff_report from './load_report.js'
import * as Interactions from './interactions.js'
import * as Diff2Html from 'diff2html/bundles/js/diff2html.min.js'
import 'diff2html/bundles/css/diff2html.min.css'

var current_diff_detail_row = null

function DiffReport() {
  const [diffData, setDiffData] = React.useState(null)

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const diff_report = await load_diff_report()

        /* Uncomment this for debugging */
        // console.log("diff_report", diff_report)
        // window.diff_report = diff_report

        setDiffData({
          report_title: diff_report.report_title,
          diff_summary: diff_report.diff_summary,
          diff_per_col: diff_report.diff_per_col,
        })
      } catch (error) {
        console.error("Error fetching data:", error)
      }
    }

    fetchData()
  }, []); // The empty dependency array ensures that this effect runs once on mount

  if (!diffData) {
    // Data is still being fetched, render a loading state or return null
    return <p>Loading...</p>
  }

  const { report_title, diff_summary, diff_per_col } = diffData

  return (
    <React.Fragment>
      <Title report_title={report_title} />
      <SchemaDiffReport diff_summary={diff_summary} />
      <DataDiffReport report_title={report_title} diff_summary={diff_summary} diff_per_col={diff_per_col} />
    </React.Fragment>
  )
}

function Title({report_title, diff_summary}) {
  return (
    <h1 className="report_title">{report_title}</h1>
  )
}


function SchemaDiffReport({report_title, diff_summary}) {
  return (
    <React.Fragment>
      <div className={`box ${diff_summary.same_schema ? 'green' : 'red'}`}>
        {diff_summary.same_schema ? 'SCHEMA: OK' : 'SCHEMA: CHANGES DETECTED'}
      </div>

      <button className="collapsible" onClick={(e) => Interactions.toggleShowSchema(e.target)}>
        {diff_summary.same_schema ? 'Show Schema' : 'Show Schema Diff'}
      </button>
      {diff_summary.same_schema ? <SameSchemaDetails diff_summary={diff_summary} /> : <DiffSchemaDetails diff_summary={diff_summary} />}
    </React.Fragment>
  )
}

function SameSchemaDetails({diff_summary}) {
  return (
    <div className="content" style={{display: "none"}}>
      <div>
        <div className="d2h-wrapper">
          <div className="d2h-file-wrapper" data-lang="">
            <div className="d2h-file-header">
              <React.Fragment>
                <svg aria-hidden="true" className="d2h-icon" height="16" version="1.1" viewBox="0 0 12 16" width="12">
                  <path d="M6 5H2v-1h4v1zM2 8h7v-1H2v1z m0 2h7v-1H2v1z m0 2h7v-1H2v1z m10-7.5v9.5c0 0.55-0.45 1-1 1H1c-0.55 0-1-0.45-1-1V2c0-0.55 0.45-1 1-1h7.5l3.5 3.5z m-1 0.5L8 2H1v12h10V5z"></path>
                </svg>
                <span className="d2h-file-name">Schema</span>
              </React.Fragment>
            </div>
            <div className="d2h-file-diff">
              <div className="d2h-code-wrapper">
                <table className="d2h-diff-table">
                  <tbody className="d2h-diff-tbody">
                    {
                      diff_summary.schema_diff_str.split("\n").map(
                        (line, id) => <SameSchemaDetailsRow key={id} id={id} line={line} />
                      )
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SameSchemaDetailsRow({line, id}) {
  return (
    <tr>
      <td className="d2h-code-side-linenumber d2h-cntx">
        {id}
      </td>
      <td className="d2h-cntx">
        <div className="d2h-code-side-line d2h-cntx">
          <span className="d2h-code-side-line-prefix">&nbsp;</span>
          <span className="d2h-code-side-line-ctn" style={{userSelect: "text"}}>{line}</span>
        </div>
      </td>
    </tr>
  )
}

function DiffSchemaDetails({diff_summary}) {
  const schemaDiffStr = "--- Schema\n+++ Schema\n" + diff_summary.schema_diff_str

  const diffHtml = Diff2Html.html(schemaDiffStr, {
    drawFileList: false,
    matching: 'lines',
    outputFormat: 'side-by-side',
  })

  return (
    <React.Fragment>
      <div className="content" style={{display: "block"}}>
        <div id="schema_diff" dangerouslySetInnerHTML={{ __html: diffHtml}}></div>
      </div>
      <div>
        <i>
          Columns that changed names are displayed but their values cannot be compared.<br/>
          Columns that changed type have been converted to perform the comparison.
        </i>
      </div>
    </React.Fragment>
  )
}


function DataDiffReport({report_title, diff_summary, diff_per_col}) {

  return (
    <div>
      <div className={`box ${diff_summary.same_data ? 'green' : 'red'}`}>
        {diff_summary.same_data
          ? `DATA: OK (${diff_summary.total_nb_rows})`
          : 'DATA: CHANGES DETECTED'}
      </div>

      <div>
        <button className="button_toggleHideColumnsWithNoChange" onClick={() => Interactions.toggleHideColumnsWithNoChange()}>
          Hide columns with no change
        </button>
        <button className="button_toggleExpandAllDetails" onClick={() => Interactions.toggleExpandAllDetails()}>
          Expand all details
        </button>
      </div>

      <DataDiffTable diff_summary={diff_summary} diff_per_col={diff_per_col} />
    </div>
  )
}

function DataDiffTable({ diff_summary, diff_per_col }) {
  if (diff_summary.total_nb_rows === 0) {
    return <div className="box orange">Both DataFrames are empty</div>
  }

  return (
    <table className="DataDiffTable" style={{ borderSpacing: 0, width: 'auto', display: 'inline-block' }}>
      <tbody className="DataDiffTable_tbody">
        {
          diff_per_col.map(
            (col_diff, id) => <ColumnDiff key={id} col_diff={col_diff} diff_summary={diff_summary} />
          )
        }
      </tbody>
    </table>
  )
}

function ColumnDiff({col_diff, diff_summary}) {

  function sortDiffArray(array) {
    return array.sort((a, b) => {
      return b.nb - a.nb
    })
  }

  const no_change_element = {
        type: 'no_change',
        name: 'Not changed',
        desc: 'Number of values that did not change',
        count: col_diff.counts.no_change,
        diff: sortDiffArray(col_diff.diff.no_change),
        top_title: 'Most frequent identical values',
        pct: (col_diff.counts.no_change / col_diff.counts.total * 100).toFixed(2),
        color: 'green'
      }
  const changed_element = {
        type: 'changed',
        name: 'Changed',
        desc: 'Number of values that changed',
        count: col_diff.counts.changed,
        diff: sortDiffArray(col_diff.diff.changed),
        top_title: 'Most frequent changes',
        pct: (col_diff.counts.changed / col_diff.counts.total * 100).toFixed(2),
        color: 'red'
      }
  const only_in_left_element = {
        type: 'only_in_left',
        name: 'Only in ' + diff_summary.left_df_alias,
        desc: 'Number of values only in ' + diff_summary.left_df_alias,
        count: col_diff.counts.only_in_left,
        diff: sortDiffArray(col_diff.diff.only_in_left),
        top_title: 'Most frequent values in ' + diff_summary.left_df_alias,
        pct: (col_diff.counts.only_in_left / col_diff.counts.total * 100).toFixed(2),
        color: 'blue'
      }
  const only_in_right_element = {
        type: 'only_in_right',
        name: 'Only in ' + diff_summary.right_df_alias,
        desc: 'Number of values only in ' + diff_summary.right_df_alias,
        count: col_diff.counts.only_in_right,
        diff: sortDiffArray(col_diff.diff.only_in_right),
        top_title: 'Most frequent values in ' + diff_summary.right_df_alias,
        pct: (col_diff.counts.only_in_right / col_diff.counts.total * 100).toFixed(2),
        color: 'purple'
      }
  const elements = [no_change_element, changed_element, only_in_left_element, only_in_right_element]

  const title =
    `${no_change_element.name}: ${no_change_element.count} (${no_change_element.pct} %)\n` +
    `${changed_element.name}: ${changed_element.count} (${changed_element.pct} %)\n` +
    `${only_in_left_element.name}: ${only_in_left_element.count} (${only_in_left_element.pct} %)\n` +
    `${only_in_right_element.name}: ${only_in_right_element.count} (${only_in_right_element.pct} %)`

  const no_change = col_diff.counts.no_change === col_diff.counts.total

  return (
    <React.Fragment>
      <ColumnDiffRow col_diff={col_diff} diff_summary={diff_summary} elements={elements} no_change={no_change} />
      <DetailsTable col_diff={col_diff} diff_summary={diff_summary} elements={elements} no_change={no_change} />
    </React.Fragment>
  )
}

function ColumnDiffRow({col_diff, diff_summary, elements, no_change}) {
  return (
    <tr key={col_diff.column_name} className={"ColumnDiffRow " + (no_change ? 'no_change' : '')}>
      <td className="ColumnDiffRow_td left"/>
      <td className={"ColumnDiffRow_td column_name " + (diff_summary.join_cols.includes(col_diff.column_name) ? ' join_column_name' : '')}>
        <pre style={{margin: 0}}>{`${diff_summary.column_names_diff[col_diff.column_name]} ${col_diff.column_name}`}</pre>
      </td>
      <td className="ColumnDiffRow_td chart_bar_container">
        <div className="chart_bar_table_container">
          <table className="chart_bar_table">
            <tbody>
              <tr className="chart_bar_row">
                {elements.map((element, id) => <ChartBar key={id} element={element} col_diff={col_diff}/>)}
              </tr>
            </tbody>
          </table>
          <table className="chart_bar_table_tooltip_text">
            <tbody>
              {elements.map((element, id) => <ChartBarTooltip key={id} element={element}/>)}
            </tbody>
          </table>
        </div>
      </td>
      <td className="ColumnDiffRow_td right"/>
    </tr>
  )
}

function ChartBar({element, col_diff}) {
  return (
    <td
      style={{
        backgroundColor: element.color,
        width: element.count > 0 ? `${Math.max(element.pct, 2.5)}%` : '0%',
        height: '100%',
        padding: 0,
      }}
      onClick={() => Interactions.toggleColumnDetails(col_diff.column_name)}
    ></td>
  )
}

function ChartBarTooltip({element}) {
  return (
    <tr>
      <td style={{ color: element.color }}>
      {element.name}: {element.count} ({element.pct}%)
      </td>
    </tr>
  )
}

function DetailsTable({col_diff, diff_summary, elements, no_change}) {
  return (
    <tr key={col_diff.column_name} className={`details${no_change ? ' no_change' : ''}`} column_name={col_diff.column_name}>
      <td colSpan="4">
        <div className="top_cols_container">
          {elements.map((element, id) => <ElementDetails key={id} col_diff={col_diff} diff_summary={diff_summary} element={element} />)}
        </div>
      </td>
    </tr>
  )
}

function ElementDetails({col_diff, diff_summary, element}) {
  if (element.count === "0") {
    return (<React.Fragment/>)
  }
  return (
    <div key={element.type} className="top_col_table_container">
      <b>{element.top_title}</b>
      <table className="top_col_table">
        <tbody>
          <tr>
              <React.Fragment>
              {element.type === 'changed' && (
                <React.Fragment>
                  <th className="top_col_table_header">{diff_summary.left_df_alias}</th>
                  <th className="top_col_table_header"> </th>
                  <th className="top_col_table_header">{diff_summary.right_df_alias}</th>
                </React.Fragment>
              )}
              {element.type !== 'changed' && (
                <th className="top_col_table_header"> Value </th>
              )}
              <th colSpan="2" className="top_col_table_header">
                Nb occurrences
              </th>
              </React.Fragment>
          </tr>
          {element.diff.map((diff_row, id) => <DiffDetailRow key={id} element={element} col_diff={col_diff} diff_row={diff_row} /> )}
        </tbody>
      </table>
    </div>
  )
}

function DiffDetailRow({element, col_diff, diff_row}) {
  const diff_row_pct = ((diff_row.nb / col_diff.counts.total) * 100).toFixed(2)

  return (
    <tr key={diff_row.value}>
      <React.Fragment>
        <DiffDetailRowValue element={element} diff_row={diff_row}/>
        <td className="top_col_table_div">{diff_row.nb}</td>
        <td className="top_col_table_div">
          <table
            className="top_col_bar_table"
            style={{ width: '100%', borderCollapse: 'collapse' }}
          >
            <tbody>
              <tr style={{ width: '100%', height: '20px' }}>
                <td
                  style={{
                    backgroundColor: element.color,
                    width: `${Math.max(diff_row_pct, 2.5)}px`,
                    height: '100%',
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
  )
}

function DiffDetailRowValue({element, diff_row}) {
  switch (element.type) {
    case 'no_change':
      return (
        <td className="top_col_table_div">
          {diff_row.value == null ? <i>NULL</i> : format_value(diff_row.value)}
        </td>
      )

    case 'changed':
      return(
        <React.Fragment>
          <td className="top_col_table_div">
            {diff_row.left_value == null ? <i>NULL</i> : format_value(diff_row.left_value)}
          </td>
          <td className="top_col_table_div">&#10132;</td>
          <td className="top_col_table_div">
            {diff_row.right_value == null ? <i>NULL</i> : format_value(diff_row.right_value)}
          </td>
        </React.Fragment>
      )

    case 'only_in_left':
      return(
        <td className="top_col_table_div">
          {diff_row.value == null ? <i>NULL</i> : format_value(diff_row.value)}
        </td>
      )

    case 'only_in_right':
      return(
        <td className="top_col_table_div">
          {diff_row.value == null ? <i>NULL</i> : format_value(diff_row.value)}
        </td>
      )
    default:
      return
  } ;
}

function format_value(sample_value) {
  if (typeof sample_value === 'object' && sample_value !== null) {
    return JSON.stringify(sample_value)
  }
  else if (typeof sample_value === 'string' && sample_value !== null) {
    return `"${sample_value}"`
  }
  else if (sample_value !== null) {
    return sample_value.toString()
  }
  else {
    return "NULL"
  }
}

export default DiffReport
