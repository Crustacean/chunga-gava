-- Enable required PostgreSQL extensions for PostGIS (map coordinates) and pgvector (LLM embeddings).
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;
