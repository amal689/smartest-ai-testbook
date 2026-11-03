FROM ghcr.io/astral-sh/uv:0.13.6 AS uv
FROM python:3.12-slim
COPY --from=uv /uv /uvx /bin/
WORKDIR /workspace
COPY pyproject.toml uv.lock ./
RUN uv sync --locked
COPY src ./src
COPY tests ./tests
ENV PYTHONPATH=/workspace/src
EXPOSE 3002
CMD ["uv", "run", "--no-sync", "python", "-m", "web_server"]
