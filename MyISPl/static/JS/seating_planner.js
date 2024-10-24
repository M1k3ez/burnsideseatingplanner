$(document).ready(function() {
    // Constants
    const gridSize = 5;
    const CHAIR_WIDTH = 120;
    const CHAIR_HEIGHT = 120;

    // State variables
    let chairs = [];
    let students = [];
    let plan_id;
    let lastScrollTop = 0;
    let lastScrollLeft = 0;

    // Inject required styles
    $("<style>")
    .prop("type", "text/css")
    .html(`
        .chair-context-menu {
            background: white;
            border: 1px solid #ccc;
            border-radius: 4px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            z-index: 1000;
            min-width: 70px;
        }

        .chair-context-menu div {
            padding: 8px 12px;  
            cursor: pointer;
            transition: background-color 0.2s;
            background: white;
        }

        .chair-context-menu div:hover {
            background-color: #f0f0f0;
        }

        .grid-canvas.a4-portrait {
            width: 794px;
            height: 1123px;
        }

        .grid-canvas.a4-landscape {
            width: 1123px;
            height: 794px;
        }

        .grid-canvas.a4-portrait,
        .grid-canvas.a4-landscape {
            background-image: 
                linear-gradient(to right, rgba(0,0,0,.02) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(0,0,0,.02) 1px, transparent 1px);
            background-size: ${gridSize}px ${gridSize}px;
        }
        .chair {
            width: ${CHAIR_WIDTH}px !important;
            height: ${CHAIR_HEIGHT}px !important;
            position: absolute;
            border: 2px solid #ccc;
            background: white;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: move;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            transition: all 0.2s ease;
            border-radius: 8px;
            padding: 6px;
        }
    `)
    .appendTo("head");

    // Layout Functions
    function initializeLayout() {
        // Remove existing event handlers
        $('#layoutPortrait, #layoutLandscape').off('click');
        
        // Add new event handlers
        $('#layoutPortrait').click(function() {
            applyLayout('portrait');
            $(this).addClass('active').siblings().removeClass('active');
        });
        
        $('#layoutLandscape').click(function() {
            applyLayout('landscape');
            $(this).addClass('active').siblings().removeClass('active');
        });

        // Set initial layout
        const savedLayout = localStorage.getItem('layoutPreference') || 'portrait';
        applyLayout(savedLayout);
    }

    function applyLayout(layout) {
        const canvas = $('#canvas');
        canvas.removeClass('a4-portrait a4-landscape');
        canvas.addClass(`a4-${layout}`);

        // Update buttons
        if (layout === 'portrait') {
            $('#layoutPortrait').addClass('active');
            $('#layoutLandscape').removeClass('active');
        } else {
            $('#layoutLandscape').addClass('active');
            $('#layoutPortrait').removeClass('active');
        }

        // Save preference
        localStorage.setItem('layoutPreference', layout);

        // Reposition chairs if needed
        repositionChairs();
    }

    function repositionChairs() {
        const canvas = $('#canvas');
        const maxX = canvas.width() - CHAIR_WIDTH;
        const maxY = canvas.height() - CHAIR_HEIGHT;

        chairs.forEach(function(chair) {
            const chairElement = $(`.chair[data-chair-id="${chair.id}"]`);
            let needsRepositioning = false;

            if (chair.x > maxX) {
                chair.x = maxX;
                needsRepositioning = true;
            }
            if (chair.y > maxY) {
                chair.y = maxY;
                needsRepositioning = true;
            }

            if (needsRepositioning) {
                chairElement.css({
                    left: chair.x + 'px',
                    top: chair.y + 'px'
                });
            }
        });
    }

    // Chair Management Functions
    function deleteChair(chairId) {
        const chair = chairs.find(c => c.id === chairId);
        if (chair && chair.studentId) {
            unassignStudent(chair);
        }
        chairs = chairs.filter(c => c.id !== chairId);
        $(`.chair[data-chair-id="${chairId}"]`).remove();
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
                            <div class="student-id">ID: ${chair.studentId}</div>
                            ${getStudentPhoto(chair.studentId)}
                            <span class="student-name">${getStudentName(chair.studentId)}</span>
                            <span class="student-note">Note: this is the latest note</span>
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
                updateChairPosition(chair.id, ui.position.left, ui.position.top);
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

    // Student Functions
    function getStudentPhoto(studentId) {
        const student = students.find(s => s.student_id === studentId);
        if (student && student.photo) {
            return `<img src="${student.photo}" class="student-photo" alt="${student.first_name} ${student.last_name}">`;
        }
        return `<span class="student-initials">${getStudentInitials(studentId)}</span>`;
    }

    function getStudentName(studentId) {
        const student = students.find(s => s.student_id === studentId);
        return student ? `${student.first_name} ${student.last_name}` : '';
    }

    function getStudentInitials(studentId) {
        const student = students.find(s => s.student_id === studentId);
        return student ? 
            `${student.first_name.charAt(0).toUpperCase()}${student.last_name.charAt(0).toUpperCase()}` : '';
    }

    // Initialisation Functions
    function initializeData() {
        try {
            const canvasElement = $('#canvas');
            const rawData = canvasElement.data('chairs');
            const rawStudents = canvasElement.data('students');
            plan_id = canvasElement.data('plan-id');

            let parsedData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData || {};
            
            if (Array.isArray(parsedData)) {
                chairs = parsedData;
            } else {
                chairs = parsedData.chairs || [];
                if (parsedData.layoutPreference) {
                    localStorage.setItem('layoutPreference', parsedData.layoutPreference);
                }
            }

            students = typeof rawStudents === 'string' ? JSON.parse(rawStudents) : rawStudents || [];

            console.log('Data initialized:', {
                plan_id,
                chairCount: chairs.length,
                studentCount: students.length,
                layout: localStorage.getItem('layoutPreference')
            });
        } catch (e) {
            console.error('Error initializing data:', e);
            chairs = [];
            students = [];
        }
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

    // Chair Position Functions
    function addNewChair(x, y) {
        x += lastScrollLeft;
        y += lastScrollTop;
        const newId = chairs.length > 0 ? Math.max(...chairs.map(c => c.id)) + 1 : 1;
        const newChair = { id: newId, x, y, studentId: null };
        chairs.push(newChair);
        renderChair(newChair);
    }

    function updateChairPosition(chairId, x, y) {
        x += lastScrollLeft;
        y += lastScrollTop;
        chairs = chairs.map(c => c.id === chairId ? { ...c, x, y } : c);
    }

    // Student Assignment Functions
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
                        <div class="student-id">ID: ${studentId}</div>
                        ${getStudentPhoto(studentId)}
                        <span class="student-name">${getStudentName(studentId)}</span>
                        <span class="student-note">Note: this is the latest note</span>
                    </div>
                </div>
            `);
            chairs = chairs.map(c => c.id === chairId ? chair : c);
            studentElement.addClass('assigned').draggable('disable');
        } else {
            alert('This chair is already occupied.');
        }
    }

    // Save Function
    function saveLayout() {
        const currentLayout = $('#layoutPortrait').hasClass('active') ? 'portrait' : 'landscape';
        const layoutData = {
            chairs: chairs,
            layoutPreference: currentLayout
        };

        $.ajax({
            url: `/teacher/api/seating_plan/${plan_id}/layout`,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ layout_data: layoutData }),
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

    // Window Event Handlers
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

    $(window).on('scroll', function() {
        lastScrollTop = $(window).scrollTop();
        lastScrollLeft = $(window).scrollLeft();
    });

    // Document Event Handlers
    $(document).click(function(e) {
        if (!$(e.target).closest('.chair-context-menu').length) {
            $('.chair-context-menu').remove();
        }
    });

    // Canvas Event Handlers
    $('#canvas').on('contextmenu', function(e) {
        e.preventDefault();
    });

    // Error Handler
    window.onerror = function(msg, url, lineNo, columnNo, error) {
        console.error('Error: ' + msg + '\nURL: ' + url + '\nLine: ' + lineNo + '\nColumn: ' + columnNo + '\nError object: ' + JSON.stringify(error));
        return false;
    };

    // Initialize Everything
    initializeData();
    initializeLayout();
    initializeChairs();

    // Bind Save Button
    $("#saveChangesBtn").off('click').on('click', saveLayout);
});