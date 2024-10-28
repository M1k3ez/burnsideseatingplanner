from flask import Flask
from flask_login import LoginManager
from models import db, User
from flask_session import Session
from dotenv import load_dotenv
from redis_extensions import socketio
import os


load_dotenv()


def create_app():
    app = Flask(__name__)
    app.config.from_object('config.Config')
    app.secret_key = os.environ.get("SECRET_KEY")
    db.init_app(app)
    Session(app)
    login_manager = LoginManager()
    login_manager.init_app(app)
    login_manager.login_view = "auth.login"
    @login_manager.user_loader
    def load_user(provider_id):
        return User.query.filter_by(provider_id=provider_id).first()
    socketio.init_app(app)
    from auth import auth_bp
    from sockets import sockets_bp, start_background_task
    from administrator import administrator_bp
    from networkmanager import networkmanager_bp
    from teacher import teacher_bp
    from staff import staff_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(sockets_bp)
    app.register_blueprint(administrator_bp)
    app.register_blueprint(networkmanager_bp)
    app.register_blueprint(teacher_bp)
    app.register_blueprint(staff_bp)

    # Start the background task for session checking
    start_background_task()

    return app