document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[id^="student-notes-root"]').forEach(root => {
      const studentId = root.getAttribute('student-id');
      const studentName = root.getAttribute('student-name');
      const rootElement = document.getElementById(`student-notes-root${studentId}`);
      if (rootElement) {
        const props = {
          studentId: studentId,
          studentName: studentName
        };
        const root = ReactDOM.createRoot(rootElement);
        root.render(React.createElement(StudentNotes, props));
      }
    });
  });