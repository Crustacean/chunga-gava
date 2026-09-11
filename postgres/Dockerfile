FROM pgvector/pgvector:pg16

# The base image already ships pgvector; add PostGIS from the PGDG apt repo that
# docker-library/postgres images configure by default.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        postgresql-16-postgis-3 \
        postgresql-16-postgis-3-scripts \
    && rm -rf /var/lib/apt/lists/*

COPY backend/app/db/init_db.sql /docker-entrypoint-initdb.d/01_init.sql
