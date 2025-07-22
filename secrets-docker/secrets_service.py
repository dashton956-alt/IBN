from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os
from dotenv import load_dotenv

load_dotenv()
app = FastAPI()

class SecretRequest(BaseModel):
    key: str

@app.post("/get-secret")
def get_secret(req: SecretRequest):
    value = os.getenv(req.key)
    if value is None:
        raise HTTPException(status_code=404, detail="Secret not found")
    return {"value": value}

@app.post("/set-secret")
def set_secret(req: SecretRequest, value: str):
    # For demo only: store in .env (not secure for real prod)
    with open(".env", "a") as f:
        f.write(f"\n{req.key}={value}")
    return {"status": "ok"}
