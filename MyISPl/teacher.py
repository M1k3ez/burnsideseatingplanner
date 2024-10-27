# At the top, after imports
from flask import Blueprint, render_template, redirect, url_for, flash, request, jsonify, send_file
from flask_login import login_required, current_user
from models import db, User, Class, Student, StudentClass, USER_ROLE, Sac, SACStudent, ACADEMIC_PERFORMANCE, LANGUAGE_PROFICIENCY, Classroom, SeatingPlan, UserSeatingPlan, ClassroomSeatingPlan, Note, SeatingTemplates
from sqlalchemy.orm import joinedload
from io import StringIO, BytesIO
from sockets import socketio
import csv
import logging
import json

# Existing logging setup
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Existing blueprint setup
teacher_bp = Blueprint('teacher', __name__, url_prefix='/teacher')


@teacher_bp.app_template_filter('initials')
def initials_filter(student_id):
    student = Student.query.get(student_id)
    if student:
        return f"{student.first_name[0].upper()}{student.last_name[0].upper()}"
    return ""


@teacher_bp.app_template_filter('full_name')
def full_name_filter(student_id):
    student = Student.query.get(student_id)
    if student:
        return f"{student.first_name} {student.last_name}"
    return ""


@teacher_bp.route('/toolbox')
@login_required
def toolbox():
    user = User.query.filter_by(user_id=current_user.user_id).first()
    if user.role != USER_ROLE["Teacher"]:
        flash("Access denied: You are not authorized to access the Teacher toolbox.", "error")
        return redirect(url_for('landing_page'))
    classes = Class.query.filter_by(user_id=user.user_id).all()
    classrooms = Classroom.query.all()
    return render_template('teacher/toolbox.html', user=user, classes=classes, classrooms=classrooms)


@teacher_bp.route('/students')
@login_required
def view_students_page():
    """Render the students view page"""
    if current_user.role != USER_ROLE["Teacher"]:
        flash("Access denied: You are not authorized to view students.", "error")
        return redirect(url_for('teacher.toolbox'))
    teacher = User.query.filter_by(user_id=current_user.user_id).first()
    # Get all classes for this teacher for the dropdown
    classes = Class.query.filter_by(user_id=teacher.user_id).all()
    return render_template(
        'teacher/view_students.html',
        teacher=teacher,
        classes=classes
    )


@teacher_bp.route('/import_csv', methods=['GET', 'POST'])
@login_required
def import_csv():
    user = User.query.filter_by(user_id=current_user.user_id).first()
    if user.role != USER_ROLE["Teacher"]:
        flash("Access denied: You are not authorized to access the Teacher toolbox.", "error")
        return redirect(url_for('landing_page'))
    if request.method == 'POST':
        logger.info("Import CSV request received")
        if 'csv_file' not in request.files:
            logger.error("No file content")
            return flash("No file content", "error")
        file = request.files['csv_file']
        if file.filename == '':
            logger.error("No file selected")
            return flash("Please select your file", "error")
        if file and allowed_file(file.filename):
            logger.info("CSV import started")
            import_type = request.form.get('import_type', 'kamar')
            logger.info(f"Import type: {import_type}")
            socketio.emit('csv_import_status', {'status': 'Import started...'}, room=current_user.get_id())
            try:
                stream = StringIO(file.stream.read().decode("UTF8"), newline=None)
                csv_reader = csv.reader(stream, delimiter=',')
                if import_type == 'kamar':
                    # Skip the first row for KAMAR CSV
                    next(csv_reader)
                headers = next(csv_reader)
                logger.info(f"CSV Headers: {headers}")
                row_count = 0
                for row in csv_reader:
                    if not row or len(row) == 0:
                        continue
                    logger.debug(f"Processing row: {row}")
                    student_data = dict(zip(headers, row))
                    logger.debug(f"Mapped student data: {student_data}")
                    if import_type == 'kamar':
                        process_kamar_csv_row(student_data, user)
                    elif import_type == 'myispl':
                        process_myispl_csv_row(student_data, user)
                    row_count += 1
                    if row_count % 100 == 0:
                        db.session.commit()
                        socketio.emit('csv_import_progress', {'status': f'{row_count} rows processed'}, to='/')
                logger.info(f"Total rows processed: {row_count}")
                db.session.commit()
                socketio.emit('csv_import_status', {'status': 'Import complete!'}, to='/')
                flash('CSV imported successfully', "success")
            except Exception as e:
                db.session.rollback()
                logger.error(f'Error during CSV import: {str(e)}', exc_info=True)
                socketio.emit('csv_import_status', {'status': f'Import failed: {str(e)}'}, to='/')
            return redirect(url_for('teacher.view_students_page'))
        else:
            logger.error(f"Invalid file type: {file.filename}")
            flash('Invalid file type. Please upload a CSV file.', "error")
            return redirect(request.url)
    return render_template('teacher/view_students.html', teacher=user)



