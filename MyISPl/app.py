from flask import Flask, render_template
from models import db
# User, Classroom, SeatingPlan, UserSeatingPlan, ClassroomSeatingPlan,
# Class, Student, StudentClass, SeatAssignment, Note, AuthenticationToken,
# USER_ROLE, EMAIL_DOMAIN, EXPIRY_STATUS, ACADEMIC_PERFORMANCE, SAC_STATUS
from config import Config

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)


@app.route('/')
def landing_page():
    return render_template('landing_page.html')


@app.route('/dashboard-demo')
def dashboard_demo():
    return render_template('dashboard_demo')


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)
