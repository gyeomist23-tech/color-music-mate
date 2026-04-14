"""FastAPI 앱 진입점"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.omr import router as omr_router

app = FastAPI(
    title="Color Music Mate - OMR API",
    description="악보 이미지를 색깔악보로 변환하는 API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(omr_router)


@app.get("/")
async def root():
    return {"message": "Color Music Mate OMR API", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "ok"}
