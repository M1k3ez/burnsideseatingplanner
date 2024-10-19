from flask import Flask
from flask_login import LoginManager
from models import db, User
from auth import auth_bp  # Import the auth blueprint
from administrator import administrator_bp
from networkmanager import networkmanager_bp
from teacher import teacher_bp
from staff import staff_bp
import os
from dotenv import load_dotenv

load_dotenv()


def create_app():
    app = Flask(__name__)
    app.config.from_object('config.Config')

    # Setup secret key
    app.secret_key = os.environ.get("SECRET_KEY")

    # Initialize extensions
    db.init_app(app)  # Initialize database

    # Register the auth blueprint for authentication routes
    app.register_blueprint(auth_bp)
    app.register_blueprint(administrator_bp)
    app.register_blueprint(networkmanager_bp)
    app.register_blueprint(teacher_bp)
    app.register_blueprint(staff_bp)

    # Flask-Login setup
    login_manager = LoginManager()
    login_manager.init_app(app)
    login_manager.login_view = "auth.login"  # Redirects to login if user is not logged in

    # Define user loader for Flask-Login
    @login_manager.user_loader
    def load_user(provider_id):
        return User.query.filter_by(provider_id=provider_id).first()
    return app
