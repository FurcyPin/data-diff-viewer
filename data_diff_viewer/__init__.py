__version__ = "0.1.0"

from data_diff_viewer.diff_summary import DiffSummary
from data_diff_viewer.package import generate_report
from data_diff_viewer.utils import _ref

PROJECT_NAME = "data-diff-viewer"
PACKAGE_NAME = "data_diff_viewer"

_ref(DiffSummary)
_ref(generate_report)
