from flask_login import UserMixin
from datetime import datetime, timezone
from models import db, User as UserModel


class User(UserMixin):
    def __init__(self, user_id, provider_id, role, first_name, last_name, email):
        self.user_id = user_id
        self.provider_id = provider_id
        self.first_name = first_name
        self.last_name = last_name
        self.email = email
        self.role = role

    @staticmethod
    def split_email(user_email):
        """
        Split email into user_id and email domain.
        """
        user_id = user_email.split('@')[0]  # User ID part before '@'
        return user_id

    @staticmethod
    def get(provider_id):
        """
        Get a user by Google provider ID from the database.
        """
        print(f"Attempting to fetch user with provider ID: {provider_id}")
        user_record = UserModel.query.filter_by(provider_id=provider_id).first()
        if user_record:
            print(f"User found: {user_record.email}")
            return user_record
        else:
            print(f"User with provider ID {provider_id} not found.")
            return None

    @staticmethod
    def create(provider_id, first_name, last_name, email):
        """
        Create a new user and store it in the database.
        """
        user_id = User.split_email(email)  # Split email inside user.py
        print(f"Creating user with ID: {user_id}, Provider ID: {provider_id}, Name: {first_name} {last_name}, Email: {email}")
        new_user = UserModel(
            user_id=user_id,  # ID part before @
            provider_id=provider_id,  # Google ID (sub)
            service_provider="Google",
            first_name=first_name,
            last_name=last_name,
            email=email,
            role=3,  # Default role as 'Staff'
            date_joined=datetime.now(timezone.utc)
        )
        db.session.add(new_user)
        db.session.commit()
        print(f"User created successfully: {new_user.email}")

    @staticmethod
    def load_by_email(email):
        """
        Load a user by email from the database.
        """
        print(f"Attempting to load user by email: {email}")
        user_record = UserModel.query.filter_by(email=email).first()
        if user_record:
            print(f"User found: {user_record.email}")
            return user_record
        else:
            print(f"No user found with email: {email}")
            return None
