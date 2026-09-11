from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    database_url: str = "postgresql+psycopg://chungagava:chungagava@localhost:5432/chungagava"

    # Auth
    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    jwt_expires_minutes: int = 60 * 12
    admin_username: str = "admin"
    admin_password_hash: str = ""

    # Geofence
    geofence_country: str = "Kenya"
    geofence_min_lat: float = -4.9
    geofence_max_lat: float = 5.1
    geofence_min_lng: float = 33.5
    geofence_max_lng: float = 41.9

    # OpenAI / LLM
    openai_api_key: str = ""
    openai_chat_model: str = "gpt-4o-mini"
    openai_embedding_model: str = "text-embedding-3-small"

    # Object storage
    s3_endpoint_url: str = "http://localhost:9000"
    s3_access_key: str = "chungagava"
    s3_secret_key: str = "chungagava123"
    s3_bucket: str = "chungagava-uploads"
    s3_region: str = "us-east-1"

    # SMS
    sms_provider: str = "africastalking"
    at_username: str = "sandbox"
    at_api_key: str = ""
    at_sender_id: str = ""
    # Optional shared secret the SMS gateway must send (header X-Webhook-Secret or ?secret=)
    # for the incoming webhook to accept the request. Left blank, the webhook is unauthenticated
    # (fine for sandbox/dev testing against a gateway that can't send custom headers).
    sms_webhook_secret: str = ""

    # Email
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from: str = "noreply@chungagava.ke"

    # CORS
    frontend_origin: str = "http://localhost:3000"

    @property
    def frontend_origins(self) -> list[str]:
        """Comma-separated FRONTEND_ORIGIN support, e.g. for both localhost and a
        NodePort/minikube IP during local k8s development."""
        return [origin.strip() for origin in self.frontend_origin.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
