import { createApp } from './app.js';
import { config, validateProductionConfig } from './config.js';

validateProductionConfig();

const server = createApp().listen(config.port, () => {
  console.log(
    JSON.stringify({
      level: 'info',
      event: 'server_started',
      port: config.port,
      environment: config.nodeEnv,
      timestamp: new Date().toISOString(),
    })
  );
});

function shutdown(signal) {
  console.log(
    JSON.stringify({
      level: 'info',
      event: 'server_shutdown',
      signal,
      timestamp: new Date().toISOString(),
    })
  );
  server.close((error) => {
    if (error) {
      console.error(error);
      process.exit(1);
    }
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
