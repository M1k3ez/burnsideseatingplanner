import os
from dotenv import load_dotenv


load_dotenv()


class Config:
    SQLALCHEMY_DATABASE_URI = ['data.sqlite3.db']
    SQLALCHEMY_TRACK_MODIFICATIONS = False
