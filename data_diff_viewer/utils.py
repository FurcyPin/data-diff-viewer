import base64
from pathlib import Path

import pkg_resources


def encode_file_to_base64_string(file_path: Path) -> str:
    """Read a byte file and encode it as base64.

    Args:
        file_path: the file to read

    Returns:
        a Base64 string

    """
    file_text = file_path.read_bytes()
    return base64.b64encode(file_text).decode()


def read_resource(resource_path: str) -> str:
    """Read a resource packaged in this module.

    Args:
        resource_path: Relative path of the resource

    Returns:
        The content of the resource as a string.

    """
    from data_diff_viewer import PACKAGE_NAME

    return pkg_resources.resource_string(PACKAGE_NAME, resource_path).decode("utf-8")


def _ref(_: object) -> None:
    """Dummy function used to prevent 'optimize import' from dropping the methods imported."""
