from flask import Blueprint
from flask_socketio import emit, disconnect, join_room, leave_room
from flask_login import current_user, logout_user
from threading import Lock
from datetime import datetime, timedelta, timezone
from redis_extensions import socketio, redis_client

sockets_bp = Blueprint('sockets', __name__)

# Constants
SESSION_DURATION = timedelta(minutes=10)
print(f"SESSION_DURATION: {SESSION_DURATION}")
VERIFICATION_TIMEOUT = timedelta(minutes=10)

# Thread lock
thread = None
thread_lock = Lock()


def get_user_session_key(user_id):
    return f"user_session:{user_id}"


def check_sessions():
    while True:
        socketio.sleep(5)
        now = datetime.now(timezone.utc)
        print(f"Background task is running: Checking sessions at {now.isoformat()}")
        session_keys = redis_client.keys('user_session:*')
        print(f"Found session keys: {session_keys}")
        for key in session_keys:
            user_id = key.decode('utf-8').split(':')[1]
            session_data = redis_client.hgetall(key)
            if not session_data:
                print(f"No session data found for user {user_id}")
                continue
            session_expiry_str = session_data.get(b'session_expiry', None)
            if session_expiry_str is None:
                print(f"No session_expiry found for user {user_id}")
                continue
            session_expiry = datetime.fromisoformat(session_expiry_str.decode('utf-8'))
            print(f"User {user_id} session expiry time: {session_expiry.isoformat()}")
            print(f"Comparing now >= session_expiry: {now >= session_expiry}")
            if now >= session_expiry and b'verification_due' not in session_data:
                # Session expired, prompt for verification
                print(f"Prompting user {user_id} for verification.")
                verification_due = (now + VERIFICATION_TIMEOUT).isoformat()
                redis_client.hset(key, 'verification_due', verification_due)
                print(f"Emitting 'request_verification' event to user {user_id}")
                socketio.emit('request_verification', {'message': 'Please verify your presence by entering your user ID.'}, room=user_id)
            elif b'verification_due' in session_data:
                verification_due_str = session_data[b'verification_due'].decode('utf-8')
                verification_due = datetime.fromisoformat(verification_due_str)
                print(f"User {user_id} verification due time: {verification_due.isoformat()}")
                if now >= verification_due:
                    # Verification failed, force logout
                    print(f"User {user_id} failed to verify. Logging out.")
                    socketio.emit('force_logout', {'reason': 'Failed to verify presence.'}, room=user_id)
                    redis_client.delete(key)
            else:
                print(f"User {user_id} session is still active.")


def start_background_task():
    global thread
    with thread_lock:
        if thread is None:
            thread = socketio.start_background_task(check_sessions)


@socketio.on('connect')
def handle_connect(auth):
    if not current_user.is_authenticated:
        print("User not authenticated in Socket.IO connect.")
        disconnect()
    else:
        user_id = current_user.user_id
        session_key = get_user_session_key(user_id)
        now = datetime.now(timezone.utc)
        session_expiry_time = now + SESSION_DURATION
        session_data = {
            'last_verified': now.isoformat(),
            'session_expiry': session_expiry_time.isoformat(),
        }
        redis_client.hmset(session_key, session_data)
        join_room(user_id)
        print(f'User {user_id} connected via WebSocket at {now.isoformat()}')
        print(f"Session expiry for user {user_id} set to {session_expiry_time.isoformat()}")
        print(f"Session data for user {user_id} saved in Redis: {session_data}")


@socketio.on('disconnect')
def handle_disconnect():
    if current_user.is_authenticated:
        user_id = current_user.user_id
        session_key = get_user_session_key(user_id)
        redis_client.delete(session_key)
        leave_room(user_id)
        print(f'User {user_id} disconnected from WebSocket.')
    else:
        print('An unauthenticated user disconnected.')


start_background_task()


@socketio.on('verify_user')
def handle_verify_user(data):
    if not current_user.is_authenticated:
        disconnect()
        return
    user_id = current_user.user_id
    provided_user_id = data.get('user_id')
    if provided_user_id == user_id:
        # Verification successful
        session_key = get_user_session_key(user_id)
        session_data = {
            'last_verified': datetime.now(timezone.utc).isoformat(),
            'session_expiry': (datetime.now(timezone.utc) + SESSION_DURATION).isoformat(),
        }
        redis_client.hmset(session_key, session_data)
        redis_client.hdel(session_key, 'verification_due')
        emit('verification_success', {'message': 'Verification successful. Session extended.'})
        print(f"User {user_id} verified successfully. Session extended.")
    else:
        # Verification failed
        emit('verification_failed', {'message': 'Incorrect teacher code. You will be logged out in 5 seconds.'}, room=user_id)
        session_key = get_user_session_key(user_id)
        redis_client.delete(session_key)
        logout_user()
        disconnect()
        print(f"User {user_id} failed verification. Logging out.")
