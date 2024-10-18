import os
from flask import Blueprint, redirect, url_for, request, flash
from oauthlib.oauth2 import WebApplicationClient
import requests
from flask_login import login_user, logout_user, login_required, current_user
from dotenv import load_dotenv
from user_testing import User

# Create auth Blueprint
auth_bp = Blueprint('auth', __name__)
load_dotenv()

# OAuth2 client setup
CLIENT_ID = os.environ.get("CLIENT_ID")
CLIENT_SECRET = os.environ.get("CLIENT_SECRET")
DISCOVERY_URL = "https://accounts.google.com/.well-known/openid-configuration"
client = WebApplicationClient(CLIENT_ID)


def get_google_provider_cfg():
    return requests.get(DISCOVERY_URL).json()


# Routes for Google OAuth2
@auth_bp.route("/login")
def login():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    google_provider_cfg = get_google_provider_cfg()
    authorization_endpoint = google_provider_cfg["authorization_endpoint"]
    request_uri = client.prepare_request_uri(
        authorization_endpoint,
        redirect_uri=url_for("auth.callback", _external=True),
        scope=["openid", "email", "profile"],
    )
    return redirect(request_uri)


@auth_bp.route("/auth/login/callback")
def callback():
    # Fetch authorization code from Google
    code = request.args.get("code")
    # Exchange the authorization code for tokens
    google_provider_cfg = requests.get(DISCOVERY_URL).json()
    token_endpoint = google_provider_cfg["token_endpoint"] 
    token_url, headers, body = client.prepare_token_request(
        token_endpoint,
        authorization_response=request.url,
        redirect_url=request.base_url,
        code=code,
    )
    token_response = requests.post(
        token_url,
        headers=headers,
        data=body,
        auth=(CLIENT_ID, CLIENT_SECRET),
    )
    client.parse_request_body_response(token_response.text)
    # Get user profile information
    userinfo_endpoint = google_provider_cfg["userinfo_endpoint"]
    uri, headers, body = client.add_token(userinfo_endpoint)
    userinfo_response = requests.get(uri, headers=headers)
    if userinfo_response.json().get("email_verified"):
        user_id = userinfo_response.json()["sub"]  # Google ID
        user_email = userinfo_response.json()["email"]  # user email
        user_first_name = userinfo_response.json()["given_name"]
        user_last_name = userinfo_response.json()["family_name"]
        # Create or fetch the user in the temporary database
        user = User.get(user_id)
        if not user:
            print(f"User does not exist. Creating a new user with ID {user_id} - {user_email} - {user_first_name} {user_last_name}")
            User.create(
                id_=user_id,  # Google ID
                first_name=user_first_name,
                last_name=user_last_name,
                email=user_email)
            user = User.get(user_id)
        else:
            print(f"User with ID {user_id} already exists.")
        login_user(user)
        print(f"User {user.email} logged in successfully.")
        return redirect(url_for("auth.dashboard"))
    else:
        flash(
            "Invalid email, please login again")
        return redirect(url_for("auth.login"))


@auth_bp.route("/dashboard")
@login_required
def dashboard():
    return f"Welcome to your dashboard, {current_user.first_name} {current_user.last_name}"


@auth_bp.route("/logout")
@login_required
def logout():
    logout_user()
    return redirect(url_for("landing_page"))
