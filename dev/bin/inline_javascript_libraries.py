import base64
from pathlib import Path


def encode_file_to_base64_string(file_path: Path) -> str:
    """Read a byte file and encode it as base64.

    Args:
        file_path: the file to read

    Returns:
        a Base64 string

    """
    file_text = file_path.read_bytes()
    return base64.b64encode(file_text).decode()


def main():
    DUCKDB_NPM_DIR = Path("javascript/data-diff-viewer/node_modules/@duckdb/duckdb-wasm/dist/")
    TARGET_DIR = Path("data_diff_viewer/templates")
    target_file = TARGET_DIR / "diff_report.html"

    target_text = target_file.read_text()
    target_text = target_text.replace(
        "{{duckdb_browser_mvp_base64}}",
        encode_file_to_base64_string(DUCKDB_NPM_DIR / "duckdb-mvp.wasm")
    )
    target_text = target_text.replace(
        "{{duckdb_browser_mvp_worker_base64}}",
        encode_file_to_base64_string(DUCKDB_NPM_DIR / "duckdb-browser-mvp.worker.js")
    )

    target_text = target_text.replace(
        "{{duckdb_browser_eh_base64}}",
        encode_file_to_base64_string(DUCKDB_NPM_DIR / "duckdb-eh.wasm")
    )
    target_text = target_text.replace(
        "{{duckdb_browser_eh_worker_base64}}",
        encode_file_to_base64_string(DUCKDB_NPM_DIR / "duckdb-browser-eh.worker.js")
    )
    target_file.write_text(target_text)


if __name__ == "__main__":
    main()

