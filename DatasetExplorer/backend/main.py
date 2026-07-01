from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import io
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for simplicity, but could be SQLite
data_store = {}

@app.post("/upload")
async def upload_csv(file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Invalid file type")
    
    contents = await file.read()
    df = pd.read_csv(io.BytesIO(contents))
    data_store["df"] = df
    
    return {"message": "File uploaded successfully", "rows": len(df)}

@app.get("/rows")
async def get_rows(page: int = 1, limit: int = 10):
    if "df" not in data_store:
        raise HTTPException(status_code=404, detail="No data uploaded")
    
    df = data_store["df"]
    start = (page - 1) * limit
    end = start + limit
    
    rows = df.iloc[start:end].to_dict(orient="records")
    return {"data": rows, "total": len(df)}

@app.post("/ask")
async def ask_question(question: str):
    if "df" not in data_store:
        raise HTTPException(status_code=404, detail="No data uploaded")
    
    # Placeholder for LLM integration
    return {"answer": f"You asked: {question}. I am currently a placeholder, but I have access to {len(data_store['df'])} rows of data."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
