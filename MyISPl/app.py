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


@app.errorhandler(404)
def page_not_found(e):
    return render_template('/errors/404.html'), 404


@app.errorhandler(400)
def bad_request_error(e):
    return render_template('/errors/400.html'), 400


@app.errorhandler(403)
def forbidden_error(e):
    return render_template('/errors/403.html'), 403


@app.errorhandler(405)
def method_not_allowed_error(e):
    return render_template('/errors/405.html'), 405


@app.errorhandler(500)
def internal_server_error(e):
    return render_template('/errors/500.html'), 500


@app.route('/test500')
def test500():
    return render_template('/errors/500.html')


@app.route('/test403')
def test403():
    return render_template('/errors/403.html')


@app.route('/test405')
def test405():
    return render_template('/errors/405.html')


@app.route('/test400')
def test400():
    return render_template('/errors/400.html')


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    socketio.run(app, debug=False, host='0.0.0.0', port=8000)
