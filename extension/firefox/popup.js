function showAlert(message) {
  const alertModal = document.getElementById('alertModal');
  const alertMessage = document.getElementById('alertMessage');

  alertMessage.textContent = message;
  alertModal.style.display = 'flex'; // Show the modal

  // Automatically hide the alert after 3 seconds
  setTimeout(() => {
    alertModal.style.display = 'none';
  }, 3000);
}

// Modified Fetch and Display Cookies with Detailed Formatting
function fetchAndDisplayCookies() {
  const domain = "youtube.com";
  browser.cookies.getAll({ domain: domain }).then((cookies) => {
    const table = document.getElementById('cookieTable');
    const tbody = table.getElementsByTagName('tbody')[0]; // Get the tbody element

    // Clear existing rows from tbody before adding new rows
    while (tbody.rows.length > 0) {
      tbody.deleteRow(0);
    }

    // Add new rows to tbody based on cookies
    cookies.forEach(function (cookie) {
      let row = tbody.insertRow(-1); // Append new row at the end of the tbody
      let keyCell = row.insertCell(0);
      let valueCell = row.insertCell(1);
      keyCell.textContent = cookie.name;
      valueCell.textContent = cookie.value;
    });
  });
}

document.getElementById('copyBtn').addEventListener('click', function () {
  const domain = "youtube.com";
  browser.cookies.getAll({ domain: domain }).then((cookies) => {
    const formattedCookies = cookies.map(cookie => ({
      domain: cookie.domain,
      expirationDate: cookie.expirationDate,
      hostOnly: cookie.hostOnly,
      httpOnly: cookie.httpOnly,
      name: cookie.name,
      path: cookie.path,
      sameSite: cookie.sameSite || 'unspecified',
      secure: cookie.secure,
      session: cookie.session,
      storeId: cookie.storeId || '0',
      value: cookie.value,
      id: cookies.indexOf(cookie) + 1
    }));
    const jsonCookieText = JSON.stringify(formattedCookies, null, 2);
    navigator.clipboard.writeText(jsonCookieText).then(() => {
      showAlert('Cookies copied to clipboard!');
    });
  });
});

document.getElementById('exportBtn').addEventListener('click', function () {
  const domain = "youtube.com";
  browser.cookies.getAll({ domain: domain }).then((cookies) => {
    const formattedCookies = cookies.map(cookie => ({
      domain: cookie.domain,
      expirationDate: cookie.expirationDate,
      hostOnly: cookie.hostOnly,
      httpOnly: cookie.httpOnly,
      name: cookie.name,
      path: cookie.path,
      sameSite: cookie.sameSite || 'unspecified',
      secure: cookie.secure,
      session: cookie.session,
      storeId: cookie.storeId || '0',
      value: cookie.value,
      id: cookies.indexOf(cookie) + 1
    }));
    const jsonCookieText = JSON.stringify(formattedCookies, null, 2); // Convert object to formatted JSON string
    const blob = new Blob([jsonCookieText], { type: 'application/json' }); // Use JSON MIME type
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cookies.json'; // Save as JSON file
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
});

document.getElementById('fetchUrlBtn').addEventListener('click', function () {
  console.log("Fetch URL button clicked"); // Debugging statement
  document.getElementById('videoUrlDisplay').textContent = "clicked";
  browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
    console.log("Tabs queried:", tabs); // Debugging statement
    if (tabs.length > 0) {
      const currentTab = tabs[0]; // tabs[0] is the active tab in the current window
      const url = currentTab.url;
      document.getElementById('videoUrlDisplay').textContent = url;

      // Send message to background script
      browser.runtime.sendMessage({ action: 'fetchUrl', url: url });
    } else {
      console.error('No active tabs found');
    }
  }).catch((error) => {
    console.error('Error querying tabs:', error);
  });
});

// Listener to handle the response from the background script
browser.runtime.onMessage.addListener((message) => {
  if (message.action === 'fetchUrlResult') {
    if (message.success) {
      console.log('Fetch URL Success:', message.data);
    } else {
      console.log('Fetch URL Error:', message.error);
    }
  }
});

// Call this function to initially populate the cookie table when the popup loads.
fetchAndDisplayCookies();

document.getElementById('refreshBtn').addEventListener('click', function () {
  fetchAndDisplayCookies(); // Call this function to fetch and display cookies again
});
