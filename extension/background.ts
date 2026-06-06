export {};

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "PROMPTPILOT_API_REQUEST") {
    const { url, method, token, body } = message.payload;

    fetch(url, {
      method: method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(body)
    })
      .then(async (response) => {
        const isJson = response.headers.get('content-type')?.includes('application/json');
        const data = isJson ? await response.json() : await response.text();
        
        return {
          ok: response.ok,
          status: response.status,
          data
        };
      })
      .then((result) => {
        sendResponse({ success: true, result });
      })
      .catch((error) => {
        console.error("Proxy fetch error in background script:", error);
        sendResponse({ success: false, error: error.message || "Network request failed" });
      });

    return true; // Keep channel open for async sendResponse
  }
});
