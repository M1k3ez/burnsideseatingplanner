from flask import Flask, render_template
from flask_login import LoginManager
from models import db
from config import Config
from auth import auth_bp
from user import User
import os


app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)
os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'  # disable enforce https


# Initialize Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = "auth.login"

# Import and register the auth blueprint from auth.py
app.register_blueprint(auth_bp)


@login_manager.user_loader
def load_user(user_id):
    return User.get(user_id)


# Main routes
@app.route('/')
def landing_page():
    return render_template('landing_page.html')


@app.route('/public_privacy_policy')
def ppp():
    return render_template('public_privacy_policy.html')


@app.route('/terms_of_service')
def tos():
    return render_template('terms_of_service.html')


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)
