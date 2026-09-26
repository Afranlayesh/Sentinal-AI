import logging
import os
from rich.logging import RichHandler

os.makedirs("logs", exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(message)s",
    handlers=[
        RichHandler(rich_tracebacks=True, show_path=False),
        logging.FileHandler("logs/sentinal.log", encoding="utf-8")
    ]
)

logger = logging.getLogger("sentinal")