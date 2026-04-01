import logging
import sys
from logging.handlers import TimedRotatingFileHandler
from pathlib import Path

# Project root is two levels up from pipeline/utils/
_LOG_DIR = Path(__file__).resolve().parents[2] / "logs"
_file_handler_installed = False


def _install_file_handler() -> None:
    global _file_handler_installed
    if _file_handler_installed:
        return
    _file_handler_installed = True

    _LOG_DIR.mkdir(parents=True, exist_ok=True)
    fh = TimedRotatingFileHandler(
        _LOG_DIR / "pipeline.log",
        when="midnight",
        backupCount=7,
        encoding="utf-8",
    )
    fh.setFormatter(
        logging.Formatter(
            fmt="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
    )
    fh.setLevel(logging.DEBUG)
    logging.getLogger().addHandler(fh)


def get_logger(name: str) -> logging.Logger:
    _install_file_handler()
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(
            logging.Formatter(
                fmt="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
                datefmt="%H:%M:%S",
            )
        )
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
        logger.propagate = True  # allow file handler on root logger to receive records
    return logger
