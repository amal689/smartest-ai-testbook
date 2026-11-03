import os
import uvicorn

from web_server.app import app

uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "3002")))
