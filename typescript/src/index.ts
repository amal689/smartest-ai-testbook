import { app } from './web-server/app.js';

app.listen(Number(process.env.PORT ?? 3001), '0.0.0.0');
