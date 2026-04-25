"""Send daglig nyhetsbrev via Gmail SMTP."""
from __future__ import annotations

import os
import smtplib
import ssl
from datetime import date
from email.message import EmailMessage

SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 465


def _recipients() -> list[str]:
    raw = os.environ.get("RECIPIENTS", "")
    return [addr.strip() for addr in raw.split(",") if addr.strip()]


def send_email(html_body: str, today: date) -> None:
    user = os.environ["SMTP_USER"]
    password = os.environ["SMTP_APP_PASSWORD"]
    recipients = _recipients()
    if not recipients:
        raise RuntimeError("RECIPIENTS-secret er tom")

    msg = EmailMessage()
    msg["Subject"] = f"AI Daily — {today.isoformat()}"
    msg["From"] = user
    msg["To"] = ", ".join(recipients)
    msg.set_content(
        f"AI Daily for {today.isoformat()}.\n\n"
        f"Webutgaven: https://abstinensa.no/ai-daily/{today.year}/{today.month:02d}/{today.day:02d}.html\n"
    )
    msg.add_alternative(html_body, subtype="html")

    context = ssl.create_default_context()
    with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=context) as smtp:
        smtp.login(user, password)
        smtp.send_message(msg)
