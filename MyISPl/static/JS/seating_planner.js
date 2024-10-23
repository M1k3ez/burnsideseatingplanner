$(document).ready(function() {
    const gridSize = 20;
    const CHAIR_WIDTH = 60;
    const CHAIR_HEIGHT = 60;
    let chairs = $('#canvas').data('chairs') || [];
    let students = $('#canvas').data('students') || [];
    let plan_id = $('#canvas').data('plan-id');

    console.log('Plan ID:', plan_id);
    console.log('Chairs:', chairs);
    console.log('Students:', students);

    if (typeof chairs === 'string') {
        chairs = JSON.parse(chairs);
    }
    if (typeof students === 'string') {
        students = JSON.parse(students);
    }

    if (!Array.isArray(chairs)) {
        console.error("Error: chairs data is not a list.", chairs);
        chairs = [];
    }

    function renderChair(chair) {
        const chairDiv = $(`
            <div class="chair${chair.studentId ? ' occupied' : ''}" 
                 data-chair-id="${chair.id}" 
                 style="left: ${chair.x}px; top: ${chair.y}px;">
                ${chair.studentId ? `
                    <div class="student-assigned" data-student-id="${chair.studentId}">
                        <div class="student-info">
                            <span class="student-initials">${getStudentInitials(chair.studentId)}</span>
                            <span class="student-name">${getStudentName(chair.studentId)}</span>
                        </div>
                    </div>
                ` : `
                    <div class="empty-seat">Empty</div>
                `}
            </div>
        `);
        $("#canvas").append(chairDiv);

        chairDiv.draggable({
            containment: "#canvas",
            grid: [gridSize, gridSize],
            stop: function(event, ui) {
                const chairId = $(this).data('chair-id');
                const position = ui.position;
                updateChairPosition(chairId, position.left, position.top);
            }
        });

        chairDiv.droppable({
            accept: ".student-card",
            hoverClass: "ui-state-hover",
            drop: function(event, ui) {
                const studentId = ui.draggable.data('student-id');
                assignStudentToSpecificChair(studentId, chair.id, ui.draggable);
            }
        });
    }

    function addNewChair(x, y) {
        const newId = chairs.length > 0 ? Math.max(...chairs.map(c => c.id)) + 1 : 1;
        const newChair = {
            id: newId,
            x: x,
            y: y,
            studentId: null
        };
        chairs.push(newChair);
        renderChair(newChair);
        console.log(`Added new chair - ID: ${newId}, X: ${x}, Y: ${y}`);
    }

    function assignStudentToNearestChair(studentId, x, y, studentElement) {
        let minDistance = Infinity;
        let closestChair = null;
        chairs.forEach(function(chair) {
            if (!chair.studentId) {
                const distance = Math.sqrt(Math.pow(chair.x - x, 2) + Math.pow(chair.y - y, 2));
                if (distance < minDistance) {
                    minDistance = distance;
                    closestChair = chair;
                }
            }
        });

        if (closestChair) {
            closestChair.studentId = studentId;
            const chairDiv = $(`.chair[data-chair-id="${closestChair.id}"]`);
            chairDiv.addClass('occupied');
            chairDiv.html(`
                <div class="student-assigned" data-student-id="${studentId}">
                    <div class="student-info">
                        <span class="student-initials">${getStudentInitials(studentId)}</span>
                        <span class="student-name">${getStudentName(studentId)}</span>
                    </div>
                </div>
            `);
            chairs = chairs.map(c => c.id === closestChair.id ? closestChair : c);
            studentElement.addClass('assigned').draggable('disable');

            console.log(`Assigned student ID ${studentId} to chair ID ${closestChair.id}`);
        } else {
            alert('No available chair nearby to assign this student.');
        }
    }

    function assignStudentToSpecificChair(studentId, chairId, studentElement) {
        const chair = chairs.find(c => c.id === chairId);
        if (chair && !chair.studentId) {
            chair.studentId = studentId;
            const chairDiv = $(`.chair[data-chair-id="${chairId}"]`);
            chairDiv.addClass('occupied');
            chairDiv.html(`
                <div class="student-assigned" data-student-id="${studentId}">
                    <div class="student-info">
                        <span class="student-initials">${getStudentInitials(studentId)}</span>
                        <span class="student-name">${getStudentName(studentId)}</span>
                    </div>
                </div>
            `);
            chairs = chairs.map(c => c.id === chairId ? chair : c);
            studentElement.addClass('assigned').draggable('disable');

            console.log(`Assigned student ID ${studentId} to chair ID ${chairId}`);
        } else {
            alert('This chair is already occupied.');
        }
    }

    function updateChairPosition(chairId, x, y) {
        chairs = chairs.map(c => c.id === chairId ? { ...c, x: x, y: y } : c);
        console.log(`Updated chair ID ${chairId} position to X: ${x}, Y: ${y}`);
    }

    function saveLayout() {
        console.log('Saving layout:', chairs);
        console.log('Plan ID:', plan_id);
        $.ajax({
            url: `/teacher/api/seating_plan/${plan_id}/layout`,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                layout_data: chairs
            }),
            success: function(response) {
                if (response.success) {
                    alert('Seating plan saved successfully!');
                } else {
                    alert('Failed to save seating plan: ' + response.message);
                }
            },
            error: function(xhr, status, error) {
                alert('Error saving seating plan: ' + error);
            }
        });
    }

    function getStudentInitials(studentId) {
        const student = students.find(s => s.student_id === studentId);
        if (student) {
            return `${student.first_name.charAt(0).toUpperCase()}${student.last_name.charAt(0).toUpperCase()}`;
        }
        return '';
    }

    function getStudentName(studentId) {
        const student = students.find(s => s.student_id === studentId);
        if (student) {
            return `${student.first_name} ${student.last_name}`;
        }
        return '';
    }
    chairs.forEach(function(chair) {
        renderChair(chair);
    });

    $("#new-chair").draggable({
        helper: "clone",
        revert: "invalid",
        cursor: "move",
        appendTo: "body",
        zIndex: 10000,
        start: function(event, ui) {
            const chairOffsetX = CHAIR_WIDTH / 2;
            const chairOffsetY = CHAIR_HEIGHT / 2;

            ui.helper.css({
                'position': 'absolute',
                'left': event.clientX - chairOffsetX,
                'top': event.clientY - chairOffsetY,
                'opacity': 0.7
            });
        },
        drag: function(event, ui) {
            const chairOffsetX = CHAIR_WIDTH / 2;
            const chairOffsetY = CHAIR_HEIGHT / 2;

            ui.position.left = event.clientX - chairOffsetX;
            ui.position.top = event.clientY - chairOffsetY;
        }
    });

    $(".student-card").draggable({
        helper: "clone",
        revert: "invalid",
        cursor: "move",
        start: function(event, ui) {
            if ($(this).hasClass('assigned')) {
                // Prevent dragging assigned students
                event.preventDefault();
            } else {
                ui.helper.css('opacity', 0.7);
            }
        }
    });
    $("#canvas").droppable({
        accept: "#new-chair, .student-card",
        drop: function(event, ui) {
            const droppedElement = ui.draggable;
            const canvasOffset = $(this).offset();
            const eventPageX = event.pageX;
            const eventPageY = event.pageY;
            let x = eventPageX - canvasOffset.left - (CHAIR_WIDTH / 2);
            let y = eventPageY - canvasOffset.top - (CHAIR_HEIGHT / 2);
            const snappedX = Math.round(x / gridSize) * gridSize;
            const snappedY = Math.round(y / gridSize) * gridSize;
            if (droppedElement.attr('id') === 'new-chair') {
                addNewChair(snappedX, snappedY);
            } else if (droppedElement.hasClass('student-card')) {
                const studentId = droppedElement.data('student-id');
                assignStudentToNearestChair(studentId, snappedX, snappedY, droppedElement);
            }
            console.log(`Mouse Position - X: ${eventPageX}, Y: ${eventPageY}`);
            console.log(`Canvas Offset - Left: ${canvasOffset.left}, Top: ${canvasOffset.top}`);
            console.log(`Calculated Position - X: ${x}, Y: ${y}`);
            console.log(`Snapped Position - X: ${snappedX}, Y: ${snappedY}`);
        }
    });
    $("#saveChangesBtn").click(function() {
        saveLayout();
    });
});
