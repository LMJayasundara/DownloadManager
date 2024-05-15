function formatCookies(cookieString) {
    const cookieArray = cookieString.split('; '); // Split into individual cookies
    const jsonArray = cookieArray.map(cookie => {
        const [name, value] = cookie.split('='); // Split each cookie into name and value
        return { name, value }; // Return as an object
    });
    return jsonArray;
}

document.getElementById('copyBtn').addEventListener('click', function () {
    let cookieText = '';
    const cookies = document.querySelectorAll('#cookieTable tr');
    cookies.forEach((row, index) => {
        if (index > 0) { // Skip header row
            const cells = row.querySelectorAll('td');
            cookieText += `${cells[0].textContent}=${cells[1].textContent}; `;
        }
    });
    cookieText = cookieText.trim(); // Remove extra spaces and semicolon
    const formattedCookies = formatCookies(cookieText);
    const jsonCookieText = JSON.stringify(formattedCookies, null, 2); // Convert object to formatted JSON string
    navigator.clipboard.writeText(jsonCookieText).then(() => {
        alert('Cookies copied to clipboard in JSON format!');
    });
});

// document.getElementById('copyBtn').addEventListener('click', function () {
//     let cookieText = '';
//     const cookies = document.querySelectorAll('#cookieTable tr');
//     cookies.forEach((row, index) => {
//         if (index > 0) { // Skip header row
//             const cells = row.querySelectorAll('td');
//             cookieText += `${cells[0].textContent}=${cells[1].textContent}; `;
//         }
//     });
//     navigator.clipboard.writeText(cookieText.trim()).then(() => {
//         alert('Cookies copied to clipboard!');
//     });
// });

document.getElementById('exportBtn').addEventListener('click', function () {
    let cookieText = '';
    const cookies = document.querySelectorAll('#cookieTable tr');
    cookies.forEach((row, index) => {
        if (index > 0) { // Skip header row
            const cells = row.querySelectorAll('td');
            cookieText += `${cells[0].textContent}=${cells[1].textContent}\n`;
        }
    });
    const blob = new Blob([cookieText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'youtube_cookies.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

// Fetch and display cookies
chrome.cookies.getAll({ domain: "youtube.com" }, function (cookies) {
    const table = document.getElementById('cookieTable');
    cookies.forEach(function (cookie) {
        let row = table.insertRow(-1);
        let keyCell = row.insertCell(0);
        let valueCell = row.insertCell(1);
        keyCell.textContent = cookie.name;
        valueCell.textContent = cookie.value;
    });
});

// document.getElementById('fetchUrlBtn').addEventListener('click', function() {
//     chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
//         const currentTab = tabs[0]; // tabs[0] is the active tab in the current window
//         document.getElementById('videoUrlDisplay').textContent = currentTab.url;
//     });
// });

document.getElementById('fetchUrlBtn').addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const currentTab = tabs[0]; // tabs[0] is the active tab in the current window
        const url = currentTab.url;
        document.getElementById('videoUrlDisplay').textContent = url;

        // fetch('http://localhost:3210/url', {
        //     method: 'POST',
        //     headers: {
        //         'Content-Type': 'application/json'
        //     },
        //     body: JSON.stringify({ url: url })
        // })
        // .then(response => response.json())
        // .then(data => console.log('Success:', data))
        // .catch((error) => {
        //     console.error('Error:', error);
        // });

        fetch('http://localhost:3210/open')
        .then(response => response.text())
        .then(data => {
            if (data.includes('Launched')) {
                alert('Electron App is now open!');
            } else {
                alert('Electron App is now open!');
                // document.getElementById('messageDisplay').textContent = 'Please start the Electron app manually.';
            }
        })
        .catch(error => {
            alert('Electron App is now open!');
            // console.error('Error:', error);
            // document.getElementById('messageDisplay').textContent = 'Unable to connect. Please ensure the Electron app is running or start it manually.';
        });
    });
});