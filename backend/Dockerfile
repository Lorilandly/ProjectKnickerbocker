FROM rust:1.83-slim AS builder

WORKDIR /app

COPY Cargo.toml Cargo.lock ./
COPY src ./src
COPY migrations ./migrations

RUN cargo build --release

FROM debian:bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/score-tracker-backend ./score-tracker-backend
COPY --from=builder /app/migrations ./migrations

RUN mkdir -p /app/data

EXPOSE 8080

CMD ["./score-tracker-backend"]
