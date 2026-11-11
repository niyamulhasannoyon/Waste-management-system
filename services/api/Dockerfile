FROM rust:1.83-slim AS builder

WORKDIR /app
COPY Cargo.toml ./
COPY migrations ./migrations
COPY src ./src

RUN cargo build --release \
    && ls -lh /app/target/release/clean-savar-api

FROM debian:bookworm-slim

WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/clean-savar-api /usr/local/bin/clean-savar-api
COPY migrations ./migrations

EXPOSE 8080
CMD ["clean-savar-api"]
