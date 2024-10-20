from dotenv import load_dotenv
from datetime import timedelta
import redis  # redis cache
import os


load_dotenv()


class Config:
    SQLALCHEMY_DATABASE_URI = f"sqlite:///{
        os.path.join(os.path.dirname(__file__), 'data.sqlite3')}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.getenv('SECRET_KEY') or os.random(64)
    SESSION_TYPE = 'redis'
    SESSION_REDIS = redis.StrictRedis.from_url('redis://localhost:6379')
    SESSION_PERMANENT = True
    PERMANENT_SESSION_LIFETIME = timedelta(hours=1)
    SESSION_USE_SIGNER = True
