# google_drive_uploader.py
import os
from typing import Tuple

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload

import io

# Load from env vars
SERVICE_ACCOUNT_FILE = os.getenv("GOOGLE_SERVICE_ACCOUNT_FILE", "osrh-drive-sa.json")
DRIVE_PARENT_FOLDER_ID = os.getenv("GOOGLE_DRIVE_PARENT_FOLDER_ID")  # The OSRH_UserDocuments folder

SCOPES = ["https://www.googleapis.com/auth/drive.file"]

_drive_service = None


def get_drive_service():
    global _drive_service
    if _drive_service is None:
        creds = service_account.Credentials.from_service_account_file(
            SERVICE_ACCOUNT_FILE,
            scopes=SCOPES,
        )
        _drive_service = build("drive", "v3", credentials=creds)
    return _drive_service


def upload_user_document(user_id: str, doc_type: str, file_stream, mime_type: str = "application/pdf") -> Tuple[str, str]:
    """
    Uploads a document to Google Drive into the shared project folder.
    Names the file <userId>_<docType>.pdf

    Returns:
        (file_id, public_url)
    """
    drive = get_drive_service()

    file_name = f"{user_id}_{doc_type}.pdf"

    media = MediaIoBaseUpload(
        file_stream,
        mimetype=mime_type,
        resumable=False
    )

    file_metadata = {
        "name": file_name,
        "parents": [DRIVE_PARENT_FOLDER_ID] if DRIVE_PARENT_FOLDER_ID else [],
    }

    created = drive.files().create(
        body=file_metadata,
        media_body=media,
        fields="id, webViewLink, webContentLink"
    ).execute()

    file_id = created["id"]

    # Make it accessible: anyone with link can view
    drive.permissions().create(
        fileId=file_id,
        body={
            "role": "reader",
            "type": "anyone"
        }
    ).execute()

    # You can choose webViewLink or a direct-download style URL:
    web_view_link = created.get("webViewLink")

    # Example alternative:
    # public_url = f"https://drive.google.com/uc?id={file_id}&export=download"

    public_url = web_view_link

    return file_id, public_url
