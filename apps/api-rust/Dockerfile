# Rust HTTP API Server Dockerfile
# 
# 使用方法：
# 从项目根目录构建：docker build -f apps/api-rust/Dockerfile -t grain-api .
# 或从 api-rust 目录构建：docker build -t grain-api .

# ============================================
# 构建阶段
# ============================================
FROM rust:1.83-slim as builder

WORKDIR /build

# 安装构建依赖
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# 复制 Cargo 配置文件（用于依赖缓存）
COPY Cargo.toml Cargo.lock ./

# 复制 rust-core 源码
COPY ../../packages/rust-core ../packages/rust-core

# 复制 api-rust 源码
COPY src ./src

# 构建 release 版本
RUN cargo build --release

# ============================================
# 运行阶段
# ============================================
FROM debian:bookworm-slim

WORKDIR /app

# 安装运行时依赖
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

# 从构建阶段复制二进制文件
COPY --from=builder /build/target/release/grain-api /app/grain-api

# 创建数据目录
RUN mkdir -p /app/data

# 设置环境变量
ENV GRAIN_HOST=0.0.0.0
ENV GRAIN_PORT=3030
ENV RUST_LOG=info

# 暴露端口
EXPOSE 3030

# 运行服务
CMD ["/app/grain-api"]
