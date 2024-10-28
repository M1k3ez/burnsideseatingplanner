from flask_login import UserMixin
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import relationship, deferred
from sqlalchemy.sql import expression
from sqlalchemy import ForeignKey, CheckConstraint
from sqlalchemy.ext.associationproxy import association_proxy
from datetime import datetime, timezone
db = SQLAlchemy()

# Set user roles and expiry status as global constants
USER_ROLE = {
    "Teacher": 0,
    "Network Manager": 1,
    "Administrator": 2,
    "Staff": 3,
}

EXPIRY_STATUS = {
    "Expired": 0,
    "Valid": 1
}

LANGUAGE_PROFICIENCY = {
    "NEED TO BE UPDATED BY TEACHER": 0,
    "GOOD ENOUGH FOR COMMUNICATION AND LEARNING": 1,
    "NOT GOOD ENOUGH FOR COMMUNICATION AND LEARNING": 2
}

ACADEMIC_PERFORMANCE = {
    "NEED TO BE UPDATED BY TEACHER": 0,
    "NOT ACHIEVING": 1,
    "ACHIEVING": 2,
    "ACHIEVING WELL": 3,
    "EXCELLING": 4
}

EMAIL_DOMAIN = "@burnside.school.nz"


class User(UserMixin, db.Model):
    __tablename__ = 'USER'
    user_id = db.Column(db.String, primary_key=True)
    provider_id = db.Column(db.String(), nullable=False)
    service_provider = db.Column(db.String(), nullable=False)
    first_name = db.Column(db.String(), nullable=False)
    last_name = db.Column(db.String(), nullable=False)
    role = db.Column(db.Integer, nullable=False)
    email = db.Column(db.String(), unique=True, nullable=False)
    date_joined = db.Column(db.DateTime(), nullable=False,
                            default=datetime.now(timezone.utc))

    # EMAIL DOMAIN CONSTRAINT CHECK
    __table_args__ = (
        CheckConstraint(
            f"email LIKE '%{EMAIL_DOMAIN}'", name='email_domain_check'),)

    def get_role(self):
        """Convert role integer to string based on USER_ROLE mapping."""
        for role_name, role_value in USER_ROLE.items():
            if self.role == role_value:
                return role_name
        return "Unknown"

    def get_id(self):
        return self.provider_id

    classes = relationship(
        'Class', back_populates='teacher', cascade='all, delete-orphan')
    notes = relationship(
        'Note', back_populates='teacher', cascade='all, delete-orphan')
    user_seating_plans = relationship(
        'UserSeatingPlan', back_populates='user', cascade='all, delete-orphan')
    seating_plans = association_proxy('user_seating_plans', 'seating_plan')
    seating_templates = relationship(
        'SeatingTemplates', back_populates='user', cascade='all, delete-orphan')
    student_shoutouts = relationship(
        'StudentShoutoutList', back_populates='user',
        cascade='all, delete-orphan')


class Sac(db.Model):
    __tablename__ = 'SAC'
    sac_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    sac_name = db.Column(db.String(), nullable=False, unique=True)

    sac_students = relationship(
        'SACStudent', back_populates='sac', cascade='all, delete-orphan')


class SACStudent(db.Model):
    __tablename__ = 'SACSTUDENT'
    sac_id = db.Column(db.Integer, ForeignKey('SAC.sac_id'), primary_key=True,
                       nullable=False)
    student_id = db.Column(db.Integer, ForeignKey('STUDENT.student_id'),
                           nullable=False)
    class_id = db.Column(db.Integer, ForeignKey('CLASS.class_id'),
                         nullable=False)

    sac = relationship(
        'Sac', back_populates='sac_students', lazy='subquery')
    student = relationship(
        'Student', back_populates='sac_students', lazy='subquery')
    class_ = relationship(
        'Class', back_populates='sac_students', lazy='subquery')


