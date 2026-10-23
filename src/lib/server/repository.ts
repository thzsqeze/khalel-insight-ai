import 'server-only';
import { ProductionRepository } from './production-repository';
import type { Repository } from './repository-contract';
export function getRepository():Repository{return new ProductionRepository();}
