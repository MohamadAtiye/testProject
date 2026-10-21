from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    llama_base_url: str = "http://127.0.0.1:8080"
    llama_timeout: float = 120.0
    ml_api_key: str = "dev-ml-key"
    model_name: str = "local"

    admin_prompts: str = "persona,domain,admin"
    assist_prompts: str = "assist,assist_goals"

    log_level: str = "info"


settings = Settings()
