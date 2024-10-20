from flask import Blueprint, render_template, redirect, url_for, flash
from flask_login import login_required, current_user
from models import User, USER_ROLE  # Import User model and USER_ROLE map


# Create a Blueprint for staff
administrator_bp = Blueprint('administrator', __name__, url_prefix='/admin')


@administrator_bp.route('/dashboard')
@login_required
def dashboard():
    # Retrieve the user's details from the database based on provider_id
    user = User.query.filter_by(user_id=current_user.user_id).first()
    if user.role != USER_ROLE["Administrator"]:
        flash("Access denied: You are not authorised to access the Admin dashboard.", "error")
        return redirect(url_for('landing_page'))  # Redirect to homepage
    flash(f"Hello {user.first_name} {user.last_name}, successfully logged in", "success")
    return render_template('administrator/dashboard.html', user=user)
