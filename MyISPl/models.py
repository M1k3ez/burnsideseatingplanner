from flask_login import UserMixin
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import relationship
from sqlalchemy import ForeignKey, CheckConstraint
from sqlalchemy.ext.associationproxy import association_proxy

db = SQLAlchemy()

# Set user roles and expiry status as global constants
USER_ROLE = {
    "Teacher": 0,
    "HOF": 1,
    "Network Manager": 2,
    "Administrator": 3,
    "Staff": 4,
}

EXPIRY_STATUS = {
    "Expired": 0,
    "Valid": 1,
}

EMAIL_DOMAIN = "@burnside.school.nz"


class User(UserMixin, db.Model):
    __tablename__ = 'USER'
    user_id = db.Column(db.Integer, primary_key=True)
    provider_id = db.Column(db.String(), nullable=False)
    service_provider = db.Column(db.String(), nullable=False)
    first_name = db.Column(db.String(), nullable=False)
    last_name = db.Column(db.String(), nullable=False)
    role = db.Column(db.Integer, nullable=False)
    email = db.Column(db.String(), unique=True, nullable=False)
    date_joined = db.Column(db.String(), nullable=False)

    # EMAIL DOMAIN CONSTRAINT CHECK
    __table_args__ = (
        CheckConstraint(
            f"email LIKE '%{EMAIL_DOMAIN}'", name='email_domain_check'),)

    classes = relationship(
        'Class', back_populates='teacher', cascade='all, delete-orphan')
    notes = relationship(
        'Note', back_populates='teacher', cascade='all, delete-orphan')
    authentication_tokens = relationship(
        'AuthenticationToken', back_populates='user',
        cascade='all, delete-orphan')
    user_seating_plans = relationship(
        'UserSeatingPlan', back_populates='user', cascade='all, delete-orphan')
    seating_plans = association_proxy('user_seating_plans', 'seating_plan')


class AuthenticationToken(db.Model):
    __tablename__ = 'AUTHENTICATION_TOKEN'
    token_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, ForeignKey('USER.user_id'), nullable=False)
    token = db.Column(db.String(), nullable=False)
    expiry_status = db.Column(db.Integer, nullable=False)

    user = relationship('User', back_populates='authentication_tokens')


class Student(db.Model):
    __tablename__ = 'STUDENT'
    student_id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(), nullable=False)
    last_name = db.Column(db.String(), nullable=False)
    photo = db.Column(db.String(), nullable=False)
    SAC_status = db.Column(db.String(), nullable=False)
    academic_performance = db.Column(db.String(), nullable=False)
    language_proficiency = db.Column(db.String(), nullable=False)

    student_classes = relationship(
        'StudentClass', back_populates='student', cascade='all, delete-orphan')
    seat_assignments = relationship(
        'SeatAssignment', back_populates='student',
        cascade='all, delete-orphan')
    notes = relationship(
        'Note', back_populates='student', cascade='all, delete-orphan')


class Class(db.Model):
    __tablename__ = 'CLASS'
    class_id = db.Column(db.Integer, primary_key=True)
    class_code = db.Column(db.String(), unique=True, nullable=False)
    class_name = db.Column(db.String(), nullable=False)
    user_id = db.Column(db.Integer, ForeignKey('USER.user_id'), nullable=False)

    teacher = relationship('User', back_populates='classes')
    seating_plans = relationship(
        'SeatingPlan', back_populates='class_', cascade='all, delete-orphan')
    student_classes = relationship(
        'StudentClass', back_populates='class_', cascade='all, delete-orphan')


class Classroom(db.Model):
    __tablename__ = 'CLASSROOM'
    classroom_id = db.Column(db.String(), primary_key=True)
    room_number = db.Column(db.String(), nullable=False)
    block_name = db.Column(db.String(), nullable=False)
    block_label = db.Column(db.String(), nullable=False)

    classroom_seating_plans = relationship(
        'ClassroomSeatingPlan', back_populates='classroom',
        cascade='all, delete-orphan')
    seating_plans = association_proxy(
        'classroom_seating_plans', 'seating_plan')

    # Classroom ID generator (block_label + room_number)
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.classroom_id = self.classroom_id_generator(
            self.block_label, self.room_number)

    @staticmethod
    def classroom_id_generator(block_label, room_number):
        return f"{block_label}{room_number}"


