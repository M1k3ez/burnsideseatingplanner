const StudentNotes = ({ studentId, studentName }) => {
    // Import required hooks from React
    const { useState, useEffect } = React;
    // State Management
    // notes: Array of note objects containing note details and metadata
    const [notes, setNotes] = useState([]);
    // newNote: Content of the note being composed
    const [newNote, setNewNote] = useState('');
    // error: Stores error messages for display
    const [error, setError] = useState(null);
    // loading: Tracks the loading state during API calls
    const [loading, setLoading] = useState(true);
    // Effect hook to fetch notes when studentId changes
    useEffect(() => {
        fetchNotes();
    }, [studentId]);
    // API Interactions
    /**
     * Fetches all notes for the current student from the server
     * Updates notes state with fetched data or sets error state if fetch fails
     */
    const fetchNotes = async () => {
        try {
            const response = await fetch(`/teacher/api/student/${studentId}/notes`);
            if (!response.ok) throw new Error('Failed to fetch notes');
            const data = await response.json();
            setNotes(data.notes || []); // Set empty array if no notes exist
            setError(null);
        } catch (err) {
            console.error('Error fetching notes:', err);
            setError('Failed to load notes');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Handles form submission to create a new note
     * @param {Event} e - The form submission event
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        // Prevent submission of empty notes
        if (!newNote.trim()) return;

        try {
            const response = await fetch(`/teacher/api/student/${studentId}/notes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ details: newNote }),
            });
            if (!response.ok) throw new Error('Failed to add note');
            const data = await response.json();
            // Add new note to the beginning of the notes array
            setNotes(prevNotes => [data.note, ...prevNotes]);
            setNewNote(''); // Clear input field
            setError(null);
        } catch (err) {
            console.error('Error adding note:', err);
            setError('Failed to add note');
        }
    };
    /**
     * Handles note deletion after confirmation
     * @param {number} noteId - The ID of the note to delete
     */
    const handleDelete = async (noteId) => {
        // Show confirmation dialog before deletion
        if (!confirm('Are you sure you want to delete this note?')) return;

        try {
            const response = await fetch(`/teacher/api/notes/${noteId}`, {
                method: 'DELETE',
            });

            if (!response.ok) throw new Error('Failed to delete note');
            
            // Remove deleted note from state
            setNotes(prevNotes => prevNotes.filter(note => note.note_id !== noteId));
            setError(null);
        } catch (err) {
            console.error('Error deleting note:', err);
            setError('Failed to delete note');
        }
    };

    /**
     * Formats a date string into a localized format
     * @param {string} dateString - ISO date string to format
     * @returns {string} Formatted date string in NZ locale
     */
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-NZ', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };
    // Using React.createElement instead of JSX due to environment constraints
    return React.createElement('div', null,
        // Error Display
        error && React.createElement('div', { className: 'notes-error' }, error),

        // Note Input Form
        React.createElement('div', { className: 'notes-container' },
            React.createElement('form', { onSubmit: handleSubmit },
                // Textarea for new note input
                React.createElement('textarea', {
                    value: newNote,
                    onChange: (e) => setNewNote(e.target.value),
                    placeholder: 'Add a new note...',
                    className: 'notes-input'
                }),
                // Submit button
                React.createElement('button', {
                    type: 'submit',
                    className: 'add-note-btn'
                }, 'Add Note')
            )
        ),
        // Notes List
        React.createElement('div', { className: 'notes-list' },
            loading ? null : // Don't show anything while loading
            notes.length === 0 ?
                // Empty state message
                React.createElement('div', { className: 'notes-empty' },
                    "There's no notes for this student yet"
                ) :
                // Map through notes and create note items
                notes.map(note =>
                    React.createElement('div', {
                        key: note.note_id,
                        className: 'note-item'
                    },
                        // Note header with metadata and delete button
                        React.createElement('div', { className: 'note-header' },
                            React.createElement('div', { className: 'note-meta' },
                                `Noted by ${note.teacher_name} on ${formatDate(note.date_created)}`
                            ),
                            React.createElement('button', {
                                onClick: () => handleDelete(note.note_id),
                                className: 'delete-note-btn'
                            }, 'Delete')
                        ),
                        // Note content
                        React.createElement('div', { className: 'note-content' },
                            note.details
                        )
                    )
                )
        )
    );
};

// Export component to window object for global access
window.StudentNotes = StudentNotes;