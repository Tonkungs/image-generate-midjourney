import express, { Request, Response } from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import querystring from 'querystring';

dotenv.config();

const app = express();
const PORT = 3000;
const DISCORD_CLIENT_ID = process?.env?.DISCORD_CLIENT_ID as string;
const DISCORD_CLIENT_SECRET = process?.env?.DISCORD_CLIENT_SECRET as string;
const DISCORD_REDIRECT_URI = process?.env?.DISCORD_REDIRECT_URI as string; 
let USER_TOKEN =  process?.env?.USER_TOKEN as string;
const channelID =  process?.env?.channelID as string;

// URL สำหรับขอลิงก์การ Login กับ Discord
app.get('/login', (req: Request, res: Response) => {
  const redirectUri = `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(DISCORD_REDIRECT_URI)}&response_type=code&scope=identify guilds guilds.join messages.read`;
  res.redirect(redirectUri);
});


// Callback เมื่อได้รับ code จาก Discord
app.get('/callback', async (req: any , res: any ) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).send('No code provided');
  }
 
  try {
    // ขอ access token จาก Discord
    const tokenResponse = await axios.post(
      'https://discord.com/api/oauth2/token',
      querystring.stringify({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: DISCORD_REDIRECT_URI,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { access_token } = tokenResponse.data;
    console.log('tokenResponse.data',tokenResponse.data);
    
    USER_TOKEN = access_token
    console.log("USER_TOKEN",USER_TOKEN);
    
    // ดึงข้อมูลผู้ใช้จาก Discord
    const userResponse = await axios.get('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${USER_TOKEN}`,
      },
    });

    // ข้อมูลของผู้ใช้ที่ล็อกอินเข้ามา
    const userData = userResponse.data;
    console.log('userData =>',userData);
    res.json(userData);
    // res.send(`Hello, s${userData.username}! Your Discord login was successful.`);
  } catch (error) {
    console.error('Error during Discord OAuth2 process:', error);
    res.status(500).send('An error occurred during the login process.');
  }
});


app.get('/me/guild',async  (req: Request, res: Response) => {
    try {
      const guildsResponse = await axios.get('https://discord.com/api/users/@me/guilds', {
        headers: {
          Authorization: `Bearer ${USER_TOKEN}`,
        },
      });
  
      const guilds = guildsResponse.data;
      res.json(guilds);
    } catch (error) {
      console.error('Error fetching user guilds:', error);
      res.status(500).send('An error occurred during the login process.');
    }

})

app.get('/me/messages',async  (req: Request, res: Response) => {
  try {
    const response = await axios.post(
      `https://discord.com/api/channels/${channelID}/messages`,
      {
        content: "hello world", // ข้อความที่ต้องการส่ง
      },
      {
        headers: {
          Authorization: `Bearer ${USER_TOKEN}`, // ใช้ OAuth2 Access Token แทน Bot Token
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.status === 200) {
      console.log('Message sent successfully:', response.data);
      res.json(response.data);
    } else {
      console.log('Failed to send message:', response.status);
      res.json(response.data);
    }
  } catch (error) {
    console.error('Error sending message:', error);
  }
})

app.get('/me/token',async  (req: Request, res: Response) => {
  // เตรียมข้อมูลในรูปแบบ application/x-www-form-urlencoded
  const data = {
    client_id: DISCORD_CLIENT_ID,
    client_secret: DISCORD_CLIENT_SECRET,
    grant_type: 'authorization_code',
    code: USER_TOKEN,
    redirect_uri: 'http://localhost:3000/callback'
  };

  try {
    const response = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: querystring.stringify(data)
    });

    // ตรวจสอบผลลัพธ์จากการแลกเปลี่ยน
    if (response.ok) {
      const tokenData = await response.json();
      console.log('Access Token Data:', tokenData);
      res.json(tokenData);
    } else {
      const errorData = await response.json();
      console.error('Error:', errorData);
      res.json(errorData);
    }
  } catch (error) {
    console.error('Fetch error:', error);
  }
})

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
