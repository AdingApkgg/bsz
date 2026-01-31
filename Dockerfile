FROM docker.io/library/rust:1.75-slim AS builder

WORKDIR /app

# Cache dependencies
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs && cargo build --release && rm -rf src

# Copy static files (needed for rust-embed)
COPY static ./static

# Build
COPY src ./src
RUN touch src/main.rs && cargo build --release

FROM docker.io/library/debian:bookworm-slim
WORKDIR /app

RUN apt-get update && apt-get install -y ca-certificates curl && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/busuanzi-rs .

# Data directory for persistence
RUN mkdir -p /app/data
WORKDIR /app/data

ENV WEB_ADDRESS=0.0.0.0:8080

EXPOSE 8080

CMD ["/app/busuanzi-rs"]
