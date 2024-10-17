from flask import Flask
from models import (
    db, User, Classroom, SeatingPlan, UserSeatingPlan, ClassroomSeatingPlan,
    Class, Student, StudentClass, SeatAssignment, Note, AuthenticationToken,
    USER_ROLE, EMAIL_DOMAIN, EXPIRY_STATUS, ACADEMIC_PERFORMANCE, SAC_STATUS
)
from sqlalchemy import text, func
from config import Config

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)

with app.app_context():
    # Test that database is accessible
    try:
        db.session.execute(text('SELECT 1'))
    except Exception as e:
        print(f"Error connecting to the database: {e}")
        exit(1)

    # Collect all input values at the top
    user_id = str(input("Enter the Teacher Code: "))
    seating_plan_id = str(input("Enter the Seating Plan ID: "))
    classroom_id = str(input("Enter the Classroom ID: "))
    class_id = str(input("Enter the Class ID: "))
    student_id = str(input("Enter the Student ID: "))
    block_label = str(input("Enter the Block Label: "))
    sac_status_input = str(input("Enter the SAC Status (Yes/No): "))

    # Queries to Test Relationships
    user = User.query.get(user_id)
    if user:
        print(f"Here are the user details: {user.user_id}, {user.provider_id}, {user.service_provider}, {user.first_name}, {user.last_name}, {user.get_role()}")
    else:
        print(f"No user found with Teacher Code {user_id}")

    # 1. Get all SeatingPlans associated with a specific User via UserSeatingPlan
    user = User.query.get(user_id)
    if user:
        print(f"Seating Plans associated with User {user.first_name} {user.last_name} (via UserSeatingPlan):")
        for usp in user.user_seating_plans:
            sp = usp.seating_plan
            print(f"- SeatingPlan ID: {sp.seating_plan_id}, Date Created: {sp.date_created}")
    else:
        print(f"No user found with user_id {user_id}")

    # 2. Get all Users associated with a SeatingPlan via UserSeatingPlan
    seating_plan = SeatingPlan.query.get(seating_plan_id)
    if seating_plan:
        print(f"\nUsers associated with SeatingPlan ID {seating_plan_id} (via UserSeatingPlan):")
        for usp in seating_plan.user_seating_plans:
            u = usp.user
            print(f"- User ID: {u.user_id}, Name: {u.first_name} {u.last_name}")
    else:
        print(f"No seating plan found with seating_plan_id {seating_plan_id}")

    # 3. Get all SeatingPlans associated with a specific Classroom via ClassroomSeatingPlan
    classroom = Classroom.query.get(classroom_id)
    if classroom:
        print(f"\nSeating Plans associated with Classroom {classroom.classroom_id} (via ClassroomSeatingPlan):")
        for csp in classroom.classroom_seating_plans:
            sp = csp.seating_plan
            print(f"- SeatingPlan ID: {sp.seating_plan_id}, Date Created: {sp.date_created}")
    else:
        print(f"No classroom found with classroom_id {classroom_id}")

    # 4. Get all Classrooms associated with a specific SeatingPlan via ClassroomSeatingPlan
    if seating_plan:
        print(f"\nClassrooms associated with SeatingPlan ID {seating_plan_id} (via ClassroomSeatingPlan):")
        for csp in seating_plan.classroom_seating_plans:
            c = csp.classroom
            print(f"- Classroom ID: {c.classroom_id}, Room Number: {c.room_number}")
    else:
        print(f"No seating plan found with seating_plan_id {seating_plan_id}")

    # 5. Get all Students in a specific Class via StudentClass
    class_instance = Class.query.get(class_id)
    if class_instance:
        print(f"\nStudents in Class {class_instance.class_code} (via StudentClass):")
        for sc in class_instance.student_classes:
            student = sc.student
            print(f"- Student ID: {student.student_id}, Name: {student.first_name} {student.last_name}")
    else:
        print(f"No class found with class_id {class_id}")

    # 6. Get all Classes a Student is enrolled in via StudentClass
    student = Student.query.get(student_id)
    if student:
        print(f"\nClasses that Student {student.first_name} {student.last_name} is enrolled in (via StudentClass):")
        for sc in student.student_classes:
            cls = sc.class_
            print(f"- Class ID: {cls.class_id}, Class Code: {cls.class_code}, Class Name: {cls.class_name}")
    else:
        print(f"No student found with student_id {student_id}")

    # 7. Get all SeatAssignments in a specific SeatingPlan
    if seating_plan:
        print(f"\nSeat Assignments for SeatingPlan ID {seating_plan_id}:")
        for sa in seating_plan.seat_assignments:
            student = sa.student
            print(f"- Seat Number: {sa.seat_number}, Student: {student.first_name} {student.last_name}")
    else:
        print(f"No seating plan found with seating_plan_id {seating_plan_id}")

    # 8. Get all SeatingPlans that a Student is assigned to via SeatAssignment
    if student:
        seating_plans = set(sa.seating_plan for sa in student.seat_assignments)
        print(f"\nSeating Plans where Student {student.first_name} {student.last_name} is assigned (via SeatAssignment):")
        for sp in seating_plans:
            print(f"- SeatingPlan ID: {sp.seating_plan_id}, Class ID: {sp.class_id}")
    else:
        print(f"No student found with student_id {student_id}")

    # 9. Get all Notes written by a specific User
    if user:
        print(f"\nNotes written by User {user.first_name} {user.last_name}:")
        for note in user.notes:
            print(f"- Note ID: {note.note_id}, Date: {note.date_created}, Details: {note.details}")
    else:
        print(f"No user found with user_id {user_id}")

    # 10. Get all Notes associated with a specific Student
    if student:
        print(f"\nNotes associated with Student {student.first_name} {student.last_name}:")
        for note in student.notes:
            teacher = note.teacher
            print(f"- Note ID: {note.note_id}, Teacher: {teacher.first_name} {teacher.last_name}, Date: {note.date_created}, Details: {note.details}")
    else:
        print(f"No student found with student_id {student_id}")

    # 11. Get the Class and Teacher for a specific SeatingPlan
    if seating_plan:
        class_instance = seating_plan.class_
        teacher = class_instance.teacher
        print(f"\nSeatingPlan ID {seating_plan_id} is for Class {class_instance.class_code} taught by {teacher.first_name} {teacher.last_name}")
    else:
        print(f"No seating plan found with seating_plan_id {seating_plan_id}")

    # 12. Get all Classes taught by a specific User
    if user:
        print(f"\nClasses taught by User {user.first_name} {user.last_name}:")
        for cls in user.classes:
            print(f"- Class ID: {cls.class_id}, Class Code: {cls.class_code}, Class Name: {cls.class_name}")
    else:
        print(f"No user found with user_id {user_id}")

    # 13. Get all Authentication Tokens for a specific User
    if user:
        print(f"\nAuthentication Tokens for User {user.first_name} {user.last_name}:")
        for token in user.authentication_tokens:
            print(f"- Token ID: {token.token_id}, Token: {token.token}, Expiry Status: {token.get_expiry_status()}")
    else:
        print(f"No user found with user_id {user_id}")

    # 14. Check the email domain constraint
    invalid_email_users = User.query.filter(~User.email.like(f"%{EMAIL_DOMAIN}")).all()
    print(f"\nUsers with invalid email domains:")
    if invalid_email_users:
        for u in invalid_email_users:
            print(f"- User ID: {u.user_id}, Email: {u.email}")
    else:
        print("No users with invalid email domains found.")

    # 15. Get all Authentication Tokens that are expired
    expired_tokens = AuthenticationToken.query.filter_by(expiry_status=EXPIRY_STATUS['Expired']).all()
    print(f"\nExpired Authentication Tokens:")
    if expired_tokens:
        for token in expired_tokens:
            user = token.user
            print(f"- Token ID: {token.token_id}, User: {user.first_name} {user.last_name}, Token: {token.token}")
    else:
        print("No expired authentication tokens found.")

    # 16. Get all Classrooms with a specific block label
    classrooms_in_block = Classroom.query.filter_by(block_label=block_label).all()
    print(f"\nClassrooms in block '{block_label}':")
    if classrooms_in_block:
        for c in classrooms_in_block:
            print(f"- Classroom ID: {c.classroom_id}, Room Number: {c.room_number}")
    else:
        print(f"No classrooms found in block '{block_label}'.")

    # 17. Get all Students with a specific SAC status
