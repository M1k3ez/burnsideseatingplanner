const StudentNotes = ({ studentId, studentName }) => {
    const { useState, useEffect } = React;
    
    const [notes, setNotes] = useState([]);
    const [newNote, setNewNote] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchNotes();
    }, [studentId]);

    const fetchNotes = async () => {
        try {
            const response = await fetch(`/teacher/api/student/${studentId}/notes`);
            if (!response.ok) throw new Error('Failed to fetch notes');
            const data = await response.json();
            setNotes(data.notes || []);
            setError(null);
        } catch (err) {
            console.error('Error fetching notes:', err);
            setError('Failed to load notes');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
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
            setNotes(prevNotes => [data.note, ...prevNotes]);
            setNewNote('');
            setError(null);
        } catch (err) {
            console.error('Error adding note:', err);
            setError('Failed to add note');
        }
    };

    const handleDelete = async (noteId) => {
        if (!confirm('Are you sure you want to delete this note?')) return;

        try {
            const response = await fetch(`/teacher/api/notes/${noteId}`, {
                method: 'DELETE',
            });

            if (!response.ok) throw new Error('Failed to delete note');
            
            setNotes(prevNotes => prevNotes.filter(note => note.note_id !== noteId));
            setError(null);
        } catch (err) {
            console.error('Error deleting note:', err);
            setError('Failed to delete note');
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-NZ', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return React.createElement('div', null,
        error && React.createElement('div', { className: 'notes-error' }, error),

        React.createElement('div', { className: 'notes-container' },
            React.createElement('form', { onSubmit: handleSubmit },
                React.createElement('textarea', {
                    value: newNote,
                    onChange: (e) => setNewNote(e.target.value),
                    placeholder: 'Add a new note...',
                    className: 'notes-input'
                }),
                React.createElement('button', {
                    type: 'submit',
                    className: 'add-note-btn'
                }, 'Add Note')
            )
        ),

        React.createElement('div', { className: 'notes-list' },
            loading ? null :
            notes.length === 0 ?
                React.createElement('div', { className: 'notes-empty' },
                    "There's no notes for this student yet"
                ) :
                notes.map(note =>
                    React.createElement('div', {
                        key: note.note_id,
                        className: 'note-item'
                    },
                        React.createElement('div', { className: 'note-header' },
                            React.createElement('div', { className: 'note-meta' },
                                `Noted by ${note.teacher_name} on ${formatDate(note.date_created)}`
                            ),
                            React.createElement('button', {
                                onClick: () => handleDelete(note.note_id),
                                className: 'delete-note-btn'
                            }, 'Delete')
                        ),
                        React.createElement('div', { className: 'note-content' },
                            note.details
                        )
                    )
                )
        )
    );
};

window.StudentNotes = StudentNotes;