@teacher_bp.route('/export_csv')
@login_required
def export_csv():
    teacher = User.query.filter_by(user_id=current_user.user_id).first()
    if teacher.role != USER_ROLE["Teacher"]:
        flash("Access denied: You are not authorized to export CSV.", "error")
        return redirect(url_for('teacher.toolbox'))
    students = (
        db.session.query(Student)
        .join(StudentClass, Student.student_id == StudentClass.student_id)
        .join(Class, StudentClass.class_id == Class.class_id)
        .filter(Class.user_id == teacher.user_id)
        .options(joinedload(Student.student_classes).joinedload(StudentClass.class_))
        .distinct()
        .all()
    )
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(['Student ID', 'NSN', 'First Name', 'Last Name', 'Gender', 'Academic Performance', 
                     'Language Proficiency', 'Level', 'Form Class', 'Date of Birth', 'Ethnicity L1', 'Ethnicity L2', 'Classes'])
    for student in students:
        classes = [f"{sc.class_.class_name} ({sc.class_.class_code})" for sc in student.student_classes if sc.class_.user_id == teacher.user_id]
        classes_str = '; '.join(classes)
        writer.writerow([
            student.student_id, student.nsn, student.first_name, student.last_name, student.gender,
            student.get_academic_performance(), student.get_language_proficiency(), student.level,
            student.form_class, student.date_of_birth, student.ethnicity_l1, student.ethnicity_l2,
            classes_str
        ])
    output.seek(0)
    return send_file(
        BytesIO(output.getvalue().encode()),
        mimetype='text/csv',
        as_attachment=True,
        download_name=f'{teacher.user_id} student list with classes.csv'
    )


@teacher_bp.route('/seating_plans')
@login_required
def view_seating_plans():
    if current_user.role != USER_ROLE["Teacher"]:
        flash("Access denied: You are not authorized to view seating plans.", "error")
        return redirect(url_for('teacher.toolbox'))
    seating_plans = (SeatingPlan.query
        .join(Class)
        .filter(SeatingPlan.user_id == current_user.user_id)
        .options(
            joinedload(SeatingPlan.class_)
        )
        .order_by(Class.class_name)
        .all())
    return render_template(
        'teacher/seating_plans.html',
        seating_plans=seating_plans
    )


