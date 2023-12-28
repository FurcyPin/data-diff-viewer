import base64
import importlib
from pathlib import Path
from types import ModuleType

import pkg_resources


def load_external_module(module_name: str) -> ModuleType:
    """Load and return a Python module.

    Raise an exception if it is not installed or does not meet the expected version requirements.

    Args:
        module_name: The name of the module to load.

    Returns:
        module: The loaded Python module.

    Raises:
        ImportError: If the module is not found, does not have a `__version__` attribute, or does not meet
            the expected version requirements.

    Examples:
        >>> load_external_module('platform').__name__
        'platform'

        >>> load_external_module('nonexistent_module')
        Traceback (most recent call last):
            ...
        ImportError: Module 'nonexistent_module' not found.
        To keep spark-frame as light, flexible and secure as possible, it was not included in its dependencies.
        Please add it to your project dependencies to use this method.
    """
    try:
        module = importlib.import_module(module_name)
    except ImportError:
        from data_diff_viewer import PROJECT_NAME

        error_message = (
            f"Module '{module_name}' not found.\n"
            f"To keep {PROJECT_NAME} as light, flexible and secure as possible, "
            "it was not included in its dependencies.\n"
            "Please add it to your project dependencies to use this method."
        )
        raise ImportError(error_message) from None

    return module


def encode_file_to_base64_string(file_path: Path) -> str:
    """Read a byte file and encode it as base64.

    Args:
        file_path: the file to read

    Returns:
        a Base64 string

    """
    with file_path.open("rb") as input_file:
        encoded_string = base64.b64encode(input_file.read())
        return encoded_string.decode()


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
