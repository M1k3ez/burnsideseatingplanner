from flask import Blueprint, render_template, redirect, url_for, flash
from flask_login import login_required, current_user
from models import db, User, Class, Student, StudentClass, USER_ROLE
from sqlalchemy.orm import joinedload

teacher_bp = Blueprint('teacher', __name__, url_prefix='/teacher')

@teacher_bp.route('/dashboard')
@login_required
def dashboard():
    user = User.query.filter_by(user_id=current_user.user_id).first()
    if user.role != USER_ROLE["Teacher"]:
        flash("Access denied: You are not authorized to access the Teacher dashboard.", "error")
        return redirect(url_for('landing_page'))
    flash(f"Hello {user.first_name} {user.last_name}, successfully logged in", "success")
    return render_template('teacher/dashboard.html', user=user)

@teacher_bp.route('/students')
@login_required
def view_students():
    # Ensure the current user is a teacher
    teacher = User.query.filter_by(user_id=current_user.user_id).first()
    if teacher.role != USER_ROLE["Teacher"]:
        flash("Access denied: You are not authorized to view students.", "error")
        return redirect(url_for('teacher.dashboard'))
    # Optimized query to get all students for the teacher's classes
    students = (
        db.session.query(Student)
        .join(StudentClass, Student.student_id == StudentClass.student_id)
        .join(Class, StudentClass.class_id == Class.class_id)
        .filter(Class.user_id == teacher.user_id)
        .options(joinedload(Student.student_classes))
        .distinct()
        .all()
    )
    return render_template('teacher/view_students.html', teacher=teacher, students=students)