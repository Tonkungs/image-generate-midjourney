import WebSocket from 'ws';
// Replace 'token' with your actual token value
const url = `wss://gateway.discord.gg/?encoding=json&v=9`
const ws = new WebSocket(url);
// https://discord.com/developers/docs/events/gateway-events
// Optional: Set headers using WebSocket if needed (most browsers don't allow custom headers)
const tokenFirst = { "op": 2, "d": { "token": "", "capabilities": 30717, "properties": { "os": "Linux", "browser": "Chrome", "device": "", "system_locale": "th-TH", "browser_user_agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36", "browser_version": "129.0.0.0", "os_version": "", "referrer": "", "referring_domain": "", "referrer_current": "", "referring_domain_current": "", "release_channel": "stable", "client_build_number": 352804, "client_event_source": null }, "presence": { "status": "unknown", "since": 0, "activities": [], "afk": false }, "compress": false, "client_state": { "guild_versions": {} } } }
const MidjourneyChannelID = "1291762963174129696"
let heartbeatInterval = 40000
let MESSAGE_CREATE = "MESSAGE_CREATE"
let MESSAGE_UPDATE = "MESSAGE_UPDATE"
let MESSAGE_DELETE = "MESSAGE_DELETE"
let MESSAGE_REACTION_ADD = "MESSAGE_REACTION_ADD" // Delete
let MESSAGE_ERROR = "content There was an error processing your request"
function startWS() {

  function sendHeartbeat() {
    const heartbeat = JSON.stringify({ op: 1, d: null });
    ws.send(heartbeat);
    console.log('Heartbeat sent');
  }
  let startHeartbeat: NodeJS.Timeout

  ws.onopen = () => {
    console.log('WebSocket connection established');
    // You can send a message or perform actions here after the connection is open
    ws.send(JSON.stringify(tokenFirst));
    startHeartbeat = setInterval(sendHeartbeat, heartbeatInterval);
  };

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data as unknown as string);
    if (message.op === 10) { // Hello message from Discord
      startHeartbeat = setInterval(sendHeartbeat, heartbeatInterval);
    }
    // {
    //     t: 'MESSAGE_ACK',
    //     s: 7,
    //     op: 0,
    //     d: {
    //       version: 23680,
    //       message_id: '1317056756290945024',
    //       last_viewed: 3635,
    //       flags: 0,
    //       channel_id: '1291762963174129696'
    //     }
    //   }

    // MESSAGE_CREATE
    if (message) {
      // console.log("message =>",);
      if (message.d) {
        // console.log("message.d.channel_id",message.d);
        if (message.d.channel_id && message.d.channel_id === MidjourneyChannelID) {
          // console.log("message.channel_id =>", message);
          switch (message.t) {
            case MESSAGE_CREATE:
              if (message.d.content != "" && message.d.embeds.length == 0) {
                if (message.d.content.includes(MESSAGE_ERROR)) {
                  console.log("MESSAGE_CREATE", message);
                  break;
                }


                console.log("MESSAGE_CREATE content", message.d.content);
                
              } else {
                
                if (message.d.embeds.length <1) {
                  console.log("MESSAGE_CREATE JOB content",  message.d)
                  return
                }
                if (message.d.embeds[0].title === "Queue full") {
                  console.log("MESSAGE_CREATE Queue full", message.d.embeds[0]);
                  
                } else if (message.d.embeds[0].title === "Action needed to continue") {
                  console.log("MESSAGE_CREATE Action needed to continue", message.d.embeds[0]);
                }
                
              }
              // title: 'Queue full',
// 'Action needed to continue',
              break;
            case MESSAGE_UPDATE:
              if (message.d.content != "") {
                console.log("MESSAGE_UPDATE content", message.d.content);
              }
              break;
            case MESSAGE_DELETE:
              // { id: '1317073046384672820', channel_id: '1291762963174129696' }
              console.log("MESSAGE_DELETE", message.d.id);

              break;
            case MESSAGE_REACTION_ADD:
              const msg = message.d as Message_DELETE
              console.log("MESSAGE_REACTION_ADD", msg.emoji.name, msg.message_id);
              break;

            default:
              console.log("message.d", message);

              break;
          }
        }
      }
    }


  };

  ws.onclose = (event) => {
    console.log('WebSocket connection closed:', event);
    clearInterval(startHeartbeat);
    throw new Error("WebSocket onclose");
  };

  ws.onerror = (error) => {
    // console.error('WebSocket error:');
    console.error('WebSocket error:', error);
    clearInterval(startHeartbeat);
    throw new Error("WebSocket error");

  };
}

(function main() {
  try {
    startWS()
  
  } catch (error) {
    console.log("error", error);
    main()
  
  }
})()


interface Message_DELETE {
  user_id: string;
  type: number;
  message_id: string;
  message_author_id: string;
  emoji: {
    name: string;
    id: string | null;
  };
  channel_id: string;
  burst: boolean;
}
// {
//   t: 'MESSAGE_ACK',
//   s: 28,
//   op: 0,
//   d: {
//     version: 74244,
//     message_id: '1328364610981462168',
//     last_viewed: 3665,
//     flags: 0,
//     channel_id: '1291762963174129696'
//   }
// }
// const message: Message_DELETE = {
//   user_id: '138343612806070272',
//   type: 0,
//   message_id: '1326569831641649224',
//   message_author_id: '936929561302675456',
//   emoji: { name: '❌', id: null },
//   channel_id: '1291762963174129696',
//   burst: false
// };

// MESSAGE_CREATE JOB content {
//   type: 'rich',
//   title: 'Queue full',
//   footer: {
//     text: '/imagine A spacious dining room design featuring a custom wooden dining table, minimalist chairs, modern pendant lights hanging from the ceiling, and neutral color tones to create a casual yet elegant dining experience, --ar 16:9'
//   },
//   description: 'Your job queue is full. Please wait for a job to finish first, then resubmit this one.',
//   content_scan_version: 0,
//   color: 16711680
// }

// MESSAGE_CREATE JOB content {
//   type: 'rich',
//   title: 'Action needed to continue',
//   footer: {
//     text: '/imagine An intricate lace fabric texture featuring delicate floral patterns and a see-through design, ideal for romantic clothing. --ar 16:9'
//   },
//   description: 'Sorry! Our AI moderators feel your prompt might be against our community standards.\n' +
//     '\n' +
//     '        If you think this is a mistake, please press the "Appeal" button below and we will send it to a more sophisticated AI to double-check the result.',
//   content_scan_version: 0,
//   color: 16711680
// }

// MESSAGE_CREATE content There was an error processing your request. Please try again later. Your trace: `aspirate-giveaway-smuggler`