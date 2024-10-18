from flask_login import UserMixin

# Simulated in-memory user database
temporary_user_db = {}


class User(UserMixin):
    def __init__(self, id_, first_name, last_name, email):
        self.id = id_
        self.first_name = first_name
        self.last_name = last_name
        self.email = email

    @staticmethod
    def get(user_id):
        """
        Get a user by ID from the mock database.
        """
        print(f"Attempting to fetch user with ID: {user_id}")
        user = temporary_user_db.get(user_id)
        if user:
            print(f"User found: {user.email}")
        else:
            print(f"User with ID {user_id} not found.")
        return user

    @staticmethod
    def create(id_, first_name, last_name, email):
        """
        Create a new user and store it in the mock database.
        """
        print(
            f"Creating user with ID: {id_}, Name: {first_name} {last_name} , Email: {email}")
        new_user = User(id_, first_name, last_name, email)
        temporary_user_db[id_] = new_user
        print(f"User created successfully: {new_user.email}")

    @staticmethod
    def load_by_email(email):
        """
        Load a user by email from the mock database.
        """
        print(f"Attempting to load user by email: {email}")
        for user in temporary_user_db.values():
            if user.email == email:
                print(f"User found: {user.email}")
                print(f"User id: {user.id}")
                print(f"User name: {user.first_name} {user.last_name}")
                return user
        print(f"No user found with email: {email} or with id: {user.id} or with name: {user.first_name} {user.last_name}")
        return None
