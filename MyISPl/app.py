from flask import Flask, render_template

app = Flask(__name__)

app.config.from_object(Config)

db.init_app(app)