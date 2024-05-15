const http = require('http');
const socketIo = require('socket.io');
const axios = require('axios'); // Make sure axios is installed

// Create an HTTP server
const server = http.createServer();

// Initialize a new instance of socket.io by passing the HTTP server object
const io = socketIo(server, {
  path: '/socket'
});

const clients = new Map(); // This will store client info

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on("status", async function (data) {
    console.log(`Client ${data.id} Status: ${data.login}`);
    clients.set(socket.id, { userId: data.id, loggedIn: data.login });
    io.emit('clientres', { message: `Client ${data.id} Status: ${data.login}` });

    // // Update isActive status in database
    // try {
    //   await axios.put('https://playdownloader.com/api/User/Update', {
    //     user_id: data.id,
    //     is_active: data.login
    //   }, {
    //     headers: { 'Content-Type': 'application/json' }
    //   });
    // } catch (error) {
    //   console.error('Failed to update user status:', error.message);
    // }

    // if(!data.login){
    //   try {
    //     await axios.post('https://playdownloader.com/api/User/Logout', {
    //       user_id: data.id
    //     }, {
    //       headers: { 'Content-Type': 'application/json' }
    //     });
    //   } catch (error) {
    //     console.error('Failed to update user status on disconnect:', error.message);
    //     io.emit('clientres', { message: error.message });
    //   }
    // }
  });

  socket.on('disconnect', async () => {
    console.log('User disconnected');
    const client = clients.get(socket.id);
    if (client && client.userId) {
      clients.delete(socket.id);
      try {
        await axios.post('https://playdownloader.com/api/User/Logout', {
          user_id: client.userId
        }, {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Failed to update user status on disconnect:', error.message);
      }
    }
  });

  // Setup the heartbeat check
  socket.on('ping', () => {
    socket.emit('pong');
  });
});

// Set the server to listen on a specific port
const PORT = 5050;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
