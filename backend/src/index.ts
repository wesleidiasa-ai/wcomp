import "dotenv/config";
import { app } from "./app";
import { ensureUploadDir } from "./lib/storage";

const port = Number(process.env.PORT) || 3000;

ensureUploadDir();

app.listen(port, () => {
  console.log(`API rodando em http://localhost:${port}`);
});