@teacher_bp.route('/create_seating_plan', methods=['POST'])
@login_required
def create_seating_plan():
    try:
        data = request.get_json()
        class_id = data.get('class_id')
        template_id = data.get('template_id')
        new_plan = SeatingPlan(
            class_id=class_id,
            user_id=current_user.user_id
        )
        if template_id:
            template = SeatingTemplates.query.get_or_404(template_id)
            new_plan.layout_data = template.layout_data
        else:
            student_count = StudentClass.query.filter_by(class_id=class_id).count()
            layout = data.get('layout', 'portrait')
            canvas_width = 794 if layout == 'portrait' else 1123
            canvas_height = 1123 if layout == 'portrait' else 794
            default_chairs = generate_default_chairs(canvas_width, canvas_height, student_count)
            new_plan.layout_data = json.dumps({'chairs': default_chairs, 'layoutPreference': layout})
        db.session.add(new_plan)
        db.session.flush()
        if template_id:
            template = SeatingTemplates.query.get(template_id)
            classroom_assoc = ClassroomSeatingPlan(
                classroom_id=template.classroom_id,
                seating_plan_id=new_plan.seating_plan_id
            )
        else:
            classroom_assoc = ClassroomSeatingPlan(
                classroom_id=data.get('classroom_id'),
                seating_plan_id=new_plan.seating_plan_id
            )
        db.session.add(classroom_assoc)
        db.session.commit()
        return jsonify({
            'success': True,
            'seating_plan_id': new_plan.seating_plan_id
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@teacher_bp.route('/edit_seating_plan/<int:plan_id>', methods=['GET'])
@login_required
def edit_seating_plan(plan_id):
    seating_plan = (SeatingPlan.query
        .options(joinedload(SeatingPlan.class_))  # Ensure class relationship is loaded
        .get_or_404(plan_id))
    if str(seating_plan.user_id) != str(current_user.user_id):
        flash('Unauthorized access to this seating plan', 'error')
        return redirect(url_for('teacher.seating_plans'))
    students = (Student.query
        .join(StudentClass)
        .filter(StudentClass.class_id == seating_plan.class_id)
        .all())
    serialized_students = [{
        'student_id': student.student_id,
        'first_name': student.first_name,
        'last_name': student.last_name,
        'photo': student.photo if student.photo else None,
    } for student in students]
    classroom = None
    if seating_plan.classroom_seating_plans:
        classroom = seating_plan.classroom_seating_plans[0].classroom
    if not classroom:
        flash('No classroom assigned to this seating plan', 'error')
        return redirect(url_for('teacher.seating_plans'))
    layout_data = []
    if seating_plan.layout_data:
        try:
            layout_data = json.loads(seating_plan.layout_data)
        except json.JSONDecodeError:
            layout_data = []      
    return render_template(
        'teacher/edit_seating_plan.html',
        seating_plan=seating_plan,
        students=serialized_students,
        layout_data=layout_data,
        classroom=classroom
    )


@teacher_bp.route('/api/seating_plan/<int:plan_id>/layout', methods=['POST'])
@login_required
def save_seating_plan_layout(plan_id):
    seating_plan = SeatingPlan.query.get_or_404(plan_id)
    if str(seating_plan.user_id) != str(current_user.user_id):
        return jsonify({'success': False, 'message': 'Unauthorized access.'}), 403
    data = request.get_json()
    layout_data = data.get('layout_data', {})
    try:
        seating_plan.layout_data = json.dumps(layout_data)
        db.session.commit()
        return jsonify({'success': True}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@teacher_bp.route('/seating_plan/<int:plan_id>/delete', methods=['POST'])
@login_required
def delete_seating_plan(plan_id):
    seating_plan = SeatingPlan.query.get_or_404(plan_id)
    if str(seating_plan.user_id) != str(current_user.user_id):
        flash('Unauthorized access to this seating plan', 'error')
        return redirect(url_for('teacher.view_seating_plans'))
    try:
        db.session.delete(seating_plan)
        db.session.commit()
        flash('Seating plan deleted successfully', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Error deleting seating plan: {str(e)}', 'error')
    return redirect(url_for('teacher.view_seating_plans'))


@teacher_bp.route('/api/student/<int:student_id>/notes', methods=['GET'])
@login_required
def get_student_notes(student_id):
    if current_user.role != USER_ROLE["Teacher"]:
        return jsonify({'error': 'Unauthorized'}), 403
    notes = (Note.query
        .join(User)
        .filter(Note.student_id == student_id)
        .order_by(Note.date_created.desc())
        .all())
    return jsonify({
        'notes': [{
            'note_id': note.note_id,
            'details': note.details,
            'date_created': note.date_created.isoformat(),
            'teacher_name': f"{note.teacher.first_name} {note.teacher.last_name}"
        } for note in notes]
    })


@teacher_bp.route('/api/student/<int:student_id>/notes', methods=['POST'])
@login_required
def add_student_note(student_id):
    if current_user.role != USER_ROLE["Teacher"]:
        return jsonify({'error': 'Unauthorized'}), 403
    data = request.get_json()
    if not data or 'details' not in data:
        return jsonify({'error': 'Missing note details'}), 400
    student = Student.query.get_or_404(student_id)
    note = Note(
        student_id=student_id,
        user_id=current_user.user_id,
        details=data['details']
    )
    try:
        db.session.add(note)
        db.session.commit()
        return jsonify({
            'note': {
                'note_id': note.note_id,
                'details': note.details,
                'date_created': note.date_created.isoformat(),
                'teacher_name': f"{current_user.first_name} {current_user.last_name}"
            }
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@teacher_bp.route('/api/notes/<int:note_id>', methods=['DELETE'])
@login_required
def delete_note(note_id):
    if current_user.role != USER_ROLE["Teacher"]:
        return jsonify({'error': 'Unauthorized'}), 403
    note = Note.query.get_or_404(note_id)
    if str(note.user_id) != str(current_user.user_id):
        return jsonify({'error': 'Unauthorized to delete this note'}), 403
    try:
        db.session.delete(note)
        db.session.commit()
        return jsonify({'message': 'Note deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@teacher_bp.route('/api/classes', methods=['GET'])
@login_required
def get_teacher_classes():
    """Get all classes for the current teacher"""
    if current_user.role != USER_ROLE["Teacher"]:
        return jsonify({'error': 'Unauthorized access'}), 403
    try:
        teacher = User.query.filter_by(user_id=current_user.user_id).first()
        classes = Class.query.filter_by(user_id=teacher.user_id).all()
        return jsonify({
            'success': True,
            'classes': [{
                'class_id': class_.class_id,
                'class_name': class_.class_name,
                'class_code': class_.class_code
            } for class_ in classes]
        })
    except Exception as e:
        logger.error(f"Error fetching teacher classes: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to fetch classes'
        }), 500


@teacher_bp.route('/api/class/<int:class_id>/students', methods=['GET'])
@login_required
def get_class_students(class_id):
    """Get all students for a specific class"""
    if current_user.role != USER_ROLE["Teacher"]:
        return jsonify({'error': 'Unauthorized access'}), 403
    try:
        class_ = Class.query.filter_by(
            class_id=class_id,
            user_id=current_user.user_id
        ).first()
        if not class_:
            return jsonify({
                'success': False,
                'error': 'Class not found or unauthorized'
            }), 404
        students = (
            db.session.query(Student)
            .join(StudentClass, Student.student_id == StudentClass.student_id)
            .outerjoin(SACStudent, Student.student_id == SACStudent.student_id)
            .outerjoin(Sac, SACStudent.sac_id == Sac.sac_id)
            .filter(StudentClass.class_id == class_id)
            .options(
                joinedload(Student.sac_students).joinedload(SACStudent.sac),
                joinedload(Student.student_classes).joinedload(StudentClass.class_)
            )
            .distinct()
            .all()
        )
        return jsonify({
            'success': True,
            'class_info': {
                'class_id': class_.class_id,
                'class_name': class_.class_name,
                'class_code': class_.class_code
            },
            'students': [{
                'student_id': student.student_id,
                'first_name': student.first_name,
                'last_name': student.last_name,
                'photo': student.photo if student.photo else None,
                'gender': student.gender,
                'sac_status': [
                    sac_student.sac.sac_name 
                    for sac_student in student.sac_students
                ] if student.sac_students else [],
                'academic_performance': student.get_academic_performance(),
                'language_proficiency': student.get_language_proficiency()
            } for student in students]
        })
    except Exception as e:
        logger.error(f"Error fetching class students: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to fetch students'
        }), 500


@teacher_bp.route('/api/class/<int:class_id>/students/search')
@login_required
def search_class_students(class_id):
    """Search students within a specific class"""
    if current_user.role != USER_ROLE["Teacher"]:
        return jsonify({'error': 'Unauthorized access'}), 403
    try:
        search_term = request.args.get('q', '').strip()
        if not search_term:
            return jsonify({
                'success': False,
                'error': 'No search term provided'
            }), 400
        class_ = Class.query.filter_by(
            class_id=class_id,
            user_id=current_user.user_id
        ).first()
        if not class_:
            return jsonify({
                'success': False,
                'error': 'Class not found or unauthorized'
            }), 404
        students = (
            db.session.query(Student)
            .join(StudentClass, Student.student_id == StudentClass.student_id)
            .filter(
                StudentClass.class_id == class_id,
                db.or_(
                    Student.first_name.ilike(f'%{search_term}%'),
                    Student.last_name.ilike(f'%{search_term}%'),
                    Student.student_id.ilike(f'%{search_term}%')
                )
            )
            .options(
                joinedload(Student.sac_students).joinedload(SACStudent.sac)
            )
            .distinct()
            .all()
        )
        return jsonify({
            'success': True,
            'students': [{
                'student_id': student.student_id,
                'first_name': student.first_name,
                'last_name': student.last_name,
                'photo': student.photo if student.photo else None,
                'gender': student.gender,
                'academic_performance': student.get_academic_performance(),
                'language_proficiency': student.get_language_proficiency()
            } for student in students]
        })
    except Exception as e:
        logger.error(f"Error searching class students: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to search students'
        }), 500


@teacher_bp.route('/api/sac-options', methods=['GET'])
@login_required
def get_sac_options():
    try:
        sacs = Sac.query.all()
        return jsonify({
            'success': True,
            'sac_options': [{'sac_id': sac.sac_id, 'sac_name': sac.sac_name} for sac in sacs]
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@teacher_bp.route('/api/class/<int:class_id>/students/update', methods=['POST'])
@login_required
def update_class_students(class_id):
    """Update multiple students in a class"""
    if current_user.role != USER_ROLE["Teacher"]:
        return jsonify({'error': 'Unauthorized access'}), 403
    try:
        class_ = Class.query.filter_by(
            class_id=class_id,
            user_id=current_user.user_id
        ).first()
        if not class_:
            return jsonify({
                'success': False,
                'error': 'Class not found or unauthorized'
            }), 404
        updates = request.get_json()
        for student_id, data in updates.items():
            student = Student.query.get(student_id)
            if student:
                student.first_name = data['first_name']
                student.last_name = data['last_name']
                student.gender = data['gender']
                student.academic_performance = int(data['academic_performance'])
                student.language_proficiency = int(data['language_proficiency'])
                SACStudent.query.filter_by(
                    student_id=student.student_id,
                    class_id=class_id
                ).delete()
                for sac_id in data['sac_ids']:
                    new_sac = SACStudent(
                        student_id=student.student_id,
                        class_id=class_id,
                        sac_id=int(sac_id)
                    )
                    db.session.add(new_sac)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Students updated successfully'})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating students: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to update students'
        }), 500


@teacher_bp.route('/templates')
@login_required
def view_templates():
    """View templates for the current teacher"""
    templates = (SeatingTemplates.query.filter_by(user_id=current_user.user_id).order_by(SeatingTemplates.date_created.desc()).all())
    classrooms = Classroom.query.all() 
    return render_template(
        'teacher/view_templates.html',
        templates=templates,
        classrooms=classrooms)


@teacher_bp.route('/templates/create/<classroom_id>')
@login_required
def create_template(classroom_id):
    classroom = Classroom.query.get_or_404(classroom_id)
    layout_data = {'chairs': [], 'layoutPreference': 'portrait'}
    return render_template(
        'teacher/edit_template.html', 
        classroom=classroom,
        layout_data=layout_data
    )


@teacher_bp.route('/templates/<int:template_id>/edit')
@login_required
def edit_template(template_id):
    """Edit an existing template"""
    template = SeatingTemplates.query.get_or_404(template_id)
    if str(template.user_id) != str(current_user.user_id):
        return 403
    classroom = Classroom.query.get_or_404(template.classroom_id)
    try:
        layout_data = json.loads(template.layout_data)
    except Exception as e:
        layout_data = {'chairs': [], 'layoutPreference': 'portrait'}
    return render_template(
        'teacher/edit_template.html',
        template=template,
        classroom=classroom,
        layout_data=layout_data
    )


@teacher_bp.route('/api/templates', methods=['POST'])
@login_required
def create_template_api():
    data = request.get_json()
    template = SeatingTemplates(
        classroom_id=data['classroom_id'],
        user_id=current_user.user_id,
        layout_data=json.dumps(data['layout_data'])
    )
    try:
        db.session.add(template)
        db.session.commit()
        return jsonify({'success': True, 'template_id': template.seating_template_id})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@teacher_bp.route('/api/templates/<int:template_id>', methods=['PUT', 'DELETE'])
@login_required
def manage_template_api(template_id):
    template = SeatingTemplates.query.get_or_404(template_id)
    if str(template.user_id) != str(current_user.user_id):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    if request.method == 'DELETE':
        try:
            db.session.delete(template)
            db.session.commit()
            return jsonify({'success': True})
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'error': str(e)}), 500
    else:  # PUT
        data = request.get_json()
        try:
            template.layout_data = json.dumps(data['layout_data'])
            db.session.commit()
            return jsonify({'success': True})
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'error': str(e)}), 500


@teacher_bp.route('/api/classroom/<classroom_id>/templates')
@login_required
def get_classroom_templates(classroom_id):
    """Get all templates for a specific classroom"""
    try:
        templates = SeatingTemplates.query.filter_by(
            classroom_id=classroom_id,
            user_id=current_user.user_id
        ).order_by(SeatingTemplates.date_created.desc()).all()
        return jsonify({
            'success': True,
            'templates': [{
                'template_id': template.seating_template_id,
                'date_created': template.date_created.isoformat(),
                'classroom_id': template.classroom_id
            } for template in templates]
        })
    except Exception as e:
        logger.error(f"Error fetching templates: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to fetch templates'
        }), 500


