(async function name() {
  const data =  await fetch("wss://ws.midjourney.com/ws?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNjJlNmI5MzUtYmZmMi00YjA4LTg3YmItNWZjN2ZhMmFhOWVjIiwidXNlcm5hbWUiOiJrdW5nZ28uIiwiaWF0IjoxNzMwMjE3MzA5fQ.jSEkWXdTj4BsvJY_0d7_TPzRvZlSmaiDp9I9oTw2wsk&v=4", {
        "headers": {
          "accept-language": "en-GB,en;q=0.9,th-TH;q=0.8,th;q=0.7,en-US;q=0.6",
          "cache-control": "no-cache",
          "pragma": "no-cache",
          "sec-websocket-extensions": "permessage-deflate; client_max_window_bits",
          "sec-websocket-key": "y59Y0Ps8LS05X0OnUuekRw==",
          "sec-websocket-version": "13"
        },
        "body": null,
        "method": "GET"
      }); 
    const body = data.json();
    console.log(body);
})()