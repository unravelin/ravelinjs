import 'dotenv/config';
import { checkCertsExist, startServer } from './server.mjs';

checkCertsExist();
startServer();
