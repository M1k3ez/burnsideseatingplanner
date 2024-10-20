from flask import render_template
from models import db
from __init__ import create_app
from redis_extensions import socketio


app = create_app()


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


@app.route('/functionalities')
def functionalities():
    return render_template('functionalities.html')


@app.route('/aboutus')
def aboutus():
    return render_template('aboutus.html')


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    socketio.run(app, debug=True)