def generate_default_chairs(canvas_width, canvas_height, student_count):
    CHAIR_WIDTH = 120
    CHAIR_HEIGHT = 120
    MARGIN = 20
    max_chairs_per_row = (canvas_width - MARGIN) // (CHAIR_WIDTH + MARGIN)
    num_rows = (student_count + max_chairs_per_row - 1) // max_chairs_per_row
    total_width = min(max_chairs_per_row, student_count) * (CHAIR_WIDTH + MARGIN) - MARGIN
    total_height = num_rows * (CHAIR_HEIGHT + MARGIN) - MARGIN
    start_x = (canvas_width - total_width) // 2
    start_y = (canvas_height - total_height) // 2
    chairs = []
    chair_id = 1
    for row in range(num_rows):
        chairs_in_row = min(max_chairs_per_row, student_count - row * max_chairs_per_row)
        for col in range(chairs_in_row):
            chairs.append({
                'id': chair_id,
                'x': start_x + col * (CHAIR_WIDTH + MARGIN),
                'y': start_y + row * (CHAIR_HEIGHT + MARGIN)
            })
            chair_id += 1
    return chairs


def process_kamar_csv_row(student_data, user):
    logger.debug(f"Processing KAMAR row: {student_data}")
    student_id = student_data.get('Number')
    nsn = student_data.get('NSI')
    subject = student_data.get('Subject')
    if not student_id or not subject:
        logger.error(f"Skipping row due to missing Number or Subject: {student_data}")
        return
    logger.debug(f"Processing class: {subject}")
    class_ = Class.query.filter_by(user_id=user.user_id, class_name=subject).first()
    if not class_:
        logger.debug(f"Creating new class: {subject}")
        class_ = Class(user_id=user.user_id, class_name=subject, class_code=subject)
        db.session.add(class_)
    logger.debug(f"Processing student: {student_id}")
    student = Student.query.get(student_id)
    if not student:
        logger.debug(f"Creating new student: {student_id}")
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
        logger.debug(f"Updating existing student: {student_id}")
        student.nsn = nsn
        student.first_name = student_data.get('First Name')
        student.last_name = student_data.get('Last Name')
        student.gender = student_data.get('Gender')
        student.level = student_data.get('Level')
        student.form_class = student_data.get('Tutor')
        student.date_of_birth = student_data.get('Date of Birth')
        student.ethnicity_l1 = student_data.get('Ethnicity (L1)')
        student.ethnicity_l2 = student_data.get('Ethnicity (L2)')
    logger.debug(f"Processing StudentClass relationship: {student_id} - {subject}")
    student_class = StudentClass.query.filter_by(student_id=student_id, class_id=class_.class_id).first()
    if not student_class:
        logger.debug(f"Creating new StudentClass relationship: {student_id} - {subject}")
        student_class = StudentClass(student_id=student_id, class_id=class_.class_id)
        db.session.add(student_class)


