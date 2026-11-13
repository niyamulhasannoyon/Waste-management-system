FROM rust:1-slim-bookworm AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*
COPY Cargo.toml ./
COPY migrations ./migrations
COPY src ./src
RUN cargo build --release --bin server

FROM debian:bookworm-slim
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system clean_savar \
    && useradd --system --gid clean_savar --create-home clean_savar \
    && mkdir -p /app/uploads \
    && chown -R clean_savar:clean_savar /app

COPY --from=builder /app/target/release/server /usr/local/bin/clean-savar-api
COPY migrations ./migrations

USER clean_savar
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -sf http://127.0.0.1:8080/api/v1/health || exit 1
CMD ["clean-savar-api"]
