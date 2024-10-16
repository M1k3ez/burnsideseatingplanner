from dotenv import load_dotenv
import os


load_dotenv()


class Config:
    SQLALCHEMY_DATABASE_URI = f"sqlite:///{
        os.path.join(os.path.dirname(__file__), 'data.sqlite3')}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