def process_myispl_csv_row(student_data, user):
    logger.debug(f"Processing MyISPl row: {student_data}")
    student_id = student_data.get('Student ID')
    nsn = student_data.get('NSN')
    if not student_id or not nsn:
        logger.error(f"Skipping row due to missing Student ID or NSN: {student_data}")
        return
    logger.debug(f"Processing student: {student_id}")
    student = Student.query.get(student_id)
    if not student:
        logger.debug(f"Creating new student: {student_id}")
        student = Student(
            student_id=student_id,
            nsn=nsn,
            first_name=student_data.get('First Name'),
            last_name=student_data.get('Last Name'),
            gender=student_data.get('Gender'),
            level=student_data.get('Level'),
            form_class=student_data.get('Form Class'),
            date_of_birth=student_data.get('Date of Birth'),
            ethnicity_l1=student_data.get('Ethnicity L1'),
            ethnicity_l2=student_data.get('Ethnicity L2'),
            academic_performance=ACADEMIC_PERFORMANCE.get(student_data.get('Academic Performance'), 0),
            language_proficiency=LANGUAGE_PROFICIENCY.get(student_data.get('Language Proficiency'), 0)
        )
        db.session.add(student)
    else:
        logger.debug(f"Updating existing student: {student_id}")
        student.nsn = nsn
        student.first_name = student_data.get('First Name')
        student.last_name = student_data.get('Last Name')
        student.gender = student_data.get('Gender')
        student.level = student_data.get('Level')
        student.form_class = student_data.get('Form Class')
        student.date_of_birth = student_data.get('Date of Birth')
        student.ethnicity_l1 = student_data.get('Ethnicity L1')
        student.ethnicity_l2 = student_data.get('Ethnicity L2')
        student.academic_performance = ACADEMIC_PERFORMANCE.get(student_data.get('Academic Performance'), student.academic_performance)
        student.language_proficiency = LANGUAGE_PROFICIENCY.get(student_data.get('Language Proficiency'), student.language_proficiency)
    classes_str = student_data.get('Classes', '')
    logger.debug(f"Processing classes: {classes_str}")
    if classes_str:
        classes = classes_str.split(';')
        for class_info in classes:
            class_info = class_info.strip()
            if not class_info:
                continue
            class_name, class_code = class_info.split(' (')
            class_code = class_code.rstrip(')')
            logger.debug(f"Processing class: {class_name} ({class_code})")
            class_ = Class.query.filter_by(user_id=user.user_id, class_name=class_name, class_code=class_code).first()
            if not class_:
                logger.debug(f"Creating new class: {class_name} ({class_code})")
                class_ = Class(user_id=user.user_id, class_name=class_name, class_code=class_code)
                db.session.add(class_)
            student_class = StudentClass.query.filter_by(student_id=student.student_id, class_id=class_.class_id).first()
            if not student_class:
                logger.debug(f"Creating new StudentClass relationship: {student_id} - {class_name}")
                student_class = StudentClass(student_id=student.student_id, class_id=class_.class_id)
                db.session.add(student_class)


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in {'csv'}