# Convert input string to corresponding integer from SAC_STATUS dictionary
    sac_status_int = None
    if sac_status_input == "Yes":
        sac_status_int = 0
    elif sac_status_input == "No":
        sac_status_int = 1

    if sac_status_int is not None:
        students_with_sac_status = Student.query.filter_by(
            SAC_status=sac_status_int).all()
        print(f"\nStudents with SAC status '{sac_status_input}':")
        if students_with_sac_status:
            for s in students_with_sac_status:
                print(f"- Student ID: {s.student_id}, Name: {s.first_name} {s.last_name}, SAC Status: {s.get_SAC_status()}")
        else:
            print(f"No students found with SAC status '{sac_status_input}'.")
    else:
        print(f"Invalid SAC status input: {sac_status_input}")

    # 18. Get all SeatAssignments for a specific Student
    if student:
        print(f"\nSeat Assignments for Student {student.first_name} {student.last_name}:")
        for sa in student.seat_assignments:
            sp = sa.seating_plan
            print(f"- SeatingPlan ID: {sp.seating_plan_id}, Seat Number: {sa.seat_number}")
    else:
        print(f"No student found with student_id {student_id}")

    # 19. Get all StudentClasses entries (directly testing the join table)
    print(f"\nAll entries in StudentClass (join table between Student and Class):")
    student_classes = StudentClass.query.all()
    if student_classes:
        for sc in student_classes:
            student = sc.student
            cls = sc.class_
            print(f"- Student: {student.first_name} {student.last_name}, Class: {cls.class_code}")
    else:
        print("No entries found in StudentClass.")

    # 20. Get all ClassroomSeatingPlan entries (directly testing the join table)
    print(f"\nAll entries in ClassroomSeatingPlan (join table between Classroom and SeatingPlan):")
    classroom_seating_plans = ClassroomSeatingPlan.query.all()
    if classroom_seating_plans:
        for csp in classroom_seating_plans:
            classroom = csp.classroom
            seating_plan = csp.seating_plan
            print(f"- Classroom: {classroom.classroom_id}, SeatingPlan ID: {seating_plan.seating_plan_id}")
    else:
        print("No entries found in ClassroomSeatingPlan.")

    # 21. Get all UserSeatingPlan entries (directly testing the join table)
    print(f"\nAll entries in UserSeatingPlan (join table between User and SeatingPlan):")
    user_seating_plans = UserSeatingPlan.query.all()
    if user_seating_plans:
        for usp in user_seating_plans:
            user = usp.user
            seating_plan = usp.seating_plan
            print(f"- User: {user.first_name} {user.last_name}, SeatingPlan ID: {seating_plan.seating_plan_id}")
    else:
        print("No entries found in UserSeatingPlan.")

    # 22. Get all Students with below-average academic performance
    students_below_average = Student.query.filter(Student.academic_performance == ACADEMIC_PERFORMANCE["NOT ACHIEVING"]).all()

    print(f"\nStudents with below-average academic performance:")
    if students_below_average:
        for s in students_below_average:
            print(f"- Student ID: {s.student_id}, Name: {s.first_name} {s.last_name}, Performance: {s.get_academic_performance()}")
    else:
        print("No students found with below-average academic performance.")

    # 23. Get all Classes without any Students enrolled
    classes_without_students = Class.query.outerjoin(StudentClass).filter(StudentClass.class_id == None).all()
    print(f"\nClasses without any students enrolled:")
    if classes_without_students:
        for cls in classes_without_students:
            print(f"- Class ID: {cls.class_id}, Class Code: {cls.class_code}")
    else:
        print("All classes have students enrolled.")

    # 24. Get the total number of Students in each Class
    print(f"\nTotal number of students in each class:")
    class_student_counts = db.session.query(
        Class.class_code,
        func.count(StudentClass.student_id).label('student_count')
    ).outerjoin(StudentClass).group_by(Class.class_code).all()
    if class_student_counts:
        for cls_code, count in class_student_counts:
            print(f"- Class Code: {cls_code}, Student Count: {count}")
    else:
        print("No student counts available.")

    # 25. Get all Users with the role 'Teacher'
    teachers = User.query.filter_by(role=USER_ROLE['Teacher']).all()
    print(f"\n Users with role 'Teacher':")
    if teachers:
        for u in teachers:
            print(f"- User ID: {u.user_id}, Name: {u.first_name} {u.last_name}")
    else:
        print("No users found with role 'Teacher'.")
