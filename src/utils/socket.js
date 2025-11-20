let ioInstance = null;

export const setIO = (io) => {
  ioInstance = io;
};

export const getIO = () => ioInstance;

export const getUserRoom = (userId) => (userId ? `user:${userId}` : null);

