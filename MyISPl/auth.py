import os
from flask import Blueprint, redirect, url_for, request, flash
from oauthlib.oauth2 import WebApplicationClient
import requests
from flask_login import login_user, logout_user, current_user
from dotenv import load_dotenv
from user import User

# Create auth Blueprint
auth_bp = Blueprint('auth', __name__)
load_dotenv()

# OAuth2 client setup
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")
GOOGLE_DISCOVERY_URL = "https://accounts.google.com/.well-known/openid-configuration"
client = WebApplicationClient(GOOGLE_CLIENT_ID)
GOOGLE_SCOPES_LIST = (
    "openid",
    "email",
    "profile",
    # "https://www.googleapis.com/auth/admin.directory.user.readonly"
    )
GOOGLE_EMAIL_DOMAINS_ALLOWED = ("burnside.school.nz")


def get_google_provider_cfg():
    return requests.get(GOOGLE_DISCOVERY_URL).json()


@auth_bp.route("/login")
def login():
    if current_user.is_authenticated:
        print(f"current_user: {current_user}, type: {type(current_user)}")
        print(f"current_user.__dict__: {current_user.__dict__}")
        user_role = current_user.get_role()
        print(f"Current user role is: {user_role}")
        if user_role == "Teacher":
            return redirect(url_for('teacher.dashboard'))
        elif user_role == "Network Manager":
            return redirect(url_for('networkmanager.dashboard'))
        elif user_role == "Administrator":
            return redirect(url_for('administrator.dashboard'))
        elif user_role == "Staff":
            return redirect(url_for('staff.dashboard'))
        else:
            # Handle unknown roles
            print(f"Unauthorized role detected: {user_role}")
            flash("Unauthorized role.")
            # Redirect to a page that doesn't cause a loop
            return redirect(url_for("landing_page"))
    # Proceed with OAuth flow for unauthenticated users
    print("User is not authenticated. Starting OAuth flow.")
    google_provider_cfg = get_google_provider_cfg()
    if not google_provider_cfg:
        print("Failed to fetch Google provider configuration.")
        return "Failed to fetch Google provider configuration.", 500
    print("Fetched Google provider configuration.")
    authorization_endpoint = google_provider_cfg.get("authorization_endpoint")
    if not authorization_endpoint:
        print("Authorization endpoint not found in Google provider configuration.")
        return "Authorization endpoint not found.", 500
    request_uri = client.prepare_request_uri(
        authorization_endpoint,
        redirect_uri=url_for("auth.callback", _external=True),
        scope=GOOGLE_SCOPES_LIST,
    )
    print("Prepared request URI for OAuth.")
    return redirect(request_uri)


@auth_bp.route("/auth/login/callback")
def callback():
    # Fetch authorization code from Google
    code = request.args.get("code")
    # Exchange the authorization code for tokens
    google_provider_cfg = requests.get(GOOGLE_DISCOVERY_URL).json()
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
        auth=(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET),
    )
    client.parse_request_body_response(token_response.text)
    # Get user profile information
    userinfo_endpoint = google_provider_cfg["userinfo_endpoint"]
    uri, headers, body = client.add_token(userinfo_endpoint)
    userinfo_response = requests.get(uri, headers=headers)
    if userinfo_response.json().get("email_verified"):
        user_google_id = userinfo_response.json()["sub"]  # Google ID
        user_email = userinfo_response.json()["email"]  # user email
        user_first_name = userinfo_response.json()["given_name"]
        user_last_name = userinfo_response.json()["family_name"]
        # Check if the email domain is allowed
        if not user_email.endswith(GOOGLE_EMAIL_DOMAINS_ALLOWED):
            return f'Hi {user_first_name} {user_last_name}, please use your Burnside High School email'
        email_prefix = user_email.split('@')[0]
        if email_prefix.isalpha():
            return f'Hi {user_first_name} {user_last_name}, you are a student. Please return to the homepage.'
        else:
            # Fetch or create the user in the database
            user = User.get(user_google_id)
            if not user:
                print(f'User does not exist. Creating a new user with ID {user_google_id} - {user_email} - {user_first_name} {user_last_name}')
                User.create(
                    provider_id=user_google_id,  # Google ID
                    first_name=user_first_name,
                    last_name=user_last_name,
                    email=user_email
                )
                user = User.get(user_google_id)
            login_user(user)
            print(f"User {user.email} logged in successfully.")
    user_role = user.get_role()
    print(f"User role is: {user_role} (role value: {user.role})")
    if user_role == "Teacher":
        return redirect(url_for('teacher.dashboard'))
    elif user_role == "Network Manager":
        return redirect(url_for('networkmanager.dashboard'))
    elif user_role == "Administrator":
        return redirect(url_for('administrator.dashboard'))
    elif user_role == "Staff":
        return redirect(url_for('staff.dashboard'))
    else:
        print(f'{"Invalid email, please login again."}')
    return redirect(url_for("landing_page"))


@auth_bp.route("/logout")
def logout():
    logout_user()
    return redirect(url_for("landing_page"))


# def get_user_department(access_token, user_email):
#     directory_endpoint = ("https://admin.googleapis.com/admin/directory/v1/users")
#     headers = {
#         "Authorization": f"Bearer {access_token}",
#         "Accept": "application/json"
#     }
#     params = {
#         "customer": ("burnside.school.nz"),
#         "maxResults": 1,
#         "query": f"email:{user_email}"
#     }
#     response = requests.get(directory_endpoint, headers=headers, params=params)
#     if response.status_code == 200:
#         user_data = response.json().get("users", [])[0]
#         department = user_data.get("orgUnitPath", "Department not found")
#         return department
#     else:
#         return "Unable to fetch department info."
