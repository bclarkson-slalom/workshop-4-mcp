// Authentication state
let authToken = localStorage.getItem('authToken');
let currentUser = null;

document.addEventListener("DOMContentLoaded", () => {
  const capabilitiesList = document.getElementById("capabilities-list");
  const capabilitySelect = document.getElementById("capability");
  const registerForm = document.getElementById("register-form");
  const messageDiv = document.getElementById("message");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const logoutBtn = document.getElementById("logout-btn");

  // Check for existing session
  const storedUser = localStorage.getItem('currentUser');
  if (authToken && storedUser) {
    currentUser = JSON.parse(storedUser);
    showApp();
  } else {
    showLogin();
  }

  // Login form handler
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    await login(email, password);
  });

  // Logout handler
  logoutBtn.addEventListener("click", logout);

  // Function to show login modal
  function showLogin() {
    loginModal.style.display = "flex";
    document.getElementById("user-info").style.display = "none";
    document.querySelector("main").style.display = "none";
  }

  // Function to show main app
  function showApp() {
    loginModal.style.display = "none";
    document.getElementById("user-info").style.display = "flex";
    document.querySelector("main").style.display = "block";
    updateUserInfo();
    fetchCapabilities();
  }

  // Login function
  async function login(email, password) {
    const loginError = document.getElementById("login-error");
    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const response = await fetch('/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Invalid credentials');
      }

      const data = await response.json();
      authToken = data.access_token;
      currentUser = data.user;
      
      localStorage.setItem('authToken', authToken);
      localStorage.setItem('currentUser', JSON.stringify(currentUser));

      loginError.textContent = '';
      showApp();
    } catch (error) {
      loginError.textContent = 'Invalid email or password';
      console.error('Login error:', error);
    }
  }

  // Logout function
  function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    showLogin();
    capabilitiesList.innerHTML = '';
    capabilitySelect.innerHTML = '<option value="">-- Select a capability --</option>';
  }

  // Update user info display
  function updateUserInfo() {
    if (currentUser) {
      document.getElementById("user-name").textContent = currentUser.full_name;
      document.getElementById("user-role").textContent = `(${currentUser.role})`;
    }
  }

  // Function to fetch capabilities from API
  async function fetchCapabilities() {
    if (!authToken) {
      showLogin();
      return;
    }

    try {
      const response = await fetch("/capabilities", {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.status === 401) {
        // Token expired
        logout();
        return;
      }

      const capabilities = await response.json();

      // Clear loading message
      capabilitiesList.innerHTML = "";

      // Populate capabilities list
      Object.entries(capabilities).forEach(([name, details]) => {
        const capabilityCard = document.createElement("div");
        capabilityCard.className = "capability-card";

        const availableCapacity = details.capacity || 0;
        const currentConsultants = details.consultants ? details.consultants.length : 0;

        // Create consultants HTML with delete icons
        const consultantsHTML =
          details.consultants && details.consultants.length > 0
            ? `<div class="consultants-section">
              <h5>Registered Consultants:</h5>
              <ul class="consultants-list">
                ${details.consultants
                  .map((email) => {
                    // Only show delete button for managers and above
                    const canDelete = currentUser && 
                      (currentUser.role === 'Partner' || 
                       currentUser.role === 'ManagingDirector' || 
                       currentUser.role === 'SeniorManager');
                    return `<li>
                      <span class="consultant-email">${email}</span>
                      ${canDelete ? `<button class="delete-btn" data-capability="${name}" data-email="${email}">❌</button>` : ''}
                    </li>`;
                  })
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

  // Handle unregister functionality
  async function handleUnregister(event) {
    if (!authToken) {
      showLogin();
      return;
    }

    const button = event.target;
    const capability = button.getAttribute("data-capability");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/capabilities/${encodeURIComponent(
          capability
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );

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

    if (!authToken) {
      showLogin();
      return;
    }

    const email = document.getElementById("email").value;
    const capability = document.getElementById("capability").value;

    // Check if consultants can only register themselves
    if (currentUser.role === 'Consultant' && email !== currentUser.email) {
      messageDiv.textContent = "Consultants can only register themselves";
      messageDiv.className = "error";
      return;
    }

    try {
      const response = await fetch(
        `/capabilities/${encodeURIComponent(
          capability
        )}/register?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );

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
