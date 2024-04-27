__version__ = "0.3.2"

from data_diff_viewer.diff_summary import DiffSummary
from data_diff_viewer.package import generate_report_string
from data_diff_viewer.utils import _ref

PROJECT_NAME = "data-diff-viewer"
PACKAGE_NAME = "data_diff_viewer"

_ref(DiffSummary)
_ref(generate_report_string)
