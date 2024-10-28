from dotenv import load_dotenv
from datetime import timedelta
import redis
import os

load_dotenv()

class Config:
    # Database Configuration
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.getenv('SECRET_KEY')
    
    # Redis configuration
    SESSION_TYPE = 'redis'
    SESSION_REDIS = redis.StrictRedis.from_url(
        os.environ.get('AZURE_REDIS_CONNECTIONSTRING', 'redis://localhost:6379'),
        ssl=True if os.environ.get('AZURE_REDIS_CONNECTIONSTRING') else False
    )
    SESSION_PERMANENT = True
    PERMANENT_SESSION_LIFETIME = timedelta(hours=1)
    SESSION_USE_SIGNER = True