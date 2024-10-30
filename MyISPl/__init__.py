from flask import Flask
from flask_login import LoginManager
from models import db, User
from flask_session import Session
from dotenv import load_dotenv
from redis_extensions import socketio
import os

# Load environment variables from .env file
load_dotenv()


def create_app():
    """
    Flask application factory function.
    Creates and configures the Flask application with all necessary extensions,
    blueprints, and security settings.
    """
    # Initialize core Flask application
    app = Flask(__name__)
    # Load configuration from config.py
    app.config.from_object('config.Config')
    # Set secret key for session management and CSRF protection
    app.secret_key = os.environ.get("SECRET_KEY")
    # Setup SQLAlchemy for database operations
    db.init_app(app)

    # Initialize server-side session handling
    Session(app)

    # Configure Flask-Login for user authentication
    login_manager = LoginManager()
    login_manager.init_app(app)
    # Specify the login view for @login_required decorator
    login_manager.login_view = "auth.login"

    # User loader callback for Flask-Login
    # This callback is used to reload the user object from the user ID stored in the session
    @login_manager.user_loader
    def load_user(provider_id):
        return User.query.filter_by(provider_id=provider_id).first()
    # Initialize SocketIO for real-time communication
    socketio.init_app(app)

    # Import and register blueprints
    from auth import auth_bp 
    from sockets import sockets_bp, start_background_task 
    from administrator import administrator_bp 
    from networkmanager import networkmanager_bp
    from teacher import teacher_bp
    from staff import staff_bp

    # Register all blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(sockets_bp)
    app.register_blueprint(administrator_bp)
    app.register_blueprint(networkmanager_bp)
    app.register_blueprint(teacher_bp)
    app.register_blueprint(staff_bp)

    # Start background task for session monitoring
    start_background_task()

    return app