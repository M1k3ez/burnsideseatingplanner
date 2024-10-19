import redis
from flask_socketio import SocketIO

# Initialise Redis client for sessions and caching
redis_client = redis.StrictRedis.from_url('redis://localhost:6379')
socketio = SocketIO(message_queue='redis://localhost:6379', async_mode='threading')
