browser.runtime.onMessage.addListener((message) => {
  if (message.action === 'fetchUrl') {
    fetch('http://localhost:8000/url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: message.url }),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log('Success:', data);
        browser.runtime.sendMessage({ action: 'fetchUrlResult', success: true, data: data });
      })
      .catch((error) => {
        console.log('Error:', error);
        browser.runtime.sendMessage({ action: 'fetchUrlResult', success: false, error: error });
      });
  }
});