class Note(db.Model):
    __tablename__ = 'NOTE'
    note_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    student_id = db.Column(
        db.Integer, ForeignKey('STUDENT.student_id'), nullable=False)
    user_id = db.Column(db.Integer, ForeignKey('USER.user_id'), nullable=False)
    date_created = db.Column(db.String(), nullable=False)
    details = db.Column(db.String(), nullable=False)

    student = relationship('Student', back_populates='notes')
    teacher = relationship('User', back_populates='notes')


class SeatingPlan(db.Model):
    __tablename__ = 'SEATING_PLAN'
    seating_plan_id = db.Column(
        db.Integer, primary_key=True, autoincrement=True)
    class_id = db.Column(
        db.Integer, ForeignKey('CLASS.class_id'), nullable=False)
    date_created = db.Column(db.String(), nullable=False)
    layout_data = db.Column(db.Text(), nullable=False)

    class_ = relationship('Class', back_populates='seating_plans')
    seat_assignments = relationship(
        'SeatAssignment', back_populates='seating_plan',
        cascade='all, delete-orphan')
    user_seating_plans = relationship(
        'UserSeatingPlan', back_populates='seating_plan',
        cascade='all, delete-orphan')
    users = association_proxy('user_seating_plans', 'user')
    classroom_seating_plans = relationship(
        'ClassroomSeatingPlan', back_populates='seating_plan',
        cascade='all, delete-orphan')
    classrooms = association_proxy('classroom_seating_plans', 'classroom')


class SeatAssignment(db.Model):
    """
    Join table between SeatingPlan and Student for seat assignments.
    """
    __tablename__ = 'SEAT_ASSIGNMENT'
    seating_plan_id = db.Column(
        db.Integer, ForeignKey('SEATING_PLAN.seating_plan_id'), nullable=False)
    seat_number = db.Column(db.Integer, nullable=False)
    student_id = db.Column(
        db.Integer, ForeignKey('STUDENT.student_id'), nullable=False)

    seating_plan = relationship(
        'SeatingPlan', back_populates='seat_assignments', lazy='subquery')
    student = relationship(
        'Student', back_populates='seat_assignments', lazy='subquery')


class StudentClass(db.Model):
    """
    Join table for Student and Class.
    """
    __tablename__ = 'STUDENTCLASS'
    student_id = db.Column(
        db.Integer, ForeignKey('STUDENT.student_id'), nullable=False)
    class_id = db.Column(
        db.Integer, ForeignKey('CLASS.class_id'), nullable=False)

    student = relationship(
        'Student', back_populates='student_classes', lazy='subquery')
    class_ = relationship(
        'Class', back_populates='student_classes', lazy='subquery')


class ClassroomSeatingPlan(db.Model):
    '''
    Join table between Classroom and SeatingPlan
    '''
    __tablename__ = 'CLASSROOMSEATING_PLAN'
    classroom_id = db.Column(
        db.String(), ForeignKey('CLASSROOM.classroom_id'), nullable=False)
    seating_plan_id = db.Column(
        db.Integer, ForeignKey('SEATING_PLAN.seating_plan_id'), nullable=False)

    classroom = relationship(
        'Classroom', back_populates='classroom_seating_plans', lazy='subquery')
    seating_plan = relationship(
        'SeatingPlan', back_populates='classroom_seating_plans',
        lazy='subquery')


class UserSeatingPlan(db.Model):
    '''
    Join table between User and SeatingPlan
    '''
    __tablename__ = 'USERSEATING_PLAN'
    user_id = db.Column(
        db.Integer, ForeignKey('USER.user_id'), nullable=False)
    seating_plan_id = db.Column(
        db.Integer, ForeignKey('SEATING_PLAN.seating_plan_id'), nullable=False)

    user = relationship(
        'User', back_populates='user_seating_plans')
    seating_plan = relationship(
        'SeatingPlan', back_populates='user_seating_plans')
