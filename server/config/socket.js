// config/socket.js
let io = null;

const setIo = (socketIo) => {
  io = socketIo;
};

const getIo = () => io;

module.exports = { setIo, getIo };