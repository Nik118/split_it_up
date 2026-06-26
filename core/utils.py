def fix_database_url(url: str) -> str:
    """
    Transforms a standard PostgreSQL connection string into one compatible
    with asyncpg. Handles:
    - postgres:// -> postgresql+asyncpg://
    - Stripping incompatible query params (sslmode, channel_binding, options)
    - Enforcing ssl=require for Neon/cloud PostgreSQL
    """
    if not url or "postgres" not in url:
        return url

    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

    # Strip all query parameters (like sslmode, channel_binding, options)
    # which crash asyncpg, and explicitly force ssl=require
    if "?" in url:
        url = url.split("?")[0]
    url += "?ssl=require"

    return url
