document.addEventListener("DOMContentLoaded", () => {
  const capabilitiesList = document.getElementById("capabilities-list");
  const capabilitySelect = document.getElementById("capability");
  const registerForm = document.getElementById("register-form");
  const messageDiv = document.getElementById("message");
  const userDisplay = document.getElementById("user-display");
  const logoutBtn = document.getElementById("logout-btn");

  // Check authentication
  const token = localStorage.getItem('access_token');
  const userEmail = localStorage.getItem('user_email');
  const userRole = localStorage.getItem('user_role');
  const userName = localStorage.getItem('user_name');

  // Redirect to login if not authenticated
  if (!token) {
    window.location.href = '/static/login.html';
    return;
  }

  // Display user info
  if (userName && userRole) {
    userDisplay.textContent = `${userName} (${userRole})`;
  }

  // Logout functionality
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_name');
    window.location.href = '/static/login.html';
  });

  // Helper function to make authenticated API calls
  async function authenticatedFetch(url, options = {}) {
    const defaultOptions = {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };
    
    const response = await fetch(url, { ...options, ...defaultOptions });
    
    // If unauthorized, redirect to login
    if (response.status === 401) {
      localStorage.clear();
      window.location.href = '/static/login.html';
      return null;
    }
    
    return response;
  }

  // Function to fetch capabilities from API
  async function fetchCapabilities() {
    try {
      const response = await authenticatedFetch("/capabilities");
      if (!response) return;
      
      const capabilities = await response.json();

      // Clear loading message
      capabilitiesList.innerHTML = "";

      // Populate capabilities list
      Object.entries(capabilities).forEach(([name, details]) => {
        const capabilityCard = document.createElement("div");
        capabilityCard.className = "capability-card";

        const availableCapacity = details.capacity || 0;
        const currentConsultants = details.consultants ? details.consultants.length : 0;

        // Create consultants HTML with delete icons (only show for admins)
        const consultantsHTML =
          details.consultants && details.consultants.length > 0
            ? `<div class="consultants-section">
              <h5>Registered Consultants:</h5>
              <ul class="consultants-list">
                ${details.consultants
                  .map(
                    (email) =>
                      `<li>
                        <span class="consultant-email">${email}</span>
                        ${userRole === 'admin' ? `<button class="delete-btn" data-capability="${name}" data-email="${email}">❌</button>` : ''}
                      </li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No consultants registered yet</em></p>`;

        capabilityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Practice Area:</strong> ${details.practice_area}</p>
          <p><strong>Industry Verticals:</strong> ${details.industry_verticals ? details.industry_verticals.join(', ') : 'Not specified'}</p>
          <p><strong>Capacity:</strong> ${availableCapacity} hours/week available</p>
          <p><strong>Current Team:</strong> ${currentConsultants} consultants</p>
          <div class="consultants-container">
            ${consultantsHTML}
          </div>
        `;

        capabilitiesList.appendChild(capabilityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        capabilitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      capabilitiesList.innerHTML =
        "<p>Failed to load capabilities. Please try again later.</p>";
      console.error("Error fetching capabilities:", error);
    }
  }

  // Handle unregister functionality (admin only)
  async function handleUnregister(event) {
    if (userRole !== 'admin') {
      alert('Only administrators can unregister consultants');
      return;
    }

    const button = event.target;
    const capability = button.getAttribute("data-capability");
    const email = button.getAttribute("data-email");

    if (!confirm(`Are you sure you want to unregister ${email} from ${capability}?`)) {
      return;
    }

    try {
      const response = await authenticatedFetch(
        `/capabilities/${encodeURIComponent(
          capability
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      if (!response) return;
      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh capabilities list to show updated consultants
        fetchCapabilities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    // Only consultants and admins can register
    if (userRole === 'readonly') {
      messageDiv.textContent = "Read-only users cannot register for capabilities";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      return;
    }

    const email = document.getElementById("email").value;
    const capability = document.getElementById("capability").value;

    // Pre-fill with current user's email for consultants
    if (userRole === 'consultant') {
      document.getElementById("email").value = userEmail;
    }

    try {
      const response = await authenticatedFetch(
        `/capabilities/${encodeURIComponent(capability)}/register`,
        {
          method: "POST",
          body: JSON.stringify({ email }),
        }
      );

      if (!response) return;
      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        registerForm.reset();

        // Refresh capabilities list to show updated consultants
        fetchCapabilities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to register. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error registering:", error);
    }
  });

  // Initialize app
  fetchCapabilities();
});