class Student(db.Model):
    __tablename__ = 'STUDENT'
    student_id = db.Column(db.Integer, primary_key=True)
    nsn = db.Column(db.Integer, unique=True)
    first_name = db.Column(db.String(), nullable=False)
    last_name = db.Column(db.String(), nullable=False)
    gender = db.Column(db.String(), nullable=False)
    photo = deferred(db.Column(db.String(), nullable=True, server_default=expression.null()))
    academic_performance = db.Column(db.Integer, nullable=False)
    language_proficiency = db.Column(db.Integer, nullable=False)
    level = db.Column(db.String(), nullable=True)
    form_class = db.Column(db.String(), nullable=True)
    date_of_birth = db.Column(db.String(), nullable=True)
    ethnicity_l1 = db.Column(db.String(), nullable=True)
    ethnicity_l2 = db.Column(db.String(), nullable=True)

    def get_academic_performance(self):
        """Convert academic performance integer to string based on ACADEMIC_PERFORMANCE mapping."""
        for academic_performance_name, academic_performance_value in ACADEMIC_PERFORMANCE.items():
            if self.academic_performance == academic_performance_value:
                return academic_performance_name
        return "Unknown"

    def get_language_proficiency(self):
        """Convert language proficiency integer to string based on LANGUAGE_PROFICIENCY mapping."""
        for language_proficiency_name, language_proficiency_value in LANGUAGE_PROFICIENCY.items():
            if self.language_proficiency == language_proficiency_value:
                return language_proficiency_name
        return "Unknown"

    student_classes = relationship(
        'StudentClass', back_populates='student', cascade='all, delete-orphan')
    notes = relationship(
        'Note', back_populates='student', cascade='all, delete-orphan')
    sac_students = relationship(
        'SACStudent', back_populates='student', cascade='all, delete-orphan')
    student_shoutouts = relationship(
        'StudentShoutoutList', back_populates='student',
        cascade='all, delete-orphan')


class Class(db.Model):
    __tablename__ = 'CLASS'
    class_id = db.Column(db.Integer, primary_key=True)
    class_code = db.Column(db.String(), unique=True, nullable=False)
    class_name = db.Column(db.String(), nullable=False)
    user_id = db.Column(db.String(), ForeignKey('USER.user_id'),
                        nullable=False)

    teacher = relationship('User', back_populates='classes')
    seating_plans = relationship(
        'SeatingPlan', back_populates='class_', cascade='all, delete-orphan')
    student_classes = relationship(
        'StudentClass', back_populates='class_', cascade='all, delete-orphan')
    sac_students = relationship(
        'SACStudent', back_populates='class_', cascade='all, delete-orphan')
    student_shoutouts = relationship(
        'StudentShoutoutList', back_populates='class_',
        cascade='all, delete-orphan')


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
    seating_templates = relationship(
        'SeatingTemplates', back_populates='classroom', cascade='all, delete-orphan')

    def generate_classroom_id(self):
        return f"{self.block_name}{self.room_number}"

    def __init__(self, **kwargs):
        super(Classroom, self).__init__(**kwargs)
        if not self.classroom_id:
            self.classroom_id = self.generate_classroom_id()

    @staticmethod
    def classroom_id_generator(block_label, room_number):
        return f"{block_label}{room_number}"


class Note(db.Model):
    __tablename__ = 'NOTE'
    note_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    student_id = db.Column(
        db.Integer, ForeignKey('STUDENT.student_id'), nullable=False)
    user_id = db.Column(db.String(), ForeignKey('USER.user_id'),
                        nullable=False)
    date_created = db.Column(db.DateTime, nullable=False, default=datetime.now(timezone.utc))
    details = db.Column(db.String(), nullable=False)

    student = relationship('Student', back_populates='notes')
    teacher = relationship('User', back_populates='notes')


