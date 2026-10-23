import 'server-only';
import { isDemoMode } from './config';
import { DemoRepository } from './demo-repository';
import { ProductionRepository } from './production-repository';
import type { Repository } from './repository-contract';
const shared=globalThis as typeof globalThis&{khalelDemoRepos?:Map<string,DemoRepository>};
export function demoRepository(){const key=process.env.DEMO_DB_PATH??'default';shared.khalelDemoRepos??=new Map();let repo=shared.khalelDemoRepos.get(key);if(!repo){repo=new DemoRepository();shared.khalelDemoRepos.set(key,repo);}return repo;}
export function getRepository():Repository{return isDemoMode()?demoRepository():new ProductionRepository();}
