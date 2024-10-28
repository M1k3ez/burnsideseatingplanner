import redis
from flask_socketio import SocketIO
import os

# Get Redis connection details from environment
REDIS_CONNECTION_STRING = os.environ.get('AZURE_REDIS_CONNECTIONSTRING', 'redis://localhost:6379')
USE_SSL = 'rediss://' in REDIS_CONNECTION_STRING if REDIS_CONNECTION_STRING else False

# Initialise Redis client
redis_client = redis.StrictRedis.from_url(
    REDIS_CONNECTION_STRING,
    ssl=USE_SSL,
    decode_responses=True
)

# Initialise SocketIO
socketio = SocketIO(
    message_queue=REDIS_CONNECTION_STRING,
    async_mode='threading',
    ssl_verify=False if USE_SSL else None,
    ping_timeout=10,
    ping_interval=25
)