class SeatingTemplates(db.Model):
    __tablename__ = 'SEATING_TEMPLATES'
    seating_template_id = db.Column(
        db.Integer, primary_key=True, autoincrement=True)
    seating_template_name = db.Column(db.String())
    classroom_id = db.Column(
        db.String(), ForeignKey('CLASSROOM.classroom_id'), nullable=False)
    user_id = db.Column(
        db.Integer, ForeignKey('USER.user_id'), nullable=False)
    date_created = db.Column(
        db.DateTime(), nullable=False, default=datetime.now(timezone.utc))
    layout_data = db .Column(
        db.Text(), default='[]', nullable=False)

    classroom = relationship('Classroom', back_populates='seating_templates')
    user = relationship('User', back_populates='seating_templates')


class SeatingPlan(db.Model):
    __tablename__ = 'SEATING_PLAN'
    seating_plan_id = db.Column(
        db.Integer, primary_key=True, autoincrement=True)
    seating_plan_name = db.Column(db.String())
    class_id = db.Column(
        db.Integer, ForeignKey('CLASS.class_id'), nullable=False)
    user_id = db.Column(
        db.Integer, ForeignKey('USER.user_id'), nullable=False)
    date_created = db.Column(db.DateTime(), nullable=False, default=datetime.now(timezone.utc))
    layout_data = db.Column(db.Text(), nullable=False, default='[]')

    class_ = relationship('Class', back_populates='seating_plans')
    user_seating_plans = relationship(
        'UserSeatingPlan', back_populates='seating_plan',
        cascade='all, delete-orphan')
    users = association_proxy('user_seating_plans', 'user')
    classroom_seating_plans = relationship(
        'ClassroomSeatingPlan', back_populates='seating_plan',
        cascade='all, delete-orphan')
    classrooms = association_proxy('classroom_seating_plans', 'classroom')


class ShoutoutList(db.Model):
    __tablename__ = 'SHOUTOUT_LIST'
    shoutout_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    shoutout_category = db.Column(db.String()) 
    shoutout_message = db.Column(db.String())

    student_shoutouts = relationship(
        'StudentShoutoutList', back_populates='shoutout', cascade='all, delete-orphan')


class StudentClass(db.Model):
    """
    Join table for Student and Class.
    """
    __tablename__ = 'STUDENTCLASS'
    student_id = db.Column(
        db.Integer, ForeignKey('STUDENT.student_id'),
        nullable=False, primary_key=True)
    class_id = db.Column(
        db.Integer, ForeignKey('CLASS.class_id'),
        nullable=False, primary_key=True)

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
        db.String(), ForeignKey('CLASSROOM.classroom_id'), nullable=False,
        primary_key=True)
    seating_plan_id = db.Column(
        db.Integer, ForeignKey('SEATING_PLAN.seating_plan_id'),
        primary_key=True, nullable=False)

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
        db.String(), ForeignKey('USER.user_id'), nullable=False,
        primary_key=True)
    seating_plan_id = db.Column(
        db.Integer, ForeignKey('SEATING_PLAN.seating_plan_id'), nullable=False,)

    user = relationship(
        'User', back_populates='user_seating_plans',
        lazy='subquery')
    seating_plan = relationship(
        'SeatingPlan', back_populates='user_seating_plans',
        lazy='subquery')


class StudentShoutoutList(db.Model):
    __tablename__ = 'STUDENTSHOUT_LIST'
    shoutout_id = db.Column(
        db.Integer, ForeignKey('SHOUTOUT_LIST.shoutout_id'), primary_key=True)
    user_id = db.Column(db.Integer, ForeignKey('USER.user_id'))
    class_id = db.Column(db.Integer, ForeignKey('CLASS.class_id'))
    student_id = db.Column(db.Integer, ForeignKey('STUDENT.student_id'))

    shoutout = relationship(
        'ShoutoutList', back_populates='student_shoutouts', lazy='subquery')
    user = relationship(
        'User', back_populates='student_shoutouts', lazy='subquery')
    class_ = relationship(
        'Class', back_populates='student_shoutouts', lazy='subquery')
    student = relationship(
        'Student', back_populates='student_shoutouts', lazy='subquery')
