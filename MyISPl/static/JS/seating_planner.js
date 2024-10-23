$(document).ready(function() {
    // Initialize variables
    const gridSize = 10;
    const CHAIR_WIDTH = 50;
    const CHAIR_HEIGHT = 50;
    let lastScrollTop = 0;
    let lastScrollLeft = 0;
    let chairs = [];
    let students = [];
    let plan_id;
    $("<style>")
        .prop("type", "text/css")
        .html(`
            .chair {
                width: ${CHAIR_WIDTH}px !important;
                height: ${CHAIR_HEIGHT}px !important;
                font-size: 12px;
                position: absolute;
                border: 1px solid #ccc;
                background: white;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: move;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                transition: all 0.2s ease;
            }

            .chair:hover {
                border-color: #2196F3;
                box-shadow: 0 2px 8px rgba(33,150,243,0.3);
            }

            .student-info {
                font-size: 11px;
                text-align: center;
                width: 100%;
                display: flex;
                flex-direction: column;
                align-items: center;
                word-break: break-word;
                padding: 2px;
            }

            .student-info .student-initials {
                font-weight: bold;
                font-size: 14px;
                margin-bottom: 2px;
            }

            .student-info .student-name {
                font-size: 10px;
                line-height: 1.2;
            }

            .empty-seat {
                font-size: 11px;
                color: #666;
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .student-card.assigned {
                opacity: 0.6;
                pointer-events: none;
                background-color: #f0f0f0;
            }

            .chair-context-menu {
                background: white;
                border: 1px solid #ccc;
                border-radius: 4px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                z-index: 1000;
                min-width: 120px;
            }

            .chair-context-menu div {
                padding: 8px 12px;
                cursor: pointer;
                transition: background-color 0.2s;
            }

            .chair-context-menu div:hover {
                background-color: #f0f0f0;
            }

            .chair.occupied {
                background-color: #e3f2fd;
                border-color: #2196F3;
            }

            .chair.ui-state-hover {
                background-color: #f0f9ff;
                border-color: #42a5f5;
                box-shadow: 0 2px 8px rgba(33,150,243,0.4);
            }

            .student-assigned {
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 2px;
            }

            #new-chair {
                width: ${CHAIR_WIDTH}px;
                height: ${CHAIR_HEIGHT}px;
                border: 1px solid #ccc;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: move;
                background: white;
                margin: 10px auto;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }

            #new-chair:hover {
                border-color: #2196F3;
                box-shadow: 0 2px 8px rgba(33,150,243,0.3);
            }

            .ui-draggable-dragging {
                z-index: 1000;
                opacity: 0.8;
            }
        `)
        .appendTo("head");
    
    function initializeData() {
        try {
            const canvasElement = $('#canvas');
            const rawChairs = canvasElement.data('chairs');
            const rawStudents = canvasElement.data('students');
            plan_id = canvasElement.data('plan-id');
            
            chairs = typeof rawChairs === 'string' ? JSON.parse(rawChairs) : rawChairs || [];
            students = typeof rawStudents === 'string' ? JSON.parse(rawStudents) : rawStudents || [];
            
            if (!Array.isArray(chairs)) chairs = [];
            if (!Array.isArray(students)) students = [];
            
            console.log('Data initialized:', { plan_id, chairCount: chairs.length, studentCount: students.length });
        } catch (e) {
            console.error('Error initializing data:', e);
            chairs = [];
            students = [];
        }
    }

    function deleteChair(chairId) {
        const chair = chairs.find(c => c.id === chairId);
        if (chair && chair.studentId) {
            // If there's a student assigned, unassign them first
            const studentElement = $(`.student-card[data-student-id="${chair.studentId}"]`);
            studentElement.removeClass('assigned');
            if (studentElement.hasClass('ui-draggable')) {
                studentElement.draggable('enable');
            }
            console.log(`Unassigned student ${chair.studentId} from chair ${chairId}`);
        }
        
        chairs = chairs.filter(c => c.id !== chairId);
        $(`.chair[data-chair-id="${chairId}"]`).remove();
        console.log(`Deleted chair ${chairId}`);
    }

    function unassignStudent(chair) {
        if (!chair.studentId) return;

        const studentElement = $(`.student-card[data-student-id="${chair.studentId}"]`);
        studentElement.removeClass('assigned');
        if (studentElement.hasClass('ui-draggable')) {
            studentElement.draggable('enable');
        }

        chair.studentId = null;
        chairs = chairs.map(c => c.id === chair.id ? chair : c);

        const chairDiv = $(`.chair[data-chair-id="${chair.id}"]`);
        chairDiv.removeClass('occupied');
        chairDiv.html('<div class="empty-seat">Empty</div>');
    }

    function setupContextMenu(chairDiv, chair) {
        chairDiv.off('contextmenu').on('contextmenu', function(e) {
            e.preventDefault();
            $('.chair-context-menu').remove();
            
            const contextMenu = $('<div class="chair-context-menu"></div>')
                .css({
                    position: 'absolute',
                    left: e.pageX + 'px',
                    top: e.pageY + 'px',
                    zIndex: 1000
                });

            const deleteOption = $('<div>Delete Chair</div>').click(function() {
                deleteChair(chair.id);
                contextMenu.remove();
            });

            const unassignOption = $('<div>Unassign Student</div>').click(function() {
                unassignStudent(chair);
                contextMenu.remove();
            });

            contextMenu.append(deleteOption);
            if (chair.studentId) {
                contextMenu.append(unassignOption);
            }

            $('body').append(contextMenu);

            $(document).one('click', function(e) {
                if (!$(e.target).closest('.chair-context-menu').length) {
                    contextMenu.remove();
                }
            });
        });
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
        setupContextMenu(chairDiv, chair);

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
            accept: ".student-card:not(.assigned)",
            hoverClass: "ui-state-hover",
            drop: function(event, ui) {
                const studentId = ui.draggable.data('student-id');
                assignStudentToSpecificChair(studentId, chair.id, ui.draggable);
            }
        });
    }

    function initializeDraggables() {
        $(".student-card").draggable({
            helper: "clone",
            revert: "invalid",
            cursor: "move",
            start: function(event, ui) {
                if ($(this).hasClass('assigned')) {
                    event.preventDefault();
                    return false;
                }
                lastScrollTop = $(window).scrollTop();
                lastScrollLeft = $(window).scrollLeft();
                ui.helper.css('opacity', 0.7);
            }
        });
        $("#new-chair").draggable({
            helper: "clone",
            revert: "invalid",
            cursor: "move",
            appendTo: "body",
            zIndex: 10000,
            start: function(event, ui) {
                lastScrollTop = $(window).scrollTop();
                lastScrollLeft = $(window).scrollLeft();

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

        // Initialize canvas drop zone
        $("#canvas").droppable({
            accept: "#new-chair, .student-card:not(.assigned)",
            drop: function(event, ui) {
                const droppedElement = ui.draggable;
                const canvasOffset = $(this).offset();
                let x = event.pageX - canvasOffset.left - (CHAIR_WIDTH / 2);
                let y = event.pageY - canvasOffset.top - (CHAIR_HEIGHT / 2);
                
                const snappedX = Math.round(x / gridSize) * gridSize;
                const snappedY = Math.round(y / gridSize) * gridSize;
                
                if (droppedElement.attr('id') === 'new-chair') {
                    addNewChair(snappedX, snappedY);
                } else if (droppedElement.hasClass('student-card')) {
                    const studentId = droppedElement.data('student-id');
                    assignStudentToNearestChair(studentId, snappedX, snappedY, droppedElement);
                }
            }
        });
    }

    function initializeChairs() {
        $('#canvas .chair').remove();
        initializeDraggables();
        chairs.forEach(function(chair) {
            renderChair(chair);
            if (chair.studentId) {
                const studentElement = $(`.student-card[data-student-id="${chair.studentId}"]`);
                studentElement.addClass('assigned');
                if (studentElement.hasClass('ui-draggable')) {
                    studentElement.draggable('disable');
                }
            }
        });
    }

    function addNewChair(x, y) {
        x += lastScrollLeft;
        y += lastScrollTop;
        const newId = chairs.length > 0 ? Math.max(...chairs.map(c => c.id)) + 1 : 1;
        const newChair = {
            id: newId,
            x: x,
            y: y,
            studentId: null
        };
        chairs.push(newChair);
        renderChair(newChair);
    }

    function assignStudentToNearestChair(studentId, x, y, studentElement) {
        x += lastScrollLeft;
        y += lastScrollTop;

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
            assignStudentToSpecificChair(studentId, closestChair.id, studentElement);
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
            studentElement.addClass('assigned');
            if (studentElement.hasClass('ui-draggable')) {
                studentElement.draggable('disable');
            }
        } else {
            alert('This chair is already occupied.');
        }
    }

    function updateChairPosition(chairId, x, y) {
        x += lastScrollLeft;
        y += lastScrollTop;
        chairs = chairs.map(c => 
            c.id === chairId 
                ? { ...c, x, y } 
                : c
        );
        console.log(`Updated chair ID ${chairId} position to X: ${x}, Y: ${y}`);
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

    function saveLayout() {
        $.ajax({
            url: `/teacher/api/seating_plan/${plan_id}/layout`,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ layout_data: chairs }),
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

    $(window).on('scroll', function() {
        lastScrollTop = $(window).scrollTop();
        lastScrollLeft = $(window).scrollLeft();
    });

    $(window).resize(function() {
        const canvas = $("#canvas");
        chairs.forEach(function(chair) {
            const chairElement = $(`.chair[data-chair-id="${chair.id}"]`);
            if (chair.x > canvas.width()) {
                chair.x = canvas.width() - CHAIR_WIDTH;
                chairElement.css('left', chair.x + 'px');
            }
            if (chair.y > canvas.height()) {
                chair.y = canvas.height() - CHAIR_HEIGHT;
                chairElement.css('top', chair.y + 'px');
            }
        });
    });

    $('#canvas').on('contextmenu', function(e) {
        e.preventDefault();
    });
    $(document).click(function(e) {
        if (!$(e.target).closest('.chair-context-menu').length) {
            $('.chair-context-menu').remove();
        }
    });
    initializeData();
    initializeChairs();

    $("#saveChangesBtn").off('click').on('click', saveLayout);

    window.onerror = function(msg, url, lineNo, columnNo, error) {
        console.error('Error: ' + msg + '\nURL: ' + url + '\nLine: ' + lineNo + '\nColumn: ' + columnNo + '\nError object: ' + JSON.stringify(error));
        return false;
    };
});