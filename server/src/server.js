import app from "./app.js";
import { env } from "./config/env.js";

const server = app.listen(env.port, () => {
  console.log(
    `BookLeaf AuthorDesk API running at http://localhost:${env.port}`
  );
  console.log(`Environment: ${env.nodeEnv}`);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${env.port} is already in use.`);
  } else {
    console.error("Failed to start the server:", error.message);
  }

  process.exit(1);
});