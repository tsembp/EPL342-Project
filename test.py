from google.oauth2 import service_account
from googleapiclient.discovery import build

creds = service_account.Credentials.from_service_account_file(
    "C:/Users/35797/.../osrh-drive-sa.json",
    scopes=["https://www.googleapis.com/auth/drive.file"]
)

service = build("drive", "v3", credentials=creds)

resp = service.files().list(
    q="'1ApqeF03-sDZSERAOjRyYNxUyoXa6_hCZ' in parents",
    fields="files(id,name)"
).execute()

print(resp)
