document.addEventListener("DOMContentLoaded", function() {
  function showFlashMessage(message, category) {
      const flash = document.createElement('ul');
      flash.className = `flash ${category}`;
      flash.innerHTML = `<li>${message}</li>`;

      document.body.appendChild(flash);

      flash.addEventListener('animationend', function() {
          flash.classList.add('hidden');
          setTimeout(() => flash.remove(), 1000); // Remove the element after it is hidden
      });
  }
  // Handle flask messages rendered in the HTML template
  const flashMessagesContainer = document.getElementById('flash-messages-container');
  if (flashMessagesContainer) {
      const flashMessages = flashMessagesContainer.querySelectorAll('.flash-message');
      flashMessages.forEach(function(flashMessage) {
          const message = flashMessage.getAttribute('data-message');
          const category = flashMessage.getAttribute('data-category');
          showFlashMessage(message, category);
      });
  }

  window.showFlashMessage = showFlashMessage;
});
