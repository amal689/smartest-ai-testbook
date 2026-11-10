FROM ghcr.io/astral-sh/uv:0.13.6 AS uv
FROM python:3.12-slim
COPY --from=uv /uv /uvx /bin/
WORKDIR /workspace
COPY pyproject.toml uv.lock ./
COPY src ./src
RUN uv sync --locked
COPY tests ./tests
EXPOSE 3002
CMD ["uv", "run", "--no-sync", "python", "-m", "smartest_ai_testbook.web_server"]
