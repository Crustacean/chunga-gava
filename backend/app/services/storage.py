import uuid

import boto3
from botocore.client import Config

from app.core.config import get_settings

settings = get_settings()

_s3_client = None


def get_s3_client():
    global _s3_client
    if _s3_client is None:
        _s3_client = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint_url,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
            region_name=settings.s3_region,
            config=Config(signature_version="s3v4"),
        )
    return _s3_client


def ensure_bucket() -> None:
    client = get_s3_client()
    try:
        client.head_bucket(Bucket=settings.s3_bucket)
    except Exception:
        client.create_bucket(Bucket=settings.s3_bucket)


def upload_bytes(data: bytes, key_prefix: str, filename: str, content_type: str) -> str:
    """Upload bytes to object storage and return the storage key."""
    ensure_bucket()
    key = f"{key_prefix}/{uuid.uuid4().hex}-{filename}"
    get_s3_client().put_object(Bucket=settings.s3_bucket, Key=key, Body=data, ContentType=content_type)
    return key


def get_object_url(key: str) -> str:
    return f"{settings.s3_endpoint_url}/{settings.s3_bucket}/{key}"


def download_bytes(key: str) -> bytes:
    response = get_s3_client().get_object(Bucket=settings.s3_bucket, Key=key)
    return response["Body"].read()
