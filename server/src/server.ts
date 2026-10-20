import { createApp } from './app';
import { env } from './config/env';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log('--------------------------------------------------');
  console.log(`🎵 ClientSuite Music API Server running`);
  console.log(`🚀 Mode:     ${env.NODE_ENV}`);
  console.log(`🌐 Port:     http://localhost:${env.PORT}`);
  console.log(`🩺 Health:   http://localhost:${env.PORT}/api/health`);
  console.log('--------------------------------------------------');
});

// Graceful Shutdown
const handleShutdown = (signal: string) => {
  console.log(`\nReceived ${signal}. Gracefully shutting down...`);
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
