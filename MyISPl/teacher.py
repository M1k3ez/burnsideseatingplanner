from flask import Blueprint, render_template, redirect, url_for, flash, request, jsonify, send_file
from flask_login import login_required, current_user
from models import db, User, Class, Student, StudentClass, USER_ROLE, Sac, SACStudent, ACADEMIC_PERFORMANCE, LANGUAGE_PROFICIENCY
from sqlalchemy.orm import joinedload
from io import StringIO, BytesIO
from sockets import socketio
import csv
import logging

logging.basicConfig(level=logging.DEBUG)

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

    # Optimized query to get all students for the teacher's classes, including SAC information
    students = (
        db.session.query(Student)
        .join(StudentClass, Student.student_id == StudentClass.student_id)
        .join(Class, StudentClass.class_id == Class.class_id)
        .outerjoin(SACStudent, Student.student_id == SACStudent.student_id)
        .outerjoin(Sac, SACStudent.sac_id == Sac.sac_id)
        .filter(Class.user_id == teacher.user_id)
        .options(
            joinedload(Student.student_classes),
            joinedload(Student.sac_students).joinedload(SACStudent.sac)
        )
        .distinct()
        .all()
    )

    return render_template('teacher/view_students.html', teacher=teacher, students=students)


@teacher_bp.route('/import_csv', methods=['GET', 'POST'])
@login_required
def import_csv():
    user = User.query.filter_by(user_id=current_user.user_id).first()
    if user.role != USER_ROLE["Teacher"]:
        flash("Access denied: You are not authorized to access the Teacher dashboard.", "error")
        return redirect(url_for('landing_page'))
    if request.method == 'POST':
        logging.debug("Import CSV request received")
        if 'csv_file' not in request.files:
            return flash("No file content", "error")
        file = request.files['csv_file']
        if file.filename == '':
            return flash("Please select your file", "error")
        if file and allowed_file(file.filename):
            logging.debug("CSV import started")
            socketio.emit('csv_import_status', {'status': 'Import started...'}, room=current_user.get_id())
            try:
                stream = StringIO(file.stream.read().decode("UTF8"), newline=None)
                csv_reader = csv.reader(stream, delimiter=',')
                # Skip the first row (title row)
                next(csv_reader)
                # Read the second row as the header row
                headers = next(csv_reader)
                logging.debug(f"CSV Headers: {headers}")
                row_count = 0
                # Process each row after the header
                for row in csv_reader:
                    # Skip any empty rows
                    if not row or len(row) == 0:
                        continue
                    logging.debug(f"Processing row: {row}")
                    # Create a dictionary mapping headers to values
                    student_data = dict(zip(headers, row))
                    logging.debug(f"Mapped student data: {student_data}")
                    # Use 'Number' as the student_id and 'NSI' as nsn
                    student_id = student_data.get('Number')  # Now using 'Number' for student_id
                    nsn = student_data.get('NSI')  # Now using 'NSI' for nsn
                    subject = student_data.get('Subject')
                    if not student_id or not subject:
                        logging.error(f"Skipping row due to missing subject or NSI: {student_data}")
                        continue
                    # Find or create the class
                    class_ = Class.query.filter_by(user_id=current_user.user_id, class_name=subject).first()
                    if not class_:
                        class_ = Class(user_id=current_user.user_id, class_name=subject, class_code=subject)
                        db.session.add(class_)
                    # Find or create the student
                    student = Student.query.get(student_id)
                    if not student:
                        student = Student(
                            student_id=student_id,
                            nsn=nsn, 
                            first_name=student_data.get('First Name'),
                            last_name=student_data.get('Last Name'),
                            gender=student_data.get('Gender'),
                            level=student_data.get('Level'),
                            form_class=student_data.get('Tutor'),
                            date_of_birth=student_data.get('Date of Birth'),
                            ethnicity_l1=student_data.get('Ethnicity (L1)'),
                            ethnicity_l2=student_data.get('Ethnicity (L2)'),
                            academic_performance=0,
                            language_proficiency=0 
                        )
                        db.session.add(student)
                    else:
                        student.nsn = nsn  # Update 'NSI' (nsn) if it exists
                        student.first_name = student_data.get('First Name')
                        student.last_name = student_data.get('Last Name')
                        student.gender = student_data.get('Gender')
                        student.level = student_data.get('Level')
                        student.form_class = student_data.get('Tutor')
                        student.date_of_birth = student_data.get('Date of Birth')
                        student.ethnicity_l1 = student_data.get('Ethnicity (L1)')
                        student.ethnicity_l2 = student_data.get('Ethnicity (L2)')
                    # Create or update the StudentClass relationship
                    student_class = StudentClass.query.filter_by(student_id=student_id, class_id=class_.class_id).first()
                    if not student_class:
                        student_class = StudentClass(student_id=student_id, class_id=class_.class_id)
                        db.session.add(student_class)
                    row_count += 1
                    if row_count % 100 == 0:  # Emit progress every 100 rows
                        db.session.commit()  # Commit changes periodically
                        socketio.emit('csv_import_progress', {'status': f'{row_count} rows processed'}, to='/')
                db.session.commit()  # Final commit
                socketio.emit('csv_import_status', {'status': 'Import complete!'}, to='/')
                flash('CSV imported successfully', "success")
            except Exception as e:
                db.session.rollback()
                logging.error(f'Error during CSV import: {str(e)}', exc_info=True)
                socketio.emit('csv_import_status', {'status': f'Import failed: {str(e)}'}, to='/')
            return redirect(url_for('teacher.view_students'))
        else:
            flash('Invalid file type. Please upload a CSV file.', "error")
            return redirect(request.url)
    return render_template('teacher/view_students.html', teacher=teacher)


@teacher_bp.route('/export_csv')
@login_required
def export_csv():
    teacher = User.query.filter_by(user_id=current_user.user_id).first()
    if teacher.role != USER_ROLE["Teacher"]:
        flash("Access denied: You are not authorized to export CSV.", "error")
        return redirect(url_for('teacher.dashboard'))
    students = (
        db.session.query(Student)
        .join(StudentClass, Student.student_id == StudentClass.student_id)
        .join(Class, StudentClass.class_id == Class.class_id)
        .filter(Class.user_id == teacher.user_id)
        .distinct()
        .all()
    )
    output = StringIO()
    writer = csv.writer(output)
    # Write header
    writer.writerow(['Student ID', 'NSN', 'First Name', 'Last Name', 'Gender', 'Academic Performance', 
                     'Language Proficiency', 'Level', 'Form Class', 'Date of Birth', 'Ethnicity L1', 'Ethnicity L2'])
    # Write data
    for student in students:
        writer.writerow([
            student.student_id, student.nsn, student.first_name, student.last_name, student.gender,
            student.get_academic_performance(), student.get_language_proficiency(), student.level,
            student.form_class, student.date_of_birth, student.ethnicity_l1, student.ethnicity_l2
        ])
    output.seek(0)
    return send_file(
        BytesIO(output.getvalue().encode()),
        mimetype='text/csv',
        as_attachment=True,
        download_name=f'{teacher.user_id} student list.csv'
    )


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in {'csv'}